"""챗봇 3-tier RAG 백엔드 — CB-001/002/003/005/007.

설계 (가이드 §3.7): 한국어 임베딩 + pgvector 코사인 거리로 RAG.
- Tier 1 (KEYWORD): FAQ 카테고리 + 코사인 거리 ≤ 0.30 (score ≥ 0.70)
- Tier 2 (FAQ):     FAQ 카테고리 + 코사인 거리 ≤ 0.50 (score 0.50~0.70)
- Tier 3 (VECTOR):  TERMS 카테고리 또는 거리 ≤ 0.70 (score ≥ 0.30) + LLM 답변 합성
- 그 외: "관련 정보를 찾지 못했습니다." (confidence=LOW)

인덱싱:
    `python -m app.scripts.build_embeddings` → `data/*.md` 청크 → `AI_FAQ`(vector(768)).
질의 시:
    `jhgan/ko-sroberta-multitask` 로 쿼리 임베딩 → `AI_FAQ` `<=>` top-k.

list_faq / search_terms 는 in-memory 코퍼스 (단순 목록·문자열 매칭, 시연용).
세션/메시지는 in-memory dict — 운영은 AI_CHATBOT_SESSION/MESSAGE 로 이관.
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import TypedDict

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from .chatbot_suggestions import follow_up_questions
from .llm import chat_completion as _llm_chat_completion
from .token import ResourceType, TokenService

log = structlog.get_logger("chatbot")


# ---------------------------------------------------------------------------
# 임베딩 모델 — lazy singleton (첫 호출 시 ~수 초 로드, 모델은 ~400MB)
# ---------------------------------------------------------------------------

_EMBED_MODEL = None
_EMBED_MODEL_NAME = "jhgan/ko-sroberta-multitask"


def _get_embed_model():
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        from sentence_transformers import SentenceTransformer  # 지연 import (시작 시간 단축)

        _EMBED_MODEL = SentenceTransformer(_EMBED_MODEL_NAME)
    return _EMBED_MODEL


def _vec_literal(vec) -> str:
    return "[" + ",".join(f"{float(x):.6f}" for x in vec) + "]"


# Kafka `chatbot.llm.calls` 컨슈머 핸들러는 `llm_log.handle_llm_call` 에 위임.
# main.py 가 historically `chatbot.handle_llm_call_trace` 이름으로 import 하므로 alias 유지.
from .llm_log import handle_llm_call as handle_llm_call_trace  # noqa: E402,F401


def _embed_query(text: str) -> str:
    """쿼리 텍스트 → pgvector 텍스트 리터럴 (정규화·L2)."""
    model = _get_embed_model()
    emb = model.encode([text], normalize_embeddings=True)[0]
    return _vec_literal(emb)


class FaqEntry(TypedDict):
    faq_id: int
    category: str
    question: str
    answer: str


class TermsClause(TypedDict):
    terms_id: int
    title: str
    clause: str
    body: str


# Module-level 캐시 — 앱 시작 시 load_corpora() 로 채움.
_FAQ_CORPUS: list[FaqEntry] = []
_TERMS_CORPUS: list[TermsClause] = []
_SESSIONS: dict[int, dict] = {}
_NEXT_SESSION_ID = [1]
_NEXT_MESSAGE_ID = [1]
_FEEDBACK_LOG: list[dict] = []


_TOKEN_RE = re.compile(r"[A-Za-z가-힣0-9]+")
_CAT_RE = re.compile(r"^## \d+\. ([A-Z_]+) —")
_Q_RE = re.compile(r"^### Q(\d+)\.\s*(.+)$")


def _tokenize(s: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(s) if len(t) >= 2}


def _score(query: set[str], doc_text: str) -> float:
    doc = _tokenize(doc_text)
    if not query or not doc:
        return 0.0
    return len(query & doc) / len(query)


# ---------------------------------------------------------------------------
# 코퍼스 파싱
# ---------------------------------------------------------------------------

def _parse_faq(path: Path) -> list[FaqEntry]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    entries: list[FaqEntry] = []
    category = "OTHER"
    current_q: tuple[int, str] | None = None
    answer_buf: list[str] = []

    def _flush():
        if current_q is not None:
            entries.append(FaqEntry(
                faq_id=current_q[0],
                category=category,
                question=current_q[1],
                answer=" ".join(answer_buf).strip(),
            ))

    for raw in text.splitlines():
        line = raw.rstrip()
        m = _CAT_RE.match(line)
        if m:
            _flush()
            current_q = None
            answer_buf = []
            category = m.group(1)
            continue
        m = _Q_RE.match(line)
        if m:
            _flush()
            current_q = (int(m.group(1)), m.group(2).strip())
            answer_buf = []
            continue
        if current_q is None:
            continue
        stripped = line.strip()
        if stripped.startswith("**A.**"):
            answer_buf.append(stripped.replace("**A.**", "").strip())
        elif stripped.startswith("- 카테고리"):
            continue
        elif stripped and not stripped.startswith("---") and not stripped.startswith("#"):
            answer_buf.append(stripped)
    _flush()
    return entries


def _parse_terms(dir_path: Path) -> list[TermsClause]:
    if not dir_path.exists():
        return []
    clauses: list[TermsClause] = []
    for i, p in enumerate(sorted(dir_path.glob("*.md"))):
        if p.name.lower().startswith("readme"):
            continue
        lines = p.read_text(encoding="utf-8").splitlines()
        if not lines:
            continue
        # YAML frontmatter (`---` ~ `---`) 스킵.
        body_start = 0
        if lines and lines[0].strip() == "---":
            for j in range(1, len(lines)):
                if lines[j].strip() == "---":
                    body_start = j + 1
                    break
        # 본문에서 첫 `# 제목` 찾기.
        title = p.stem
        title_idx = body_start
        for j in range(body_start, len(lines)):
            if lines[j].startswith("# ") and not lines[j].startswith("## "):
                title = lines[j].lstrip("# ").strip() or title
                title_idx = j + 1
                break
        terms_id = i + 1
        current_clause: str | None = None
        body_buf: list[str] = []
        for raw in lines[title_idx:]:
            if raw.startswith("## "):
                if current_clause is not None:
                    clauses.append(TermsClause(
                        terms_id=terms_id,
                        title=title,
                        clause=current_clause,
                        body="\n".join(body_buf).strip(),
                    ))
                current_clause = raw.lstrip("# ").strip()
                body_buf = []
            elif current_clause is not None:
                body_buf.append(raw)
        if current_clause is not None:
            clauses.append(TermsClause(
                terms_id=terms_id, title=title,
                clause=current_clause, body="\n".join(body_buf).strip(),
            ))
    return clauses


def load_corpora(data_dir: Path) -> None:
    """앱 시작 시 1회 호출."""
    global _FAQ_CORPUS, _TERMS_CORPUS
    _FAQ_CORPUS = _parse_faq(data_dir / "seed-faq.md")
    _TERMS_CORPUS = _parse_terms(data_dir / "seed-terms")


def corpora_stats() -> dict[str, int]:
    return {"faq": len(_FAQ_CORPUS), "terms_clauses": len(_TERMS_CORPUS)}


# ---------------------------------------------------------------------------
# 메시지 전송 (3-tier 매칭)
# ---------------------------------------------------------------------------

async def chat_send(
    customer_no: int,
    message: str,
    session_id: int | None,
    tokens: TokenService,
) -> dict:
    if session_id is None or session_id not in _SESSIONS:
        session_id = _NEXT_SESSION_ID[0]
        _NEXT_SESSION_ID[0] += 1
        _SESSIONS[session_id] = {
            "customer_no": customer_no,
            "messages": [],
            "started_at": datetime.now(),
        }
    sess = _SESSIONS[session_id]
    if sess["customer_no"] != customer_no:
        raise NotFoundError(E_NOT_FOUND, "세션을 찾을 수 없습니다.")

    user_msg = {
        "message_id": _NEXT_MESSAGE_ID[0],
        "role_cd": "USER",
        "content": message,
        "rag_tier_cd": None,
        "sources": [],
        "confidence": None,
        "created_at": datetime.now(),
    }
    _NEXT_MESSAGE_ID[0] += 1
    sess["messages"].append(user_msg)

    # 벡터 검색 — 코사인 거리 작을수록 의미가 가까움 (`<=>` 0 = 동일).
    query_vec = _embed_query(message)
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "FAQ_ID", "CATEGORY", "QUESTION", "ANSWER", '
            '"EMBEDDING" <=> $1::vector AS distance '
            'FROM public."AI_FAQ" '
            'WHERE "STATUS_CD" = \'ACTIVE\' '
            '  AND ("DELETE_YN" IS NULL OR "DELETE_YN" = \'N\') '
            'ORDER BY distance LIMIT 5',
            query_vec,
        )

    faq_hits = [r for r in rows if r["CATEGORY"] != "TERMS"]
    terms_hits = [r for r in rows if r["CATEGORY"] == "TERMS"]
    top_faq = faq_hits[0] if faq_hits else None
    top_terms = terms_hits[0] if terms_hits else None
    top_faq_d = float(top_faq["distance"]) if top_faq else 999.0
    top_terms_d = float(top_terms["distance"]) if top_terms else 999.0

    def _to_score(d: float) -> float:
        # 정규화 임베딩 — 코사인 거리 [0, 2], 실제 사용 범위 대략 [0, 1].
        return max(0.0, 1.0 - float(d))

    tier: str | None
    sources: list[dict] = []
    matched_category: str | None = None
    matched_faq_id: int | None = None
    if top_faq is not None and top_faq_d <= 0.50:
        tier = "KEYWORD" if top_faq_d <= 0.30 else "FAQ"
        matched_category = top_faq["CATEGORY"]
        matched_faq_id = int(top_faq["FAQ_ID"])
        answer = top_faq["ANSWER"] or ""
        sources.append({
            "doc_token": await tokens.issue(
                ResourceType.DOC, f"AI_FAQ:{top_faq['FAQ_ID']}", customer_no
            ),
            "doc_type": "FAQ",
            "title": top_faq["QUESTION"],
            "clause": None,
            "snippet": (top_faq["ANSWER"] or "")[:120],
            "score": round(_to_score(top_faq_d), 3),
        })
        confidence = "HIGH" if top_faq_d <= 0.30 else "MEDIUM"
    elif top_terms is not None and top_terms_d <= 0.70:
        tier = "VECTOR"
        top_term_rows = []
        for r in terms_hits[:3]:
            if float(r["distance"]) > 0.85:
                break
            top_term_rows.append(r)
            title, _, clause = (r["QUESTION"] or "").partition(" · ")
            sources.append({
                "doc_token": await tokens.issue(
                    ResourceType.DOC, f"AI_FAQ:{r['FAQ_ID']}", customer_no
                ),
                "doc_type": "TERMS",
                "title": title or r["QUESTION"],
                "clause": clause or None,
                "snippet": (r["ANSWER"] or "")[:120],
                "score": round(_to_score(float(r["distance"])), 3),
            })
        # LLM 자연어 답변 생성 시도 — 실패 시 약관 안내 fallback (가이드 §3.7).
        llm_answer: str | None = None
        try:
            context = "\n\n".join(
                f"[{r['QUESTION']}]\n{(r['ANSWER'] or '')[:800]}"
                for r in top_term_rows
            )
            system_prompt = (
                "당신은 한국 은행의 상담 챗봇입니다. 아래 약관/규정 발췌만을 근거로 "
                "사용자 질문에 한국어로 간결하게(3문장 이내) 답변하세요. "
                "발췌에 없는 내용은 추측하지 말고 '약관에서 확인되지 않습니다'라고 답하세요."
            )
            user_prompt = f"질문: {message}\n\n참고 약관:\n{context}"
            llm_answer = await _llm_chat_completion(
                system_prompt, user_prompt, max_tokens=400
            )
            # LLM 호출이 성공했으면 사용량 메타를 Kafka 토픽으로 발행 (가이드 §2.4 + §3.7).
            # consumer 가 AI_LLM_CALL_LOG 에 INSERT — Phase 6 Phoenix 트레이스와 연동 후보.
            if llm_answer:
                import uuid

                from .llm import get_last_usage
                from . import kafka as kafka_svc

                usage_meta = get_last_usage()
                if usage_meta:
                    trace_id = uuid.uuid4().hex
                    await kafka_svc.send_event(
                        kafka_svc.TOPIC_CHATBOT_LLM_CALLS,
                        {
                            "trace_id": trace_id,
                            "model_name": usage_meta["model_name"],
                            "purpose_cd": "CHATBOT_RAG",
                            "prompt_tokens": usage_meta["prompt_tokens"],
                            "completion_tokens": usage_meta["completion_tokens"],
                            "status_cd": "OK",
                        },
                        key=trace_id,
                    )
                    # RAG 응답 품질 추적 — 같은 trace_id 로 발행, consumer 가 AI_RAG_EVALUATION INSERT (§3.7).
                    # 정량 지표(faithfulness/answer_relevancy 등)는 Phoenix/Ragas 통합 후 채움.
                    await kafka_svc.send_event(
                        kafka_svc.TOPIC_CHATBOT_RAG_EVALS,
                        {
                            "trace_id": trace_id,
                            "question": message,
                            "retrieved_docs": sources,
                            "answer": llm_answer,
                        },
                        key=trace_id,
                    )
        except Exception:
            log.exception("llm_answer_failed")
        if llm_answer:
            answer = llm_answer
        else:
            answer = f"관련 약관 [{top_terms['QUESTION']}] 을 확인하세요."
        confidence = "MEDIUM" if top_terms_d <= 0.50 else "LOW"
    else:
        tier = None
        answer = "관련 정보를 찾지 못했습니다. 상담원 연결을 도와드릴까요?"
        confidence = "LOW"

    # 연계 질문 — 매칭 카테고리가 있으면 그 안에서, 없으면 사용자 질문 토큰 overlap 으로 top-3
    follow_ups = await follow_up_questions(
        user_question=message,
        matched_category=matched_category,
        matched_faq_id=matched_faq_id,
        k=3,
    )

    assistant_msg = {
        "message_id": _NEXT_MESSAGE_ID[0],
        "role_cd": "ASSISTANT",
        "content": answer,
        "rag_tier_cd": tier,
        "sources": sources,
        "confidence": confidence,
        "follow_up_questions": follow_ups,
        "created_at": datetime.now(),
    }
    _NEXT_MESSAGE_ID[0] += 1
    sess["messages"].append(assistant_msg)

    return {
        "session_id": session_id,
        "user_message": user_msg,
        "assistant_message": assistant_msg,
    }


# ---------------------------------------------------------------------------
# FAQ 목록 / 약관 검색 / 출처 조회 / 피드백
# ---------------------------------------------------------------------------

def list_faq(category: str | None) -> list[dict]:
    items = _FAQ_CORPUS if category is None else [
        f for f in _FAQ_CORPUS if f["category"] == category
    ]
    return [
        {
            "faq_id": f["faq_id"],
            "category": f["category"],
            "question": f["question"],
            "answer_snippet": f["answer"][:120],
            "hit_count": 0,
        }
        for f in items
    ]


async def search_terms(
    query: str, tokens: TokenService, customer_no: int
) -> list[dict]:
    q = _tokenize(query)
    scored = [
        (_score(q, c["clause"] + " " + c["body"][:500]), c) for c in _TERMS_CORPUS
    ]
    scored = [(s, c) for s, c in scored if s > 0]
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for s, c in scored[:10]:
        out.append({
            "doc_token": await tokens.issue(
                ResourceType.DOC,
                f"TERMS:{c['terms_id']}:{c['clause']}",
                customer_no,
            ),
            "terms_id": c["terms_id"],
            "title": c["title"],
            "clause": c["clause"],
            "snippet": c["body"][:200],
            "score": round(s, 3),
        })
    return out


async def get_source(
    doc_token: str, tokens: TokenService, customer_no: int
) -> dict:
    p = await tokens.resolve(
        doc_token, customer_no, expected_type=ResourceType.DOC
    )
    if p is None:
        raise NotFoundError(E_NOT_FOUND, "출처를 찾을 수 없습니다.")
    parts = p.resource_id.split(":", 2)
    kind = parts[0]
    if kind == "TERMS":
        terms_id = int(parts[1])
        clause_filter = parts[2] if len(parts) >= 3 else None
        matches = [c for c in _TERMS_CORPUS if c["terms_id"] == terms_id]
        if not matches:
            raise NotFoundError(E_NOT_FOUND, "약관을 찾을 수 없습니다.")
        title = matches[0]["title"]
        clauses = [
            {"clause": c["clause"], "body": c["body"]}
            for c in matches
            if clause_filter is None or c["clause"] == clause_filter
        ]
        return {
            "doc_token": doc_token,
            "terms_id": terms_id,
            "title": title,
            "version": 1,
            "effective_date": "20260101",
            "clauses": clauses,
        }
    if kind == "FAQ":
        faq_id = int(parts[1])
        f = next((x for x in _FAQ_CORPUS if x["faq_id"] == faq_id), None)
        if f is None:
            raise NotFoundError(E_NOT_FOUND, "FAQ를 찾을 수 없습니다.")
        return {
            "doc_token": doc_token,
            "terms_id": 0,
            "title": f["question"],
            "version": 1,
            "effective_date": "20260101",
            "clauses": [{"clause": "답변", "body": f["answer"]}],
        }
    if kind == "AI_FAQ":
        # 벡터 검색 결과 토큰 — AI_FAQ 통합 인덱스에서 DB 조회.
        faq_id = int(parts[1])
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT "CATEGORY", "QUESTION", "ANSWER" FROM public."AI_FAQ" '
                'WHERE "FAQ_ID" = $1 AND "STATUS_CD" = \'ACTIVE\'',
                faq_id,
            )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "출처를 찾을 수 없습니다.")
        is_terms = row["CATEGORY"] == "TERMS"
        if is_terms:
            title, _, clause = (row["QUESTION"] or "").partition(" · ")
        else:
            title, clause = row["QUESTION"] or "", "답변"
        return {
            "doc_token": doc_token,
            "terms_id": faq_id if is_terms else 0,
            "title": title or row["QUESTION"] or "",
            "version": 1,
            "effective_date": "20260101",
            "clauses": [{"clause": clause or "답변", "body": row["ANSWER"] or ""}],
        }
    raise NotFoundError(E_NOT_FOUND, "출처를 찾을 수 없습니다.")


def submit_feedback(message_id: int, rating: int, comment: str | None) -> None:
    _FEEDBACK_LOG.append({
        "message_id": message_id,
        "rating": rating,
        "comment": comment,
        "at": datetime.now().isoformat(),
    })


def feedback_count() -> int:
    return len(_FEEDBACK_LOG)
