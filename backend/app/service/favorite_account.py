"""자주 쓰는 계좌 (TR-004) — FREQUENT_ACCOUNT(v53) CRUD."""

from __future__ import annotations

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError


_COLS = (
    '"FREQUENT_ACCOUNT_ID", "ALIAS", "BANK_CD", "ACCOUNT_NO", '
    '"ACCOUNT_HOLDER_NAME", "DISPLAY_ORDER", "USE_COUNT", "LAST_USED_AT"'
)


async def list_favorites(customer_no: int) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f'SELECT {_COLS} FROM public."FREQUENT_ACCOUNT" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "DISPLAY_ORDER" NULLS LAST, "USE_COUNT" DESC, '
            '         "FREQUENT_ACCOUNT_ID"',
            customer_no,
        )
    return [dict(r) for r in rows]


async def create_favorite(
    customer_no: int,
    *,
    alias: str,
    bank_cd: str,
    account_no: str,
    account_holder_name: str,
    display_order: int | None,
) -> int:
    pool = get_pool()
    async with pool.acquire() as conn:
        return int(
            await conn.fetchval(
                'INSERT INTO public."FREQUENT_ACCOUNT" ('
                '  "CUSTOMER_NO", "ALIAS", "BANK_CD", "ACCOUNT_NO", '
                '  "ACCOUNT_HOLDER_NAME", "DISPLAY_ORDER", "USE_COUNT", "DELETE_YN"'
                ") VALUES ($1, $2, $3, $4, $5, $6, 0, 'N') "
                'RETURNING "FREQUENT_ACCOUNT_ID"',
                customer_no,
                alias,
                bank_cd,
                account_no,
                account_holder_name,
                display_order,
            )
        )


async def update_favorite(customer_no: int, fav_id: int, *, alias: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            'UPDATE public."FREQUENT_ACCOUNT" SET "ALIAS" = $1, "UPDATED_AT" = NOW() '
            'WHERE "FREQUENT_ACCOUNT_ID" = $2 AND "CUSTOMER_NO" = $3 '
            '  AND "DELETE_YN" = \'N\'',
            alias,
            fav_id,
            customer_no,
        )
    if result.endswith(" 0"):
        raise NotFoundError(E_NOT_FOUND, "자주 쓰는 계좌를 찾을 수 없습니다.")


async def delete_favorite(customer_no: int, fav_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            'UPDATE public."FREQUENT_ACCOUNT" SET "DELETE_YN" = \'Y\', '
            '"UPDATED_AT" = NOW() '
            'WHERE "FREQUENT_ACCOUNT_ID" = $1 AND "CUSTOMER_NO" = $2 '
            '  AND "DELETE_YN" = \'N\'',
            fav_id,
            customer_no,
        )
    if result.endswith(" 0"):
        raise NotFoundError(E_NOT_FOUND, "자주 쓰는 계좌를 찾을 수 없습니다.")


async def touch_use(customer_no: int, account_no: str, bank_cd: str) -> None:
    """이체 시 호출 — use_count 증가, last_used_at 갱신."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."FREQUENT_ACCOUNT" '
            'SET "USE_COUNT" = COALESCE("USE_COUNT", 0) + 1, '
            '    "LAST_USED_AT" = NOW(), "UPDATED_AT" = NOW() '
            'WHERE "CUSTOMER_NO" = $1 AND "ACCOUNT_NO" = $2 AND "BANK_CD" = $3 '
            '  AND "DELETE_YN" = \'N\'',
            customer_no,
            account_no,
            bank_cd,
        )