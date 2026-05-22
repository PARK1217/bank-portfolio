"""관리자 — 실행된 대출 계약 검색 + 실행 이력 (Phase 6 §9.2).

조회 흐름
- list_loan_contracts(query, loan_type_cd, status_cd, rate_min, rate_max,
                      date_from, date_to, repay_method_cd, limit, offset)
    LOAN_CONTRACT 를 회원/상품/계좌 정보와 함께 약정일 역순 나열.
    검색: 계약번호 / 회원번호 / 회원이름 / 상품명 부분 일치.
    필터: LOAN_TYPE_CD(TERM/CREDIT/MORTGAGE) · LOAN_STATUS_CD(NEW/NORMAL/OVERDUE/CLOSED) ·
          REPAY_METHOD_CD(EPI/OD/...) · 금리 범위 · 약정일 범위(yyyymmdd).
- list_exec_history(loan_contract_no)
    LOAN_EXEC_HISTORY 회차별 자금 실행 이력 (실행/취소).
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool

log = structlog.get_logger("admin_loan_contract")


async def list_loan_contracts(
    query: str | None = None,
    loan_type_cd: str | None = None,
    status_cd: str | None = None,
    repay_method_cd: str | None = None,
    rate_min: float | None = None,
    rate_max: float | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['lc."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(query)
            i1, i2, i3, i4 = (
                len(params) - 3,
                len(params) - 2,
                len(params) - 1,
                len(params),
            )
            clauses.append(
                f"(lc.\"LOAN_CONTRACT_NO\" ILIKE ${i1} OR p.\"PARTY_NAME\" ILIKE ${i2} "
                f"OR lc.\"PRODUCT_NAME_SNAPSHOT\" ILIKE ${i3} "
                f"OR CAST(lc.\"CUSTOMER_NO\" AS TEXT) = ${i4})"
            )
        if loan_type_cd:
            params.append(loan_type_cd)
            clauses.append(f'lc."LOAN_TYPE_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f'lc."LOAN_STATUS_CD" = ${len(params)}')
        if repay_method_cd:
            params.append(repay_method_cd)
            clauses.append(f'lc."REPAY_METHOD_CD" = ${len(params)}')
        if rate_min is not None:
            params.append(rate_min)
            clauses.append(f'lc."CONTRACT_RATE" >= ${len(params)}')
        if rate_max is not None:
            params.append(rate_max)
            clauses.append(f'lc."CONTRACT_RATE" <= ${len(params)}')
        if date_from:
            params.append(date_from)
            clauses.append(f'lc."CONTRACT_DATE" >= ${len(params)}')
        if date_to:
            params.append(date_to)
            clauses.append(f'lc."CONTRACT_DATE" <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."LOAN_CONTRACT" lc '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )

        # 잔여 한도 = CONTRACT_LIMIT - CURRENT_USAGE (음수 가드).
        # 연체 회차 수는 LOAN_REPAY_SCHEDULE 의 OVERDUE 행 count.
        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT lc."LOAN_CONTRACT_NO", lc."CUSTOMER_NO", lc."LOAN_PRODUCT_ID", '
            f'       lc."LOAN_TYPE_CD", lc."REPAY_METHOD_CD", '
            f'       lc."CONTRACT_LIMIT", lc."CURRENT_USAGE", '
            f'       lc."CONTRACT_RATE", lc."BASE_RATE", lc."SPREAD_RATE", '
            f'       lc."OVERDUE_SPREAD_RATE", lc."RATE_TYPE_CD", '
            f'       lc."CONTRACT_DATE", lc."EFFECTIVE_DATE", lc."MATURITY_DATE", '
            f'       lc."LOAN_STATUS_CD", lc."OVERDUE_STAGE_CD", '
            f'       lc."JOIN_BRANCH_CD", lc."PRODUCT_NAME_SNAPSHOT", '
            f'       lc."LOAN_ACCOUNT_NO", lc."MAIN_DEPOSIT_ACCOUNT_NO", '
            f'       lc."LOAN_PERIOD_MONTHS", lc."GRACE_PERIOD_MONTHS", '
            f'       p."PARTY_NAME" AS customer_name, '
            f'       (SELECT COUNT(*) FROM public."LOAN_REPAY_SCHEDULE" lrs '
            f'           WHERE lrs."LOAN_CONTRACT_NO" = lc."LOAN_CONTRACT_NO" '
            f'             AND lrs."SCHEDULE_STATUS_CD" = \'OVERDUE\' '
            f'             AND lrs."DELETE_YN" = \'N\') AS overdue_count '
            f'FROM public."LOAN_CONTRACT" lc '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY lc."CONTRACT_DATE" DESC NULLS LAST, lc."LOAN_CONTRACT_NO" '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [
        {
            "loan_contract_no": r["LOAN_CONTRACT_NO"],
            "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
            "customer_name": r["customer_name"],
            "product_id": int(r["LOAN_PRODUCT_ID"]) if r["LOAN_PRODUCT_ID"] is not None else None,
            "product_name": r["PRODUCT_NAME_SNAPSHOT"],
            "loan_type_cd": r["LOAN_TYPE_CD"],
            "repay_method_cd": r["REPAY_METHOD_CD"],
            "contract_limit": int(r["CONTRACT_LIMIT"] or 0),
            "current_usage": int(r["CURRENT_USAGE"] or 0),
            "available_amount": max(0, int(r["CONTRACT_LIMIT"] or 0) - int(r["CURRENT_USAGE"] or 0)),
            "contract_rate": float(r["CONTRACT_RATE"] or 0),
            "base_rate": float(r["BASE_RATE"] or 0) if r["BASE_RATE"] is not None else None,
            "spread_rate": float(r["SPREAD_RATE"] or 0) if r["SPREAD_RATE"] is not None else None,
            "overdue_spread_rate": float(r["OVERDUE_SPREAD_RATE"] or 0) if r["OVERDUE_SPREAD_RATE"] is not None else None,
            "rate_type_cd": r["RATE_TYPE_CD"],
            "loan_status_cd": r["LOAN_STATUS_CD"],
            "overdue_stage_cd": r["OVERDUE_STAGE_CD"],
            "overdue_count": int(r["overdue_count"] or 0),
            "contract_date": r["CONTRACT_DATE"],
            "effective_date": r["EFFECTIVE_DATE"],
            "maturity_date": r["MATURITY_DATE"],
            "join_branch_cd": r["JOIN_BRANCH_CD"],
            "loan_account_no": r["LOAN_ACCOUNT_NO"],
            "main_deposit_account_no": r["MAIN_DEPOSIT_ACCOUNT_NO"],
            "loan_period_months": int(r["LOAN_PERIOD_MONTHS"]) if r["LOAN_PERIOD_MONTHS"] is not None else None,
            "grace_period_months": int(r["GRACE_PERIOD_MONTHS"]) if r["GRACE_PERIOD_MONTHS"] is not None else None,
        }
        for r in rows
    ]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def list_exec_history(loan_contract_no: str) -> list[dict[str, Any]]:
    """LOAN_EXEC_HISTORY — 계약 자금 실행 이력 (mainly EXEC=실행, CANCEL_YN='Y'=취소)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "EXEC_SEQ","EXEC_DATETIME","EXEC_TYPE_CD","EXEC_AMOUNT",'
            '       "POST_EXEC_BALANCE","DEPOSIT_ACCOUNT_NO","CHANNEL_CD",'
            '       "EMP_NO","REMARK","CANCEL_YN","ORIGINAL_TX_REF" '
            'FROM public."LOAN_EXEC_HISTORY" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "EXEC_SEQ"',
            loan_contract_no,
        )
    return [
        {
            "exec_seq": int(r["EXEC_SEQ"]),
            "exec_datetime": r["EXEC_DATETIME"],
            "exec_type_cd": r["EXEC_TYPE_CD"],
            "exec_amount": int(r["EXEC_AMOUNT"] or 0),
            "post_exec_balance": int(r["POST_EXEC_BALANCE"] or 0),
            "deposit_account_no": r["DEPOSIT_ACCOUNT_NO"],
            "channel_cd": r["CHANNEL_CD"],
            "emp_no": r["EMP_NO"],
            "remark": r["REMARK"],
            "cancel_yn": r["CANCEL_YN"],
            "original_tx_ref": int(r["ORIGINAL_TX_REF"]) if r["ORIGINAL_TX_REF"] is not None else None,
        }
        for r in rows
    ]
