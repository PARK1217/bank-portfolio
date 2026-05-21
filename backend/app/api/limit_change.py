"""계좌 한도 변경 라우터 — SCR-SC-006 / WORKBOARD 대기 작업.

경로:
  POST   /accounts/{account_no}/limit-change                 신청
  GET    /accounts/{account_no}/limit-change-status          상태(현재 한도 + PENDING + 이력)
  POST   /accounts/{account_no}/limit-change/{request_id}/cancel  취소

main.py 에서 `api = APIRouter(prefix="/api")` 묶음에 include 할 것.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends

from ..schema.limit_change import (
    LimitChangeRequest,
    LimitChangeResponse,
    LimitChangeStatusResponse,
)
from ..service.auth import CurrentCustomer, current_customer
from ..service.limit_change import (
    apply_for_change,
    cancel_pending,
    status_for_account,
    sweep_due,
)

router = APIRouter(prefix="/accounts", tags=["security-limit"])
log = structlog.get_logger("limit_change")


@router.get(
    "/{account_no}/limit-change-status",
    response_model=LimitChangeStatusResponse,
)
async def get_status(
    account_no: str,
    user: CurrentCustomer = Depends(current_customer),
) -> LimitChangeStatusResponse:
    # 진입 시 만료 PENDING 자동 적용 (배치 미구현 환경에서도 즉시성 보장)
    await sweep_due()
    data = await status_for_account(customer_no=user.customer_no, account_no=account_no)
    return LimitChangeStatusResponse(**data)


@router.post("/{account_no}/limit-change", response_model=LimitChangeResponse)
async def request_change(
    account_no: str,
    req: LimitChangeRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> LimitChangeResponse:
    result = await apply_for_change(
        customer_no=user.customer_no,
        account_no=account_no,
        limit_type_cd=req.limit_type_cd,
        new_limit_krw=req.new_limit_krw,
        otp_code=req.otp_code,
    )
    return LimitChangeResponse(**result)


@router.post("/{account_no}/limit-change/{request_id}/cancel")
async def cancel_change(
    account_no: str,
    request_id: int,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    await cancel_pending(
        customer_no=user.customer_no,
        account_no=account_no,
        request_id=request_id,
    )
    return {"success": True}