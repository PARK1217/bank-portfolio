"""관리자 인증 라우터 — Phase 6 §9.2.1.

엔드포인트
- POST /api/admin/auth/login    사번/비번 → JWT(role=ADMIN) + ADMIN_SESSION ACTIVE
- GET  /api/admin/auth/me       현재 관리자 컨텍스트
- POST /api/admin/auth/logout   ADMIN_SESSION → LOGOUT
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, login, logout, require_admin

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
    result = await login(req.employee_no, req.password, client_ip)
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