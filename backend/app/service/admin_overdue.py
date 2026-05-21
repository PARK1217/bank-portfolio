"""관리자 — 회원별 연체 추적 (Phase 6 §9.2.5).

조회 흐름
- list_overdue_customers()
    LOAN_REPAY_SCHEDULE.SCHEDULE_STATUS_CD = 'OVERDUE' 회차를 고객 단위로 집계.
    반환: 고객별 1행 (이름·연체 건수·총 연체 금액·최대 연체 일수·대출 계약 수).
- get_overdue_detail(customer_no)
    해당 고객의 LOAN_CONTRACT 목록 + 각 계약의 회차별 상태(SCHEDULED_DATE/금액/상태).
    OVERDUE 회차의 days_overdue 는 (CURRENT_DATE - to_date(SCHEDULED_DATE)) 로 산출.

연체 일수 계산은 LOAN_REPAY_SCHEDULE.SCHEDULED_DATE(varchar yyyymmdd) 와
서버 CURRENT_DATE 의 차이. v53 스키마에 OVERDUE_DAYS 컬럼이 따로 없어
실시간 계산이 가이드 §9.2.5 와 정합.
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError

log = structlog.get_logger("admin_overdue")


async def list_overdue_customers(limit: int = 100) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT lc."CUSTOMER_NO"                                   AS customer_no, '
            '       COALESCE(p."PARTY_NAME", \'-\')                    AS name, '
            '       count(*)                                          AS overdue_count, '
            '       count(DISTINCT lc."LOAN_CONTRACT_NO")              AS loan_contract_count, '
            '       SUM(lrs."SCHEDULED_TOTAL")                         AS overdue_amount_krw, '
            '       SUM(lrs."SCHEDULED_PRINCIPAL")                     AS overdue_principal_krw, '
            '       MAX(CURRENT_DATE - to_date(lrs."SCHEDULED_DATE",\'YYYYMMDD\')) '
            '                                                          AS max_overdue_days, '
            '       MIN(lrs."SCHEDULED_DATE")                          AS earliest_overdue_date '
            'FROM public."LOAN_REPAY_SCHEDULE" lrs '
            'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrs."LOAN_CONTRACT_NO" '
            'JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = lc."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE lrs."SCHEDULE_STATUS_CD" = \'OVERDUE\' '
            '  AND lrs."DELETE_YN" = \'N\' '
            '  AND lc."DELETE_YN" = \'N\' '
            '  AND c."DELETE_YN" = \'N\' '
            'GROUP BY lc."CUSTOMER_NO", p."PARTY_NAME" '
            'ORDER BY max_overdue_days DESC, overdue_amount_krw DESC '
            'LIMIT $1',
            limit,
        )
    return [
        {
            "customer_no": int(r["customer_no"]),
            "name": r["name"],
            "overdue_count": int(r["overdue_count"]),
            "loan_contract_count": int(r["loan_contract_count"]),
            "overdue_amount_krw": int(r["overdue_amount_krw"] or 0),
            "overdue_principal_krw": int(r["overdue_principal_krw"] or 0),
            "max_overdue_days": int(r["max_overdue_days"] or 0),
            "earliest_overdue_date": r["earliest_overdue_date"],
        }
        for r in rows
    ]


async def get_overdue_detail(customer_no: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        cust = await conn.fetchrow(
            'SELECT c."CUSTOMER_NO", c."EMAIL", c."CUST_GRADE_CD", c."CUST_STATUS_CD", '
            '       COALESCE(p."PARTY_NAME", \'-\') AS name '
            'FROM public."CUSTOMER" c '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE c."CUSTOMER_NO" = $1 AND c."DELETE_YN" = \'N\'',
            customer_no,
        )
        if cust is None:
            raise NotFoundError(E_NOT_FOUND, "해당 회원을 찾을 수 없어요.")

        contracts = await conn.fetch(
            'SELECT "LOAN_CONTRACT_NO","PRODUCT_NAME_SNAPSHOT","LOAN_TYPE_CD",'
            '       "CONTRACT_LIMIT","CURRENT_USAGE","CONTRACT_RATE","OVERDUE_SPREAD_RATE",'
            '       "LOAN_STATUS_CD","OVERDUE_STAGE_CD","CONTRACT_DATE","MATURITY_DATE" '
            'FROM public."LOAN_CONTRACT" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "CONTRACT_DATE" DESC',
            customer_no,
        )

        contract_list: list[dict[str, Any]] = []
        for c in contracts:
            schedules = await conn.fetch(
                'SELECT "INSTALLMENT_NO","SCHEDULED_DATE",'
                '       "SCHEDULED_PRINCIPAL","SCHEDULED_INTEREST","SCHEDULED_TOTAL",'
                '       "SCHEDULE_STATUS_CD",'
                '       CASE WHEN "SCHEDULE_STATUS_CD" = \'OVERDUE\' '
                '            THEN CURRENT_DATE - to_date("SCHEDULED_DATE",\'YYYYMMDD\') '
                '            ELSE NULL END AS days_overdue '
                'FROM public."LOAN_REPAY_SCHEDULE" '
                'WHERE "LOAN_CONTRACT_NO" = $1 AND "DELETE_YN" = \'N\' '
                'ORDER BY "INSTALLMENT_NO"',
                c["LOAN_CONTRACT_NO"],
            )
            overdue_rows = [s for s in schedules if s["SCHEDULE_STATUS_CD"] == "OVERDUE"]
            contract_list.append({
                "loan_contract_no": c["LOAN_CONTRACT_NO"],
                "product_name": c["PRODUCT_NAME_SNAPSHOT"] or "",
                "loan_type_cd": c["LOAN_TYPE_CD"] or "",
                "contract_limit": int(c["CONTRACT_LIMIT"] or 0),
                "current_usage": int(c["CURRENT_USAGE"] or 0),
                "contract_rate": float(c["CONTRACT_RATE"] or 0),
                "overdue_spread_rate": float(c["OVERDUE_SPREAD_RATE"] or 0),
                "loan_status_cd": c["LOAN_STATUS_CD"] or "",
                "overdue_stage_cd": c["OVERDUE_STAGE_CD"],
                "contract_date": c["CONTRACT_DATE"],
                "maturity_date": c["MATURITY_DATE"],
                "overdue_count": len(overdue_rows),
                "overdue_amount_krw": sum(int(s["SCHEDULED_TOTAL"] or 0) for s in overdue_rows),
                "max_overdue_days": max((s["days_overdue"] or 0 for s in overdue_rows), default=0),
                "schedules": [
                    {
                        "installment_no": int(s["INSTALLMENT_NO"]),
                        "scheduled_date": s["SCHEDULED_DATE"],
                        "scheduled_principal": int(s["SCHEDULED_PRINCIPAL"] or 0),
                        "scheduled_interest": int(s["SCHEDULED_INTEREST"] or 0),
                        "scheduled_total": int(s["SCHEDULED_TOTAL"] or 0),
                        "status_cd": s["SCHEDULE_STATUS_CD"] or "",
                        "days_overdue": s["days_overdue"],
                    }
                    for s in schedules
                ],
            })

    return {
        "customer": {
            "customer_no": int(cust["CUSTOMER_NO"]),
            "name": cust["name"],
            "email": cust["EMAIL"],
            "grade_cd": cust["CUST_GRADE_CD"],
            "status_cd": cust["CUST_STATUS_CD"],
        },
        "contracts": contract_list,
    }