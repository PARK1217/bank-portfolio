"""Kafka chatbot.llm.calls → AI_LLM_CALL_LOG(v53) INSERT 핸들러.

LLM 호출이 끝나면 `service/llm.py` 가 토큰 사용량을 Kafka 로 발행하고,
이 모듈이 컨슈머로 받아 DB 에 영구화한다 (가이드 §3.7).

발행 실패해도 LLM 응답 흐름은 영향 없음 (graceful degrade — kafka.py 가 no-op).
"""

from __future__ import annotations

import structlog

from ..db import get_pool

log = structlog.get_logger("llm_log")


async def handle_llm_call(event: dict) -> None:
    """chatbot.llm.calls 토픽 메시지 1건 처리.

    챗봇은 `service/chatbot.py:chat_send` 가 동기로 직접 AI_LLM_CALL_LOG INSERT 하고
    LLM_CALL_ID 를 ASSISTANT 메시지에 채운다 (race-free). 이 컨슈머는
    (a) 같은 trace_id 가 이미 적재되어 있으면 skip — 중복 INSERT 방지,
    (b) 다른 도메인(FDS 등)이 Kafka 로만 발행한 경우는 fallback INSERT.
    """
    trace_id = event.get("trace_id")
    if not trace_id:
        log.warning("llm_call_event_missing_trace_id", event=event)
        return
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            existing = await conn.fetchval(
                'SELECT "LLM_CALL_ID" FROM public."AI_LLM_CALL_LOG" '
                'WHERE "TRACE_ID" = $1 LIMIT 1',
                trace_id,
            )
            if existing is not None:
                log.info(
                    "llm_call_log_skip_existing",
                    trace_id=trace_id,
                    llm_call_id=int(existing),
                )
                return
            await conn.execute(
                'INSERT INTO public."AI_LLM_CALL_LOG" ('
                '  "TRACE_ID", "MODEL_NAME", "PURPOSE_CD", '
                '  "PROMPT_TOKENS", "COMPLETION_TOKENS", "LATENCY_MS", '
                '  "STATUS_CD", "ERROR_MESSAGE", "DELETE_YN"'
                ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'N')",
                trace_id,
                event.get("model_name"),
                event.get("purpose_cd"),
                event.get("prompt_tokens"),
                event.get("completion_tokens"),
                event.get("latency_ms"),
                event.get("status_cd") or "OK",
                event.get("error_message"),
            )
        log.info(
            "llm_call_logged",
            trace_id=trace_id,
            model=event.get("model_name"),
            total_tokens=event.get("total_tokens"),
        )
    except Exception:
        log.exception("llm_call_log_insert_failed", trace_id=trace_id)