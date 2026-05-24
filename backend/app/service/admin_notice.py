"""관리자 — 공지(NOTICE) + 이벤트(EVENT) 운영.

기존 frontend 의 공개 조회 API (api/notice.py) 와 별도. 관리자는 발행/수정/숨김.

공지 (NOTICE)
- CATEGORY_CD: SERVICE / SECURITY / SYSTEM / POLICY
- STATUS_CD  : PUBLISH / DRAFT / ARCHIVE
- PINNED_YN  : Y/N (상단 고정)
- PUBLISHED_AT / EXPIRES_AT  : 노출 기간
- DELETE_YN  : 'Y' = 논리 삭제

이벤트 (EVENT)
- STATUS_CD  : PUBLISH / DRAFT / ENDED
- PERIOD_START / PERIOD_END  : 진행 기간
- BANNER_URL : 배너 (선택)

관리자는 DRAFT 상태로 작성한 후 PUBLISH 로 전환하는 흐름도 가능.
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_notice")


NOTICE_CATEGORIES = {"SERVICE", "SECURITY", "SYSTEM", "POLICY"}
NOTICE_STATUSES = {"PUBLISH", "DRAFT", "ARCHIVE"}
EVENT_STATUSES = {"PUBLISH", "DRAFT", "ENDED"}


# ---------------------------------------------------------------------------
# Notice
# ---------------------------------------------------------------------------

async def list_notices(
    query: str | None = None,
    category_cd: str | None = None,
    status_cd: str | None = None,
    pinned_yn: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['"DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            i1, i2, i3 = len(params) - 2, len(params) - 1, len(params)
            clauses.append(
                f'("TITLE" ILIKE ${i1} OR "BODY" ILIKE ${i2} OR "AUTHOR" ILIKE ${i3})'
            )
        if category_cd:
            params.append(category_cd)
            clauses.append(f'"CATEGORY_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f'"STATUS_CD" = ${len(params)}')
        if pinned_yn:
            params.append(pinned_yn)
            clauses.append(f'"PINNED_YN" = ${len(params)}')
        if date_from:
            params.append(date_from)
            clauses.append(f'to_char("PUBLISHED_AT", \'YYYYMMDD\') >= ${len(params)}')
        if date_to:
            params.append(date_to)
            clauses.append(f'to_char("PUBLISHED_AT", \'YYYYMMDD\') <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."NOTICE" WHERE {where}', *params,
        )

        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT "NOTICE_ID","TITLE","CATEGORY_CD","PINNED_YN","STATUS_CD",'
            f'       "PUBLISHED_AT","EXPIRES_AT","VIEW_COUNT","AUTHOR","CREATED_AT" '
            f'FROM public."NOTICE" WHERE {where} '
            f'ORDER BY "PINNED_YN" DESC, "PUBLISHED_AT" DESC NULLS LAST, "NOTICE_ID" DESC '
            f'LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}',
            *params_with_paging,
        )

    items = [_notice_row(r) for r in rows]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_notice_detail(notice_id: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "NOTICE_ID","TITLE","BODY","CATEGORY_CD","PINNED_YN","STATUS_CD",'
            '       "PUBLISHED_AT","EXPIRES_AT","VIEW_COUNT","AUTHOR","CREATED_AT","UPDATED_AT" '
            'FROM public."NOTICE" WHERE "NOTICE_ID" = $1 AND "DELETE_YN" = \'N\'',
            notice_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 공지를 찾을 수 없어요.")
    return {
        **_notice_row(row),
        "body": row["BODY"],
        "updated_at": row["UPDATED_AT"],
    }


async def create_notice(
    title: str,
    body: str,
    category_cd: str,
    pinned_yn: str,
    status_cd: str,
    expires_at: str | None,
    author: str,
) -> dict[str, Any]:
    if category_cd not in NOTICE_CATEGORIES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 분류: {category_cd}")
    if status_cd not in NOTICE_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태: {status_cd}")
    if pinned_yn not in ("Y", "N"):
        raise BusinessError(E_VALIDATION, "PINNED_YN 은 Y/N 만 허용")

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO public."NOTICE" '
            '("TITLE","BODY","CATEGORY_CD","PINNED_YN","STATUS_CD","EXPIRES_AT","AUTHOR") '
            'VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "NOTICE_ID","PUBLISHED_AT","CREATED_AT"',
            title, body, category_cd, pinned_yn, status_cd, expires_at, author,
        )
    log.info("notice_created", notice_id=int(row["NOTICE_ID"]), by=author)
    return {
        "notice_id": int(row["NOTICE_ID"]),
        "published_at": row["PUBLISHED_AT"],
        "created_at": row["CREATED_AT"],
    }


async def update_notice(
    notice_id: int,
    title: str | None,
    body: str | None,
    category_cd: str | None,
    pinned_yn: str | None,
    status_cd: str | None,
    expires_at: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if category_cd is not None and category_cd not in NOTICE_CATEGORIES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 분류: {category_cd}")
    if status_cd is not None and status_cd not in NOTICE_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태: {status_cd}")
    if pinned_yn is not None and pinned_yn not in ("Y", "N"):
        raise BusinessError(E_VALIDATION, "PINNED_YN 은 Y/N 만 허용")

    sets: list[str] = []
    params: list[Any] = []
    for col, val in [
        ("TITLE", title),
        ("BODY", body),
        ("CATEGORY_CD", category_cd),
        ("PINNED_YN", pinned_yn),
        ("STATUS_CD", status_cd),
        ("EXPIRES_AT", expires_at),
    ]:
        if val is not None:
            params.append(val)
            sets.append(f'"{col}" = ${len(params)}')
    if not sets:
        raise BusinessError(E_VALIDATION, "변경할 항목이 없습니다.")

    sets.append('"UPDATED_AT" = NOW()')
    params.append(notice_id)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval(
                'SELECT 1 FROM public."NOTICE" WHERE "NOTICE_ID" = $1 AND "DELETE_YN" = \'N\'',
                notice_id,
            )
            if not exists:
                raise NotFoundError(E_NOT_FOUND, "해당 공지를 찾을 수 없어요.")
            await conn.execute(
                f'UPDATE public."NOTICE" SET {", ".join(sets)} WHERE "NOTICE_ID" = ${len(params)}',
                *params,
            )
    log.info("notice_updated", notice_id=notice_id, by=employee_no)
    return {"notice_id": notice_id}


async def delete_notice(notice_id: int, employee_no: str) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval(
                'SELECT 1 FROM public."NOTICE" WHERE "NOTICE_ID" = $1 AND "DELETE_YN" = \'N\'',
                notice_id,
            )
            if not exists:
                raise NotFoundError(E_NOT_FOUND, "해당 공지를 찾을 수 없어요.")
            await conn.execute(
                'UPDATE public."NOTICE" SET "DELETE_YN" = \'Y\', "UPDATED_AT" = NOW() '
                'WHERE "NOTICE_ID" = $1',
                notice_id,
            )
    log.info("notice_deleted", notice_id=notice_id, by=employee_no)
    return {"notice_id": notice_id, "deleted": True}


def _notice_row(r: Any) -> dict[str, Any]:
    return {
        "notice_id": int(r["NOTICE_ID"]),
        "title": r["TITLE"],
        "category_cd": r["CATEGORY_CD"],
        "pinned_yn": r["PINNED_YN"],
        "status_cd": r["STATUS_CD"],
        "published_at": r["PUBLISHED_AT"],
        "expires_at": r.get("EXPIRES_AT") if hasattr(r, "get") else r["EXPIRES_AT"],
        "view_count": int(r["VIEW_COUNT"] or 0),
        "author": r["AUTHOR"],
        "created_at": r["CREATED_AT"],
    }


# ---------------------------------------------------------------------------
# Event
# ---------------------------------------------------------------------------

async def list_events(
    query: str | None = None,
    status_cd: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['"DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            i1, i2, i3 = len(params) - 2, len(params) - 1, len(params)
            clauses.append(
                f'("TITLE" ILIKE ${i1} OR "SUMMARY" ILIKE ${i2} OR "BODY" ILIKE ${i3})'
            )
        if status_cd:
            params.append(status_cd)
            clauses.append(f'"STATUS_CD" = ${len(params)}')
        if date_from:
            params.append(date_from)
            clauses.append(f'to_char("PERIOD_START", \'YYYYMMDD\') >= ${len(params)}')
        if date_to:
            params.append(date_to)
            clauses.append(f'to_char("PERIOD_END", \'YYYYMMDD\') <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."EVENT" WHERE {where}', *params,
        )
        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT "EVENT_ID","TITLE","SUMMARY","STATUS_CD","PERIOD_START","PERIOD_END",'
            f'       "BANNER_URL","VIEW_COUNT","PUBLISHED_AT","AUTHOR","CREATED_AT" '
            f'FROM public."EVENT" WHERE {where} '
            f'ORDER BY "PERIOD_START" DESC NULLS LAST, "EVENT_ID" DESC '
            f'LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}',
            *params_with_paging,
        )

    items = [_event_row(r) for r in rows]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_event_detail(event_id: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "EVENT_ID","TITLE","SUMMARY","BODY","BANNER_URL","STATUS_CD",'
            '       "PERIOD_START","PERIOD_END","VIEW_COUNT","PUBLISHED_AT","AUTHOR",'
            '       "CREATED_AT","UPDATED_AT" '
            'FROM public."EVENT" WHERE "EVENT_ID" = $1 AND "DELETE_YN" = \'N\'',
            event_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 이벤트를 찾을 수 없어요.")
    return {
        **_event_row(row),
        "body": row["BODY"],
        "updated_at": row["UPDATED_AT"],
    }


async def create_event(
    title: str,
    summary: str | None,
    body: str,
    banner_url: str | None,
    period_start: str | None,
    period_end: str | None,
    status_cd: str,
    author: str,
) -> dict[str, Any]:
    if status_cd not in EVENT_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태: {status_cd}")

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO public."EVENT" '
            '("TITLE","SUMMARY","BODY","BANNER_URL","PERIOD_START","PERIOD_END","STATUS_CD","AUTHOR") '
            'VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8) '
            'RETURNING "EVENT_ID","PUBLISHED_AT","CREATED_AT"',
            title, summary, body, banner_url, period_start, period_end, status_cd, author,
        )
    log.info("event_created", event_id=int(row["EVENT_ID"]), by=author)
    return {
        "event_id": int(row["EVENT_ID"]),
        "published_at": row["PUBLISHED_AT"],
        "created_at": row["CREATED_AT"],
    }


async def update_event(
    event_id: int,
    title: str | None,
    summary: str | None,
    body: str | None,
    banner_url: str | None,
    period_start: str | None,
    period_end: str | None,
    status_cd: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if status_cd is not None and status_cd not in EVENT_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태: {status_cd}")

    sets: list[str] = []
    params: list[Any] = []
    cast_map = {"PERIOD_START": "::date", "PERIOD_END": "::date"}
    for col, val in [
        ("TITLE", title),
        ("SUMMARY", summary),
        ("BODY", body),
        ("BANNER_URL", banner_url),
        ("PERIOD_START", period_start),
        ("PERIOD_END", period_end),
        ("STATUS_CD", status_cd),
    ]:
        if val is not None:
            params.append(val)
            cast = cast_map.get(col, "")
            sets.append(f'"{col}" = ${len(params)}{cast}')
    if not sets:
        raise BusinessError(E_VALIDATION, "변경할 항목이 없습니다.")

    sets.append('"UPDATED_AT" = NOW()')
    params.append(event_id)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval(
                'SELECT 1 FROM public."EVENT" WHERE "EVENT_ID" = $1 AND "DELETE_YN" = \'N\'',
                event_id,
            )
            if not exists:
                raise NotFoundError(E_NOT_FOUND, "해당 이벤트를 찾을 수 없어요.")
            await conn.execute(
                f'UPDATE public."EVENT" SET {", ".join(sets)} WHERE "EVENT_ID" = ${len(params)}',
                *params,
            )
    log.info("event_updated", event_id=event_id, by=employee_no)
    return {"event_id": event_id}


async def delete_event(event_id: int, employee_no: str) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval(
                'SELECT 1 FROM public."EVENT" WHERE "EVENT_ID" = $1 AND "DELETE_YN" = \'N\'',
                event_id,
            )
            if not exists:
                raise NotFoundError(E_NOT_FOUND, "해당 이벤트를 찾을 수 없어요.")
            await conn.execute(
                'UPDATE public."EVENT" SET "DELETE_YN" = \'Y\', "UPDATED_AT" = NOW() '
                'WHERE "EVENT_ID" = $1',
                event_id,
            )
    log.info("event_deleted", event_id=event_id, by=employee_no)
    return {"event_id": event_id, "deleted": True}


def _event_row(r: Any) -> dict[str, Any]:
    return {
        "event_id": int(r["EVENT_ID"]),
        "title": r["TITLE"],
        "summary": r["SUMMARY"],
        "status_cd": r["STATUS_CD"],
        "period_start": r["PERIOD_START"],
        "period_end": r["PERIOD_END"],
        "banner_url": r["BANNER_URL"],
        "view_count": int(r["VIEW_COUNT"] or 0),
        "published_at": r["PUBLISHED_AT"],
        "author": r["AUTHOR"],
        "created_at": r["CREATED_AT"],
    }
