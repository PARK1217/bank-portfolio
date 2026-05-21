"""계좌 한도 변경 신청 서비스 — ACCOUNT_LIMIT_CHANGE_REQUEST CRUD + 7일 만료 적용.

약관 근거: 자유입출금 통장 특약 §4(2), 자유입출금예금 §5(2) — 7일 점검 기간.

흐름:
  apply_for_change()  : OTP 검증 → PENDING INSERT (apply_datetime = now+7일)
  status_for_account(): 현재 한도 + PENDING/최근 이력 조회
  cancel_pending()    : 본인이 PENDING 행을 CANCELED 로 전환
  sweep_due()         : APPLY_DATETIME 경과 PENDING → APPLIED + ACCOUNT 컬럼 갱신 (배치/요청 진입 시 옵션 호출)

LIMIT_TYPE_CD → ACCOUNT 컬럼 매핑:
  DAILY_WITHDRAW → ACCOUNT.DAILY_WITHDRAW_LIMIT
  DAILY_TRANSFER → ACCOUNT.DAILY_TRANSFER_LIMIT
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pyotp
import structlog

from ..db import get_pool
from ..errors import E_IDEMPOTENCY_CONFLICT, E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, ConflictError, NotFoundError
from .notification import insert_notification as _insert_notification


log = structlog.get_logger("limit_change")


_REVIEW_DAYS = 7

_TYPE_TO_COL = {
    "DAILY_WITHDRAW": "DAILY_WITHDRAW_LIMIT",
    "DAILY_TRANSFER": "DAILY_TRANSFER_LIMIT",
}


def _days_remaining(apply_dt: datetime) -> int:
    """올림 일수 — 23h 남았어도 1일로 표시."""
    delta = apply_dt - datetime.now()
    if delta.total_seconds() <= 0:
        return 0
    return (delta.days + (1 if delta.seconds > 0 else 0))


def _row_to_item(r) -> dict:
    apply_dt = r["APPLY_DATETIME"]
    item = {
        "request_id": int(r["REQUEST_ID"]),
        "account_no": r["ACCOUNT_NO"],
        "limit_type_cd": r["LIMIT_TYPE_CD"],
        "old_limit_krw": int(r["OLD_LIMIT_KRW"]) if r["OLD_LIMIT_KRW"] is not None else None,
        "new_limit_krw": int(r["NEW_LIMIT_KRW"]),
        "request_datetime": r["REQUEST_DATETIME"],
        "apply_datetime": apply_dt,
        "applied_datetime": r["APPLIED_DATETIME"],
        "canceled_datetime": r["CANCELED_DATETIME"],
        "status_cd": r["STATUS_CD"],
        "verify_method_cd": r["VERIFY_METHOD_CD"],
        "days_remaining": _days_remaining(apply_dt) if r["STATUS_CD"] == "PENDING" else 0,
    }
    return item


async def _resolve_account(conn, customer_no: int, account_no: str) -> dict:
    row = await conn.fetchrow(
        'SELECT "ACCOUNT_NO", "DAILY_WITHDRAW_LIMIT", "DAILY_TRANSFER_LIMIT" '
        'FROM public."ACCOUNT" '
        'WHERE "CUSTOMER_NO" = $1 AND "ACCOUNT_NO" = $2 AND "DELETE_YN" = \'N\'',
        customer_no,
        account_no,
    )
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "계좌를 찾을 수 없습니다.")
    return dict(row)


def _verify_otp(customer_no: int, otp_code: str) -> None:
    # auth.py 의 in-memory secret store 공유 (운영은 CUSTOMER.OTP_SECRET 영구화)
    from ..api.auth import _otp_secrets  # type: ignore[attr-defined]
    entry = _otp_secrets.get(customer_no)
    if not entry or not entry.get("active"):
        raise BusinessError(
            E_VALIDATION,
            "한도 변경에는 OTP 등록이 필요해요. 보안 설정에서 OTP 를 먼저 등록해 주세요.",
        )
    if not pyotp.TOTP(entry["secret"]).verify(otp_code):
        raise BusinessError(E_VALIDATION, "OTP 코드가 올바르지 않습니다.")


# ---------------------------------------------------------------------------
# 신청
# ---------------------------------------------------------------------------

async def apply_for_change(
    *,
    customer_no: int,
    account_no: str,
    limit_type_cd: str,
    new_limit_krw: int,
    otp_code: str,
) -> dict:
    if limit_type_cd not in _TYPE_TO_COL:
        raise BusinessError(E_VALIDATION, "지원하지 않는 한도 종류입니다.")
    _verify_otp(customer_no, otp_code)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            acct = await _resolve_account(conn, customer_no, account_no)
            col = _TYPE_TO_COL[limit_type_cd]
            old_limit = acct[col]

            if old_limit is not None and int(old_limit) == int(new_limit_krw):
                raise BusinessError(E_VALIDATION, "현재 한도와 동일합니다.")

            existing = await conn.fetchval(
                'SELECT "REQUEST_ID" FROM public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
                'WHERE "ACCOUNT_NO" = $1 AND "LIMIT_TYPE_CD" = $2 '
                'AND "STATUS_CD" = \'PENDING\' AND "DELETE_YN" = \'N\'',
                account_no,
                limit_type_cd,
            )
            if existing:
                raise ConflictError(
                    E_IDEMPOTENCY_CONFLICT,
                    "이미 진행 중인 한도 변경 신청이 있습니다. 점검 기간 종료 후 다시 신청해 주세요.",
                )

            apply_dt = datetime.now() + timedelta(days=_REVIEW_DAYS)
            request_id = await conn.fetchval(
                'INSERT INTO public."ACCOUNT_LIMIT_CHANGE_REQUEST" ('
                '  "CUSTOMER_NO", "ACCOUNT_NO", "LIMIT_TYPE_CD", '
                '  "OLD_LIMIT_KRW", "NEW_LIMIT_KRW", "APPLY_DATETIME", '
                '  "STATUS_CD", "VERIFY_METHOD_CD"'
                ") VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 'OTP') "
                'RETURNING "REQUEST_ID"',
                customer_no,
                account_no,
                limit_type_cd,
                int(old_limit) if old_limit is not None else None,
                int(new_limit_krw),
                apply_dt,
            )

    label = "이체 한도" if limit_type_cd == "DAILY_TRANSFER" else "출금 한도"
    try:
        await _insert_notification(
            customer_no,
            type_cd="SECURITY",
            title=f"{label} 변경 신청 접수",
            body=(
                f"{account_no} 계좌의 {label} 변경 신청이 접수되었습니다. "
                f"{_REVIEW_DAYS}일 점검 후 자동 적용됩니다."
            ),
            link_url="/security/transfer-limit",
            reference_id=int(request_id),
            reference_type="LIMIT_CHANGE",
        )
    except Exception:
        log.exception("limit_change_notification_failed", request_id=request_id)

    log.info(
        "limit_change_requested",
        customer_no=customer_no,
        account_no=account_no,
        limit_type_cd=limit_type_cd,
        new_limit_krw=int(new_limit_krw),
        request_id=int(request_id),
    )

    return {
        "request_id": int(request_id),
        "apply_datetime": apply_dt,
        "days_until_apply": _REVIEW_DAYS,
    }


# ---------------------------------------------------------------------------
# 상태 조회
# ---------------------------------------------------------------------------

async def status_for_account(*, customer_no: int, account_no: str) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        acct = await _resolve_account(conn, customer_no, account_no)
        rows = await conn.fetch(
            'SELECT "REQUEST_ID", "ACCOUNT_NO", "LIMIT_TYPE_CD", "OLD_LIMIT_KRW", '
            '"NEW_LIMIT_KRW", "REQUEST_DATETIME", "APPLY_DATETIME", "APPLIED_DATETIME", '
            '"CANCELED_DATETIME", "STATUS_CD", "VERIFY_METHOD_CD" '
            'FROM public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
            'WHERE "CUSTOMER_NO" = $1 AND "ACCOUNT_NO" = $2 AND "DELETE_YN" = \'N\' '
            'ORDER BY "REQUEST_DATETIME" DESC LIMIT 20',
            customer_no,
            account_no,
        )

    items = [_row_to_item(r) for r in rows]
    pending = [it for it in items if it["status_cd"] == "PENDING"]
    history = [it for it in items if it["status_cd"] != "PENDING"]
    return {
        "current_daily_withdraw_krw": (
            int(acct["DAILY_WITHDRAW_LIMIT"]) if acct["DAILY_WITHDRAW_LIMIT"] is not None else None
        ),
        "current_daily_transfer_krw": (
            int(acct["DAILY_TRANSFER_LIMIT"]) if acct["DAILY_TRANSFER_LIMIT"] is not None else None
        ),
        "pending": pending,
        "history": history,
    }


# ---------------------------------------------------------------------------
# 취소
# ---------------------------------------------------------------------------

async def cancel_pending(*, customer_no: int, account_no: str, request_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                'SELECT "REQUEST_ID", "STATUS_CD" FROM public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
                'WHERE "REQUEST_ID" = $1 AND "CUSTOMER_NO" = $2 '
                'AND "ACCOUNT_NO" = $3 AND "DELETE_YN" = \'N\' FOR UPDATE',
                int(request_id),
                customer_no,
                account_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "신청 내역을 찾을 수 없습니다.")
            if row["STATUS_CD"] != "PENDING":
                raise BusinessError(
                    E_VALIDATION, "이미 적용되었거나 취소된 신청은 취소할 수 없습니다."
                )
            await conn.execute(
                'UPDATE public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
                'SET "STATUS_CD" = \'CANCELED\', "CANCELED_DATETIME" = CURRENT_TIMESTAMP, '
                '"UPDATED_AT" = CURRENT_TIMESTAMP WHERE "REQUEST_ID" = $1',
                int(request_id),
            )
    log.info(
        "limit_change_canceled",
        customer_no=customer_no,
        account_no=account_no,
        request_id=int(request_id),
    )


# ---------------------------------------------------------------------------
# 만료 적용 (배치/엔드포인트 호출 모두 동일 진입점)
# ---------------------------------------------------------------------------

async def sweep_due() -> int:
    """APPLY_DATETIME 경과 PENDING 행을 APPLIED 로 전환 + ACCOUNT 컬럼 갱신. 반환: 처리 건수."""
    pool = get_pool()
    applied_count = 0
    async with pool.acquire() as conn:
        async with conn.transaction():
            due = await conn.fetch(
                'SELECT "REQUEST_ID", "CUSTOMER_NO", "ACCOUNT_NO", "LIMIT_TYPE_CD", "NEW_LIMIT_KRW" '
                'FROM public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
                'WHERE "STATUS_CD" = \'PENDING\' AND "DELETE_YN" = \'N\' '
                'AND "APPLY_DATETIME" <= CURRENT_TIMESTAMP '
                'FOR UPDATE SKIP LOCKED',
            )
            for r in due:
                col = _TYPE_TO_COL.get(r["LIMIT_TYPE_CD"])
                if not col:
                    continue
                await conn.execute(
                    f'UPDATE public."ACCOUNT" SET "{col}" = $1, "UPDATED_AT" = NOW() '
                    'WHERE "ACCOUNT_NO" = $2 AND "DELETE_YN" = \'N\'',
                    int(r["NEW_LIMIT_KRW"]),
                    r["ACCOUNT_NO"],
                )
                await conn.execute(
                    'UPDATE public."ACCOUNT_LIMIT_CHANGE_REQUEST" '
                    'SET "STATUS_CD" = \'APPLIED\', "APPLIED_DATETIME" = CURRENT_TIMESTAMP, '
                    '"UPDATED_AT" = CURRENT_TIMESTAMP WHERE "REQUEST_ID" = $1',
                    int(r["REQUEST_ID"]),
                )
                try:
                    label = "이체 한도" if r["LIMIT_TYPE_CD"] == "DAILY_TRANSFER" else "출금 한도"
                    await _insert_notification(
                        int(r["CUSTOMER_NO"]),
                        type_cd="SECURITY",
                        title=f"{label} 변경 적용 완료",
                        body=f"{r['ACCOUNT_NO']} 계좌의 {label}가 {int(r['NEW_LIMIT_KRW']):,}원으로 적용되었습니다.",
                        link_url="/security/transfer-limit",
                        reference_id=int(r["REQUEST_ID"]),
                        reference_type="LIMIT_CHANGE",
                    )
                except Exception:
                    log.exception("limit_change_applied_notify_failed", request_id=int(r["REQUEST_ID"]))
                applied_count += 1
    if applied_count:
        log.info("limit_change_sweep", applied=applied_count)
    return applied_count