"""관리자 챗봇 라우터 — 직원 업무 어시스턴트.

설계 — RBAC B 방식 (메모리 admin-chatbot-rbac-design):
- 5001 (관리자 콘솔) 에서만 사용 — ADMIN JWT 필수
- `chat_send(audience='ADMIN')` 호출 → AUDIENCE_CD IN ('USER','ADMIN','BOTH') 검색
- 직원 SOP/규정/법령 톤 system prompt
- `/api/admin/chatbot/*` 라우트 → AdminAuditMiddleware 가 자동 ACTION_CD='CHATBOT_QUERY' 적재
- 세션은 ADMIN 호출에서도 같은 AI_CHATBOT_SESSION 테이블 사용 — customer_no 컬럼에 employee_no 매핑
  (시연용; 운영 시 별도 ADMIN_CHATBOT_SESSION 테이블 분리 권장)
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends

from ..schema.chatbot import (
    ChatMessageItem,
    ChatSendRequest,
    ChatSendResponse,
    ChatSourceRef,
)
from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.auth import get_token_service
from ..service.chatbot import chat_send, get_session, list_sessions
from ..service.token import TokenService

router = APIRouter(prefix="/admin/chatbot", tags=["admin-chatbot"])
log = structlog.get_logger("admin_chatbot")


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


# 직원 → AI_CHATBOT_SESSION.CUSTOMER_NO 매핑 — 시연용 EMPLOYEE_NO 해시
# (운영 시 별도 테이블 분리 권장)
def _employee_session_id(employee_no: str) -> int:
    # ADMIN001 / AUDIT001 등 → 99_xxxxxx (예약 영역, 999000~999999)
    h = 0
    for c in employee_no:
        h = (h * 31 + ord(c)) & 0xFFFF
    return 990000 + (h % 9999)


@router.post("/messages", response_model=ChatSendResponse)
async def send_message(
    req: ChatSendRequest,
    admin: CurrentAdmin = Depends(require_admin),
    tokens: TokenService = Depends(get_token_service),
) -> ChatSendResponse:
    pseudo_customer_no = _employee_session_id(admin.employee_no)
    result = await chat_send(
        customer_no=pseudo_customer_no,
        message=req.message,
        session_id=req.session_id,
        tokens=tokens,
        audience="ADMIN",
    )
    log.info(
        "admin_chat_message",
        employee_no=admin.employee_no,
        session_id=result["session_id"],
        tier=result["assistant_message"]["rag_tier_cd"],
        confidence=result["assistant_message"]["confidence"],
    )
    return ChatSendResponse(
        session_id=result["session_id"],
        user_message=_to_msg(result["user_message"]),
        assistant_message=_to_msg(result["assistant_message"]),
    )


@router.get("/sessions")
async def get_my_sessions(
    admin: CurrentAdmin = Depends(require_admin),
    tokens: TokenService = Depends(get_token_service),
) -> dict:
    pseudo_customer_no = _employee_session_id(admin.employee_no)
    return await list_sessions(pseudo_customer_no, tokens)


@router.get("/sessions/{session_id}")
async def get_my_session_detail(
    session_id: int,
    admin: CurrentAdmin = Depends(require_admin),
    tokens: TokenService = Depends(get_token_service),
) -> dict:
    pseudo_customer_no = _employee_session_id(admin.employee_no)
    return await get_session(pseudo_customer_no, session_id, tokens)
