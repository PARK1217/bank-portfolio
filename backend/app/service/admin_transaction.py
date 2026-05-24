"""관리자 — 거래내역 통합 검색 + 상세.

조회 흐름
- list_transactions(...) — TRANSACTION 전체 (DELETE_YN='N') 시간 역순.
    검색·필터:
      - query        계좌번호/회원이름/회원번호/메모/상대 이름·계좌 부분 일치
      - account_no   특정 계좌
      - customer_no  특정 회원의 보유 계좌 전체
      - tx_type_cd   DEPOSIT/WITHDRAW/TRANSFER/INTEREST/FEE/CORRECTION/REVERSAL/LOAN_EXEC/LOAN_REPAY
      - status_cd    COMPLETE/SETTLED/PENDING/FAILED/CANCELED
      - own_bank_yn  Y/N
      - date_from / date_to  yyyymmdd (TX_DATETIME prefix)
      - amount_min / amount_max  절대값 기준 (음수도 매칭)
- get_transaction_detail(transaction_id) — 거래 1건 + 계좌·회원 메타.
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError

log = structlog.get_logger("admin_transaction")


async def list_transactions(
    query: str | None = None,
    account_no: str | None = None,
    customer_no: int | None = None,
    tx_type_cd: str | None = None,
    status_cd: str | None = None,
    own_bank_yn: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['t."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            # 5개 필드 부분 일치 + 회원번호 정확 일치.
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(query)
            i1, i2, i3, i4, i5, i6 = (
                len(params) - 5, len(params) - 4, len(params) - 3,
                len(params) - 2, len(params) - 1, len(params),
            )
            clauses.append(
                f"(t.\"ACCOUNT_NO\" ILIKE ${i1} OR t.\"TX_MEMO\" ILIKE ${i2} "
                f"OR t.\"COUNTERPART_ACCOUNT_NO\" ILIKE ${i3} "
                f"OR t.\"COUNTERPART_HOLDER_NAME\" ILIKE ${i4} "
                f"OR p.\"PARTY_NAME\" ILIKE ${i5} "
                f"OR CAST(a.\"CUSTOMER_NO\" AS TEXT) = ${i6})"
            )
        if account_no:
            params.append(account_no)
            clauses.append(f't."ACCOUNT_NO" = ${len(params)}')
        if customer_no is not None:
            params.append(customer_no)
            clauses.append(f'a."CUSTOMER_NO" = ${len(params)}')
        if tx_type_cd:
            params.append(tx_type_cd)
            clauses.append(f't."TX_TYPE_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f't."TX_STATUS_CD" = ${len(params)}')
        if own_bank_yn:
            params.append(own_bank_yn)
            clauses.append(f't."OWN_BANK_YN" = ${len(params)}')
        if date_from:
            params.append(date_from)
            clauses.append(f'SUBSTRING(t."TX_DATETIME",1,8) >= ${len(params)}')
        if date_to:
            params.append(date_to)
            clauses.append(f'SUBSTRING(t."TX_DATETIME",1,8) <= ${len(params)}')
        if amount_min is not None:
            params.append(amount_min)
            clauses.append(f'ABS(t."TX_AMOUNT") >= ${len(params)}')
        if amount_max is not None:
            params.append(amount_max)
            clauses.append(f'ABS(t."TX_AMOUNT") <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."TRANSACTION" t '
            f'LEFT JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )
        # 합계 — 입금/출금 분리 (절대값 합).
        sums = await conn.fetchrow(
            f'SELECT '
            f'   COALESCE(SUM(CASE WHEN t."TX_AMOUNT" > 0 THEN t."TX_AMOUNT" ELSE 0 END), 0) AS sum_in, '
            f'   COALESCE(SUM(CASE WHEN t."TX_AMOUNT" < 0 THEN -t."TX_AMOUNT" ELSE 0 END), 0) AS sum_out '
            f'FROM public."TRANSACTION" t '
            f'LEFT JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )

        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT t."TRANSACTION_ID", t."ACCOUNT_NO", t."TX_DATETIME", '
            f'       t."TX_TYPE_CD", t."TX_AMOUNT", t."POST_TX_BALANCE", '
            f'       t."COUNTERPART_ACCOUNT_NO", t."COUNTERPART_BANK_NAME", '
            f'       t."COUNTERPART_HOLDER_NAME", t."OWN_BANK_YN", '
            f'       t."TX_CHANNEL_CD", t."TX_STATUS_CD", t."FAILURE_REASON_CD", '
            f'       t."TX_MEMO", t."CANCEL_YN", '
            f'       a."CUSTOMER_NO", a."ACCOUNT_TYPE_CD", '
            f'       p."PARTY_NAME" AS customer_name '
            f'FROM public."TRANSACTION" t '
            f'LEFT JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY t."TX_DATETIME" DESC NULLS LAST, t."TRANSACTION_ID" DESC '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [_tx_row(r) for r in rows]
    return {
        "items": items,
        "count": len(items),
        "total": int(total or 0),
        "sum_in_krw": int(sums["sum_in"] or 0),
        "sum_out_krw": int(sums["sum_out"] or 0),
    }


async def get_transaction_detail(transaction_id: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT t."TRANSACTION_ID", t."ACCOUNT_NO", t."TX_DATETIME", '
            '       t."TX_TYPE_CD", t."TX_AMOUNT", t."POST_TX_BALANCE", '
            '       t."COUNTERPART_ACCOUNT_NO", t."COUNTERPART_BANK_CD", '
            '       t."COUNTERPART_BANK_NAME", t."COUNTERPART_HOLDER_NAME", '
            '       t."OWN_BANK_YN", t."TX_CHANNEL_CD", t."TX_STATUS_CD", '
            '       t."FAILURE_REASON_CD", t."TX_MEMO", t."TRANSFER_ID", '
            '       t."EXEC_SEQ_REF", t."REPAY_SEQ_REF", t."CANCEL_YN", '
            '       t."ORIGINAL_TX_REF", t."IDEMPOTENCY_KEY", t."CREATED_AT", '
            '       a."CUSTOMER_NO", a."ACCOUNT_TYPE_CD", a."ACCOUNT_STATUS_CD", '
            '       p."PARTY_NAME" AS customer_name, c."EMAIL" '
            'FROM public."TRANSACTION" t '
            'LEFT JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE t."TRANSACTION_ID" = $1 AND t."DELETE_YN" = \'N\'',
            transaction_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 거래를 찾을 수 없어요.")

    return {
        "transaction": {
            "transaction_id": int(row["TRANSACTION_ID"]),
            "account_no": row["ACCOUNT_NO"],
            "tx_datetime": row["TX_DATETIME"],
            "tx_type_cd": row["TX_TYPE_CD"],
            "tx_amount": int(row["TX_AMOUNT"] or 0),
            "post_tx_balance": int(row["POST_TX_BALANCE"] or 0),
            "counterpart_account_no": row["COUNTERPART_ACCOUNT_NO"],
            "counterpart_bank_cd": row["COUNTERPART_BANK_CD"],
            "counterpart_bank_name": row["COUNTERPART_BANK_NAME"],
            "counterpart_holder_name": row["COUNTERPART_HOLDER_NAME"],
            "own_bank_yn": row["OWN_BANK_YN"],
            "tx_channel_cd": row["TX_CHANNEL_CD"],
            "tx_status_cd": row["TX_STATUS_CD"],
            "failure_reason_cd": row["FAILURE_REASON_CD"],
            "memo": row["TX_MEMO"],
            "transfer_id": int(row["TRANSFER_ID"]) if row["TRANSFER_ID"] is not None else None,
            "exec_seq_ref": int(row["EXEC_SEQ_REF"]) if row["EXEC_SEQ_REF"] is not None else None,
            "repay_seq_ref": int(row["REPAY_SEQ_REF"]) if row["REPAY_SEQ_REF"] is not None else None,
            "cancel_yn": row["CANCEL_YN"],
            "original_tx_ref": int(row["ORIGINAL_TX_REF"]) if row["ORIGINAL_TX_REF"] is not None else None,
            "idempotency_key": row["IDEMPOTENCY_KEY"],
            "created_at": row["CREATED_AT"],
        },
        "owner": {
            "customer_no": int(row["CUSTOMER_NO"]) if row["CUSTOMER_NO"] is not None else None,
            "customer_name": row["customer_name"],
            "customer_email": row["EMAIL"],
            "account_type_cd": row["ACCOUNT_TYPE_CD"],
            "account_status_cd": row["ACCOUNT_STATUS_CD"],
        },
    }


def _tx_row(r: Any) -> dict[str, Any]:
    return {
        "transaction_id": int(r["TRANSACTION_ID"]),
        "account_no": r["ACCOUNT_NO"],
        "account_type_cd": r["ACCOUNT_TYPE_CD"],
        "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
        "customer_name": r["customer_name"],
        "tx_datetime": r["TX_DATETIME"],
        "tx_type_cd": r["TX_TYPE_CD"],
        "tx_amount": int(r["TX_AMOUNT"] or 0),
        "post_tx_balance": int(r["POST_TX_BALANCE"] or 0),
        "counterpart_account_no": r["COUNTERPART_ACCOUNT_NO"],
        "counterpart_bank_name": r["COUNTERPART_BANK_NAME"],
        "counterpart_holder_name": r["COUNTERPART_HOLDER_NAME"],
        "own_bank_yn": r["OWN_BANK_YN"],
        "tx_channel_cd": r["TX_CHANNEL_CD"],
        "tx_status_cd": r["TX_STATUS_CD"],
        "failure_reason_cd": r["FAILURE_REASON_CD"],
        "memo": r["TX_MEMO"],
        "cancel_yn": r["CANCEL_YN"],
    }
