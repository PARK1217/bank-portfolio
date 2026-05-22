"""관리자 — 계좌 목록·상세 조회.

엔드포인트
- list_accounts(query, account_type_cd, status_cd, limit, offset)
    검색: account_no/account_holder_name/customer_no 부분 일치.
    필터: ACCOUNT_TYPE_CD, ACCOUNT_STATUS_CD.
- get_account_detail(account_no)
    계좌 1건 + 보유 고객 + 최근 거래 N건.
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError

log = structlog.get_logger("admin_account")


async def list_accounts(
    query: str | None = None,
    account_type_cd: str | None = None,
    status_cd: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['a."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(query)
            i1, i2, i3 = len(params) - 2, len(params) - 1, len(params)
            clauses.append(
                f"(a.\"ACCOUNT_NO\" ILIKE ${i1} OR a.\"ACCOUNT_HOLDER_NAME\" ILIKE ${i2} "
                f"OR CAST(a.\"CUSTOMER_NO\" AS TEXT) = ${i3})"
            )
        if account_type_cd:
            params.append(account_type_cd)
            clauses.append(f'a."ACCOUNT_TYPE_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f'a."ACCOUNT_STATUS_CD" = ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."ACCOUNT" a WHERE {where}',
            *params,
        )

        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT a."ACCOUNT_NO", a."CUSTOMER_NO", a."ACCOUNT_TYPE_CD", '
            f'       a."ACCOUNT_STATUS_CD", a."BALANCE", a."ACCOUNT_HOLDER_NAME", '
            f'       a."ACCOUNT_ALIAS", a."OPEN_DATE", a."LIMITED_ACCOUNT_YN", '
            f'       a."PRIMARY_ACCOUNT_YN", a."DAILY_WITHDRAW_LIMIT", '
            f'       a."DAILY_TRANSFER_LIMIT", a."HIDDEN_YN", '
            f'       p."PARTY_NAME" AS customer_name '
            f'FROM public."ACCOUNT" a '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY a."ACCOUNT_NO" '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [
        {
            "account_no": r["ACCOUNT_NO"],
            "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
            "customer_name": r["customer_name"],
            "account_type_cd": r["ACCOUNT_TYPE_CD"],
            "status_cd": r["ACCOUNT_STATUS_CD"],
            "balance": int(r["BALANCE"] or 0),
            "holder_name": r["ACCOUNT_HOLDER_NAME"],
            "alias": r["ACCOUNT_ALIAS"],
            "open_date": r["OPEN_DATE"],
            "limited_yn": r["LIMITED_ACCOUNT_YN"],
            "primary_yn": r["PRIMARY_ACCOUNT_YN"],
            "daily_withdraw_limit": int(r["DAILY_WITHDRAW_LIMIT"] or 0),
            "daily_transfer_limit": int(r["DAILY_TRANSFER_LIMIT"] or 0),
            "hidden_yn": r["HIDDEN_YN"],
        }
        for r in rows
    ]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_account_detail(account_no: str) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT a."ACCOUNT_NO", a."CUSTOMER_NO", a."ACCOUNT_TYPE_CD", '
            '       a."ACCOUNT_STATUS_CD", a."BALANCE", a."PENDING_WITHDRAW", '
            '       a."ACCOUNT_HOLDER_NAME", a."ACCOUNT_ALIAS", '
            '       a."OPEN_DATE", a."CLOSE_DATE", a."LAST_TX_DATETIME", '
            '       a."LIMITED_ACCOUNT_YN", a."PRIMARY_ACCOUNT_YN", a."HIDDEN_YN", '
            '       a."DAILY_WITHDRAW_LIMIT", a."DAILY_TRANSFER_LIMIT", '
            '       a."PWD_ERROR_COUNT", a."CUMULATIVE_INTEREST", '
            '       c."EMAIL", c."CUST_GRADE_CD", c."CUST_STATUS_CD", '
            '       p."PARTY_NAME" AS customer_name '
            'FROM public."ACCOUNT" a '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE a."ACCOUNT_NO" = $1 AND a."DELETE_YN" = \'N\'',
            account_no,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 계좌를 찾을 수 없어요.")

        txs = await conn.fetch(
            'SELECT "TRANSACTION_ID", "TX_DATETIME", "TX_AMOUNT", "POST_TX_BALANCE", '
            '       "TX_TYPE_CD", "COUNTERPART_ACCOUNT_NO", "COUNTERPART_BANK_NAME", '
            '       "COUNTERPART_HOLDER_NAME", "TX_MEMO" '
            'FROM public."TRANSACTION" '
            'WHERE "ACCOUNT_NO" = $1 '
            'ORDER BY "TRANSACTION_ID" DESC LIMIT 20',
            account_no,
        )

    return {
        "account": {
            "account_no": row["ACCOUNT_NO"],
            "customer_no": int(row["CUSTOMER_NO"]) if row["CUSTOMER_NO"] is not None else None,
            "customer_name": row["customer_name"],
            "customer_email": row["EMAIL"],
            "customer_grade_cd": row["CUST_GRADE_CD"],
            "customer_status_cd": row["CUST_STATUS_CD"],
            "account_type_cd": row["ACCOUNT_TYPE_CD"],
            "status_cd": row["ACCOUNT_STATUS_CD"],
            "balance": int(row["BALANCE"] or 0),
            "pending_withdraw": int(row["PENDING_WITHDRAW"] or 0),
            "holder_name": row["ACCOUNT_HOLDER_NAME"],
            "alias": row["ACCOUNT_ALIAS"],
            "open_date": row["OPEN_DATE"],
            "close_date": row["CLOSE_DATE"],
            "last_tx_datetime": row["LAST_TX_DATETIME"],
            "limited_yn": row["LIMITED_ACCOUNT_YN"],
            "primary_yn": row["PRIMARY_ACCOUNT_YN"],
            "hidden_yn": row["HIDDEN_YN"],
            "daily_withdraw_limit": int(row["DAILY_WITHDRAW_LIMIT"] or 0),
            "daily_transfer_limit": int(row["DAILY_TRANSFER_LIMIT"] or 0),
            "pwd_error_count": int(row["PWD_ERROR_COUNT"] or 0),
            "cumulative_interest": int(row["CUMULATIVE_INTEREST"] or 0),
        },
        "recent_transactions": [
            {
                "transaction_id": int(t["TRANSACTION_ID"]),
                "tx_datetime": t["TX_DATETIME"],
                "amount": int(t["TX_AMOUNT"] or 0),
                "balance_after": int(t["POST_TX_BALANCE"] or 0),
                "tx_type_cd": t["TX_TYPE_CD"],
                "counterpart_account_no": t["COUNTERPART_ACCOUNT_NO"],
                "counterpart_bank_name": t["COUNTERPART_BANK_NAME"],
                "counterpart_holder_name": t["COUNTERPART_HOLDER_NAME"],
                "memo": t["TX_MEMO"],
            }
            for t in txs
        ],
    }