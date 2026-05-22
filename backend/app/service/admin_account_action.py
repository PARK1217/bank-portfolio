"""관리자 — 계좌 강제 변경 액션.

- change_account_status(account_no, new_status_cd, reason_cd, remark, employee_no)
    ACCOUNT.ACCOUNT_STATUS_CD 즉시 변경 + ACCOUNT_STATUS_HISTORY (event=STATUS_CHANGE).
- reset_pwd_error(account_no, remark, employee_no)
    ACCOUNT.PWD_ERROR_COUNT = 0 + ACCOUNT_STATUS_HISTORY (event=PWD_ERROR_RESET).
- force_change_limit(account_no, limit_type_cd, new_limit_krw, reason_cd, remark, employee_no)
    ACCOUNT.DAILY_*_LIMIT 즉시 변경 + ACCOUNT_LIMIT_CHANGE_REQUEST INSERT
    (VERIFY_METHOD_CD='ADMIN', STATUS_CD='APPLIED', APPLIED_DATETIME=NOW()).
- list_account_status_history(account_no, limit)
- list_account_limit_history(account_no, limit)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_account_action")


# 실 시드에 있는 코드: NORMAL / 5050 / LIMITED. LOCKED·DORMANT 는 운영상 추가.
ALLOWED_ACCT_STATUSES = {"NORMAL", "5050", "LIMITED", "LOCKED", "DORMANT", "CLOSED"}
ALLOWED_LIMIT_TYPES = {"DAILY_WITHDRAW", "DAILY_TRANSFER"}

# 한도 cap — 너무 큰 수 차단 (운영자 실수 가드). 10억.
MAX_LIMIT_KRW = 1_000_000_000


def _now14() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


async def change_account_status(
    account_no: str,
    new_status_cd: str,
    reason_cd: str | None,
    remark: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if new_status_cd not in ALLOWED_ACCT_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태 코드: {new_status_cd}")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                'SELECT "ACCOUNT_STATUS_CD" FROM public."ACCOUNT" '
                'WHERE "ACCOUNT_NO" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                account_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "해당 계좌를 찾을 수 없어요.")
            old = row["ACCOUNT_STATUS_CD"]
            if old == new_status_cd:
                raise BusinessError(E_VALIDATION, "이미 같은 상태입니다.")

            await conn.execute(
                'UPDATE public."ACCOUNT" SET "ACCOUNT_STATUS_CD" = $1, '
                '"UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
                'WHERE "ACCOUNT_NO" = $3',
                new_status_cd, employee_no, account_no,
            )
            history_id = await conn.fetchval(
                'INSERT INTO public."ACCOUNT_STATUS_HISTORY" '
                '("ACCOUNT_NO","EVENT_DATETIME","EVENT_TYPE_CD",'
                ' "OLD_VALUE","NEW_VALUE","REASON_CD","REMARK","EMPLOYEE_NO") '
                "VALUES ($1,$2,'STATUS_CHANGE',$3,$4,$5,$6,$7) RETURNING \"HISTORY_ID\"",
                account_no, _now14(), old, new_status_cd, reason_cd, remark, employee_no,
            )

    log.info(
        "account_status_changed",
        account_no=account_no, old=old, new=new_status_cd,
        by=employee_no, history_id=int(history_id),
    )
    return {
        "history_id": int(history_id),
        "account_no": account_no,
        "old_status_cd": old,
        "new_status_cd": new_status_cd,
    }


async def reset_pwd_error(
    account_no: str,
    remark: str | None,
    employee_no: str,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                'SELECT "PWD_ERROR_COUNT" FROM public."ACCOUNT" '
                'WHERE "ACCOUNT_NO" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                account_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "해당 계좌를 찾을 수 없어요.")
            old = int(row["PWD_ERROR_COUNT"] or 0)
            if old == 0:
                raise BusinessError(E_VALIDATION, "이미 오류 횟수가 0 입니다.")

            await conn.execute(
                'UPDATE public."ACCOUNT" SET "PWD_ERROR_COUNT" = 0, '
                '"UPDATED_BY" = $1, "UPDATED_AT" = NOW() '
                'WHERE "ACCOUNT_NO" = $2',
                employee_no, account_no,
            )
            history_id = await conn.fetchval(
                'INSERT INTO public."ACCOUNT_STATUS_HISTORY" '
                '("ACCOUNT_NO","EVENT_DATETIME","EVENT_TYPE_CD",'
                ' "OLD_VALUE","NEW_VALUE","REASON_CD","REMARK","EMPLOYEE_NO") '
                "VALUES ($1,$2,'PWD_ERROR_RESET',$3,'0','UNLOCK',$4,$5) RETURNING \"HISTORY_ID\"",
                account_no, _now14(), str(old), remark, employee_no,
            )

    log.info(
        "account_pwd_error_reset",
        account_no=account_no, old=old, by=employee_no, history_id=int(history_id),
    )
    return {
        "history_id": int(history_id),
        "account_no": account_no,
        "old_pwd_error_count": old,
    }


async def force_change_limit(
    account_no: str,
    limit_type_cd: str,
    new_limit_krw: int,
    reason_cd: str | None,
    remark: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if limit_type_cd not in ALLOWED_LIMIT_TYPES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 한도 유형: {limit_type_cd}")
    if new_limit_krw < 0 or new_limit_krw > MAX_LIMIT_KRW:
        raise BusinessError(E_VALIDATION, f"한도는 0 ~ {MAX_LIMIT_KRW:,}원 범위여야 합니다.")

    col = "DAILY_WITHDRAW_LIMIT" if limit_type_cd == "DAILY_WITHDRAW" else "DAILY_TRANSFER_LIMIT"

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                f'SELECT "CUSTOMER_NO", "{col}" AS old_limit FROM public."ACCOUNT" '
                'WHERE "ACCOUNT_NO" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                account_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "해당 계좌를 찾을 수 없어요.")
            old_limit = int(row["old_limit"] or 0)
            if old_limit == new_limit_krw:
                raise BusinessError(E_VALIDATION, "이미 같은 한도입니다.")
            customer_no = int(row["CUSTOMER_NO"]) if row["CUSTOMER_NO"] is not None else None
            if customer_no is None:
                raise BusinessError(E_VALIDATION, "계좌 소유 회원을 확인할 수 없어요.")

            await conn.execute(
                f'UPDATE public."ACCOUNT" SET "{col}" = $1, '
                '"UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
                'WHERE "ACCOUNT_NO" = $3',
                new_limit_krw, employee_no, account_no,
            )
            # 기존 ACCOUNT_LIMIT_CHANGE_REQUEST 재활용 — APPLIED 즉시 처리.
            request_id = await conn.fetchval(
                'INSERT INTO public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
                '("CUSTOMER_NO","ACCOUNT_NO","LIMIT_TYPE_CD","OLD_LIMIT_KRW","NEW_LIMIT_KRW",'
                ' "APPLY_DATETIME","APPLIED_DATETIME","STATUS_CD","VERIFY_METHOD_CD","REMARK") '
                "VALUES ($1,$2,$3,$4,$5,NOW(),NOW(),'APPLIED','ADMIN',$6) "
                'RETURNING "REQUEST_ID"',
                customer_no, account_no, limit_type_cd, old_limit, new_limit_krw,
                remark or reason_cd,
            )

    log.info(
        "account_limit_force_changed",
        account_no=account_no, limit_type_cd=limit_type_cd,
        old=old_limit, new=new_limit_krw,
        by=employee_no, request_id=int(request_id),
    )
    return {
        "request_id": int(request_id),
        "account_no": account_no,
        "limit_type_cd": limit_type_cd,
        "old_limit_krw": old_limit,
        "new_limit_krw": new_limit_krw,
    }


async def list_account_status_history(account_no: str, limit: int = 50) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "HISTORY_ID","EVENT_DATETIME","EVENT_TYPE_CD","OLD_VALUE","NEW_VALUE",'
            '       "REASON_CD","REMARK","EMPLOYEE_NO","CREATED_AT" '
            'FROM public."ACCOUNT_STATUS_HISTORY" '
            'WHERE "ACCOUNT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "EVENT_DATETIME" DESC, "HISTORY_ID" DESC LIMIT $2',
            account_no, limit,
        )
    return [
        {
            "history_id": int(r["HISTORY_ID"]),
            "event_datetime": r["EVENT_DATETIME"],
            "event_type_cd": r["EVENT_TYPE_CD"],
            "old_value": r["OLD_VALUE"],
            "new_value": r["NEW_VALUE"],
            "reason_cd": r["REASON_CD"],
            "remark": r["REMARK"],
            "employee_no": r["EMPLOYEE_NO"],
        }
        for r in rows
    ]


async def list_account_limit_history(account_no: str, limit: int = 50) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "REQUEST_ID","LIMIT_TYPE_CD","OLD_LIMIT_KRW","NEW_LIMIT_KRW",'
            '       "STATUS_CD","VERIFY_METHOD_CD","REQUEST_DATETIME","APPLY_DATETIME",'
            '       "APPLIED_DATETIME","CANCELED_DATETIME","REMARK" '
            'FROM public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
            'WHERE "ACCOUNT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "REQUEST_DATETIME" DESC LIMIT $2',
            account_no, limit,
        )
    return [
        {
            "request_id": int(r["REQUEST_ID"]),
            "limit_type_cd": r["LIMIT_TYPE_CD"],
            "old_limit_krw": int(r["OLD_LIMIT_KRW"] or 0),
            "new_limit_krw": int(r["NEW_LIMIT_KRW"] or 0),
            "status_cd": r["STATUS_CD"],
            "verify_method_cd": r["VERIFY_METHOD_CD"],
            "request_datetime": r["REQUEST_DATETIME"],
            "apply_datetime": r["APPLY_DATETIME"],
            "applied_datetime": r["APPLIED_DATETIME"],
            "canceled_datetime": r["CANCELED_DATETIME"],
            "remark": r["REMARK"],
        }
        for r in rows
    ]
