"""관리자 — 자동이체 운영 모니터링.

조회 흐름
- get_dashboard()
    워커 운영 현황 — 활성 건수·오늘 도래·이번 달 SUCCESS/FAIL/DELAY 집계·성공률·실패 사유 Top·가까운 도래 Top.
- list_auto_transfers(query, status_cd, cycle_cd, customer_no, account_no,
                       amount_min, amount_max, limit, offset)
    AUTO_TRANSFER 검색. 회원·계좌·이름·메모 부분 일치 + 상태/주기/금액 필터.
- get_auto_transfer_detail(auto_id)
    1건 기본 정보 + 전체 실행 이력 (SCHEDULED_DATE 역순).
- list_exec_history(status_cd, delay_reason_cd, date_from, date_to, limit, offset)
    워커 실행 이력 통합 검색 — 실패 사례 추적용.

코드 정합 (워커 + 시드 기준)
- AUTO_TRANSFER.AUTO_STATUS_CD : ACTIVE / COMPLETE / CANCEL
- AUTO_TRANSFER.CYCLE_TYPE_CD  : ONCE / MONTHLY
- AUTO_TRANSFER_EXEC.EXEC_STATUS_CD : SUCCESS / FAIL / DELAY (워커 INSERT)
- AUTO_TRANSFER_EXEC.DELAY_REASON_CD : NO_BAL / NO_ACCT / DUP / BOKCLS / INTERNAL / ERR
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError

log = structlog.get_logger("admin_auto_transfer")


async def get_dashboard() -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        # 등록 상태별 집계
        status_rows = await conn.fetch(
            'SELECT "AUTO_STATUS_CD" AS cd, COUNT(*) AS cnt '
            'FROM public."AUTO_TRANSFER" WHERE "DELETE_YN" = \'N\' '
            'GROUP BY "AUTO_STATUS_CD"'
        )
        status_map = {r["cd"]: int(r["cnt"]) for r in status_rows}

        # 오늘 도래 — 활성 + (월 자동이체 today_day 일치 or 1회성 valid_start_date == today)
        due_today = await conn.fetchval(
            'SELECT COUNT(*) FROM public."AUTO_TRANSFER" '
            'WHERE "DELETE_YN" = \'N\' AND "AUTO_STATUS_CD" = \'ACTIVE\' '
            '  AND ((("CYCLE_TYPE_CD" = \'MONTHLY\' '
            '         AND "MONTHLY_EXEC_DAY" = EXTRACT(DAY FROM CURRENT_DATE)::int) '
            '       OR ("CYCLE_TYPE_CD" = \'ONCE\' '
            '           AND "VALID_START_DATE" = to_char(CURRENT_DATE, \'YYYYMMDD\')))'
            '       AND (("VALID_END_DATE" IS NULL OR "VALID_END_DATE" = \'\') '
            '            OR "VALID_END_DATE" >= to_char(CURRENT_DATE, \'YYYYMMDD\')))'
        )

        # 이번 달 실행 결과 집계
        month_exec = await conn.fetch(
            'SELECT "EXEC_STATUS_CD" AS cd, COUNT(*) AS cnt '
            'FROM public."AUTO_TRANSFER_EXEC" '
            'WHERE "DELETE_YN" = \'N\' '
            '  AND SUBSTRING("SCHEDULED_DATE",1,6) = to_char(CURRENT_DATE, \'YYYYMM\') '
            'GROUP BY "EXEC_STATUS_CD"'
        )
        exec_map = {r["cd"]: int(r["cnt"]) for r in month_exec}

        # 실패 사유 Top — 이번 달
        delay_top_rows = await conn.fetch(
            'SELECT "DELAY_REASON_CD" AS reason, COUNT(*) AS cnt '
            'FROM public."AUTO_TRANSFER_EXEC" '
            'WHERE "DELETE_YN" = \'N\' '
            '  AND SUBSTRING("SCHEDULED_DATE",1,6) = to_char(CURRENT_DATE, \'YYYYMM\') '
            '  AND "EXEC_STATUS_CD" IN (\'FAIL\', \'DELAY\') '
            '  AND "DELAY_REASON_CD" IS NOT NULL '
            'GROUP BY "DELAY_REASON_CD" ORDER BY cnt DESC LIMIT 5'
        )

        # 가까운 도래 Top5 — MONTHLY 는 다음 도래일 가정, ONCE 는 valid_start_date
        upcoming = await conn.fetch(
            'SELECT a."AUTO_TRANSFER_ID", a."CUSTOMER_NO", a."WITHDRAW_ACCOUNT_NO", '
            '       a."DEPOSIT_ACCOUNT_NO", a."DEPOSIT_BANK_NAME", a."DEPOSIT_HOLDER_NAME", '
            '       a."TRANSFER_AMOUNT", a."CYCLE_TYPE_CD", a."MONTHLY_EXEC_DAY", '
            '       a."VALID_START_DATE", '
            '       p."PARTY_NAME" AS customer_name, '
            '       CASE '
            '         WHEN a."CYCLE_TYPE_CD" = \'ONCE\' '
            '           THEN to_date(a."VALID_START_DATE", \'YYYYMMDD\') '
            '         WHEN a."CYCLE_TYPE_CD" = \'MONTHLY\' THEN '
            '           CASE WHEN a."MONTHLY_EXEC_DAY" >= EXTRACT(DAY FROM CURRENT_DATE)::int '
            '                THEN make_date('
            '                    EXTRACT(YEAR FROM CURRENT_DATE)::int, '
            '                    EXTRACT(MONTH FROM CURRENT_DATE)::int, '
            '                    LEAST(a."MONTHLY_EXEC_DAY", 28)) '
            '                ELSE make_date('
            '                    EXTRACT(YEAR FROM (CURRENT_DATE + INTERVAL \'1 month\'))::int, '
            '                    EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL \'1 month\'))::int, '
            '                    LEAST(a."MONTHLY_EXEC_DAY", 28)) END '
            '       END AS next_due '
            'FROM public."AUTO_TRANSFER" a '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE a."DELETE_YN" = \'N\' AND a."AUTO_STATUS_CD" = \'ACTIVE\' '
            'ORDER BY next_due ASC NULLS LAST, a."AUTO_TRANSFER_ID" LIMIT 5'
        )

    success = exec_map.get("SUCCESS", 0)
    fail = exec_map.get("FAIL", 0)
    delay = exec_map.get("DELAY", 0)
    total = success + fail + delay
    success_rate = round(success / total * 100, 1) if total > 0 else None

    return {
        "active_count": status_map.get("ACTIVE", 0),
        "complete_count": status_map.get("COMPLETE", 0),
        "cancel_count": status_map.get("CANCEL", 0),
        "due_today": int(due_today or 0),
        "month_success": success,
        "month_fail": fail,
        "month_delay": delay,
        "month_success_rate": success_rate,
        "delay_reason_top": [
            {"reason_cd": r["reason"], "count": int(r["cnt"])} for r in delay_top_rows
        ],
        "upcoming": [
            {
                "auto_transfer_id": int(r["AUTO_TRANSFER_ID"]),
                "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
                "customer_name": r["customer_name"],
                "withdraw_account_no": r["WITHDRAW_ACCOUNT_NO"],
                "deposit_account_no": r["DEPOSIT_ACCOUNT_NO"],
                "deposit_bank_name": r["DEPOSIT_BANK_NAME"],
                "deposit_holder_name": r["DEPOSIT_HOLDER_NAME"],
                "transfer_amount": int(r["TRANSFER_AMOUNT"] or 0),
                "cycle_type_cd": r["CYCLE_TYPE_CD"],
                "monthly_exec_day": r["MONTHLY_EXEC_DAY"],
                "next_due_date": r["next_due"],
            }
            for r in upcoming
        ],
    }


async def list_auto_transfers(
    query: str | None = None,
    status_cd: str | None = None,
    cycle_cd: str | None = None,
    customer_no: int | None = None,
    account_no: str | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['a."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(query)
            i1, i2, i3, i4, i5 = (
                len(params) - 4, len(params) - 3, len(params) - 2,
                len(params) - 1, len(params),
            )
            clauses.append(
                f"(a.\"WITHDRAW_ACCOUNT_NO\" ILIKE ${i1} OR a.\"DEPOSIT_ACCOUNT_NO\" ILIKE ${i2} "
                f"OR a.\"DEPOSIT_HOLDER_NAME\" ILIKE ${i3} OR p.\"PARTY_NAME\" ILIKE ${i4} "
                f"OR CAST(a.\"CUSTOMER_NO\" AS TEXT) = ${i5})"
            )
        if status_cd:
            params.append(status_cd)
            clauses.append(f'a."AUTO_STATUS_CD" = ${len(params)}')
        if cycle_cd:
            params.append(cycle_cd)
            clauses.append(f'a."CYCLE_TYPE_CD" = ${len(params)}')
        if customer_no is not None:
            params.append(customer_no)
            clauses.append(f'a."CUSTOMER_NO" = ${len(params)}')
        if account_no:
            params.append(account_no)
            params.append(account_no)
            i1, i2 = len(params) - 1, len(params)
            clauses.append(f'(a."WITHDRAW_ACCOUNT_NO" = ${i1} OR a."DEPOSIT_ACCOUNT_NO" = ${i2})')
        if amount_min is not None:
            params.append(amount_min)
            clauses.append(f'a."TRANSFER_AMOUNT" >= ${len(params)}')
        if amount_max is not None:
            params.append(amount_max)
            clauses.append(f'a."TRANSFER_AMOUNT" <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."AUTO_TRANSFER" a '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )

        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT a."AUTO_TRANSFER_ID", a."CUSTOMER_NO", '
            f'       a."WITHDRAW_ACCOUNT_NO", a."DEPOSIT_ACCOUNT_NO", '
            f'       a."DEPOSIT_BANK_CD", a."DEPOSIT_BANK_NAME", a."DEPOSIT_HOLDER_NAME", '
            f'       a."TRANSFER_AMOUNT", a."CYCLE_TYPE_CD", a."MONTHLY_EXEC_DAY", '
            f'       a."VALID_START_DATE", a."VALID_END_DATE", '
            f'       a."AUTO_STATUS_CD", a."REG_CHANNEL_CD", '
            f'       a."WITHDRAW_MEMO", a."DEPOSIT_MEMO", a."CREATED_AT", '
            f'       p."PARTY_NAME" AS customer_name '
            f'FROM public."AUTO_TRANSFER" a '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY a."AUTO_TRANSFER_ID" DESC '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [_row(r) for r in rows]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_auto_transfer_detail(auto_id: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT a."AUTO_TRANSFER_ID", a."CUSTOMER_NO", '
            '       a."WITHDRAW_ACCOUNT_NO", a."DEPOSIT_ACCOUNT_NO", '
            '       a."DEPOSIT_BANK_CD", a."DEPOSIT_BANK_NAME", a."DEPOSIT_HOLDER_NAME", '
            '       a."TRANSFER_AMOUNT", a."CYCLE_TYPE_CD", a."MONTHLY_EXEC_DAY", '
            '       a."VALID_START_DATE", a."VALID_END_DATE", '
            '       a."AUTO_STATUS_CD", a."REG_CHANNEL_CD", '
            '       a."MAX_RETRY_COUNT", a."RETRY_INTERVAL_HOURS", '
            '       a."FAILURE_ACTION_CD", a."CARRY_NEXT_MONTH_YN", '
            '       a."WITHDRAW_MEMO", a."DEPOSIT_MEMO", a."CREATED_AT", '
            '       p."PARTY_NAME" AS customer_name, c."EMAIL" '
            'FROM public."AUTO_TRANSFER" a '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE a."AUTO_TRANSFER_ID" = $1 AND a."DELETE_YN" = \'N\'',
            auto_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 자동이체를 찾을 수 없어요.")

        execs = await conn.fetch(
            'SELECT "SCHEDULED_DATE", "BIZ_DAY_ADJUSTED", "EXEC_DATETIME", '
            '       "EXEC_STATUS_CD", "DELAY_REASON_CD", "TRANSFER_ID", "TRANSACTION_ID" '
            'FROM public."AUTO_TRANSFER_EXEC" '
            'WHERE "AUTO_TRANSFER_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "SCHEDULED_DATE" DESC, "EXEC_DATETIME" DESC',
            auto_id,
        )

    return {
        "auto_transfer": {
            "auto_transfer_id": int(row["AUTO_TRANSFER_ID"]),
            "customer_no": int(row["CUSTOMER_NO"]) if row["CUSTOMER_NO"] is not None else None,
            "customer_name": row["customer_name"],
            "customer_email": row["EMAIL"],
            "withdraw_account_no": row["WITHDRAW_ACCOUNT_NO"],
            "deposit_account_no": row["DEPOSIT_ACCOUNT_NO"],
            "deposit_bank_cd": row["DEPOSIT_BANK_CD"],
            "deposit_bank_name": row["DEPOSIT_BANK_NAME"],
            "deposit_holder_name": row["DEPOSIT_HOLDER_NAME"],
            "transfer_amount": int(row["TRANSFER_AMOUNT"] or 0),
            "cycle_type_cd": row["CYCLE_TYPE_CD"],
            "monthly_exec_day": row["MONTHLY_EXEC_DAY"],
            "valid_start_date": row["VALID_START_DATE"],
            "valid_end_date": row["VALID_END_DATE"],
            "auto_status_cd": row["AUTO_STATUS_CD"],
            "reg_channel_cd": row["REG_CHANNEL_CD"],
            "max_retry_count": row["MAX_RETRY_COUNT"],
            "retry_interval_hours": row["RETRY_INTERVAL_HOURS"],
            "failure_action_cd": row["FAILURE_ACTION_CD"],
            "carry_next_month_yn": row["CARRY_NEXT_MONTH_YN"],
            "withdraw_memo": row["WITHDRAW_MEMO"],
            "deposit_memo": row["DEPOSIT_MEMO"],
            "created_at": row["CREATED_AT"],
        },
        "executions": [
            {
                "scheduled_date": e["SCHEDULED_DATE"],
                "biz_day_adjusted": e["BIZ_DAY_ADJUSTED"],
                "exec_datetime": e["EXEC_DATETIME"],
                "exec_status_cd": e["EXEC_STATUS_CD"],
                "delay_reason_cd": e["DELAY_REASON_CD"],
                "transfer_id": int(e["TRANSFER_ID"]) if e["TRANSFER_ID"] is not None else None,
                "transaction_id": int(e["TRANSACTION_ID"]) if e["TRANSACTION_ID"] is not None else None,
            }
            for e in execs
        ],
    }


async def list_exec_history(
    status_cd: str | None = None,
    delay_reason_cd: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['e."DELETE_YN" = \'N\'', 'a."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if status_cd:
            params.append(status_cd)
            clauses.append(f'e."EXEC_STATUS_CD" = ${len(params)}')
        if delay_reason_cd:
            params.append(delay_reason_cd)
            clauses.append(f'e."DELAY_REASON_CD" = ${len(params)}')
        if date_from:
            params.append(date_from)
            clauses.append(f'e."SCHEDULED_DATE" >= ${len(params)}')
        if date_to:
            params.append(date_to)
            clauses.append(f'e."SCHEDULED_DATE" <= ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."AUTO_TRANSFER_EXEC" e '
            f'JOIN public."AUTO_TRANSFER" a ON a."AUTO_TRANSFER_ID" = e."AUTO_TRANSFER_ID" '
            f"WHERE {where}",
            *params,
        )

        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT e."AUTO_TRANSFER_ID", e."SCHEDULED_DATE", e."BIZ_DAY_ADJUSTED", '
            f'       e."EXEC_DATETIME", e."EXEC_STATUS_CD", e."DELAY_REASON_CD", '
            f'       e."TRANSFER_ID", e."TRANSACTION_ID", '
            f'       a."CUSTOMER_NO", a."WITHDRAW_ACCOUNT_NO", a."DEPOSIT_ACCOUNT_NO", '
            f'       a."DEPOSIT_HOLDER_NAME", a."TRANSFER_AMOUNT", '
            f'       p."PARTY_NAME" AS customer_name '
            f'FROM public."AUTO_TRANSFER_EXEC" e '
            f'JOIN public."AUTO_TRANSFER" a ON a."AUTO_TRANSFER_ID" = e."AUTO_TRANSFER_ID" '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY e."SCHEDULED_DATE" DESC, e."EXEC_DATETIME" DESC NULLS LAST, '
            f'         e."AUTO_TRANSFER_ID" DESC '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [
        {
            "auto_transfer_id": int(r["AUTO_TRANSFER_ID"]),
            "scheduled_date": r["SCHEDULED_DATE"],
            "biz_day_adjusted": r["BIZ_DAY_ADJUSTED"],
            "exec_datetime": r["EXEC_DATETIME"],
            "exec_status_cd": r["EXEC_STATUS_CD"],
            "delay_reason_cd": r["DELAY_REASON_CD"],
            "transfer_id": int(r["TRANSFER_ID"]) if r["TRANSFER_ID"] is not None else None,
            "transaction_id": int(r["TRANSACTION_ID"]) if r["TRANSACTION_ID"] is not None else None,
            "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
            "customer_name": r["customer_name"],
            "withdraw_account_no": r["WITHDRAW_ACCOUNT_NO"],
            "deposit_account_no": r["DEPOSIT_ACCOUNT_NO"],
            "deposit_holder_name": r["DEPOSIT_HOLDER_NAME"],
            "transfer_amount": int(r["TRANSFER_AMOUNT"] or 0),
        }
        for r in rows
    ]
    return {"items": items, "count": len(items), "total": int(total or 0)}


def _row(r: Any) -> dict[str, Any]:
    return {
        "auto_transfer_id": int(r["AUTO_TRANSFER_ID"]),
        "customer_no": int(r["CUSTOMER_NO"]) if r["CUSTOMER_NO"] is not None else None,
        "customer_name": r["customer_name"],
        "withdraw_account_no": r["WITHDRAW_ACCOUNT_NO"],
        "deposit_account_no": r["DEPOSIT_ACCOUNT_NO"],
        "deposit_bank_cd": r["DEPOSIT_BANK_CD"],
        "deposit_bank_name": r["DEPOSIT_BANK_NAME"],
        "deposit_holder_name": r["DEPOSIT_HOLDER_NAME"],
        "transfer_amount": int(r["TRANSFER_AMOUNT"] or 0),
        "cycle_type_cd": r["CYCLE_TYPE_CD"],
        "monthly_exec_day": r["MONTHLY_EXEC_DAY"],
        "valid_start_date": r["VALID_START_DATE"],
        "valid_end_date": r["VALID_END_DATE"],
        "auto_status_cd": r["AUTO_STATUS_CD"],
        "reg_channel_cd": r["REG_CHANNEL_CD"],
        "withdraw_memo": r["WITHDRAW_MEMO"],
        "deposit_memo": r["DEPOSIT_MEMO"],
        "created_at": r["CREATED_AT"],
    }
