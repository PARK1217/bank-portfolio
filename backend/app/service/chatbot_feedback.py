"""챗봇 피드백 영구화 — AI_CHATBOT_FEEDBACK(v53) INSERT.

별도 모듈로 분리 — `service/chatbot.py` 가 풀스택 RAG 갱신 영역과 빈번히 충돌하므로
피드백 저장 로직은 여기서 단독 관리.
"""

from __future__ import annotations

import structlog

from ..db import get_pool

log = structlog.get_logger("chatbot_feedback")


async def submit_feedback_db(
    customer_no: int, message_id: int, rating: int, comment: str | None
) -> None:
    """AI_CHATBOT_FEEDBACK 에 1행 INSERT. 실패는 로그만 남기고 silent."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                'INSERT INTO public."AI_CHATBOT_FEEDBACK" ('
                '  "MESSAGE_ID", "CUSTOMER_NO", "RATING", "COMMENT", "DELETE_YN"'
                ") VALUES ($1, $2, $3, $4, 'N')",
                message_id,
                customer_no,
                rating,
                comment,
            )
        log.info("feedback_saved", message_id=message_id, rating=rating)
    except Exception:
        log.exception("feedback_db_insert_failed", message_id=message_id)