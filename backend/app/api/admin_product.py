"""관리자 — 상품 관리 라우터 (Phase 6 신설).

엔드포인트
- GET   /api/admin/products                    목록(필터: type_cd / status_cd) + 실시간 집계
- GET   /api/admin/products/{product_id}       상세(기간·금리·약관)
- PATCH /api/admin/products/{product_id}/status  상태 변경 (SALE/SUSPEND/CLOSED)

ADMIN_AUDIT_LOG 적재는 AdminAuditMiddleware 가 응답 후 자동 적재.
ACTION_CD 명시 매핑 + TARGET_TABLE 규칙은 `service/admin_audit.py` 참조.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_product import (
    get_product_detail,
    list_products,
    update_product_status,
)

router = APIRouter(prefix="/admin/products", tags=["admin-product"])


class ProductStatusUpdateRequest(BaseModel):
    new_status: str = Field(..., description="SALE / SUSPEND / CLOSED")


@router.get("")
async def admin_list_products(
    type_cd: str | None = Query(None, description="SAVING/DEPOSIT/INSTALL/FOREIGN/LOAN"),
    status_cd: str | None = Query(None, description="SALE/SUSPEND/CLOSED"),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    items = await list_products(type_cd=type_cd, status_cd=status_cd)
    return {"items": items, "count": len(items)}


@router.get("/{product_id}")
async def admin_product_detail(
    product_id: int = Path(..., ge=1, le=32767),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_product_detail(product_id)


@router.patch("/{product_id}/status")
async def admin_product_status(
    req: ProductStatusUpdateRequest,
    product_id: int = Path(..., ge=1, le=32767),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    result = await update_product_status(
        product_id=product_id,
        new_status=req.new_status,
        employee_no=admin.employee_no,
    )
    return result
