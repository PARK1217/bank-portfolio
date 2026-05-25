"""인증 라우터 — AU-001 (login), AU-012 (logout), me.

다음 단계 (별도 작업):
  AU-002 약관동의 / AU-003 본인인증 / AU-004 계정정보 / AU-008 간편비밀번호 /
  AU-010 OTP 등록 / SC-002 비밀번호 변경.
"""

from __future__ import annotations

import base64
import secrets
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends

from ..db import get_pool
from ..errors import (
    E_ACCOUNT_LOCKED,
    E_OTP_ALREADY_ACTIVE,
    E_UNAUTHORIZED,
    E_VALIDATION,
)
from ..exceptions import AuthError, BusinessError, ConflictError
from ..schema.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    OtpSetupInitResponse,
    OtpSetupVerifyRequest,
)
from ..service.account import fetch_accounts_for, issue_account_tokens
from ..service.auth import (
    CurrentCustomer,
    current_customer,
    get_token_service,
    issue_access_token,
    verify_password,
)
from ..service.auth.deps import current_customer_jti
from ..service.auth.session import revoke_jti
from ..service.token import TokenService

router = APIRouter(prefix="/auth", tags=["auth"])
log = structlog.get_logger("auth")

# 사용자 열거 공격 방지 — 이메일/비번 실패 메시지 통일.
_LOGIN_FAIL_MSG = "이메일 또는 비밀번호가 일치하지 않습니다."
_LOGIN_LOCK_MSG = (
    "5회 연속 실패로 계정이 잠겼어요. "
    "비밀번호 재설정 후 다시 로그인해주세요."
)
_LOGIN_MAX_ATTEMPTS = 5

# 미가입 이메일에 대한 카운트 (in-memory) — 사용자 열거 방지 차원에서 UX 일관 유지.
# 등록된 이메일은 CUSTOMER.LOGIN_FAIL_COUNT 컬럼에 영구화.
_unknown_email_fail_count: dict[str, int] = {}


def _fail_msg(count: int) -> str:
    return f"{_LOGIN_FAIL_MSG} ({count}/{_LOGIN_MAX_ATTEMPTS})"


@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    tokens: TokenService = Depends(get_token_service),
) -> LoginResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "CUSTOMER_NO", "PASSWORD", "CUST_STATUS_CD", "DELETE_YN", '
            '       COALESCE("LOGIN_FAIL_COUNT", 0) AS fail_count '
            'FROM public."CUSTOMER" WHERE "EMAIL" = $1',
            req.email,
        )

    # 미가입 이메일 — in-memory 카운트만, 영구 잠금 없음.
    if row is None or row["DELETE_YN"] == "Y":
        nxt = _unknown_email_fail_count.get(req.email, 0) + 1
        _unknown_email_fail_count[req.email] = nxt
        # UX 일관: 5회 도달해도 잠금 동선 진입 X (실제 잠금 대상 없음), 카운트만 그대로.
        raise AuthError(E_UNAUTHORIZED, _fail_msg(min(nxt, _LOGIN_MAX_ATTEMPTS)))

    # 이미 잠긴 계정 — 비번 정합 여부 상관없이 즉시 잠금 응답.
    if row["CUST_STATUS_CD"] == "5052":
        raise AuthError(E_ACCOUNT_LOCKED, _LOGIN_LOCK_MSG)

    if not verify_password(req.password, row["PASSWORD"] or ""):
        # 비번 불일치 — DB LOGIN_FAIL_COUNT++ 후 5도달 시 잠금 발동.
        new_count = int(row["fail_count"]) + 1
        async with pool.acquire() as conn:
            if new_count >= _LOGIN_MAX_ATTEMPTS:
                await conn.execute(
                    'UPDATE public."CUSTOMER" '
                    'SET "LOGIN_FAIL_COUNT" = $1, "CUST_STATUS_CD" = \'5052\' '
                    'WHERE "CUSTOMER_NO" = $2',
                    new_count, int(row["CUSTOMER_NO"]),
                )
                raise AuthError(E_ACCOUNT_LOCKED, _LOGIN_LOCK_MSG)
            await conn.execute(
                'UPDATE public."CUSTOMER" SET "LOGIN_FAIL_COUNT" = $1 '
                'WHERE "CUSTOMER_NO" = $2',
                new_count, int(row["CUSTOMER_NO"]),
            )
        raise AuthError(E_UNAUTHORIZED, _fail_msg(new_count))

    if row["CUST_STATUS_CD"] != "5050":
        # 5051=휴면 / 5053=탈퇴. 상태별 메시지/복구 흐름은 명세 시트 확정 후 분기.
        raise AuthError(E_UNAUTHORIZED, "사용할 수 없는 계정입니다.")

    customer_no = int(row["CUSTOMER_NO"])
    # 정상 로그인 — 누적 카운트 초기화 + 미가입 in-memory 도 정리(같은 이메일 재시도 흔적 제거).
    if int(row["fail_count"]) > 0:
        async with pool.acquire() as conn:
            await conn.execute(
                'UPDATE public."CUSTOMER" SET "LOGIN_FAIL_COUNT" = 0 '
                'WHERE "CUSTOMER_NO" = $1',
                customer_no,
            )
    _unknown_email_fail_count.pop(req.email, None)
    token, expires_in = issue_access_token(customer_no)

    # 마지막 접속 일시 업데이트 — CUSTOMER.LAST_ACCESS_DT 형식: yyyymmddhhmmss
    now_str = datetime.now().strftime("%Y%m%d%H%M%S")
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."CUSTOMER" SET "LAST_ACCESS_DT" = $1 WHERE "CUSTOMER_NO" = $2',
            now_str,
            customer_no,
        )

    structlog.contextvars.bind_contextvars(customer_no=customer_no)

    # 본인 계좌 accountToken 일괄 발급 (sheet 02)
    accounts = await fetch_accounts_for(customer_no)
    account_tokens_list = await issue_account_tokens(
        tokens, customer_no, [a.account_no for a in accounts]
    )
    log.info("login_success", account_count=len(account_tokens_list))

    return LoginResponse(
        access_token=token,
        expires_in=expires_in,
        customer_no=customer_no,
        requires_device_otp=False,  # device_fingerprint 분기는 추후
        account_tokens=account_tokens_list,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
    jti: str | None = Depends(current_customer_jti),
) -> LogoutResponse:
    revoked = await tokens.revoke_all_for_customer(user.customer_no)
    # JWT 자체를 즉시 무효화 — 만료까지 남은 시간만큼만 블랙리스트 보관.
    if jti:
        exp_at = int(datetime.now(timezone.utc).timestamp()) + 30 * 60
        revoke_jti(jti, exp_at)
    log.info("logout_success", revoked=revoked, jti_revoked=bool(jti))
    return LogoutResponse(revoked_tokens=revoked)


@router.post("/refresh")
async def refresh(
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    """현재 유효 JWT 를 검증 후 새 JWT 재발급 (silent refresh / 명시적 시간 연장).

    프론트엔드 시간 연장 버튼 또는 silent refresh 흐름에서 호출.
    기존 JWT 가 유효해야만 통과 — 만료 후엔 다시 로그인 필요.
    """
    token, expires_in = issue_access_token(user.customer_no)
    log.info("token_refresh", customer_no=user.customer_no)
    return {"access_token": token, "expires_in": expires_in}


import pyotp

# ---------------------------------------------------------------------------
# AU-010 OTP 등록 — TOTP 표준 (RFC 6238).
# secret/활성 상태는 in-memory — 운영은 CUSTOMER 테이블에 OTP_SECRET 컬럼 추가.
# ---------------------------------------------------------------------------

_otp_secrets: dict[int, dict] = {}


def _gen_otp_secret() -> str:
    # pyotp.random_base32() 가 32자 기반 secret 생성 표준.
    return pyotp.random_base32()


@router.post("/otp/init", response_model=OtpSetupInitResponse)
async def otp_init(
    user: CurrentCustomer = Depends(current_customer),
) -> OtpSetupInitResponse:
    # 이미 활성화된 사용자가 재호출하면 기존 secret 이 덮어쓰여 기존 OTP 가 무효화되므로 거부.
    # 재발급/변경은 별도 흐름(`/security/otp`)에서 기존 secret 해제 후 다시 init 한다.
    existing = _otp_secrets.get(user.customer_no)
    if existing and existing.get("active"):
        raise ConflictError(E_OTP_ALREADY_ACTIVE, "이미 OTP가 등록되어 있어요.")

    s = _gen_otp_secret()
    _otp_secrets[user.customer_no] = {"secret": s, "active": False}
    # pyotp.TOTP(s).provisioning_uri(...) 로 자동 생성 가능
    totp = pyotp.TOTP(s)
    uri = totp.provisioning_uri(name=user.email, issuer_name="bank-portfolio")
    log.info("otp_init", customer_no=user.customer_no)
    return OtpSetupInitResponse(secret=s, otpauth_uri=uri)


@router.post("/otp/verify")
async def otp_verify(
    req: OtpSetupVerifyRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    entry = _otp_secrets.get(user.customer_no)
    if entry is None:
        raise BusinessError(E_VALIDATION, "먼저 OTP 등록을 시작해주세요.")

    # pyotp 실시간 TOTP 검증 (30초 윈도우)
    totp = pyotp.TOTP(entry["secret"])
    if not totp.verify(req.otp_code):
        # 6자리 숫자 형식만 맞는다고 통과시키던 mock 검증 우회 픽스 (2026-05-20)
        raise BusinessError(E_VALIDATION, "OTP 코드가 올바르지 않습니다.")

    was_active = bool(entry.get("active"))
    entry["active"] = True

    # 첫 등록 시 본인 보유 계좌의 일일 출금 한도를 5천만으로 상향(이미 더 큰 한도면 유지).
    # 디폴트 30만 제한을 OTP 등록으로 비대면 해제하는 정책 (SCR-SC-008).
    raised_count = 0
    if not was_active:
        pool = get_pool()
        async with pool.acquire() as conn:
            status = await conn.execute(
                'UPDATE public."ACCOUNT" '
                'SET "DAILY_WITHDRAW_LIMIT" = GREATEST(COALESCE("DAILY_WITHDRAW_LIMIT", 0), 50000000) '
                'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\'',
                user.customer_no,
            )
            if status and status.startswith("UPDATE "):
                raised_count = int(status.split()[-1])

    log.info("otp_active", customer_no=user.customer_no, raised_accounts=raised_count)
    return {"active": True, "raised_accounts": raised_count}


@router.get("/me")
async def me(user: CurrentCustomer = Depends(current_customer)) -> dict:
    entry = _otp_secrets.get(user.customer_no)
    pool = get_pool()
    async with pool.acquire() as conn:
        last_access_raw = await conn.fetchval(
            'SELECT "LAST_ACCESS_DT" FROM public."CUSTOMER" WHERE "CUSTOMER_NO" = $1',
            user.customer_no,
        )
    last_access_iso: str | None = None
    if last_access_raw and len(last_access_raw) == 14 and last_access_raw.isdigit():
        try:
            last_access_iso = datetime.strptime(
                last_access_raw, "%Y%m%d%H%M%S"
            ).isoformat()
        except ValueError:
            last_access_iso = None
    return {
        "customer_no": user.customer_no,
        "email": user.email,
        "name": user.name,
        "grade_cd": user.grade_cd,
        "status_cd": user.status_cd,
        "otp_active": bool(entry and entry.get("active")),
        "last_access_at": last_access_iso,
    }


# ---------------------------------------------------------------------------
# /setup/* alias — 프론트엔드 `/setup/otp` 화면이 호출하는 path 정합.
#   화면(`frontend/app/setup/otp/page.tsx`):
#     POST /api/setup/otp/init  → 시크릿/QR URI 발급
#     POST /api/setup/otp       → 6자리 코드 검증·활성
#   동일 핸들러를 그대로 재사용하므로 동작·응답 형식은 `/auth/otp/*` 와 같다.
# ---------------------------------------------------------------------------

setup_router = APIRouter(prefix="/setup", tags=["setup"])

setup_router.add_api_route(
    "/otp/init",
    otp_init,
    methods=["POST"],
    response_model=OtpSetupInitResponse,
)
setup_router.add_api_route(
    "/otp",
    otp_verify,
    methods=["POST"],
)