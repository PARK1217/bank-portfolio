"""알림 도메인 (HM-004) — NOTIFICATION(v53) CRUD."""

from __future__ import annotations

from datetime import datetime

from ..db import get_pool


_COLS = (
    '"NOTIFICATION_ID", "TYPE_CD", "TITLE", "BODY", "LINK_URL", '
    '"REFERENCE_ID", "REFERENCE_TYPE", "IS_READ", "READ_AT", "CREATED_AT"'
)


def _row_to_item(r) -> dict:
    body = r["BODY"] or ""
    return {
        "id": int(r["NOTIFICATION_ID"]),
        "type_cd": r["TYPE_CD"] or "OTHER",
        "title": r["TITLE"] or "",
        "body_snippet": body[:160],
        "link_url": r["LINK_URL"],
        "reference_id": r["REFERENCE_ID"],
        "reference_type": r["REFERENCE_TYPE"],
        "is_read": bool(r["IS_READ"]),
        "read_at": r["READ_AT"],
        "created_at": r["CREATED_AT"] or datetime.now(),
    }


async def list_notifications(
    customer_no: int,
    *,
    unread_only: bool = False,
    types: list[str] | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], bool, int, int, dict[str, int]]:
    """반환: (items, has_next, total, unread_count, unread_by_type).

    types 가 주어지면 해당 TYPE_CD 만 필터. total 은 같은 필터를 적용한 전체 건수.
    unread_count/unread_by_type 는 필터와 무관하게 본인 전체 기준 — 화면 탭별 미읽음 배지용.
    """
    pool = get_pool()
    where = ['"CUSTOMER_NO" = $1', '"DELETE_YN" = \'N\'']
    params: list = [customer_no]
    if unread_only:
        where.append('"IS_READ" = FALSE')
    if types:
        params.append(types)
        where.append(f'"TYPE_CD" = ANY(${len(params)}::text[])')
    where_sql = " AND ".join(where)

    base_params = list(params)
    limit_idx = len(params) + 1
    offset_idx = len(params) + 2
    params.extend([limit + 1, offset])

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f'SELECT {_COLS} FROM public."NOTIFICATION" '
            f"WHERE {where_sql} "
            f'ORDER BY "CREATED_AT" DESC, "NOTIFICATION_ID" DESC '
            f"LIMIT ${limit_idx} OFFSET ${offset_idx}",
            *params,
        )
        total = await conn.fetchval(
            f'SELECT count(*) FROM public."NOTIFICATION" WHERE {where_sql}',
            *base_params,
        )
        breakdown = await conn.fetch(
            'SELECT "TYPE_CD", count(*) AS n FROM public."NOTIFICATION" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            '  AND "IS_READ" = FALSE '
            'GROUP BY "TYPE_CD"',
            customer_no,
        )

    unread_by_type: dict[str, int] = {r["TYPE_CD"] or "OTHER": int(r["n"]) for r in breakdown}
    unread = sum(unread_by_type.values())
    has_next = len(rows) > limit
    items = [_row_to_item(r) for r in rows[:limit]]
    return items, has_next, int(total or 0), unread, unread_by_type


async def mark_read(customer_no: int, ids: list[int] | None) -> int:
    """ids=None 이면 본인 미읽음 전체. 반환: 갱신 행 수."""
    pool = get_pool()
    async with pool.acquire() as conn:
        if ids is None:
            result = await conn.execute(
                'UPDATE public."NOTIFICATION" SET "IS_READ" = TRUE, "READ_AT" = NOW(), '
                '"UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $1 AND "IS_READ" = FALSE '
                '  AND "DELETE_YN" = \'N\'',
                customer_no,
            )
        else:
            if not ids:
                return 0
            result = await conn.execute(
                'UPDATE public."NOTIFICATION" SET "IS_READ" = TRUE, "READ_AT" = NOW(), '
                '"UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $1 AND "NOTIFICATION_ID" = ANY($2::bigint[]) '
                '  AND "IS_READ" = FALSE AND "DELETE_YN" = \'N\'',
                customer_no,
                ids,
            )
    # asyncpg execute returns "UPDATE N"
    parts = result.split()
    return int(parts[-1]) if parts and parts[-1].isdigit() else 0


async def insert_notification(
    customer_no: int,
    *,
    type_cd: str,
    title: str,
    body: str,
    link_url: str | None = None,
    reference_id: int | None = None,
    reference_type: str | None = None,
) -> int:
    """다른 도메인이 알림 발송할 때 호출. 반환: 발행된 NOTIFICATION_ID."""
    pool = get_pool()
    async with pool.acquire() as conn:
        return int(
            await conn.fetchval(
                'INSERT INTO public."NOTIFICATION" ('
                '  "CUSTOMER_NO", "TYPE_CD", "TITLE", "BODY", "LINK_URL", '
                '  "REFERENCE_ID", "REFERENCE_TYPE", "IS_READ", "DELETE_YN"'
                ") VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, 'N') "
                'RETURNING "NOTIFICATION_ID"',
                customer_no,
                type_cd,
                title,
                body,
                link_url,
                reference_id,
                reference_type,
            )
        )