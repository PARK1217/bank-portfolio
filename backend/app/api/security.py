"""보안 도메인 라우터 — SC-006 계좌 비밀번호(SIMPLE_PIN) 재설정.

흐름 (3분기):
  1) 정상       : 현재 PIN 확인 + OTP → 새 PIN
  2) 잠금       : 어느 계좌라도 LIMITED_ACCOUNT_YN='Y' 또는 PWD_ERROR_COUNT>=5
                  → 현재 PIN 단계 생략, OTP → 새 PIN + 잠금 자동 해제
  3) OTP 미등록 : 영업점 방문 안내 화면 (백엔드는 단순 거부)

CUSTOMER.SIMPLE_PIN 은 고객 단위 1개이지만 잠금 카운터는 ACCOUNT 단위라,
재설정 성공 시 본인 보유 모든 계좌의 잠금 카운터/플래그를 함께 초기화한다.
"""

from __future__ import annotations

import pyotp
import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError
from ..service.auth import CurrentCustomer, current_customer
from ..service.auth.passwords import hash_password, verify_password

# auth.py 의 in-memory secret store 를 그대로 공유.
# (운영은 CUSTOMER.OTP_SECRET 영구화 — 별도 작업)
from .auth import _otp_secrets  # type: ignore[attr-defined]

router = APIRouter(prefix="/security", tags=["security"])
log = structlog.get_logger("security")


# ---------------------------------------------------------------------------
# 스키마
# ---------------------------------------------------------------------------

class SimplePinStatusResponse(BaseModel):
    otp_active: bool = Field(..., description="OTP 등록 활성 여부")
    pin_locked: bool = Field(..., description="어느 계좌라도 잠겨 있는지")
    locked_accounts: int = Field(..., description="잠긴 계좌 수")


class SimplePinResetRequest(BaseModel):
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_pin: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    current_pin: str | None = Field(
        None,
        description="잠금 상태가 아닌 경우 필수 (정상 분기). 잠금 분기에서는 OTP 만으로 재설정 허용.",
    )


class SimplePinResetResponse(BaseModel):
    success: bool = True
    unlocked_accounts: int = Field(0, description="잠금 해제된 계좌 수")


# ---------------------------------------------------------------------------
# 상태 조회
# ---------------------------------------------------------------------------

async def _count_locked_accounts(customer_no: int) -> int:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchval(
            'SELECT count(*) FROM public."ACCOUNT" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            "AND (\"LIMITED_ACCOUNT_YN\" = 'Y' OR COALESCE(\"PWD_ERROR_COUNT\", 0) >= 5)",
            customer_no,
        )
    return int(row or 0)


@router.get("/simple-pin/status", response_model=SimplePinStatusResponse)
async def simple_pin_status(
    user: CurrentCustomer = Depends(current_customer),
) -> SimplePinStatusResponse:
    entry = _otp_secrets.get(user.customer_no)
    otp_active = bool(entry and entry.get("active"))
    locked = await _count_locked_accounts(user.customer_no)
    return SimplePinStatusResponse(
        otp_active=otp_active,
        pin_locked=locked > 0,
        locked_accounts=locked,
    )


# ---------------------------------------------------------------------------
# 재설정
# ---------------------------------------------------------------------------

@router.post("/simple-pin/reset", response_model=SimplePinResetResponse)
async def simple_pin_reset(
    req: SimplePinResetRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> SimplePinResetResponse:
    # 1) OTP 등록·검증 (미등록은 즉시 거부 — 화면은 미리 영업점 안내로 분기)
    entry = _otp_secrets.get(user.customer_no)
    if not entry or not entry.get("active"):
        raise BusinessError(
            E_VALIDATION,
            "비대면 재설정에는 OTP 등록이 필요해요. 영업점을 방문해 주세요.",
        )
    if not pyotp.TOTP(entry["secret"]).verify(req.otp_code):
        raise BusinessError(E_VALIDATION, "OTP 코드가 올바르지 않습니다.")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 2) CUSTOMER.SIMPLE_PIN 조회 (잠금 여부와 무관하게 현재 해시 필요)
            row = await conn.fetchrow(
                'SELECT "SIMPLE_PIN" FROM public."CUSTOMER" '
                'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                user.customer_no,
            )
            if row is None:
                raise NotFoundError(E_NOT_FOUND, "고객 정보를 찾을 수 없어요.")

            # 3) 잠금 상태 — 어느 계좌라도 잠겨 있으면 잠금 분기
            locked_count = await conn.fetchval(
                'SELECT count(*) FROM public."ACCOUNT" '
                'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
                "AND (\"LIMITED_ACCOUNT_YN\" = 'Y' OR COALESCE(\"PWD_ERROR_COUNT\", 0) >= 5)",
                user.customer_no,
            )
            is_locked = int(locked_count or 0) > 0

            # 4) 정상 분기에서는 current_pin 필수·검증
            if not is_locked:
                if not req.current_pin:
                    raise BusinessError(E_VALIDATION, "현재 계좌 비밀번호를 입력해 주세요.")
                stored = row["SIMPLE_PIN"]
                if not stored or not verify_password(req.current_pin, stored):
                    raise BusinessError(E_VALIDATION, "현재 계좌 비밀번호가 일치하지 않습니다.")

            # 5) 새 PIN 해시 저장
            await conn.execute(
                'UPDATE public."CUSTOMER" '
                'SET "SIMPLE_PIN" = $1, "UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $2',
                hash_password(req.new_pin),
                user.customer_no,
            )

            # 6) 보유 계좌 잠금/오류 카운터 일괄 초기화 — 재설정 성공으로 풀어줌
            status = await conn.execute(
                'UPDATE public."ACCOUNT" '
                'SET "PWD_ERROR_COUNT" = 0, "LIMITED_ACCOUNT_YN" = \'N\' '
                'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
                "AND (\"LIMITED_ACCOUNT_YN\" = 'Y' OR COALESCE(\"PWD_ERROR_COUNT\", 0) >= 5)",
                user.customer_no,
            )
            unlocked = 0
            if status and status.startswith("UPDATE "):
                unlocked = int(status.split()[-1])

    log.info(
        "simple_pin_reset",
        customer_no=user.customer_no,
        was_locked=is_locked,
        unlocked_accounts=unlocked,
    )
    return SimplePinResetResponse(success=True, unlocked_accounts=unlocked)