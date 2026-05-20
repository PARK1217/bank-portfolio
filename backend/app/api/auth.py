"""인증 라우터 — AU-001 (login), AU-012 (logout), me.

다음 단계 (별도 작업):
  AU-002 약관동의 / AU-003 본인인증 / AU-004 계정정보 / AU-008 간편비밀번호 /
  AU-010 OTP 등록 / SC-002 비밀번호 변경.
"""

from __future__ import annotations

from datetime import datetime

import structlog
from fastapi import APIRouter, Depends

from ..db import get_pool
from ..errors import E_UNAUTHORIZED
from ..exceptions import AuthError
from ..schema.auth import LoginRequest, LoginResponse, LogoutResponse
from ..service.account import fetch_accounts_for, issue_account_tokens
from ..service.auth import (
    CurrentCustomer,
    current_customer,
    get_token_service,
    issue_access_token,
    verify_password,
)
from ..service.token import TokenService

router = APIRouter(prefix="/auth", tags=["auth"])
log = structlog.get_logger("auth")

# 사용자 열거 공격 방지 — 이메일/비번 실패 메시지 통일.
_LOGIN_FAIL_MSG = "이메일 또는 비밀번호가 일치하지 않습니다."


@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    tokens: TokenService = Depends(get_token_service),
) -> LoginResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "CUSTOMER_NO", "PASSWORD", "CUST_STATUS_CD", "DELETE_YN" '
            'FROM public."CUSTOMER" WHERE "EMAIL" = $1',
            req.email,
        )

    if row is None or row["DELETE_YN"] == "Y":
        raise AuthError(E_UNAUTHORIZED, _LOGIN_FAIL_MSG)
    if not verify_password(req.password, row["PASSWORD"] or ""):
        raise AuthError(E_UNAUTHORIZED, _LOGIN_FAIL_MSG)
    if row["CUST_STATUS_CD"] != "5050":
        # 5051=휴면 / 5053=탈퇴. 상태별 메시지/복구 흐름은 명세 시트 확정 후 분기.
        raise AuthError(E_UNAUTHORIZED, "사용할 수 없는 계정입니다.")

    customer_no = int(row["CUSTOMER_NO"])
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
) -> LogoutResponse:
    revoked = await tokens.revoke_all_for_customer(user.customer_no)
    log.info("logout_success", revoked=revoked)
    return LogoutResponse(revoked_tokens=revoked)


@router.get("/me")
async def me(user: CurrentCustomer = Depends(current_customer)) -> dict:
    return {
        "customer_no": user.customer_no,
        "email": user.email,
        "grade_cd": user.grade_cd,
        "status_cd": user.status_cd,
    }