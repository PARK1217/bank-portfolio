"""이체 라우터 — TR-001 / TR-002 / TR-003."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field

from ..errors import E_VALIDATION
from ..exceptions import BusinessError
from ..logging_setup import mask_account_no
from ..schema.common import MaskedAccount
from ..schema.transfer import (
    TransferConfirmRequest,
    TransferConfirmResponse,
    TransferDetailResponse,
    TransferInitResponse,
)
from ..service.account import (
    fetch_account,
    issue_tx_token,
    resolve_account_token,
    resolve_tx_token,
)
from ..service.account_verify import verify_account
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import TokenService
from ..service.transfer import (
    _settle_status_for,
    _settle_type_for,
    execute_transfer,
    fetch_transfer_by_tx,
)


class VerifyAccountRequest(BaseModel):
    to_bank_cd: str = Field(..., min_length=3, max_length=3, examples=["098", "088"])
    to_account_no: str = Field(..., min_length=6, max_length=20, examples=["110-001-100001"])


class VerifyAccountResponse(BaseModel):
    exists: bool
    holder_name: str | None
    source: str = Field(..., description="INTRA_BANK | KFTC")
    bank_cd: str
    account_no: str
    error: str | None = Field(None, description="VERIFY_TIMEOUT | VERIFY_BROKER_DOWN")

router = APIRouter(prefix="/transfer", tags=["transfer"])
log = structlog.get_logger("transfer_api")


@router.get("/init", response_model=TransferInitResponse)
async def init_transfer(
    from_account_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TransferInitResponse:
    """TR-001 — 이체 화면 진입 시 출금계좌 정보·잔액·한도."""
    account_no = await resolve_account_token(tokens, from_account_token, user.customer_no)
    row = await fetch_account(account_no, user.customer_no)
    return TransferInitResponse(
        from_account=MaskedAccount(masked=mask_account_no(row.account_no)),
        balance=row.balance,
        daily_remaining_limit=row.daily_transfer_limit or 0,
        once_limit=row.daily_withdraw_limit or 0,
    )


@router.post("/verify-account", response_model=VerifyAccountResponse)
async def verify_account_endpoint(
    req: VerifyAccountRequest,
    user: CurrentCustomer = Depends(current_customer),  # noqa: ARG001 — 인증 게이트
) -> VerifyAccountResponse:
    """입금 계좌·예금주 검증 — 당행 즉시 DB / 타행 Kafka request-reply (가이드 §2.4)."""
    result = await verify_account(req.to_bank_cd, req.to_account_no)
    return VerifyAccountResponse(**{
        "exists": result["exists"],
        "holder_name": result.get("holder_name"),
        "source": result["source"],
        "bank_cd": result["bank_cd"],
        "account_no": result["account_no"],
        "error": result.get("error"),
    })


@router.post("", response_model=TransferConfirmResponse)
async def confirm_transfer(
    req: TransferConfirmRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TransferConfirmResponse:
    """TR-002 — 이체 확인·실행. Idempotency-Key 헤더 필수."""
    if not idempotency_key:
        raise BusinessError(E_VALIDATION, "Idempotency-Key 헤더가 필요합니다.")

    from_account_no = await resolve_account_token(
        tokens, req.from_account_token, user.customer_no
    )
    result = await execute_transfer(
        user_customer_no=user.customer_no,
        from_account_no=from_account_no,
        to_bank_cd=req.to_bank_cd,
        to_account_no=req.to_account_no,
        to_holder_name=req.to_holder_name,
        amount_krw=req.amount_krw,
        memo=req.memo,
        password_or_otp=req.password_or_otp,
        idempotency_key=idempotency_key,
        tokens=tokens,
    )

    tx_token = await issue_tx_token(tokens, result.tx_id_withdraw, user.customer_no)
    return TransferConfirmResponse(
        tx_token=tx_token,
        settlement_type=result.settlement_type,
        settlement_status=result.settlement_status,
        requested_at=result.requested_at,
        completed_at=result.completed_at,
        idempotent_replay=result.idempotent_replay,
    )


@router.get("/{tx_token}", response_model=TransferDetailResponse)
async def get_transfer_detail(
    tx_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TransferDetailResponse:
    """TR-003 — 이체 결과 상세."""
    tx_id = await resolve_tx_token(tokens, tx_token, user.customer_no)
    tr = await fetch_transfer_by_tx(tx_id, user.customer_no)
    return TransferDetailResponse(
        tx_token=tx_token,
        from_account=MaskedAccount(
            masked=mask_account_no(tr.withdraw_account_no),
            bank_cd=tr.withdraw_bank_cd,
            bank_name=tr.withdraw_bank_name,
            holder_name=tr.withdraw_holder_name,
        ),
        to_account=MaskedAccount(
            masked=mask_account_no(tr.deposit_account_no),
            bank_cd=tr.deposit_bank_cd,
            bank_name=tr.deposit_bank_name,
            holder_name=tr.deposit_holder_name,
        ),
        amount_krw=tr.amount,
        fee=tr.fee,
        memo=tr.memo,
        settlement_type=_settle_type_for(tr.transfer_type_cd),
        settlement_status=_settle_status_for(tr.transfer_status_cd),
        requested_at=tr.request_dt or tr.complete_dt,
        completed_at=tr.complete_dt,
        counterpart_approval_no=tr.counterpart_approval_no,
    )