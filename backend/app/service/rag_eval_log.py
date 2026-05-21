"""Kafka chatbot.rag.evaluations → AI_RAG_EVALUATION(v53) INSERT 핸들러.

RAG 응답 품질 추적 (가이드 §3.7) — Faithfulness / Answer-Relevancy /
Context-Precision / Context-Recall. Phoenix/Ragas 정식 통합 전이라도
값은 누적 적재 → 운영 단계에서 회귀/품질 모니터링에 활용.

이벤트 페이로드 스키마 (발행 측 = service/chatbot.py 의 Tier 3 응답 합성 직후):
{
  "trace_id":        "<service/llm.py 가 발행한 LLM_CALL 의 trace_id>",
  "question":        "...",
  "retrieved_docs":  [{"doc_token":..., "title":..., "score":...}, ...],
  "answer":          "...",
  "faithfulness":    0.92,    # optional
  "answer_relevancy": 0.88,   # optional
  "context_precision": 0.81,  # optional
  "context_recall":  0.74,    # optional
}

FK: AI_RAG_EVALUATION.LLM_CALL_ID → AI_LLM_CALL_LOG.LLM_CALL_ID.
trace_id 로 LLM_CALL 조회 후 INSERT. LLM_CALL 미발견 시 skip(이벤트 순서 race).
"""

from __future__ import annotations

import json

import structlog

from ..db import get_pool

log = structlog.get_logger("rag_eval_log")


async def handle_rag_evaluation(event: dict) -> None:
    trace_id = event.get("trace_id")
    if not trace_id:
        log.warning("rag_eval_event_missing_trace_id", event=event)
        return
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            llm_call_id = await conn.fetchval(
                'SELECT "LLM_CALL_ID" FROM public."AI_LLM_CALL_LOG" '
                'WHERE "TRACE_ID" = $1 ORDER BY "LLM_CALL_ID" DESC LIMIT 1',
                trace_id,
            )
            if llm_call_id is None:
                # LLM_CALL 컨슈머가 아직 처리 못 했을 수도 (이벤트 순서 race) — silent skip.
                log.warning("rag_eval_llm_call_missing", trace_id=trace_id)
                return
            retrieved = event.get("retrieved_docs")
            await conn.execute(
                'INSERT INTO public."AI_RAG_EVALUATION" ('
                '  "LLM_CALL_ID", "QUESTION", "RETRIEVED_DOCS", "ANSWER", '
                '  "FAITHFULNESS", "ANSWER_RELEVANCY", '
                '  "CONTEXT_PRECISION", "CONTEXT_RECALL", '
                '  "EVALUATED_AT", "DELETE_YN"'
                ") VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, NOW(), 'N')",
                int(llm_call_id),
                event.get("question"),
                json.dumps(retrieved, ensure_ascii=False) if retrieved is not None else None,
                event.get("answer"),
                event.get("faithfulness"),
                event.get("answer_relevancy"),
                event.get("context_precision"),
                event.get("context_recall"),
            )
        log.info(
            "rag_eval_logged",
            trace_id=trace_id,
            llm_call_id=int(llm_call_id),
            faithfulness=event.get("faithfulness"),
        )
    except Exception:
        log.exception("rag_eval_insert_failed", trace_id=trace_id)