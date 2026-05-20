"""상품 라우터 — OP-001 카탈로그 / OP-002 상세.

카탈로그/상세는 공개(인증 불필요). 가입 흐름은 별도 모듈.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from ..schema.product import ProductCatalogResponse, ProductDetailResponse
from ..service.product import fetch_catalog, fetch_product_detail

router = APIRouter(prefix="/products", tags=["product"])
log = structlog.get_logger("product")


@router.get("", response_model=ProductCatalogResponse)
async def list_products() -> ProductCatalogResponse:
    items = await fetch_catalog()
    log.info("product_catalog", count=len(items))
    return ProductCatalogResponse(items=items)


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_detail(product_id: int) -> ProductDetailResponse:
    return await fetch_product_detail(product_id)