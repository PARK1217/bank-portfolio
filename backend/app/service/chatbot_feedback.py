"""챗봇 피드백 영구화 — AI_CHATBOT_FEEDBACK(v53) INSERT.

별도 모듈로 분리 — `service/chatbot.py` 가 풀스택 RAG 갱신 영역과 빈번히 충돌하므로
피드백 저장 로직은 여기서 단독 관리.
"""

from __future__ import annotations

import structlog

from ..db import get_pool

log = structlog.get_logger("chatbot_feedback")


async def submit_feedback_db(
    customer_no: int,
    message_id: int,
    rating: int,
    comment: str | None,
    *,
    audience_cd: str = "USER",
    issue_category: str | None = None,
) -> None:
    """AI_CHATBOT_FEEDBACK upsert — 같은 (customer, message) 있으면 UPDATE.

    v53 에 UNIQUE 제약이 없어 service 단에서 SELECT → INSERT/UPDATE 분기.
    실패는 로그만 남기고 silent.

    audience_cd: USER(고객) / ADMIN(직원). 같은 테이블 + 라벨 분리.
    issue_category: 👎 시 카테고리 (RETRIEVAL_MISS, ANSWER_INCORRECT 등).
    """
    aud = (audience_cd or "USER").upper()[:5]
    cat = (issue_category or None) and str(issue_category)[:40]
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            existing_id = await conn.fetchval(
                'SELECT "FEEDBACK_ID" FROM public."AI_CHATBOT_FEEDBACK" '
                'WHERE "CUSTOMER_NO" = $1 AND "MESSAGE_ID" = $2 '
                '  AND "DELETE_YN" = \'N\' '
                'ORDER BY "FEEDBACK_ID" DESC LIMIT 1',
                customer_no,
                message_id,
            )
            if existing_id:
                await conn.execute(
                    'UPDATE public."AI_CHATBOT_FEEDBACK" '
                    'SET "RATING" = $1, "COMMENT" = $2, '
                    '    "AUDIENCE_CD" = $3, "ISSUE_CATEGORY" = $4, '
                    '    "UPDATED_AT" = NOW() '
                    'WHERE "FEEDBACK_ID" = $5',
                    rating,
                    comment,
                    aud,
                    cat,
                    existing_id,
                )
                log.info(
                    "feedback_updated",
                    message_id=message_id,
                    rating=rating,
                    feedback_id=int(existing_id),
                    audience=aud,
                    issue=cat,
                )
            else:
                await conn.execute(
                    'INSERT INTO public."AI_CHATBOT_FEEDBACK" ('
                    '  "MESSAGE_ID", "CUSTOMER_NO", "RATING", "COMMENT", '
                    '  "AUDIENCE_CD", "ISSUE_CATEGORY", "DELETE_YN"'
                    ") VALUES ($1, $2, $3, $4, $5, $6, 'N')",
                    message_id,
                    customer_no,
                    rating,
                    comment,
                    aud,
                    cat,
                )
                log.info(
                    "feedback_saved",
                    message_id=message_id,
                    rating=rating,
                    audience=aud,
                    issue=cat,
                )
    except Exception:
        log.exception("feedback_db_upsert_failed", message_id=message_id)


async def feedback_stats() -> dict:
    """챗봇 피드백 집계 — 전체 + audience(USER/ADMIN) 분리 + 👎 이슈 분포.

    RATING 1=👎 / 5=👍. satisfaction_rate = 👍 / (👍+👎).
    AUDIENCE_CD 는 char(5) 라 패딩 공백 제거 후 라벨링.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        agg = await conn.fetch(
            'SELECT COALESCE("AUDIENCE_CD", \'USER\') AS audience, '
            '       count(*) AS total, '
            '       count(*) FILTER (WHERE "RATING" = 5) AS up, '
            '       count(*) FILTER (WHERE "RATING" = 1) AS down '
            'FROM public."AI_CHATBOT_FEEDBACK" '
            "WHERE \"DELETE_YN\" = 'N' "
            'GROUP BY COALESCE("AUDIENCE_CD", \'USER\')'
        )
        issues = await conn.fetch(
            'SELECT "ISSUE_CATEGORY" AS category, count(*) AS cnt '
            'FROM public."AI_CHATBOT_FEEDBACK" '
            "WHERE \"DELETE_YN\" = 'N' AND \"RATING\" = 1 "
            '  AND "ISSUE_CATEGORY" IS NOT NULL '
            'GROUP BY "ISSUE_CATEGORY" '
            'ORDER BY cnt DESC'
        )

    by_audience: dict[str, dict] = {}
    total = up = down = 0
    for r in agg:
        aud = (r["audience"] or "USER").strip() or "USER"
        t, u, d = int(r["total"]), int(r["up"]), int(r["down"])
        by_audience[aud] = {
            "total": t,
            "up": u,
            "down": d,
            "satisfaction_rate": round(u / (u + d), 4) if (u + d) else None,
        }
        total += t
        up += u
        down += d

    return {
        "total": total,
        "up": up,
        "down": down,
        "satisfaction_rate": round(up / (up + down), 4) if (up + down) else None,
        "by_audience": by_audience,
        "issue_breakdown": [
            {"category": r["category"], "count": int(r["cnt"])} for r in issues
        ],
    }


async def list_feedback(
    *,
    audience_cd: str | None = None,   # USER / ADMIN / (None=전체)
    rating: int | None = None,        # 1 / 5 / (None=전체)
    has_comment: bool = False,        # True 면 코멘트 있는 것만
    limit: int = 50,
    offset: int = 0,
) -> dict:
    where: list[str] = ["\"DELETE_YN\" = 'N'"]
    args: list = []

    def _next() -> str:
        return f"${len(args) + 1}"

    if audience_cd:
        where.append(f'"AUDIENCE_CD" = {_next()}')
        args.append(audience_cd)
    if rating in (1, 5):
        where.append(f'"RATING" = {_next()}')
        args.append(rating)
    if has_comment:
        where.append('"COMMENT" IS NOT NULL AND length(trim("COMMENT")) > 0')

    where_sql = "WHERE " + " AND ".join(where)
    pool = get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f'SELECT count(*) FROM public."AI_CHATBOT_FEEDBACK" {where_sql}',
            *args,
        )
        rows = await conn.fetch(
            f'SELECT "FEEDBACK_ID", "MESSAGE_ID", "CUSTOMER_NO", "RATING", '
            f'       "COMMENT", "AUDIENCE_CD", "ISSUE_CATEGORY", '
            f'       COALESCE("UPDATED_AT", "CREATED_AT") AS at '
            f'FROM public."AI_CHATBOT_FEEDBACK" {where_sql} '
            f'ORDER BY COALESCE("UPDATED_AT", "CREATED_AT") DESC, "FEEDBACK_ID" DESC '
            f'LIMIT {int(limit)} OFFSET {int(offset)}',
            *args,
        )

    items = [
        {
            "feedback_id": int(r["FEEDBACK_ID"]),
            "message_id": int(r["MESSAGE_ID"]),
            "customer_no": int(r["CUSTOMER_NO"]),
            "rating": int(r["RATING"]) if r["RATING"] is not None else None,
            "comment": r["COMMENT"],
            "audience_cd": (r["AUDIENCE_CD"] or "USER").strip() or "USER",
            "issue_category": r["ISSUE_CATEGORY"],
            "at": r["at"],
        }
        for r in rows
    ]
    return {"items": items, "total": int(total or 0)}