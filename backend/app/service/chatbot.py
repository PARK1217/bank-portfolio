"""챗봇 3-tier RAG 백엔드 — CB-001/002/003/005/007.

설계: LLM 호출 없이 키워드 기반 score 매칭으로 가이드 §3.7 환각 방지 패턴 그대로.
- Tier 1 (KEYWORD): FAQ 질문 거의 일치 (score >= 0.9)
- Tier 2 (FAQ): FAQ 의미 매칭 (0.7 ~ 0.9)
- Tier 3 (VECTOR): 약관 본문 매칭 (>= 0.4)
- 그 외: "관련 정보를 찾지 못했습니다." (confidence=LOW)

코퍼스: `data/seed-faq.md`, `data/seed-terms/*.md` 앱 시작 시 in-memory 로드.
세션/메시지: in-memory dict — 운영은 AI_CHATBOT_SESSION/MESSAGE 테이블(v53)로 교체.
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import TypedDict

from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from .token import ResourceType, TokenService


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

    q = _tokenize(message)

    faq_ranked = sorted(
        ((_score(q, f["question"]), f) for f in _FAQ_CORPUS),
        key=lambda x: x[0],
        reverse=True,
    )
    terms_ranked = sorted(
        ((_score(q, c["clause"] + " " + c["body"][:500]), c) for c in _TERMS_CORPUS),
        key=lambda x: x[0],
        reverse=True,
    )

    top_faq = faq_ranked[0] if faq_ranked else (0.0, None)
    top_terms = terms_ranked[0] if terms_ranked else (0.0, None)

    tier: str | None
    sources: list[dict] = []
    if top_faq[0] >= 0.7 and top_faq[1] is not None:
        tier = "KEYWORD" if top_faq[0] >= 0.9 else "FAQ"
        f = top_faq[1]
        answer = f["answer"]
        sources.append({
            "doc_token": await tokens.issue(
                ResourceType.DOC, f"FAQ:{f['faq_id']}", customer_no
            ),
            "doc_type": "FAQ",
            "title": f["question"],
            "clause": None,
            "snippet": f["answer"][:120],
            "score": round(top_faq[0], 3),
        })
        confidence = "HIGH" if top_faq[0] >= 0.9 else "MEDIUM"
    elif top_terms[0] >= 0.4 and top_terms[1] is not None:
        tier = "VECTOR"
        c = top_terms[1]
        answer = f"관련 약관 [{c['title']} · {c['clause']}] 을 확인하세요."
        for s, cc in terms_ranked[:3]:
            if s < 0.2 or cc is None:
                break
            sources.append({
                "doc_token": await tokens.issue(
                    ResourceType.DOC,
                    f"TERMS:{cc['terms_id']}:{cc['clause']}",
                    customer_no,
                ),
                "doc_type": "TERMS",
                "title": cc["title"],
                "clause": cc["clause"],
                "snippet": cc["body"][:120],
                "score": round(s, 3),
            })
        confidence = "MEDIUM" if top_terms[0] >= 0.5 else "LOW"
    else:
        tier = None
        answer = "관련 정보를 찾지 못했습니다. 상담원 연결을 도와드릴까요?"
        confidence = "LOW"

    assistant_msg = {
        "message_id": _NEXT_MESSAGE_ID[0],
        "role_cd": "ASSISTANT",
        "content": answer,
        "rag_tier_cd": tier,
        "sources": sources,
        "confidence": confidence,
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
