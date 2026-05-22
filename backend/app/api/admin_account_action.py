"""관리자 — 계좌 강제 변경 액션 라우터.

POST /api/admin/accounts/{account_no}/status                상태 변경
POST /api/admin/accounts/{account_no}/pwd-error-reset       비밀번호 오류 횟수 0
POST /api/admin/accounts/{account_no}/limit                 일일 한도 강제 변경
GET  /api/admin/accounts/{account_no}/status-history        상태/잠금해제 이력
GET  /api/admin/accounts/{account_no}/limit-history         한도 변경 이력
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field

from ..service.admin_account_action import (
    change_account_status,
    force_change_limit,
    list_account_limit_history,
    list_account_status_history,
    reset_pwd_error,
)
from ..service.admin_auth import CurrentAdmin, require_admin

router = APIRouter(prefix="/admin/accounts", tags=["admin-account-action"])


class AcctStatusChangeRequest(BaseModel):
    new_status_cd: str = Field(..., min_length=2, max_length=10)
    reason_cd: str | None = Field(None, max_length=20)
    remark: str | None = Field(None, max_length=1000)


class PwdResetRequest(BaseModel):
    remark: str | None = Field(None, max_length=1000)


class LimitForceRequest(BaseModel):
    limit_type_cd: str = Field(..., pattern="^(DAILY_WITHDRAW|DAILY_TRANSFER)$")
    new_limit_krw: int = Field(..., ge=0, le=1_000_000_000)
    reason_cd: str | None = Field(None, max_length=20)
    remark: str | None = Field(None, max_length=1000)


@router.post("/{account_no}/status")
async def post_status_change(
    req: AcctStatusChangeRequest,
    account_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await change_account_status(
        account_no=account_no,
        new_status_cd=req.new_status_cd,
        reason_cd=req.reason_cd,
        remark=req.remark,
        employee_no=admin.employee_no,
    )


@router.post("/{account_no}/pwd-error-reset")
async def post_pwd_reset(
    req: PwdResetRequest,
    account_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await reset_pwd_error(
        account_no=account_no,
        remark=req.remark,
        employee_no=admin.employee_no,
    )


@router.post("/{account_no}/limit")
async def post_limit_force(
    req: LimitForceRequest,
    account_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await force_change_limit(
        account_no=account_no,
        limit_type_cd=req.limit_type_cd,
        new_limit_krw=req.new_limit_krw,
        reason_cd=req.reason_cd,
        remark=req.remark,
        employee_no=admin.employee_no,
    )


@router.get("/{account_no}/status-history")
async def get_status_history(
    account_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    items = await list_account_status_history(account_no, limit=limit)
    return {"items": items, "count": len(items)}


@router.get("/{account_no}/limit-history")
async def get_limit_history(
    account_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    items = await list_account_limit_history(account_no, limit=limit)
    return {"items": items, "count": len(items)}
