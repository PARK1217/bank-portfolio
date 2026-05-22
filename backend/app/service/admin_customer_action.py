"""관리자 — 회원 강제 변경 액션.

- change_customer_status(customer_no, new_status_cd, reason_cd, remark, employee_no)
    CUSTOMER.CUST_STATUS_CD 즉시 변경 + CUSTOMER_STATUS_HISTORY 이벤트 적재.
- change_customer_grade(customer_no, new_grade_cd, reason_cd, remark, employee_no)
    CUSTOMER.CUST_GRADE_CD 즉시 변경 + 기존 CUSTOMER_GRADE_HISTORY 패턴
    (직전 행 GRADE_END_DATE 채우고 새 행 INSERT).
- list_customer_status_history(customer_no, limit)
- list_customer_grade_history(customer_no, limit)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_customer_action")


# 허용 상태/등급 — 화이트리스트. 시드에 없는 값도 운영상 가능해야 해서 명시 enum.
ALLOWED_CUST_STATUSES = {"5050", "LIMITED", "LOCKED", "DORMANT"}
ALLOWED_CUST_GRADES = {"VIP", "G100", "GENERAL", "MINOR", "SENIOR", "STUDENT"}


def _now14() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _today8() -> str:
    return datetime.now().strftime("%Y%m%d")


async def change_customer_status(
    customer_no: int,
    new_status_cd: str,
    reason_cd: str | None,
    remark: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if new_status_cd not in ALLOWED_CUST_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태 코드: {new_status_cd}")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                'SELECT "CUST_STATUS_CD" FROM public."CUSTOMER" '
                'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                customer_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "해당 회원을 찾을 수 없어요.")
            old = row["CUST_STATUS_CD"]
            if old == new_status_cd:
                raise BusinessError(E_VALIDATION, "이미 같은 상태입니다.")

            await conn.execute(
                'UPDATE public."CUSTOMER" SET "CUST_STATUS_CD" = $1, '
                '"UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $3',
                new_status_cd, employee_no, customer_no,
            )
            history_id = await conn.fetchval(
                'INSERT INTO public."CUSTOMER_STATUS_HISTORY" '
                '("CUSTOMER_NO","EVENT_DATETIME","OLD_STATUS_CD","NEW_STATUS_CD",'
                ' "REASON_CD","REMARK","EMPLOYEE_NO") '
                'VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "HISTORY_ID"',
                customer_no, _now14(), old, new_status_cd, reason_cd, remark, employee_no,
            )

    log.info(
        "customer_status_changed",
        customer_no=customer_no,
        old=old, new=new_status_cd,
        by=employee_no, history_id=int(history_id),
    )
    return {
        "history_id": int(history_id),
        "customer_no": customer_no,
        "old_status_cd": old,
        "new_status_cd": new_status_cd,
    }


async def change_customer_grade(
    customer_no: int,
    new_grade_cd: str,
    reason_cd: str | None,
    remark: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if new_grade_cd not in ALLOWED_CUST_GRADES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 등급 코드: {new_grade_cd}")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                'SELECT "CUST_GRADE_CD" FROM public."CUSTOMER" '
                'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                customer_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "해당 회원을 찾을 수 없어요.")
            old = row["CUST_GRADE_CD"]
            if old == new_grade_cd:
                raise BusinessError(E_VALIDATION, "이미 같은 등급입니다.")

            await conn.execute(
                'UPDATE public."CUSTOMER" SET "CUST_GRADE_CD" = $1, '
                '"UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $3',
                new_grade_cd, employee_no, customer_no,
            )

            today = _today8()
            # 직전 열린(END_DATE NULL) 행이 있으면 END_DATE 마감.
            await conn.execute(
                'UPDATE public."CUSTOMER_GRADE_HISTORY" '
                'SET "GRADE_END_DATE" = $1, "UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $3 AND "GRADE_END_DATE" IS NULL '
                '  AND "DELETE_YN" = \'N\'',
                today, employee_no, customer_no,
            )
            # 신규 등급 행 INSERT. PK 가 (CUSTOMER_NO, GRADE_START_DATE) 라
            # 같은 날 두 번 변경하면 PK 충돌 — ON CONFLICT 로 REMARK 만 갱신.
            await conn.execute(
                'INSERT INTO public."CUSTOMER_GRADE_HISTORY" '
                '("CUSTOMER_NO","GRADE_START_DATE","CUST_GRADE_CD","GRADE_REASON_CD",'
                ' "REMARK","CREATED_BY") '
                'VALUES ($1,$2,$3,$4,$5,$6) '
                'ON CONFLICT ("CUSTOMER_NO","GRADE_START_DATE") DO UPDATE SET '
                '  "CUST_GRADE_CD" = EXCLUDED."CUST_GRADE_CD", '
                '  "GRADE_REASON_CD" = EXCLUDED."GRADE_REASON_CD", '
                '  "REMARK" = EXCLUDED."REMARK", '
                '  "UPDATED_BY" = EXCLUDED."CREATED_BY", "UPDATED_AT" = NOW()',
                customer_no, today, new_grade_cd, reason_cd, remark, employee_no,
            )

    log.info(
        "customer_grade_changed",
        customer_no=customer_no, old=old, new=new_grade_cd, by=employee_no,
    )
    return {
        "customer_no": customer_no,
        "old_grade_cd": old,
        "new_grade_cd": new_grade_cd,
        "grade_start_date": _today8(),
    }


async def list_customer_status_history(customer_no: int, limit: int = 50) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "HISTORY_ID","EVENT_DATETIME","OLD_STATUS_CD","NEW_STATUS_CD",'
            '       "REASON_CD","REMARK","EMPLOYEE_NO","CREATED_AT" '
            'FROM public."CUSTOMER_STATUS_HISTORY" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "EVENT_DATETIME" DESC, "HISTORY_ID" DESC LIMIT $2',
            customer_no, limit,
        )
    return [
        {
            "history_id": int(r["HISTORY_ID"]),
            "event_datetime": r["EVENT_DATETIME"],
            "old_status_cd": r["OLD_STATUS_CD"],
            "new_status_cd": r["NEW_STATUS_CD"],
            "reason_cd": r["REASON_CD"],
            "remark": r["REMARK"],
            "employee_no": r["EMPLOYEE_NO"],
        }
        for r in rows
    ]


async def list_customer_grade_history(customer_no: int, limit: int = 50) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "GRADE_START_DATE","GRADE_END_DATE","CUST_GRADE_CD","GRADE_REASON_CD",'
            '       "REMARK","CREATED_BY","CREATED_AT" '
            'FROM public."CUSTOMER_GRADE_HISTORY" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "GRADE_START_DATE" DESC LIMIT $2',
            customer_no, limit,
        )
    return [
        {
            "grade_start_date": r["GRADE_START_DATE"],
            "grade_end_date": r["GRADE_END_DATE"],
            "grade_cd": r["CUST_GRADE_CD"],
            "reason_cd": r["GRADE_REASON_CD"],
            "remark": r["REMARK"],
            "created_by": r["CREATED_BY"],
        }
        for r in rows
    ]
