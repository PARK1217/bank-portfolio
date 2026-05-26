"""챗봇 3-tier RAG 스키마 — SCR-CB-001 ~ 007 (Signature 중심)."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


# ----------------------------------------------------------------------
# SCR-CB-001 메인 / 대화창
# ----------------------------------------------------------------------

class ChatSourceRef(BaseModel):
    doc_token: str = Field(..., description="약관/FAQ docToken")
    doc_type: str = Field(..., description="TERMS / FAQ")
    title: str
    clause: str | None = None
    snippet: str
    score: float | None = None


class ChatMessageItem(BaseModel):
    message_id: int
    role_cd: str = Field(..., description="USER / ASSISTANT")
    content: str
    rag_tier_cd: str | None = Field(
        None, description="KEYWORD / FAQ / VECTOR (ASSISTANT 메시지에만)"
    )
    sources: list[ChatSourceRef] = Field(default_factory=list)
    confidence: str | None = Field(None, description="HIGH/MEDIUM/LOW")
    follow_up_questions: list[str] = Field(
        default_factory=list,
        description="ASSISTANT 메시지 아래 표시할 연계 질문 후보 (k=3)",
    )
    created_at: datetime


class ChatSendRequest(BaseModel):
    session_id: int | None = Field(None, description="None = 신규 세션 시작")
    message: str = Field(..., min_length=1, max_length=2000)


class ChatSendResponse(BaseModel):
    session_id: int
    user_message: ChatMessageItem
    assistant_message: ChatMessageItem


# ----------------------------------------------------------------------
# SCR-CB-002 카테고리별 FAQ
# ----------------------------------------------------------------------

class FaqItem(BaseModel):
    faq_id: int
    category: str
    question: str
    answer_snippet: str
    hit_count: int


class FaqListResponse(BaseModel):
    category: str | None = None
    items: list[FaqItem]


# ----------------------------------------------------------------------
# SCR-CB-003 약관 검색 (벡터)
# ----------------------------------------------------------------------

class TermsSearchItem(BaseModel):
    doc_token: str
    terms_id: int
    title: str
    clause: str | None = None
    snippet: str
    score: float


class TermsSearchResponse(BaseModel):
    query: str
    items: list[TermsSearchItem]


# ----------------------------------------------------------------------
# SCR-CB-004 대화 이력
# ----------------------------------------------------------------------

class ChatSessionItem(BaseModel):
    session_id: int
    started_at: datetime
    ended_at: datetime | None = None
    status_cd: str
    last_message_snippet: str | None = None


class ChatHistoryResponse(BaseModel):
    sessions: list[ChatSessionItem]


# ----------------------------------------------------------------------
# SCR-CB-005 답변 출처 (약관 원문)
# ----------------------------------------------------------------------

class ChatSourceClause(BaseModel):
    clause: str
    body: str


class ChatSourceResponse(BaseModel):
    doc_token: str
    terms_id: int
    title: str
    version: int
    effective_date: str
    clauses: list[ChatSourceClause]


# ----------------------------------------------------------------------
# SCR-CB-006 상담원 연결 (Later)
# ----------------------------------------------------------------------

class ChatHandoffRequest(BaseModel):
    session_id: int
    category: str
    content: str
    attach_recent_n: int = Field(20, ge=1, le=200, description="첨부할 최근 메시지 개수")


class ChatHandoffResponse(BaseModel):
    complaint_token: str


# ----------------------------------------------------------------------
# SCR-CB-007 피드백 (Signature — Phoenix 평가 연계)
# ----------------------------------------------------------------------

class ChatFeedbackRequest(BaseModel):
    message_id: int
    rating: int = Field(..., description="1=👎 / 5=👍")
    comment: str | None = Field(None, max_length=1000)
    issue_category: str | None = Field(
        None,
        max_length=40,
        description="👎 카테고리 — RETRIEVAL_MISS / ANSWER_INCORRECT / KNOWLEDGE_GAP / LENGTH / OTHER",
    )


# ----------------------------------------------------------------------
# 추천 질문 (EmptyState 개인화)
# ----------------------------------------------------------------------

class ChatSuggestionItem(BaseModel):
    faq_id: int
    category: str
    question: str


class ChatSuggestionsResponse(BaseModel):
    items: list[ChatSuggestionItem]