"""관리자 인증 라우터 — Phase 6 §9.2.1.

엔드포인트
- POST /api/admin/auth/login    사번/비번 → JWT(role=ADMIN) + ADMIN_SESSION ACTIVE
- GET  /api/admin/auth/me       현재 관리자 컨텍스트
- POST /api/admin/auth/logout   ADMIN_SESSION → LOGOUT

로그인 성공/실패는 AdminAuditMiddleware 가 미들웨어에서 못 잡는 경로(EMPLOYEE_NO 알 수
없음)라 라우터가 직접 ADMIN_AUDIT_LOG INSERT 한다.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from ..exceptions import AuthError
from ..service.admin_audit import insert_audit_log
from ..service.admin_auth import (
    CurrentAdmin,
    login,
    logout,
    refresh,
    require_admin,
)

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


class AdminLoginRequest(BaseModel):
    employee_no: str = Field(..., min_length=1, max_length=20)
    password: str = Field(..., min_length=4, max_length=100)


class AdminLoginResponse(BaseModel):
    access_token: str
    expires_in: int
    employee_no: str
    name: str
    auth_level_cd: str
    session_id: int


class AdminMeResponse(BaseModel):
    employee_no: str
    name: str
    auth_level_cd: str
    session_id: int


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(req: AdminLoginRequest, request: Request) -> AdminLoginResponse:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    try:
        result = await login(req.employee_no, req.password, client_ip)
    except AuthError:
        # 실패도 감사 적재. EMPLOYEE_NO 는 요청값(미존재 사번도 그대로 기록).
        await insert_audit_log(
            employee_no=req.employee_no or "UNKNOWN",
            action_cd="AUTH_LOGIN",
            target_table="ADMIN_SESSION",
            result_cd="DENIED",
            access_ip=client_ip,
            user_agent=user_agent,
            remark=f"req={getattr(request.state, 'request_id', None)}",
        )
        raise

    await insert_audit_log(
        employee_no=result["employee_no"],
        action_cd="AUTH_LOGIN",
        target_table="ADMIN_SESSION",
        target_id=str(result["session_id"]),
        result_cd="OK",
        access_ip=client_ip,
        user_agent=user_agent,
        remark=f"req={getattr(request.state, 'request_id', None)}",
    )
    return AdminLoginResponse(**result)


@router.get("/me", response_model=AdminMeResponse)
async def admin_me(admin: CurrentAdmin = Depends(require_admin)) -> AdminMeResponse:
    return AdminMeResponse(
        employee_no=admin.employee_no,
        name=admin.name,
        auth_level_cd=admin.auth_level_cd,
        session_id=admin.session_id,
    )


@router.post("/logout")
async def admin_logout(admin: CurrentAdmin = Depends(require_admin)) -> dict:
    await logout(admin.session_id, admin.employee_no)
    return {"success": True}


@router.post("/refresh")
async def admin_refresh(admin: CurrentAdmin = Depends(require_admin)) -> dict:
    """ACTIVE 세션의 JWT 재발급. require_admin 이 LAST_ACTIVITY_DT 자동 갱신."""
    return await refresh(admin)