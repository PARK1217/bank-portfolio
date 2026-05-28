"""관리자 — LLM 호출 추적(AI_LLM_CALL_LOG) 조회 서비스.

frontend-admin `/observability` 화면이 사용. Phoenix iframe 외에 우리 DB 에
직접 적재한 LLM 호출 row 를 펼침 UI 로 보여주기 위한 데이터 출처.

엔드포인트 2개:
  - list_llm_calls()  : 필터된 목록 (가벼움 — RAW_QUESTION 80자 truncate)
  - get_llm_call()    : 단건 상세 (전문 — system/user/retrieved/response 전부)

권한: require_admin 게이팅 (라우터 측).
"""

from __future__ import annotations

import json

from ..db import get_pool


async def list_llm_calls(
    *,
    audience_cd: str | None = None,    # USER / ADMIN / (None=전체)
    cache_hit_yn: str | None = None,   # Y / N / (None=전체)
    purpose_cd: str | None = None,
    q: str | None = None,              # RAW_QUESTION 부분 일치
    date_from: str | None = None,      # YYYY-MM-DD
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    where: list[str] = []
    args: list = []

    def _next() -> str:
        args_idx = len(args) + 1
        return f"${args_idx}"

    if audience_cd:
        where.append(f'"AUDIENCE_CD" = {_next()}')
        args.append(audience_cd)
    if cache_hit_yn:
        where.append(f'"CACHE_HIT_YN" = {_next()}')
        args.append(cache_hit_yn)
    if purpose_cd:
        where.append(f'"PURPOSE_CD" = {_next()}')
        args.append(purpose_cd)
    if q:
        where.append(f'"RAW_QUESTION" ILIKE {_next()}')
        args.append(f"%{q}%")
    if date_from:
        where.append(f'"CALLED_AT" >= {_next()}::date')
        args.append(date_from)
    if date_to:
        where.append(f'"CALLED_AT" < ({_next()}::date + INTERVAL \'1 day\')')
        args.append(date_to)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    pool = get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f'SELECT count(*) FROM public."AI_LLM_CALL_LOG" {where_sql}',
            *args,
        )
        rows = await conn.fetch(
            f'SELECT "LLM_CALL_ID", "CALLED_AT", "AUDIENCE_CD", "CACHE_HIT_YN", '
            f'       "MODEL_NAME", "PURPOSE_CD", "PROMPT_TOKENS", "COMPLETION_TOKENS", '
            f'       "LATENCY_MS", "STATUS_CD", LEFT("RAW_QUESTION", 80) AS raw_q_head '
            f'FROM public."AI_LLM_CALL_LOG" {where_sql} '
            f'ORDER BY "CALLED_AT" DESC, "LLM_CALL_ID" DESC '
            f'LIMIT {int(limit)} OFFSET {int(offset)}',
            *args,
        )

    items = [
        {
            "llm_call_id": int(r["LLM_CALL_ID"]),
            "called_at": r["CALLED_AT"],
            "audience_cd": r["AUDIENCE_CD"],
            "cache_hit_yn": r["CACHE_HIT_YN"],
            "model_name": r["MODEL_NAME"],
            "purpose_cd": r["PURPOSE_CD"],
            "prompt_tokens": r["PROMPT_TOKENS"],
            "completion_tokens": r["COMPLETION_TOKENS"],
            "latency_ms": r["LATENCY_MS"],
            "status_cd": r["STATUS_CD"],
            "raw_question_head": r["raw_q_head"],
        }
        for r in rows
    ]
    return {"items": items, "total": int(total or 0)}


async def get_llm_call(llm_call_id: int) -> dict | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        r = await conn.fetchrow(
            'SELECT "LLM_CALL_ID", "TRACE_ID", "SPAN_ID", "CALLED_AT", '
            '       "AUDIENCE_CD", "CACHE_HIT_YN", "MODEL_NAME", "PURPOSE_CD", '
            '       "PROMPT_TOKENS", "COMPLETION_TOKENS", "LATENCY_MS", '
            '       "STATUS_CD", "ERROR_MESSAGE", '
            '       "SYSTEM_PROMPT", "USER_PROMPT", "RAW_QUESTION", '
            '       "REWRITTEN_QUERY", "RETRIEVED_CONTEXT", "RESPONSE_TEXT" '
            'FROM public."AI_LLM_CALL_LOG" '
            'WHERE "LLM_CALL_ID" = $1',
            llm_call_id,
        )
    if r is None:
        return None
    ctx = r["RETRIEVED_CONTEXT"]
    if isinstance(ctx, str):
        try:
            ctx = json.loads(ctx)
        except Exception:
            ctx = None
    # 해당 LLM 호출의 최신 RAG 품질 평가(있으면) — 1:N 이라 최신 1건.
    async with pool.acquire() as conn:
        ev = await conn.fetchrow(
            'SELECT "FAITHFULNESS", "ANSWER_RELEVANCY", "CONTEXT_PRECISION", '
            '       "CONTEXT_RECALL", "EVALUATED_AT" '
            'FROM public."AI_RAG_EVALUATION" '
            'WHERE "LLM_CALL_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "EVAL_ID" DESC LIMIT 1',
            llm_call_id,
        )
    evaluation = None
    if ev is not None:
        evaluation = {
            "faithfulness": float(ev["FAITHFULNESS"]) if ev["FAITHFULNESS"] is not None else None,
            "answer_relevancy": float(ev["ANSWER_RELEVANCY"]) if ev["ANSWER_RELEVANCY"] is not None else None,
            "context_precision": float(ev["CONTEXT_PRECISION"]) if ev["CONTEXT_PRECISION"] is not None else None,
            "context_recall": float(ev["CONTEXT_RECALL"]) if ev["CONTEXT_RECALL"] is not None else None,
            "evaluated_at": ev["EVALUATED_AT"],
        }
    return {
        "llm_call_id": int(r["LLM_CALL_ID"]),
        "trace_id": r["TRACE_ID"],
        "span_id": r["SPAN_ID"],
        "called_at": r["CALLED_AT"],
        "audience_cd": r["AUDIENCE_CD"],
        "cache_hit_yn": r["CACHE_HIT_YN"],
        "model_name": r["MODEL_NAME"],
        "purpose_cd": r["PURPOSE_CD"],
        "prompt_tokens": r["PROMPT_TOKENS"],
        "completion_tokens": r["COMPLETION_TOKENS"],
        "latency_ms": r["LATENCY_MS"],
        "status_cd": r["STATUS_CD"],
        "error_message": r["ERROR_MESSAGE"],
        "system_prompt": r["SYSTEM_PROMPT"],
        "user_prompt": r["USER_PROMPT"],
        "raw_question": r["RAW_QUESTION"],
        "rewritten_query": r["REWRITTEN_QUERY"],
        "retrieved_context": ctx,
        "response_text": r["RESPONSE_TEXT"],
        "evaluation": evaluation,
    }


async def llm_call_stats() -> dict:
    """대시보드용 — 최근 24h LLM 호출 통계 (hit/miss/avg latency)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        r = await conn.fetchrow(
            'SELECT count(*) FILTER (WHERE "CACHE_HIT_YN" = \'Y\') AS cache_hits, '
            '       count(*) FILTER (WHERE "CACHE_HIT_YN" = \'N\') AS cache_misses, '
            '       count(*) AS total, '
            '       avg("LATENCY_MS") FILTER (WHERE "CACHE_HIT_YN" = \'N\') AS avg_miss_lat, '
            '       avg("LATENCY_MS") FILTER (WHERE "CACHE_HIT_YN" = \'Y\') AS avg_hit_lat, '
            '       sum("PROMPT_TOKENS") AS prompt_tokens, '
            '       sum("COMPLETION_TOKENS") AS completion_tokens '
            'FROM public."AI_LLM_CALL_LOG" '
            "WHERE \"CALLED_AT\" >= NOW() - INTERVAL '24 hours'"
        )
    total = int(r["total"] or 0)
    hits = int(r["cache_hits"] or 0)
    misses = int(r["cache_misses"] or 0)
    return {
        "total": total,
        "cache_hits": hits,
        "cache_misses": misses,
        "cache_hit_rate": round(hits / (hits + misses), 4) if (hits + misses) else 0.0,
        "avg_miss_latency_ms": int(r["avg_miss_lat"]) if r["avg_miss_lat"] else None,
        "avg_hit_latency_ms": int(r["avg_hit_lat"]) if r["avg_hit_lat"] else None,
        "prompt_tokens_24h": int(r["prompt_tokens"] or 0),
        "completion_tokens_24h": int(r["completion_tokens"] or 0),
    }


async def rag_eval_stats() -> dict:
    """RAG 응답 품질 4지표 평균 — AI_RAG_EVALUATION 전체(미삭제) 집계.

    LLM-as-judge 자가 채점값이라 절대 신뢰도가 아니라 상대 추이 지표.
    값이 NULL(채점 실패)인 행은 avg 가 자동 제외.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        r = await conn.fetchrow(
            'SELECT count(*) AS total, '
            '       avg("FAITHFULNESS") AS faithfulness, '
            '       avg("ANSWER_RELEVANCY") AS answer_relevancy, '
            '       avg("CONTEXT_PRECISION") AS context_precision, '
            '       avg("CONTEXT_RECALL") AS context_recall '
            'FROM public."AI_RAG_EVALUATION" '
            "WHERE \"DELETE_YN\" = 'N'"
        )

    def _f(v) -> float | None:
        return round(float(v), 4) if v is not None else None

    return {
        "total": int(r["total"] or 0),
        "faithfulness": _f(r["faithfulness"]),
        "answer_relevancy": _f(r["answer_relevancy"]),
        "context_precision": _f(r["context_precision"]),
        "context_recall": _f(r["context_recall"]),
    }
