"""관리자 — 회원 강제 변경 액션 라우터.

POST /api/admin/customers/{customer_no}/status              상태 변경 (5050/LIMITED/LOCKED/DORMANT)
POST /api/admin/customers/{customer_no}/grade               등급 변경 (VIP/G100/GENERAL/MINOR/SENIOR/STUDENT)
GET  /api/admin/customers/{customer_no}/status-history      상태 변경 이력
GET  /api/admin/customers/{customer_no}/grade-history       등급 변경 이력

require_admin Depends 게이팅. AdminAuditMiddleware 자동 적재.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_customer_action import (
    change_customer_grade,
    change_customer_status,
    list_customer_grade_history,
    list_customer_status_history,
)

router = APIRouter(prefix="/admin/customers", tags=["admin-customer-action"])


class StatusChangeRequest(BaseModel):
    new_status_cd: str = Field(..., min_length=2, max_length=8)
    reason_cd: str | None = Field(None, max_length=20)
    remark: str | None = Field(None, max_length=1000)


class GradeChangeRequest(BaseModel):
    new_grade_cd: str = Field(..., min_length=2, max_length=8)
    reason_cd: str | None = Field(None, max_length=8)
    remark: str | None = Field(None, max_length=1000)


@router.post("/{customer_no}/status")
async def post_status_change(
    req: StatusChangeRequest,
    customer_no: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await change_customer_status(
        customer_no=customer_no,
        new_status_cd=req.new_status_cd,
        reason_cd=req.reason_cd,
        remark=req.remark,
        employee_no=admin.employee_no,
    )


@router.post("/{customer_no}/grade")
async def post_grade_change(
    req: GradeChangeRequest,
    customer_no: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await change_customer_grade(
        customer_no=customer_no,
        new_grade_cd=req.new_grade_cd,
        reason_cd=req.reason_cd,
        remark=req.remark,
        employee_no=admin.employee_no,
    )


@router.get("/{customer_no}/status-history")
async def get_status_history(
    customer_no: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    items = await list_customer_status_history(customer_no, limit=limit)
    return {"items": items, "count": len(items)}


@router.get("/{customer_no}/grade-history")
async def get_grade_history(
    customer_no: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    items = await list_customer_grade_history(customer_no, limit=limit)
    return {"items": items, "count": len(items)}
