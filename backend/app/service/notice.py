"""공지사항 / 이벤트 서비스."""

from __future__ import annotations

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError


# --- 공지사항 ---------------------------------------------------------------

_NOTICE_LIST_COLS = (
    '"NOTICE_ID", "TITLE", "CATEGORY_CD", "PINNED_YN", '
    '"PUBLISHED_AT", "VIEW_COUNT"'
)
_NOTICE_DETAIL_COLS = (
    '"NOTICE_ID", "TITLE", "BODY", "CATEGORY_CD", "PINNED_YN", '
    '"AUTHOR", "PUBLISHED_AT", "VIEW_COUNT"'
)


async def list_notices(
    *, category_cd: str | None = None, limit: int = 20, offset: int = 0
) -> tuple[list[dict], int]:
    pool = get_pool()
    where = ['"DELETE_YN" = \'N\'', '"STATUS_CD" = \'PUBLISH\'']
    args: list = []
    if category_cd:
        args.append(category_cd)
        where.append(f'"CATEGORY_CD" = ${len(args)}')
    where_sql = " AND ".join(where)
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f'SELECT count(*) FROM public."NOTICE" WHERE {where_sql}', *args
        )
        args.extend([limit, offset])
        rows = await conn.fetch(
            f'SELECT {_NOTICE_LIST_COLS} FROM public."NOTICE" '
            f'WHERE {where_sql} '
            'ORDER BY "PINNED_YN" DESC, "PUBLISHED_AT" DESC, "NOTICE_ID" DESC '
            f'LIMIT ${len(args) - 1} OFFSET ${len(args)}',
            *args,
        )
    return [dict(r) for r in rows], int(total or 0)


async def get_notice(notice_id: int) -> dict:
    """공지 본문 조회 (조회수 변경 X — Strict Mode 중복 회피 위해 별도 hit endpoint).

    반환 dict 에 prev_id/next_id 포함 (목록 정렬 = 고정 우선·PUBLISHED_AT 최신).
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f'SELECT {_NOTICE_DETAIL_COLS} FROM public."NOTICE" '
            'WHERE "NOTICE_ID" = $1 AND "DELETE_YN" = \'N\' '
            '  AND "STATUS_CD" = \'PUBLISH\'',
            notice_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "공지사항을 찾을 수 없습니다.")
        # prev/next — 목록 순서 (PINNED DESC, PUBLISHED_AT DESC, NOTICE_ID DESC) 기준
        cur_pinned = row["PINNED_YN"] or "N"
        cur_pub = row["PUBLISHED_AT"]
        # 다음(목록상 아래) — 더 옛날, 같은 pinned
        next_id = await conn.fetchval(
            'SELECT "NOTICE_ID" FROM public."NOTICE" '
            'WHERE "DELETE_YN"=\'N\' AND "STATUS_CD"=\'PUBLISH\' '
            '  AND (("PINNED_YN" = $1 AND ("PUBLISHED_AT" < $2 OR '
            '         ("PUBLISHED_AT" = $2 AND "NOTICE_ID" < $3))) '
            '       OR ("PINNED_YN" < $1)) '
            'ORDER BY "PINNED_YN" DESC, "PUBLISHED_AT" DESC, "NOTICE_ID" DESC LIMIT 1',
            cur_pinned, cur_pub, notice_id,
        )
        # 이전(목록상 위) — 더 최신
        prev_id = await conn.fetchval(
            'SELECT "NOTICE_ID" FROM public."NOTICE" '
            'WHERE "DELETE_YN"=\'N\' AND "STATUS_CD"=\'PUBLISH\' '
            '  AND (("PINNED_YN" = $1 AND ("PUBLISHED_AT" > $2 OR '
            '         ("PUBLISHED_AT" = $2 AND "NOTICE_ID" > $3))) '
            '       OR ("PINNED_YN" > $1)) '
            'ORDER BY "PINNED_YN" ASC, "PUBLISHED_AT" ASC, "NOTICE_ID" ASC LIMIT 1',
            cur_pinned, cur_pub, notice_id,
        )
    return {**dict(row), "prev_id": prev_id, "next_id": next_id}


async def hit_notice(notice_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."NOTICE" SET "VIEW_COUNT" = "VIEW_COUNT" + 1 '
            'WHERE "NOTICE_ID" = $1 AND "DELETE_YN"=\'N\' AND "STATUS_CD"=\'PUBLISH\'',
            notice_id,
        )


# --- 이벤트 ---------------------------------------------------------------

_EVENT_LIST_COLS = (
    '"EVENT_ID", "TITLE", "SUMMARY", "BANNER_URL", "PERIOD_START", '
    '"PERIOD_END", "STATUS_CD", "PUBLISHED_AT", "VIEW_COUNT"'
)
_EVENT_DETAIL_COLS = (
    '"EVENT_ID", "TITLE", "SUMMARY", "BODY", "BANNER_URL", "PERIOD_START", '
    '"PERIOD_END", "STATUS_CD", "AUTHOR", "PUBLISHED_AT", "VIEW_COUNT"'
)


async def list_events(
    *, status_cd: str | None = None, limit: int = 20, offset: int = 0
) -> tuple[list[dict], int]:
    pool = get_pool()
    where = ['"DELETE_YN" = \'N\'']
    args: list = []
    if status_cd:
        args.append(status_cd)
        where.append(f'"STATUS_CD" = ${len(args)}')
    where_sql = " AND ".join(where)
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f'SELECT count(*) FROM public."EVENT" WHERE {where_sql}', *args
        )
        args.extend([limit, offset])
        rows = await conn.fetch(
            f'SELECT {_EVENT_LIST_COLS} FROM public."EVENT" '
            f'WHERE {where_sql} '
            'ORDER BY "PUBLISHED_AT" DESC, "EVENT_ID" DESC '
            f'LIMIT ${len(args) - 1} OFFSET ${len(args)}',
            *args,
        )
    return [dict(r) for r in rows], int(total or 0)


async def get_event(event_id: int) -> dict:
    """이벤트 본문 + prev/next. 조회수 증가는 별도 hit_event."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f'SELECT {_EVENT_DETAIL_COLS} FROM public."EVENT" '
            'WHERE "EVENT_ID" = $1 AND "DELETE_YN" = \'N\'',
            event_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "이벤트를 찾을 수 없습니다.")
        cur_pub = row["PUBLISHED_AT"]
        # 다음(목록상 아래) — 더 옛날
        next_id = await conn.fetchval(
            'SELECT "EVENT_ID" FROM public."EVENT" '
            'WHERE "DELETE_YN"=\'N\' '
            '  AND ("PUBLISHED_AT" < $1 OR ("PUBLISHED_AT" = $1 AND "EVENT_ID" < $2)) '
            'ORDER BY "PUBLISHED_AT" DESC, "EVENT_ID" DESC LIMIT 1',
            cur_pub, event_id,
        )
        # 이전(목록상 위) — 더 최신
        prev_id = await conn.fetchval(
            'SELECT "EVENT_ID" FROM public."EVENT" '
            'WHERE "DELETE_YN"=\'N\' '
            '  AND ("PUBLISHED_AT" > $1 OR ("PUBLISHED_AT" = $1 AND "EVENT_ID" > $2)) '
            'ORDER BY "PUBLISHED_AT" ASC, "EVENT_ID" ASC LIMIT 1',
            cur_pub, event_id,
        )
    return {**dict(row), "prev_id": prev_id, "next_id": next_id}


async def hit_event(event_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."EVENT" SET "VIEW_COUNT" = "VIEW_COUNT" + 1 '
            'WHERE "EVENT_ID" = $1 AND "DELETE_YN"=\'N\'',
            event_id,
        )