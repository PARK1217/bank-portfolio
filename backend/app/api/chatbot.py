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
    get_source,
    list_faq,
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


@router.get("/suggestions", response_model=ChatSuggestionsResponse)
async def get_suggestions(
    user: CurrentCustomer = Depends(current_customer),
    limit: int = Query(4, ge=1, le=8),
) -> ChatSuggestionsResponse:
    """EmptyState 개인화 추천 — 보유 패턴(예금/적금/대출/자동이체) 시그널 기반."""
    items = await list_personalized_suggestions(user.customer_no, limit=limit)
    return ChatSuggestionsResponse(items=[ChatSuggestionItem(**i) for i in items])