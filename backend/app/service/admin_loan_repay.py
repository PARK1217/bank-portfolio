"""관리자 — 대출 상환 목록·상세 조회.

조회 흐름
- list_repayments(query, repay_type_cd, channel_cd, status_cd, date_from, date_to, limit, offset)
    LOAN_REPAY_HISTORY 를 회원/상품/계약 정보와 함께 시간 역순 나열.
    검색: 계약번호 / 회원번호 / 회원이름 부분 일치.
    필터: REPAY_TYPE_CD(SCHEDULE/PREPAY/OVERDUE) · CHANNEL_CD(APP/COUNTER/AUTO) ·
          REPAY_STATUS_CD(OK/CANCEL) · 일자 범위(REPAY_DATETIME yyyymmdd).
- get_contract_repayment_detail(loan_contract_no)
    계약 1건의 LOAN_CONTRACT + LOAN_REPAY_SCHEDULE 전체 회차 + LOAN_REPAY_HISTORY 전체 이력 + 합계.

코드 정합 — 실제 seed/loan.py 에서 사용 중인 값.
- LOAN_REPAY_SCHEDULE.SCHEDULE_STATUS_CD: WAITING(미래 예정) · PENDING(처리 중) · PAID(완납) · OVERDUE(연체)
- LOAN_REPAY_HISTORY.REPAY_STATUS_CD: OK(정상 적용) · CANCEL(취소)
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from .admin_loan_contract import list_exec_history

log = structlog.get_logger("admin_loan_repay")


async def get_repayments_dashboard() -> dict[str, Any]:
    """상환 메인 화면 진입 시 표시할 진행 중 현황.

    - in_progress_contracts: 활성(NORMAL/OVERDUE) 계약 수
    - overdue_installments : OVERDUE 회차 수 (전체)
    - due_today           : 오늘 도래 회차 수 (WAITING/PENDING/OVERDUE)
    - due_this_month      : 이번 달 도래 회차 수
    - overdue_top         : 최장 연체일 상위 5건 (계약 단위)
    - upcoming_top        : 가까운 도래 상위 5건
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        in_progress_contracts = await conn.fetchval(
            'SELECT COUNT(*) FROM public."LOAN_CONTRACT" '
            'WHERE "DELETE_YN" = \'N\' AND "LOAN_STATUS_CD" IN (\'NORMAL\', \'OVERDUE\')'
        )
        overdue_installments = await conn.fetchval(
            'SELECT COUNT(*) FROM public."LOAN_REPAY_SCHEDULE" '
            'WHERE "DELETE_YN" = \'N\' AND "SCHEDULE_STATUS_CD" = \'OVERDUE\''
        )
        # 오늘 도래 — to_date(SCHEDULED_DATE,'YYYYMMDD') = CURRENT_DATE
        due_today = await conn.fetchval(
            'SELECT COUNT(*) FROM public."LOAN_REPAY_SCHEDULE" '
            'WHERE "DELETE_YN" = \'N\' '
            '  AND "SCHEDULE_STATUS_CD" IN (\'WAITING\', \'PENDING\', \'OVERDUE\') '
            '  AND to_date("SCHEDULED_DATE", \'YYYYMMDD\') = CURRENT_DATE'
        )
        # 이번 달 도래
        due_this_month = await conn.fetchval(
            'SELECT COUNT(*) FROM public."LOAN_REPAY_SCHEDULE" '
            'WHERE "DELETE_YN" = \'N\' '
            '  AND "SCHEDULE_STATUS_CD" IN (\'WAITING\', \'PENDING\', \'OVERDUE\') '
            '  AND date_trunc(\'month\', to_date("SCHEDULED_DATE", \'YYYYMMDD\')) '
            '      = date_trunc(\'month\', CURRENT_DATE)'
        )

        # 최장 연체 — 계약 단위 집계, 최장 연체일 DESC
        overdue_top_rows = await conn.fetch(
            'SELECT lc."LOAN_CONTRACT_NO", lc."PRODUCT_NAME_SNAPSHOT", lc."CUSTOMER_NO", '
            '       p."PARTY_NAME" AS customer_name, '
            '       COUNT(*) AS overdue_count, '
            '       MAX(CURRENT_DATE - to_date(lrs."SCHEDULED_DATE", \'YYYYMMDD\')) AS max_days, '
            '       SUM(lrs."SCHEDULED_TOTAL") AS total_overdue_krw '
            'FROM public."LOAN_REPAY_SCHEDULE" lrs '
            'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrs."LOAN_CONTRACT_NO" '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE lrs."DELETE_YN" = \'N\' AND lc."DELETE_YN" = \'N\' '
            '  AND lrs."SCHEDULE_STATUS_CD" = \'OVERDUE\' '
            'GROUP BY lc."LOAN_CONTRACT_NO", lc."PRODUCT_NAME_SNAPSHOT", lc."CUSTOMER_NO", p."PARTY_NAME" '
            'ORDER BY max_days DESC LIMIT 5'
        )
        # 가까운 도래 — 미래 WAITING 가장 가까운 5건
        upcoming_rows = await conn.fetch(
            'SELECT lrs."LOAN_CONTRACT_NO", lrs."INSTALLMENT_NO", lrs."SCHEDULED_DATE", '
            '       lrs."SCHEDULED_TOTAL", lc."CUSTOMER_NO", '
            '       p."PARTY_NAME" AS customer_name, lc."PRODUCT_NAME_SNAPSHOT", '
            '       to_date(lrs."SCHEDULED_DATE", \'YYYYMMDD\') - CURRENT_DATE AS days_left '
            'FROM public."LOAN_REPAY_SCHEDULE" lrs '
            'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrs."LOAN_CONTRACT_NO" '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE lrs."DELETE_YN" = \'N\' AND lc."DELETE_YN" = \'N\' '
            '  AND lrs."SCHEDULE_STATUS_CD" IN (\'WAITING\', \'PENDING\') '
            '  AND to_date(lrs."SCHEDULED_DATE", \'YYYYMMDD\') >= CURRENT_DATE '
            'ORDER BY lrs."SCHEDULED_DATE" ASC LIMIT 5'
        )

    return {
        "in_progress_contracts": int(in_progress_contracts or 0),
        "overdue_installments": int(overdue_installments or 0),
        "due_today": int(due_today or 0),
        "due_this_month": int(due_this_month or 0),
        "overdue_top": [
            {
                "loan_contract_no": r["LOAN_CONTRACT_NO"],
                "product_name": r["PRODUCT_NAME_SNAPSHOT"],
                "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
                "customer_name": r["customer_name"],
                "overdue_count": int(r["overdue_count"]),
                "max_overdue_days": int(r["max_days"] or 0),
                "total_overdue_krw": int(r["total_overdue_krw"] or 0),
            }
            for r in overdue_top_rows
        ],
        "upcoming_top": [
            {
                "loan_contract_no": r["LOAN_CONTRACT_NO"],
                "installment_no": int(r["INSTALLMENT_NO"]),
                "scheduled_date": r["SCHEDULED_DATE"],
                "scheduled_total": int(r["SCHEDULED_TOTAL"] or 0),
                "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
                "customer_name": r["customer_name"],
                "product_name": r["PRODUCT_NAME_SNAPSHOT"],
                "days_left": int(r["days_left"] or 0),
            }
            for r in upcoming_rows
        ],
    }


async def list_repayments(
    query: str | None = None,
    repay_type_cd: str | None = None,
    channel_cd: str | None = None,
    status_cd: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['lrh."DELETE_YN" = \'N\'', 'lc."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(query)
            i1, i2, i3 = len(params) - 2, len(params) - 1, len(params)
            clauses.append(
                f"(lrh.\"LOAN_CONTRACT_NO\" ILIKE ${i1} OR p.\"PARTY_NAME\" ILIKE ${i2} "
                f"OR CAST(lc.\"CUSTOMER_NO\" AS TEXT) = ${i3})"
            )
        if repay_type_cd:
            params.append(repay_type_cd)
            clauses.append(f'lrh."REPAY_TYPE_CD" = ${len(params)}')
        if channel_cd:
            params.append(channel_cd)
            clauses.append(f'lrh."CHANNEL_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f'lrh."REPAY_STATUS_CD" = ${len(params)}')
        # REPAY_DATETIME 은 yyyymmddhhmmss 14자 — yyyymmdd 8자 비교는 substring(1,8).
        if date_from:
            params.append(date_from)
            clauses.append(f'SUBSTRING(lrh."REPAY_DATETIME",1,8) >= ${len(params)}')
        if date_to:
            params.append(date_to)
            clauses.append(f'SUBSTRING(lrh."REPAY_DATETIME",1,8) <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."LOAN_REPAY_HISTORY" lrh '
            f'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrh."LOAN_CONTRACT_NO" '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )

        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT lrh."LOAN_CONTRACT_NO", lrh."REPAY_SEQ", lrh."SCHEDULE_REF", '
            f'       lrh."REPAY_DATETIME", lrh."REPAY_TYPE_CD", '
            f'       lrh."REPAY_PRINCIPAL", lrh."REPAY_NORMAL_INTEREST", lrh."REPAY_OVERDUE_INTEREST", '
            f'       lrh."POST_PRINCIPAL_BALANCE", lrh."WITHDRAW_ACCOUNT_NO", lrh."CHANNEL_CD", '
            f'       lrh."REPAY_STATUS_CD", lrh."AUTO_TRANSFER_ID", '
            f'       lrh."UNPAID_NORMAL_INTEREST", lrh."UNPAID_OVERDUE_INTEREST", lrh."OVERDUE_DAYS", '
            f'       lc."CUSTOMER_NO", lc."PRODUCT_NAME_SNAPSHOT", lc."LOAN_TYPE_CD", '
            f'       p."PARTY_NAME" AS customer_name '
            f'FROM public."LOAN_REPAY_HISTORY" lrh '
            f'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrh."LOAN_CONTRACT_NO" '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY lrh."REPAY_DATETIME" DESC NULLS LAST, lrh."LOAN_CONTRACT_NO", lrh."REPAY_SEQ" DESC '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [_repay_row(r) for r in rows]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_contract_repayment_detail(loan_contract_no: str) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        contract = await conn.fetchrow(
            'SELECT lc."LOAN_CONTRACT_NO", lc."CUSTOMER_NO", lc."PRODUCT_NAME_SNAPSHOT", '
            '       lc."LOAN_TYPE_CD", lc."REPAY_METHOD_CD", lc."CONTRACT_LIMIT", lc."CURRENT_USAGE", '
            '       lc."CONTRACT_RATE", lc."OVERDUE_SPREAD_RATE", lc."LOAN_STATUS_CD", '
            '       lc."OVERDUE_STAGE_CD", lc."CONTRACT_DATE", lc."MATURITY_DATE", '
            '       lc."LOAN_ACCOUNT_NO", lc."MAIN_DEPOSIT_ACCOUNT_NO", '
            '       p."PARTY_NAME" AS customer_name, c."EMAIL" '
            'FROM public."LOAN_CONTRACT" lc '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE lc."LOAN_CONTRACT_NO" = $1 AND lc."DELETE_YN" = \'N\'',
            loan_contract_no,
        )
        if contract is None:
            raise NotFoundError(E_NOT_FOUND, "해당 대출 계약을 찾을 수 없어요.")

        schedules = await conn.fetch(
            'SELECT "INSTALLMENT_NO","SCHEDULED_DATE","SCHEDULED_PRINCIPAL","SCHEDULED_INTEREST",'
            '       "SCHEDULED_TOTAL","SCHEDULE_STATUS_CD","POST_PRINCIPAL_BALANCE","ACTUAL_REPAY_ID",'
            '       CASE WHEN "SCHEDULE_STATUS_CD" = \'OVERDUE\' '
            '            THEN CURRENT_DATE - to_date("SCHEDULED_DATE",\'YYYYMMDD\') '
            '            ELSE NULL END AS days_overdue '
            'FROM public."LOAN_REPAY_SCHEDULE" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "INSTALLMENT_NO"',
            loan_contract_no,
        )
        history = await conn.fetch(
            'SELECT "REPAY_SEQ","SCHEDULE_REF","REPAY_DATETIME","REPAY_TYPE_CD",'
            '       "REPAY_PRINCIPAL","REPAY_NORMAL_INTEREST","REPAY_OVERDUE_INTEREST",'
            '       "POST_PRINCIPAL_BALANCE","WITHDRAW_ACCOUNT_NO","CHANNEL_CD",'
            '       "REPAY_STATUS_CD","AUTO_TRANSFER_ID","UNPAID_NORMAL_INTEREST",'
            '       "UNPAID_OVERDUE_INTEREST","OVERDUE_DAYS","REMARK" '
            'FROM public."LOAN_REPAY_HISTORY" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "REPAY_SEQ"',
            loan_contract_no,
        )

    # 자금 실행 이력 — 같은 계약 detail 화면에서 함께 보여주기 위해 합쳐 반환.
    executions = await list_exec_history(loan_contract_no)

    # 합계 — 정상 적용(REPAY_STATUS_CD='OK') 만 집계. CANCEL 은 누적에서 제외.
    paid_principal = sum(int(h["REPAY_PRINCIPAL"] or 0) for h in history if h["REPAY_STATUS_CD"] == "OK")
    paid_normal = sum(int(h["REPAY_NORMAL_INTEREST"] or 0) for h in history if h["REPAY_STATUS_CD"] == "OK")
    paid_overdue = sum(int(h["REPAY_OVERDUE_INTEREST"] or 0) for h in history if h["REPAY_STATUS_CD"] == "OK")
    scheduled_remaining = sum(
        int(s["SCHEDULED_TOTAL"] or 0)
        for s in schedules
        if s["SCHEDULE_STATUS_CD"] in ("WAITING", "PENDING", "OVERDUE")
    )
    overdue_count = sum(1 for s in schedules if s["SCHEDULE_STATUS_CD"] == "OVERDUE")
    max_overdue_days = max(
        (int(s["days_overdue"] or 0) for s in schedules if s["SCHEDULE_STATUS_CD"] == "OVERDUE"),
        default=0,
    )

    return {
        "contract": {
            "loan_contract_no": contract["LOAN_CONTRACT_NO"],
            "customer_no": int(contract["CUSTOMER_NO"]) if contract["CUSTOMER_NO"] is not None else None,
            "customer_name": contract["customer_name"],
            "customer_email": contract["EMAIL"],
            "product_name": contract["PRODUCT_NAME_SNAPSHOT"],
            "loan_type_cd": contract["LOAN_TYPE_CD"],
            "repay_method_cd": contract["REPAY_METHOD_CD"],
            "contract_limit": int(contract["CONTRACT_LIMIT"] or 0),
            "current_usage": int(contract["CURRENT_USAGE"] or 0),
            "contract_rate": float(contract["CONTRACT_RATE"] or 0),
            "overdue_spread_rate": float(contract["OVERDUE_SPREAD_RATE"] or 0),
            "loan_status_cd": contract["LOAN_STATUS_CD"],
            "overdue_stage_cd": contract["OVERDUE_STAGE_CD"],
            "contract_date": contract["CONTRACT_DATE"],
            "maturity_date": contract["MATURITY_DATE"],
            "loan_account_no": contract["LOAN_ACCOUNT_NO"],
            "main_deposit_account_no": contract["MAIN_DEPOSIT_ACCOUNT_NO"],
        },
        "summary": {
            "paid_principal_krw": paid_principal,
            "paid_normal_interest_krw": paid_normal,
            "paid_overdue_interest_krw": paid_overdue,
            "paid_total_krw": paid_principal + paid_normal + paid_overdue,
            "scheduled_remaining_krw": scheduled_remaining,
            "overdue_count": overdue_count,
            "max_overdue_days": max_overdue_days,
            "installments_total": len(schedules),
            "installments_done": sum(1 for s in schedules if s["SCHEDULE_STATUS_CD"] == "PAID"),
        },
        "schedules": [
            {
                "installment_no": int(s["INSTALLMENT_NO"]),
                "scheduled_date": s["SCHEDULED_DATE"],
                "scheduled_principal": int(s["SCHEDULED_PRINCIPAL"] or 0),
                "scheduled_interest": int(s["SCHEDULED_INTEREST"] or 0),
                "scheduled_total": int(s["SCHEDULED_TOTAL"] or 0),
                "status_cd": s["SCHEDULE_STATUS_CD"],
                "post_principal_balance": int(s["POST_PRINCIPAL_BALANCE"] or 0),
                "actual_repay_id": int(s["ACTUAL_REPAY_ID"]) if s["ACTUAL_REPAY_ID"] is not None else None,
                "days_overdue": s["days_overdue"],
            }
            for s in schedules
        ],
        "history": [
            {
                "repay_seq": int(h["REPAY_SEQ"]),
                "schedule_ref": int(h["SCHEDULE_REF"]) if h["SCHEDULE_REF"] is not None else None,
                "repay_datetime": h["REPAY_DATETIME"],
                "repay_type_cd": h["REPAY_TYPE_CD"],
                "repay_principal": int(h["REPAY_PRINCIPAL"] or 0),
                "repay_normal_interest": int(h["REPAY_NORMAL_INTEREST"] or 0),
                "repay_overdue_interest": int(h["REPAY_OVERDUE_INTEREST"] or 0),
                "post_principal_balance": int(h["POST_PRINCIPAL_BALANCE"] or 0),
                "withdraw_account_no": h["WITHDRAW_ACCOUNT_NO"],
                "channel_cd": h["CHANNEL_CD"],
                "repay_status_cd": h["REPAY_STATUS_CD"],
                "auto_transfer_id": int(h["AUTO_TRANSFER_ID"]) if h["AUTO_TRANSFER_ID"] is not None else None,
                "unpaid_normal_interest": int(h["UNPAID_NORMAL_INTEREST"] or 0),
                "unpaid_overdue_interest": int(h["UNPAID_OVERDUE_INTEREST"] or 0),
                "overdue_days": int(h["OVERDUE_DAYS"]) if h["OVERDUE_DAYS"] is not None else None,
                "remark": h["REMARK"],
            }
            for h in history
        ],
        "executions": executions,
    }


def _repay_row(r: Any) -> dict[str, Any]:
    principal = int(r["REPAY_PRINCIPAL"] or 0)
    normal = int(r["REPAY_NORMAL_INTEREST"] or 0)
    overdue = int(r["REPAY_OVERDUE_INTEREST"] or 0)
    return {
        "loan_contract_no": r["LOAN_CONTRACT_NO"],
        "repay_seq": int(r["REPAY_SEQ"]),
        "schedule_ref": int(r["SCHEDULE_REF"]) if r["SCHEDULE_REF"] is not None else None,
        "repay_datetime": r["REPAY_DATETIME"],
        "repay_type_cd": r["REPAY_TYPE_CD"],
        "repay_principal": principal,
        "repay_normal_interest": normal,
        "repay_overdue_interest": overdue,
        "repay_total": principal + normal + overdue,
        "post_principal_balance": int(r["POST_PRINCIPAL_BALANCE"] or 0),
        "withdraw_account_no": r["WITHDRAW_ACCOUNT_NO"],
        "channel_cd": r["CHANNEL_CD"],
        "repay_status_cd": r["REPAY_STATUS_CD"],
        "auto_transfer_id": int(r["AUTO_TRANSFER_ID"]) if r["AUTO_TRANSFER_ID"] is not None else None,
        "unpaid_normal_interest": int(r["UNPAID_NORMAL_INTEREST"] or 0),
        "unpaid_overdue_interest": int(r["UNPAID_OVERDUE_INTEREST"] or 0),
        "overdue_days": int(r["OVERDUE_DAYS"]) if r["OVERDUE_DAYS"] is not None else None,
        "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
        "customer_name": r["customer_name"],
        "product_name": r["PRODUCT_NAME_SNAPSHOT"],
        "loan_type_cd": r["LOAN_TYPE_CD"],
    }
