"""계좌 한도 변경 라우터 — SCR-SC-006 / WORKBOARD 대기 작업.

경로:
  GET    /accounts/limit-change-status                            본인 계좌 일괄 상태 (N+1 회피용)
  POST   /accounts/{account_no}/limit-change                      신청
  GET    /accounts/{account_no}/limit-change-status               단건 상태(현재 한도 + PENDING + 이력)
  POST   /accounts/{account_no}/limit-change/{request_id}/cancel  취소

main.py 에서 `api = APIRouter(prefix="/api")` 묶음에 include 할 것.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query

from ..schema.limit_change import (
    LimitChangeRequest,
    LimitChangeResponse,
    LimitChangeStatusBatchResponse,
    LimitChangeStatusResponse,
)
from ..service.auth import CurrentCustomer, current_customer
from ..service.limit_change import (
    apply_for_change,
    cancel_pending,
    status_for_account,
    status_for_accounts,
    sweep_due,
)

router = APIRouter(prefix="/accounts", tags=["security-limit"])
log = structlog.get_logger("limit_change")


@router.get(
    "/limit-change-status",
    response_model=LimitChangeStatusBatchResponse,
)
async def get_status_batch(
    account_nos: str | None = Query(
        default=None,
        description="콤마 구분 ACCOUNT_NO 목록 (생략 시 본인 전체 계좌)",
    ),
    user: CurrentCustomer = Depends(current_customer),
) -> LimitChangeStatusBatchResponse:
    await sweep_due()
    nos: list[str] | None = None
    if account_nos:
        parsed = [s.strip() for s in account_nos.split(",") if s.strip()]
        nos = parsed or None
    data = await status_for_accounts(customer_no=user.customer_no, account_nos=nos)
    return LimitChangeStatusBatchResponse(items=data)


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