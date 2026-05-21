"""관리자 인증·세션 서비스 — Phase 6 §9.2.1.

흐름
- POST /api/admin/auth/login
    EMPLOYEE_MASTER 비번 검증 → ADMIN_SESSION INSERT(ACTIVE)
    → JWT 발급(role=ADMIN, employee_no, session_id 클레임)
- Authorization: Bearer <jwt> 로 보호된 /api/admin/* 호출
    require_admin Depends 가 JWT 디코드 + ADMIN_SESSION 활성 확인 + LAST_ACTIVITY_DT 갱신
- POST /api/admin/auth/logout
    ADMIN_SESSION.SESSION_STATUS_CD='LOGOUT' + LOGOUT_DATETIME 갱신

스키마 메모
- EMPLOYEE_MASTER.AUTH_LEVEL_CD: 'ADMIN' (전권) / 'AUDIT' (감사 — 조회만)
- ADMIN_SESSION.SESSION_ID 는 시퀀스/IDENTITY 미부여 → MAX+1 패턴
- ADMIN_SESSION.SESSION_STATUS_CD: 'ACTIVE' / 'LOGOUT' / 'EXPIRED'
- LOGIN_DATETIME/LAST_ACTIVITY_DT/LOGOUT_DATETIME 은 varchar(14) yyyymmddhhmmss
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import structlog
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError

from ..config import settings
from ..db import get_pool
from ..errors import E_UNAUTHORIZED
from ..exceptions import AuthError
from .auth.passwords import verify_password

log = structlog.get_logger("admin_auth")

_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# CurrentAdmin
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CurrentAdmin:
    employee_no: str
    name: str
    auth_level_cd: str          # 'ADMIN' / 'AUDIT' / ...
    session_id: int


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def _issue_admin_token(employee_no: str, session_id: int) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_in = settings.JWT_EXPIRE_MINUTES * 60
    payload = {
        "sub": f"emp:{employee_no}",
        "role": "ADMIN",
        "employee_no": employee_no,
        "session_id": session_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }
    token = pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


def _decode_admin_token(token: str) -> dict:
    try:
        payload = pyjwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ExpiredSignatureError as e:
        raise AuthError(E_UNAUTHORIZED, "세션이 만료되었습니다.") from e
    except InvalidTokenError as e:
        raise AuthError(E_UNAUTHORIZED, "유효하지 않은 토큰입니다.") from e

    if payload.get("role") != "ADMIN" or not payload.get("employee_no"):
        raise AuthError(E_UNAUTHORIZED, "관리자 토큰이 아닙니다.")
    return payload


# ---------------------------------------------------------------------------
# 로그인 / 로그아웃 / 세션
# ---------------------------------------------------------------------------

def _now14() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


async def login(employee_no: str, password: str, access_ip: str | None) -> dict:
    """반환: {access_token, expires_in, employee_no, name, auth_level_cd, session_id}."""
    pool = get_pool()
    async with pool.acquire() as conn:
        emp = await conn.fetchrow(
            'SELECT "EMPLOYEE_NO","NAME","AUTH_LEVEL_CD","EMP_STATUS_CD","PASSWORD","DELETE_YN" '
            'FROM public."EMPLOYEE_MASTER" WHERE "EMPLOYEE_NO" = $1',
            employee_no,
        )
        if emp is None or emp["DELETE_YN"] == "Y":
            raise AuthError(E_UNAUTHORIZED, "사번 또는 비밀번호가 일치하지 않습니다.")
        if emp["EMP_STATUS_CD"] and emp["EMP_STATUS_CD"] != "ACTIVE":
            raise AuthError(E_UNAUTHORIZED, "사용할 수 없는 계정입니다.")
        if not emp["PASSWORD"] or not verify_password(password, emp["PASSWORD"]):
            raise AuthError(E_UNAUTHORIZED, "사번 또는 비밀번호가 일치하지 않습니다.")

        # SESSION_ID 시퀀스 없음 → MAX+1
        next_id = await conn.fetchval(
            'SELECT COALESCE(MAX("SESSION_ID"),0)+1 FROM public."ADMIN_SESSION"'
        )
        now14 = _now14()
        await conn.execute(
            'INSERT INTO public."ADMIN_SESSION" ('
            '  "SESSION_ID","EMPLOYEE_NO","LOGIN_DATETIME","LAST_ACTIVITY_DT",'
            '  "ACCESS_IP","SESSION_STATUS_CD","INQUIRY_COUNT","CREATED_BY"'
            ") VALUES ($1,$2,$3,$3,$4,'ACTIVE',0,$2)",
            next_id, employee_no, now14, (access_ip or "0.0.0.0")[:45],
        )

    token, expires_in = _issue_admin_token(employee_no, int(next_id))
    log.info("admin_login", employee_no=employee_no, session_id=int(next_id))
    return {
        "access_token": token,
        "expires_in": expires_in,
        "employee_no": emp["EMPLOYEE_NO"],
        "name": emp["NAME"],
        "auth_level_cd": emp["AUTH_LEVEL_CD"] or "ADMIN",
        "session_id": int(next_id),
    }


async def logout(session_id: int, employee_no: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."ADMIN_SESSION" '
            'SET "SESSION_STATUS_CD" = \'LOGOUT\', '
            '    "LOGOUT_DATETIME" = $1, "UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
            'WHERE "SESSION_ID" = $3 AND "EMPLOYEE_NO" = $4',
            _now14(), employee_no, session_id, employee_no,
        )
    log.info("admin_logout", employee_no=employee_no, session_id=session_id)


# ---------------------------------------------------------------------------
# require_admin Depends
# ---------------------------------------------------------------------------

async def require_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentAdmin:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthError(E_UNAUTHORIZED, "관리자 인증이 필요합니다.")

    payload = _decode_admin_token(credentials.credentials)
    employee_no = payload["employee_no"]
    session_id = int(payload.get("session_id") or 0)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                'SELECT e."EMPLOYEE_NO", e."NAME", e."AUTH_LEVEL_CD", e."EMP_STATUS_CD", '
                '       e."DELETE_YN" AS emp_deleted, '
                '       s."SESSION_STATUS_CD", s."DELETE_YN" AS session_deleted '
                'FROM public."EMPLOYEE_MASTER" e '
                'LEFT JOIN public."ADMIN_SESSION" s '
                '       ON s."SESSION_ID" = $2 AND s."EMPLOYEE_NO" = e."EMPLOYEE_NO" '
                'WHERE e."EMPLOYEE_NO" = $1',
                employee_no, session_id,
            )
            if row is None or row["emp_deleted"] == "Y":
                raise AuthError(E_UNAUTHORIZED, "유효하지 않은 세션입니다.")
            if row["EMP_STATUS_CD"] and row["EMP_STATUS_CD"] != "ACTIVE":
                raise AuthError(E_UNAUTHORIZED, "사용할 수 없는 계정입니다.")
            if row["SESSION_STATUS_CD"] is None or row["session_deleted"] == "Y":
                raise AuthError(E_UNAUTHORIZED, "세션을 찾을 수 없습니다.")
            if row["SESSION_STATUS_CD"] != "ACTIVE":
                raise AuthError(E_UNAUTHORIZED, "세션이 만료되었습니다.")

            # 활동 시각 갱신 (best-effort)
            await conn.execute(
                'UPDATE public."ADMIN_SESSION" '
                'SET "LAST_ACTIVITY_DT" = $1, "INQUIRY_COUNT" = COALESCE("INQUIRY_COUNT",0)+1 '
                'WHERE "SESSION_ID" = $2',
                _now14(), session_id,
            )

    structlog.contextvars.bind_contextvars(
        admin_employee_no=employee_no, admin_session_id=session_id,
    )
    current = CurrentAdmin(
        employee_no=row["EMPLOYEE_NO"],
        name=row["NAME"] or "",
        auth_level_cd=row["AUTH_LEVEL_CD"] or "ADMIN",
        session_id=session_id,
    )
    # AdminAuditMiddleware 가 응답 후 EMPLOYEE_NO 채울 때 사용.
    request.state.admin = current
    return current