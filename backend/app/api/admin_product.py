"""관리자 — 상품 관리 라우터 (Phase 6 신설).

엔드포인트
- GET   /api/admin/products                    목록(필터: type_cd / status_cd) + 실시간 집계
- GET   /api/admin/products/{product_id}       상세(기간·금리·약관)
- PATCH /api/admin/products/{product_id}/status  상태 변경 (SALE/SUSPEND/CLOSED)

ADMIN_AUDIT_LOG 적재는 AdminAuditMiddleware 가 응답 후 자동 적재.
ACTION_CD 명시 매핑 + TARGET_TABLE 규칙은 `service/admin_audit.py` 참조.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, Request
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_product import (
    create_product,
    get_product_detail,
    list_products,
    update_product_status,
)

router = APIRouter(prefix="/admin/products", tags=["admin-product"])


class ProductStatusUpdateRequest(BaseModel):
    new_status: str = Field(..., description="SALE / SUSPEND / CLOSED")


class ProductCreateRequest(BaseModel):
    product_id: int | None = Field(
        None,
        ge=1,
        le=32767,
        description="명시 입력 시 그 코드 사용 (중복 409). 비우면 타입 분류 안에서 자동 발급.",
    )
    product_name: str = Field(..., min_length=1, max_length=80)
    product_type_cd: str = Field(..., description="SAVING / DEPOSIT / INSTALL / FOREIGN / LOAN")
    product_status_cd: str = Field("SALE", description="기본값 SALE")
    special_yn: bool = False
    min_amount: int | None = Field(None, ge=0)
    max_amount: int | None = Field(None, ge=0)
    sale_start_date: str | None = Field(None, description="YYYYMMDD")
    sale_end_date: str | None = Field(None, description="YYYYMMDD")
    owner_dept: str | None = Field(None, max_length=50)
    product_desc: str | None = None
    product_features: str | None = Field(None, max_length=500)


@router.get("")
async def admin_list_products(
    type_cd: str | None = Query(None, description="SAVING/DEPOSIT/INSTALL/FOREIGN/LOAN"),
    status_cd: str | None = Query(None, description="SALE/SUSPEND/CLOSED"),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    items = await list_products(type_cd=type_cd, status_cd=status_cd)
    return {"items": items, "count": len(items)}


@router.post("", status_code=201)
async def admin_create_product(
    req: ProductCreateRequest,
    request: Request,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    result = await create_product(
        product_id=req.product_id,
        product_name=req.product_name,
        product_type_cd=req.product_type_cd,
        product_status_cd=req.product_status_cd,
        special_yn=req.special_yn,
        min_amount=req.min_amount,
        max_amount=req.max_amount,
        sale_start_date=req.sale_start_date,
        sale_end_date=req.sale_end_date,
        owner_dept=req.owner_dept,
        product_desc=req.product_desc,
        product_features=req.product_features,
        employee_no=admin.employee_no,
    )
    request.state.audit_after = {
        "product_id": req.product_id,
        "product_name": req.product_name,
        "product_type_cd": req.product_type_cd,
        "product_status_cd": req.product_status_cd,
    }
    return result


@router.get("/{product_id}")
async def admin_product_detail(
    product_id: int = Path(..., ge=1, le=32767),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_product_detail(product_id)


@router.patch("/{product_id}/status")
async def admin_product_status(
    req: ProductStatusUpdateRequest,
    request: Request,
    product_id: int = Path(..., ge=1, le=32767),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    result = await update_product_status(
        product_id=product_id,
        new_status=req.new_status,
        employee_no=admin.employee_no,
    )
    request.state.audit_after = {
        "product_id": product_id,
        "new_status": req.new_status,
    }
    return result
