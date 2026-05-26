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
세션/메시지는 AI_CHATBOT_SESSION / AI_CHATBOT_MESSAGE(v53) 에 영구화.
RAG_SOURCE_IDS jsonb 에 sources 메타(doc_type/doc_id/title/clause/snippet/score) 저장 —
get_session 응답 시 doc_token 은 본인 검증 후 재발급.
"""

from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime
from pathlib import Path
from typing import TypedDict

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from ..observability import get_tracer
from .chatbot_suggestions import follow_up_questions
from .llm import chat_completion as _llm_chat_completion
from .token import ResourceType, TokenService

_tracer = get_tracer("banking.chatbot")

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
_FEEDBACK_LOG: list[dict] = []


def _sources_for_db(sources: list[dict]) -> str:
    """RAG_SOURCE_IDS jsonb 에 저장할 메타 직렬화. doc_token 제외(재발급 가능)."""
    keep = []
    for s in sources:
        keep.append({
            "doc_type": s.get("doc_type"),
            "doc_id": s.get("doc_id"),
            "title": s.get("title"),
            "clause": s.get("clause"),
            "snippet": s.get("snippet"),
            "score": s.get("score"),
        })
    return json.dumps(keep, ensure_ascii=False)


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

# 욕설·비속어 사전 (한국어 일반 + 영어 흔한 욕). RAG 거치지 않고 짧게 거절.
_PROFANITY = re.compile(
    r"(씨발|시발|개새|좆|존나|병신|등신|니애미|니애비|fuck|shit|asshole|bitch|"
    r"바보(야|아|냐)|멍청이|꺼져|닥쳐|꺼지|죽어|개같|좇같)",
    re.IGNORECASE,
)

# 단순 인사·잡담 패턴 — RAG 매칭 부적합이므로 짧게 응답.
_GREETING = re.compile(r"^(안녕|하이|hi|hello|반가|좋은\s*(아침|오후|저녁)|어디|뭐해|졸려|배고파)", re.IGNORECASE)
_TINY = re.compile(r"^[\s.?!ㅋㅎㅠ]+$|^.{1,3}$")  # 3자 이하 또는 ㅋㅋ/ㅎㅎ/?? 만


def _early_reply(message: str, audience: str) -> str | None:
    """RAG 검색 전 짧은 가드. None 반환 시 정상 RAG 흐름. 문자열 반환 시 즉시 응답.

    가드 1) 욕설·비속어 → 정중 거절
    가드 2) 단순 인사·잡담 → 한 줄 안내
    가드 3) 3자 이하 단답·이모지만 → 다시 질문 유도
    """
    txt = (message or "").strip()
    if not txt:
        return "내용을 입력해 주세요."
    if _PROFANITY.search(txt):
        return (
            "부적절한 표현이 감지되어 답변할 수 없어요. 업무 관련 질문을 정확히 입력해 주세요. "
            "본 대화 내용은 감사 로그에 기록됩니다."
        )
    if _TINY.match(txt):
        if audience == "ADMIN":
            return "업무 관련 질문을 한 문장으로 입력해 주세요. 예) 의심거래 보고 절차"
        return "궁금한 점을 한 문장으로 알려주세요. 예) 이체 한도는 어떻게 바꾸나요?"
    if _GREETING.match(txt) and len(txt) < 12:
        if audience == "ADMIN":
            return "안녕하세요. 업무 관련 질문이 있으면 입력해 주세요. (예: 의심거래 보고 절차)"
        return "안녕하세요. 어떤 도움이 필요하신가요? (예: 이체 한도 변경 방법)"
    return None


def _doc_metadata_json(category: str | None, question: str | None) -> str:
    import json as _json
    return _json.dumps({"category": category or "", "question": question or ""}, ensure_ascii=False)


async def chat_send(
    customer_no: int,
    message: str,
    session_id: int | None,
    tokens: TokenService,
    audience: str = "USER",
) -> dict:
    """audience='USER' (고객 페이지) 또는 'ADMIN' (관리자 콘솔).

    audience='USER' → AUDIENCE_CD IN ('USER','BOTH') 검색 + 고객 톤 system prompt
    audience='ADMIN' → AUDIENCE_CD IN ('USER','ADMIN','BOTH') 전부 + 직원 SOP 톤 system prompt
    customer_no 는 ADMIN 호출의 경우 employee_no 매핑이라 의미가 다르지만, 동일 컬럼 재활용.
    """
    # FastAPI 자동 span 이 root 역할. 여기선 retrieve / generate 두 sub span 으로 분리해
    # Phoenix 의 RAG 트리 (RETRIEVER → LLM) 를 그린다. OpenInference 컨벤션 따름.
    pool = get_pool()

    # 세션 확보 — 기존 세션 본인 확인 또는 신규 INSERT
    async with pool.acquire() as conn:
        if session_id is not None:
            owner = await conn.fetchval(
                'SELECT "CUSTOMER_NO" FROM public."AI_CHATBOT_SESSION" '
                'WHERE "SESSION_ID" = $1 '
                "  AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N')",
                session_id,
            )
            if owner is None or int(owner) != int(customer_no):
                session_id = None
        if session_id is None:
            session_id = await conn.fetchval(
                'INSERT INTO public."AI_CHATBOT_SESSION" '
                '  ("CUSTOMER_NO", "STATUS_CD", "CREATED_BY", "DELETE_YN") '
                "VALUES ($1, 'ACTIVE', $2, 'N') "
                'RETURNING "SESSION_ID"',
                customer_no,
                f"CUSTOMER:{customer_no}",
            )
        # USER 메시지 INSERT (응답 메타 채우기 위해 row 받아옴)
        user_row = await conn.fetchrow(
            'INSERT INTO public."AI_CHATBOT_MESSAGE" '
            '  ("SESSION_ID", "ROLE_CD", "CONTENT", "CREATED_BY", "DELETE_YN") '
            "VALUES ($1, 'USER', $2, $3, 'N') "
            'RETURNING "MESSAGE_ID", "CREATED_AT"',
            session_id,
            message,
            f"CUSTOMER:{customer_no}",
        )
    user_msg = {
        "message_id": int(user_row["MESSAGE_ID"]),
        "role_cd": "USER",
        "content": message,
        "rag_tier_cd": None,
        "sources": [],
        "confidence": None,
        "created_at": user_row["CREATED_AT"],
    }

    # LLM_CALL_ID 는 VECTOR tier 에서 LLM 호출 후 동기 INSERT 로 채워짐 (없으면 None).
    llm_call_id: int | None = None

    # 짧은 잡담·욕설·매칭 부적합 가드 — RAG 거치지 않고 즉시 응답.
    short_reply = _early_reply(message, audience)
    if short_reply is not None:
        async with pool.acquire() as conn:
            asst_row = await conn.fetchrow(
                'INSERT INTO public."AI_CHATBOT_MESSAGE" '
                '  ("SESSION_ID", "ROLE_CD", "CONTENT", "RAG_TIER_CD", '
                '   "RAG_SOURCE_IDS", "LLM_CALL_ID", "CREATED_BY", "DELETE_YN") '
                "VALUES ($1, 'ASSISTANT', $2, NULL, NULL, NULL, $3, 'N') "
                'RETURNING "MESSAGE_ID", "CREATED_AT"',
                session_id, short_reply, f"CUSTOMER:{customer_no}",
            )
        assistant_msg = {
            "message_id": int(asst_row["MESSAGE_ID"]),
            "role_cd": "ASSISTANT",
            "content": short_reply,
            "rag_tier_cd": None,
            "sources": [],
            "confidence": "HIGH",
            "follow_up_questions": [],
            "created_at": asst_row["CREATED_AT"],
        }
        return {"session_id": session_id, "user_message": user_msg, "assistant_message": assistant_msg}

    # 임베딩 + 벡터 검색 — Retriever span
    with _tracer.start_as_current_span("chatbot.rag.retrieve") as retr:
        retr.set_attribute("openinference.span.kind", "RETRIEVER")
        retr.set_attribute("input.value", message[:2000])
        retr.set_attribute("embedding.model_name", "jhgan/ko-sroberta-multitask")
        retr.set_attribute("retrieval.top_k", 5)
        retr.set_attribute("session.id", session_id)
        retr.set_attribute("user.id", customer_no)
        query_vec = _embed_query(message)
        # audience 분기 — USER 는 USER+BOTH, ADMIN 은 USER+ADMIN+BOTH 모두 검색
        # ADMIN 호출 시 SYNTH_SOP 청크에 distance 가산점(-0.15) 부여 — 합성 SOP 가
        # AI Hub 학술 청크보다 우선 검색되도록 (시연 톤 자연스러움).
        audience_filter = ['USER', 'BOTH'] if audience != 'ADMIN' else ['USER', 'ADMIN', 'BOTH']
        retr.set_attribute("rbac.audience", audience)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                'SELECT "FAQ_ID", "CATEGORY", "QUESTION", "ANSWER", "AUDIENCE_CD", "SOURCE_TAG", '
                '       ("EMBEDDING" <=> $1::vector) - '
                '       (CASE WHEN "SOURCE_TAG" = \'SYNTH_SOP\' THEN 0.15 ELSE 0.0 END) '
                '       AS distance '
                'FROM public."AI_FAQ" '
                'WHERE "STATUS_CD" = \'ACTIVE\' '
                '  AND ("DELETE_YN" IS NULL OR "DELETE_YN" = \'N\') '
                '  AND "AUDIENCE_CD" = ANY($2::text[]) '
                'ORDER BY distance LIMIT 5',
                query_vec,
                audience_filter,
            )
        for i, r in enumerate(rows):
            retr.set_attribute(f"retrieval.documents.{i}.document.id", str(r["FAQ_ID"]))
            retr.set_attribute(
                f"retrieval.documents.{i}.document.content",
                (r["ANSWER"] or "")[:600],
            )
            retr.set_attribute(
                f"retrieval.documents.{i}.document.score",
                float(1.0 - float(r["distance"])),
            )
            retr.set_attribute(
                f"retrieval.documents.{i}.document.metadata",
                _doc_metadata_json(r["CATEGORY"], r["QUESTION"]),
            )

    faq_hits = [r for r in rows if r["CATEGORY"] != "TERMS"]
    terms_hits = [r for r in rows if r["CATEGORY"] == "TERMS"]
    top_faq = faq_hits[0] if faq_hits else None
    top_terms = terms_hits[0] if terms_hits else None
    top_faq_d = float(top_faq["distance"]) if top_faq else 999.0
    top_terms_d = float(top_terms["distance"]) if top_terms else 999.0

    # 매칭 부적합 가드 — 모든 청크 distance > 0.70 면 RAG 자료가 질문과 무관.
    # LLM 합성 시도 대신 짧고 정직한 거절. 단계 절차 강제 X.
    top_dist_overall = float(rows[0]["distance"]) if rows else 999.0
    if top_dist_overall > 0.70:
        deny = (
            "관련 내부 자료를 찾지 못했어요. 질문을 더 구체적으로 입력하시거나, 관련 부서 "
            "또는 시스템 화면(예: 회원 검색·상품 카탈로그·감사 로그)에서 직접 확인해 주세요."
            if audience == "ADMIN"
            else "관련 약관·안내 자료를 찾지 못했어요. 질문을 더 구체적으로 입력하시거나, 상담원 연결을 이용해 주세요."
        )
        async with pool.acquire() as conn:
            asst_row = await conn.fetchrow(
                'INSERT INTO public."AI_CHATBOT_MESSAGE" '
                '  ("SESSION_ID", "ROLE_CD", "CONTENT", "RAG_TIER_CD", '
                '   "RAG_SOURCE_IDS", "LLM_CALL_ID", "CREATED_BY", "DELETE_YN") '
                "VALUES ($1, 'ASSISTANT', $2, NULL, NULL, NULL, $3, 'N') "
                'RETURNING "MESSAGE_ID", "CREATED_AT"',
                session_id, deny, f"CUSTOMER:{customer_no}",
            )
        assistant_msg = {
            "message_id": int(asst_row["MESSAGE_ID"]),
            "role_cd": "ASSISTANT",
            "content": deny,
            "rag_tier_cd": None,
            "sources": [],
            "confidence": "LOW",
            "follow_up_questions": [],
            "created_at": asst_row["CREATED_AT"],
        }
        return {"session_id": session_id, "user_message": user_msg, "assistant_message": assistant_msg}

    def _to_score(d: float) -> float:
        # 정규화 임베딩 — 코사인 거리 [0, 2], 실제 사용 범위 대략 [0, 1].
        return max(0.0, 1.0 - float(d))

    tier: str | None
    sources: list[dict] = []
    matched_category: str | None = None
    matched_faq_id: int | None = None
    # ADMIN audience 호출 시 — FAQ/KEYWORD tier 짧은 응답 대신 항상 LLM 합성으로 통과.
    # 이유: 합성 SOP 본문이 markdown 표 형태라 KEYWORD tier 가 본문 그대로 반환하면
    # 직원이 받는 답변이 보고서체로 깨짐. LLM 이 단계별 SOP 톤으로 압축·재구성.
    # 부적합 매칭(distance 큰 데도 가산점으로 1위) 인 경우도 LLM 이 "내부 규정에서
    # 확인되지 않습니다" 로 정중 거절 가능.
    force_llm = audience == "ADMIN"
    if not force_llm and top_faq is not None and top_faq_d <= 0.50:
        tier = "KEYWORD" if top_faq_d <= 0.30 else "FAQ"
        matched_category = top_faq["CATEGORY"]
        matched_faq_id = int(top_faq["FAQ_ID"])
        answer = top_faq["ANSWER"] or ""
        sources.append({
            "doc_token": await tokens.issue(
                ResourceType.DOC, f"AI_FAQ:{top_faq['FAQ_ID']}", customer_no
            ),
            "doc_type": "FAQ",
            "doc_id": int(top_faq["FAQ_ID"]),
            "title": top_faq["QUESTION"],
            "clause": None,
            "snippet": (top_faq["ANSWER"] or "")[:120],
            "score": round(_to_score(top_faq_d), 3),
        })
        confidence = "HIGH" if top_faq_d <= 0.30 else "MEDIUM"
    elif (top_terms is not None and top_terms_d <= 0.70) or (force_llm and rows):
        tier = "VECTOR"
        top_term_rows = []
        # ADMIN: faq_hits (SYNTH_SOP+AIHUB) 우선, USER 도메인 매칭 fallback
        # USER: terms_hits 만 (기존 동작)
        candidate_rows = (faq_hits[:3] + terms_hits[:2]) if force_llm else terms_hits[:3]
        for r in candidate_rows[:3]:
            if not force_llm and float(r["distance"]) > 0.85:
                break
            top_term_rows.append(r)
            title, _, clause = (r["QUESTION"] or "").partition(" · ")
            sources.append({
                "doc_token": await tokens.issue(
                    ResourceType.DOC, f"AI_FAQ:{r['FAQ_ID']}", customer_no
                ),
                "doc_type": (r.get("CATEGORY") or "TERMS"),
                "doc_id": int(r["FAQ_ID"]),
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
            if audience == "ADMIN":
                # 최상위 매칭 distance 평가 — 0.55 이상이면 자료가 부족하다는 신호 추가
                top_dist = float(top_term_rows[0]["distance"]) if top_term_rows else 1.0
                low_relevance_warn = (
                    "\n\n[중요] 발췌 자료의 최상위 유사도가 낮습니다. 질문과 직접 관련 없으면 "
                    "단계 절차로 답변 강제하지 말고 '내부 SOP 자료에서 직접 확인되지 않습니다. "
                    "관련 부서·시스템(예: PRODUCT 카탈로그·여신부)에 문의하세요'라고 정직히 답변하세요."
                ) if top_dist > 0.55 else ""
                system_prompt = (
                    "당신은 다온뱅크 **직원 업무 어시스턴트**입니다. 아래 내부 SOP·규정 발췌만을 "
                    "근거로 한국어 답변을 작성하세요.\n\n"
                    "[작성 규칙]\n"
                    "- 질문 유형에 맞춰 답변하세요:\n"
                    "  * 절차·SOP 질문 → 단계별(1·2·3) 답변\n"
                    "  * 정보 조회·정의 질문 → 평문으로 간결히 (단계 강제 X)\n"
                    "  * 정책·기준 질문 → 요약 + 근거 조항\n"
                    "- 발췌 본문을 그대로 길게 옮기지 마세요. 핵심만 직원 톤으로 재구성.\n"
                    "- 분량 6문장 이내. 법령·약관 인용은 조항만 짧게(예: '특정금융정보법 §4').\n"
                    "- 발췌가 학술 보고서·논문이면 결론만 요약하고 보고서체는 피하세요.\n"
                    "- **발췌에 없는 사실은 절대 추측·창작 금지** — 내부 자료에서 확인되지 않으면 "
                    "'내부 SOP에서 확인되지 않습니다. 관련 부서·시스템에 문의 권유드립니다'."
                    + low_relevance_warn
                )
            else:
                system_prompt = (
                    "당신은 다온뱅크 고객 상담 챗봇입니다. 아래 약관/규정 발췌만을 근거로 "
                    "사용자 질문에 한국어로 간결하게(3문장 이내) 답변하세요. "
                    "발췌에 없는 내용은 추측하지 말고 '약관에서 확인되지 않습니다'라고 답하세요."
                )
            user_prompt = f"질문: {message}\n\n참고 약관:\n{context}"
            llm_answer = await _llm_chat_completion(
                system_prompt, user_prompt, max_tokens=400
            )
            # LLM 호출이 성공했으면 (a) AI_LLM_CALL_LOG 동기 INSERT 후 LLM_CALL_ID 수령,
            # (b) Kafka 발행 (Phoenix trace 용도), (c) RAG 품질 평가 비동기 fire-and-forget.
            # 동기 INSERT 패턴이라 LLM_CALL_ID 를 ASSISTANT 메시지 INSERT 시 그대로 채움.
            if llm_answer:
                import uuid

                from .llm import get_last_usage
                from . import kafka as kafka_svc

                usage_meta = get_last_usage()
                if usage_meta:
                    llm_trace_id = uuid.uuid4().hex
                    try:
                        async with pool.acquire() as conn:
                            llm_call_id = int(await conn.fetchval(
                                'INSERT INTO public."AI_LLM_CALL_LOG" ('
                                '  "TRACE_ID", "MODEL_NAME", "PURPOSE_CD", '
                                '  "PROMPT_TOKENS", "COMPLETION_TOKENS", '
                                '  "STATUS_CD", "CREATED_BY", "DELETE_YN"'
                                ") VALUES ($1, $2, 'CHATBOT_RAG', $3, $4, 'OK', $5, 'N') "
                                'RETURNING "LLM_CALL_ID"',
                                llm_trace_id,
                                usage_meta["model_name"],
                                usage_meta["prompt_tokens"],
                                usage_meta["completion_tokens"],
                                f"CUSTOMER:{customer_no}",
                            ))
                    except Exception:
                        log.exception("llm_call_log_insert_failed", trace_id=llm_trace_id)
                    await kafka_svc.send_event(
                        kafka_svc.TOPIC_CHATBOT_LLM_CALLS,
                        {
                            "trace_id": llm_trace_id,
                            "model_name": usage_meta["model_name"],
                            "purpose_cd": "CHATBOT_RAG",
                            "prompt_tokens": usage_meta["prompt_tokens"],
                            "completion_tokens": usage_meta["completion_tokens"],
                            "status_cd": "OK",
                        },
                        key=llm_trace_id,
                    )
                    # RAG 응답 품질 추적 — 평가는 LLM 4번 호출이라 4~8초 걸려 사용자 응답을 막지 않도록
                    # asyncio.create_task 로 백그라운드 fire-and-forget. 평가 끝나면 같은 trace_id 로 발행.
                    asyncio.create_task(
                        _evaluate_and_publish(
                            trace_id=llm_trace_id,
                            question=message,
                            retrieved_docs=sources,
                            answer=llm_answer,
                        )
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

    async with pool.acquire() as conn:
        asst_row = await conn.fetchrow(
            'INSERT INTO public."AI_CHATBOT_MESSAGE" '
            '  ("SESSION_ID", "ROLE_CD", "CONTENT", "RAG_TIER_CD", '
            '   "RAG_SOURCE_IDS", "LLM_CALL_ID", "CREATED_BY", "DELETE_YN") '
            "VALUES ($1, 'ASSISTANT', $2, $3, $4::jsonb, $5, $6, 'N') "
            'RETURNING "MESSAGE_ID", "CREATED_AT"',
            session_id,
            answer,
            tier,
            _sources_for_db(sources),
            llm_call_id,
            f"CUSTOMER:{customer_no}",
        )
    assistant_msg = {
        "message_id": int(asst_row["MESSAGE_ID"]),
        "role_cd": "ASSISTANT",
        "content": answer,
        "rag_tier_cd": tier,
        "sources": sources,
        "confidence": confidence,
        "follow_up_questions": follow_ups,
        "created_at": asst_row["CREATED_AT"],
    }

    return {
        "session_id": session_id,
        "user_message": user_msg,
        "assistant_message": assistant_msg,
    }


# ---------------------------------------------------------------------------
# FAQ 목록 / 약관 검색 / 출처 조회 / 피드백
# ---------------------------------------------------------------------------

async def list_sessions(customer_no: int, *, q: str | None = None) -> list[dict]:
    """본인의 챗봇 세션 목록 — SCR-CB-004 history 화면용.

    AI_CHATBOT_SESSION + 마지막 ASSISTANT/첫 USER 메시지 LATERAL 조인 +
    메시지 개수 집계 + q 부분일치 필터.
    """
    pool = get_pool()
    args: list = [customer_no]
    where_extra = ""
    if q:
        needle = q.strip()
        if needle:
            args.append(f"%{needle}%")
            i = len(args)
            where_extra = (
                f" AND EXISTS (SELECT 1 FROM public.\"AI_CHATBOT_MESSAGE\" mm "
                f' WHERE mm."SESSION_ID" = s."SESSION_ID" '
                f"   AND (mm.\"DELETE_YN\" IS NULL OR mm.\"DELETE_YN\" = 'N') "
                f' AND mm."CONTENT" ILIKE ${i})'
            )
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT s."SESSION_ID", s."STARTED_AT", s."ENDED_AT", '
            '       s."STATUS_CD", '
            '       last_a."CONTENT" AS last_content, '
            '       first_u."CONTENT" AS first_user_content, '
            '       COALESCE(cnt."n", 0) AS message_count '
            'FROM public."AI_CHATBOT_SESSION" s '
            'LEFT JOIN LATERAL ('
            '  SELECT "CONTENT" FROM public."AI_CHATBOT_MESSAGE" '
            '  WHERE "SESSION_ID" = s."SESSION_ID" '
            "    AND \"ROLE_CD\" = 'ASSISTANT' "
            "    AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N') "
            '  ORDER BY "CREATED_AT" DESC, "MESSAGE_ID" DESC LIMIT 1'
            ') last_a ON TRUE '
            'LEFT JOIN LATERAL ('
            '  SELECT "CONTENT" FROM public."AI_CHATBOT_MESSAGE" '
            '  WHERE "SESSION_ID" = s."SESSION_ID" '
            "    AND \"ROLE_CD\" = 'USER' "
            "    AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N') "
            '  ORDER BY "CREATED_AT" ASC, "MESSAGE_ID" ASC LIMIT 1'
            ') first_u ON TRUE '
            'LEFT JOIN LATERAL ('
            '  SELECT count(*) AS n FROM public."AI_CHATBOT_MESSAGE" '
            '  WHERE "SESSION_ID" = s."SESSION_ID" '
            "    AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N')"
            ') cnt ON TRUE '
            'WHERE s."CUSTOMER_NO" = $1 '
            "  AND (s.\"DELETE_YN\" IS NULL OR s.\"DELETE_YN\" = 'N') "
            f"{where_extra} "
            'ORDER BY s."STARTED_AT" DESC, s."SESSION_ID" DESC',
            *args,
        )
    out = []
    for r in rows:
        last = r["last_content"]
        first_u = r["first_user_content"]
        out.append({
            "session_id": int(r["SESSION_ID"]),
            "started_at": r["STARTED_AT"],
            "ended_at": r["ENDED_AT"],
            "status_cd": r["STATUS_CD"] or "ACTIVE",
            "last_message_snippet": (last[:120] if last else None),
            "first_user_snippet": (first_u[:120] if first_u else None),
            "message_count": int(r["message_count"] or 0),
        })
    return out


async def get_session(
    customer_no: int, session_id: int, tokens: TokenService
) -> dict:
    """세션 상세 — 본인 검증 후 messages 전체 반환. sources doc_token 재발급."""
    pool = get_pool()
    async with pool.acquire() as conn:
        owner = await conn.fetchval(
            'SELECT "CUSTOMER_NO" FROM public."AI_CHATBOT_SESSION" '
            'WHERE "SESSION_ID" = $1 '
            "  AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N')",
            session_id,
        )
        if owner is None or int(owner) != int(customer_no):
            raise NotFoundError(E_NOT_FOUND, "세션을 찾을 수 없습니다.")
        rows = await conn.fetch(
            'SELECT "MESSAGE_ID", "ROLE_CD", "CONTENT", "RAG_TIER_CD", '
            '       "RAG_SOURCE_IDS", "CREATED_AT" '
            'FROM public."AI_CHATBOT_MESSAGE" '
            'WHERE "SESSION_ID" = $1 '
            "  AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N') "
            'ORDER BY "CREATED_AT", "MESSAGE_ID"',
            session_id,
        )
    messages = []
    for r in rows:
        raw_src = r["RAG_SOURCE_IDS"]
        if isinstance(raw_src, str):
            try:
                raw_src = json.loads(raw_src)
            except Exception:
                raw_src = []
        sources: list[dict] = []
        for s in raw_src or []:
            doc_id = s.get("doc_id")
            if doc_id is None:
                continue
            sources.append({
                "doc_token": await tokens.issue(
                    ResourceType.DOC, f"AI_FAQ:{doc_id}", customer_no
                ),
                "doc_type": s.get("doc_type") or "FAQ",
                "title": s.get("title") or "",
                "clause": s.get("clause"),
                "snippet": s.get("snippet") or "",
                "score": s.get("score"),
            })
        messages.append({
            "message_id": int(r["MESSAGE_ID"]),
            "role_cd": r["ROLE_CD"],
            "content": r["CONTENT"] or "",
            "rag_tier_cd": r["RAG_TIER_CD"],
            "sources": sources,
            "confidence": None,
            "follow_up_questions": [],
            "created_at": r["CREATED_AT"],
        })
    return {
        "session_id": int(session_id),
        "messages": messages,
    }


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


async def _evaluate_and_publish(
    *,
    trace_id: str,
    question: str,
    retrieved_docs: list[dict],
    answer: str,
) -> None:
    """RAG 응답 품질 평가 → Kafka 발행 (백그라운드 fire-and-forget).

    LLM-as-judge 3번 호출이라 3~6초 소요 — 사용자 응답 흐름과 분리.
    실패해도 메인 흐름 영향 없음.
    """
    try:
        from .rag_evaluator import evaluate_rag
        from . import kafka as kafka_svc

        scores = await evaluate_rag(
            question=question, retrieved_docs=retrieved_docs, answer=answer
        )
        await kafka_svc.send_event(
            kafka_svc.TOPIC_CHATBOT_RAG_EVALS,
            {
                "trace_id": trace_id,
                "question": question,
                "retrieved_docs": retrieved_docs,
                "answer": answer,
                "faithfulness": scores.get("faithfulness"),
                "answer_relevancy": scores.get("answer_relevancy"),
                "context_precision": scores.get("context_precision"),
                "context_recall": scores.get("context_recall"),
            },
            key=trace_id,
        )
    except Exception:
        log.exception("rag_eval_publish_failed", trace_id=trace_id)
