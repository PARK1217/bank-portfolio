"""FastAPI 의존성 — current_customer / get_token_service.

`Depends(current_customer)`:
  1) Authorization: Bearer <jwt> 검증
  2) CUSTOMER 조회 + DELETE_YN / CUST_STATUS_CD 체크
  3) structlog contextvars 에 customer_no 자동 bind
     → 이후 모든 로그에 customer_no 자동 주입 (가이드 §3.1 필수 필드)
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ...db import get_pool
from ...errors import E_UNAUTHORIZED
from ...exceptions import AuthError
from ..token import TokenService
from .jwt import decode_access_token

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentCustomer:
    """인증된 고객의 가벼운 컨텍스트."""

    customer_no: int
    email: str
    grade_cd: str | None
    status_cd: str


async def current_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentCustomer:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthError(E_UNAUTHORIZED, "인증이 필요합니다.")

    customer_no = decode_access_token(credentials.credentials)

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "CUSTOMER_NO", "EMAIL", "CUST_GRADE_CD", "CUST_STATUS_CD", "DELETE_YN" '
            'FROM public."CUSTOMER" WHERE "CUSTOMER_NO" = $1',
            customer_no,
        )

    if row is None or row["DELETE_YN"] == "Y":
        raise AuthError(E_UNAUTHORIZED, "유효하지 않은 세션입니다.")
    # 5050=정상 / 5051=휴면 / 5053=탈퇴 — 정상만 통과
    if row["CUST_STATUS_CD"] != "5050":
        raise AuthError(E_UNAUTHORIZED, "사용할 수 없는 계정입니다.")

    structlog.contextvars.bind_contextvars(customer_no=row["CUSTOMER_NO"])

    return CurrentCustomer(
        customer_no=row["CUSTOMER_NO"],
        email=row["EMAIL"],
        grade_cd=row["CUST_GRADE_CD"],
        status_cd=row["CUST_STATUS_CD"],
    )


def get_token_service(request: Request) -> TokenService:
    """앱 lifespan 에서 생성된 TokenService 를 주입."""
    svc = getattr(request.app.state, "token_service", None)
    if svc is None:
        raise RuntimeError("TokenService not initialized — check lifespan setup.")
    return svc