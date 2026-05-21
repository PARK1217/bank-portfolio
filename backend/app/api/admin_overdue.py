"""관리자 — 회원별 연체 추적 라우터 (Phase 6 §9.2.5).

엔드포인트
- GET /api/admin/customers/overdue
- GET /api/admin/customers/{customer_no}/overdue

require_admin Depends 게이팅. AdminAuditMiddleware 가 자동 적재.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_overdue import get_overdue_detail, list_overdue_customers

router = APIRouter(prefix="/admin/customers", tags=["admin-overdue"])


@router.get("/overdue")
async def list_overdue(
    admin: CurrentAdmin = Depends(require_admin),
    limit: int = Query(100, ge=1, le=500),
) -> dict:
    items = await list_overdue_customers(limit=limit)
    return {"items": items, "count": len(items)}


@router.get("/{customer_no}/overdue")
async def get_overdue(
    customer_no: int,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_overdue_detail(customer_no)