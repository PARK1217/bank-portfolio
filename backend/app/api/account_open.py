"""상품 가입 라우터 (OP-009 적금 — 자동이체 자동 등록 시그니처)."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends

from ..schema.product import OpenAccountResponse, OpenInstallmentRequest
from ..service.account_open import open_installment
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import TokenService

router = APIRouter(prefix="/products", tags=["product-open"])
log = structlog.get_logger("product_open")


@router.post("/{product_id}/open-installment", response_model=OpenAccountResponse)
async def open_installment_route(
    product_id: int,
    req: OpenInstallmentRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    account_token, _auto_token, _next_dt = await open_installment(
        customer_no=user.customer_no,
        product_id=product_id,
        monthly_amount_krw=req.monthly_amount_krw,
        period_months=req.period_months,
        transfer_day=req.transfer_day,
        withdraw_account_token=req.withdraw_account_token,
        tokens=tokens,
    )
    return OpenAccountResponse(account_token=account_token)