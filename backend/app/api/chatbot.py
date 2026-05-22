"""챗봇 라우터 — CB-001~007 (LLM 없이 키워드 기반 3-tier 시뮬).

엔드포인트:
  /chatbot/messages           POST  — 메시지 전송 + 답변 (CB-001)
  /chatbot/faq                GET   — FAQ 목록 (CB-002)
  /chatbot/terms/search       GET   — 약관 검색 (CB-003)
  /chatbot/sources/{doc_token} GET  — 출처 조회 (CB-005)
  /chatbot/feedback           POST  — 응답 피드백 (CB-007)
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query

from ..schema.chatbot import (
    ChatFeedbackRequest,
    ChatMessageItem,
    ChatSendRequest,
    ChatSendResponse,
    ChatSourceClause,
    ChatSourceRef,
    ChatSourceResponse,
    ChatSuggestionItem,
    ChatSuggestionsResponse,
    FaqItem,
    FaqListResponse,
    TermsSearchItem,
    TermsSearchResponse,
)
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.chatbot import (
    chat_send,
    get_session,
    get_source,
    list_faq,
    list_sessions,
    search_terms,
)
from ..service.chatbot_feedback import submit_feedback_db
from ..service.chatbot_suggestions import list_personalized_suggestions
from ..service.token import TokenService

router = APIRouter(prefix="/chatbot", tags=["chatbot"])
log = structlog.get_logger("chatbot")


def _to_msg(m: dict) -> ChatMessageItem:
    return ChatMessageItem(
        message_id=m["message_id"],
        role_cd=m["role_cd"],
        content=m["content"],
        rag_tier_cd=m["rag_tier_cd"],
        sources=[ChatSourceRef(**s) for s in m["sources"]],
        confidence=m["confidence"],
        follow_up_questions=m.get("follow_up_questions") or [],
        created_at=m["created_at"],
    )


@router.post("/messages", response_model=ChatSendResponse)
async def send_message(
    req: ChatSendRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> ChatSendResponse:
    result = await chat_send(user.customer_no, req.message, req.session_id, tokens)
    log.info(
        "chat_message",
        session_id=result["session_id"],
        tier=result["assistant_message"]["rag_tier_cd"],
        confidence=result["assistant_message"]["confidence"],
    )
    return ChatSendResponse(
        session_id=result["session_id"],
        user_message=_to_msg(result["user_message"]),
        assistant_message=_to_msg(result["assistant_message"]),
    )


@router.get("/faq", response_model=FaqListResponse)
async def get_faq(
    category: str | None = Query(None),
    user: CurrentCustomer = Depends(current_customer),
) -> FaqListResponse:
    items = list_faq(category)
    return FaqListResponse(
        category=category,
        items=[FaqItem(**i) for i in items],
    )


@router.get("/terms/search", response_model=TermsSearchResponse)
async def get_terms_search(
    q: str = Query(..., min_length=1),
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TermsSearchResponse:
    items = await search_terms(q, tokens, user.customer_no)
    return TermsSearchResponse(
        query=q,
        items=[TermsSearchItem(**i) for i in items],
    )


@router.get("/sources/{doc_token}", response_model=ChatSourceResponse)
async def get_chat_source(
    doc_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> ChatSourceResponse:
    src = await get_source(doc_token, tokens, user.customer_no)
    return ChatSourceResponse(
        doc_token=src["doc_token"],
        terms_id=src["terms_id"],
        title=src["title"],
        version=src["version"],
        effective_date=src["effective_date"],
        clauses=[ChatSourceClause(**c) for c in src["clauses"]],
    )


@router.post("/feedback")
async def post_feedback(
    req: ChatFeedbackRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    await submit_feedback_db(user.customer_no, req.message_id, req.rating, req.comment)
    return {"received": True}


# ---------------------------------------------------------------------------
# 세션 목록·상세 (SCR-CB-004 history + chat 페이지의 기존 세션 히스토리 로드)
# ---------------------------------------------------------------------------

@router.get("/sessions")
async def get_sessions_list(
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    items = list_sessions(user.customer_no)
    return {"sessions": items}


@router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: int,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    return get_session(user.customer_no, session_id)


# ---------------------------------------------------------------------------
# 프론트 path 별칭 — 화면이 호출하는 path 와 백엔드 path 가 어긋난 케이스 정합
# ---------------------------------------------------------------------------

@router.get("/terms-search", response_model=TermsSearchResponse)
async def get_terms_search_alias(
    query: str = Query(..., min_length=1),
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TermsSearchResponse:
    """frontend `chatbot/terms-search/page.tsx` 가 `?query=` 로 호출하는 경로."""
    items = await search_terms(query, tokens, user.customer_no)
    return TermsSearchResponse(
        query=query,
        items=[TermsSearchItem(**i) for i in items],
    )


@router.get("/source/{doc_token}", response_model=ChatSourceResponse)
async def get_chat_source_alias(
    doc_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> ChatSourceResponse:
    """frontend `chatbot/source/[docToken]/page.tsx` 가 단수형으로 호출."""
    src = await get_source(doc_token, tokens, user.customer_no)
    return ChatSourceResponse(
        doc_token=src["doc_token"],
        terms_id=src["terms_id"],
        title=src["title"],
        version=src["version"],
        effective_date=src["effective_date"],
        clauses=[ChatSourceClause(**c) for c in src["clauses"]],
    )


# ---------------------------------------------------------------------------
# 상담원 연결 (SCR-CB-006 handoff) — 시연용 mock
# ---------------------------------------------------------------------------

@router.post("/handoff")
async def post_handoff(
    body: dict,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    """상담원 연결 신청 mock. COMPLAINT 시스템 전체가 미구현이라 token 만 반환.

    실제 흐름이 동작하려면 backend 의 `complaints` 라우터 + COMPLAINT 테이블 시드 필요.
    프론트 `/complaints/{token}` 페이지는 backend 미구현으로 404 떨어짐 (WORKBOARD 인계).
    """
    import uuid
    complaint_token = uuid.uuid4().hex
    log.info(
        "chatbot_handoff_mock",
        customer_no=user.customer_no,
        session_id=body.get("session_id"),
        category=body.get("category"),
        content_len=len(body.get("content") or ""),
        complaint_token=complaint_token,
    )
    return {"complaint_token": complaint_token}


@router.get("/suggestions", response_model=ChatSuggestionsResponse)
async def get_suggestions(
    user: CurrentCustomer = Depends(current_customer),
    limit: int = Query(4, ge=1, le=8),
) -> ChatSuggestionsResponse:
    """EmptyState 개인화 추천 — 보유 패턴(예금/적금/대출/자동이체) 시그널 기반."""
    items = await list_personalized_suggestions(user.customer_no, limit=limit)
    return ChatSuggestionsResponse(items=[ChatSuggestionItem(**i) for i in items])