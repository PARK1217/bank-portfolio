"""거래 상세 라우터 — AC-005."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..logging_setup import mask_account_no
from ..schema.account import TransactionDetailResponse
from ..schema.common import MaskedAccount
from ..service.account import fetch_transaction, resolve_tx_token
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import TokenService

router = APIRouter(prefix="/transactions", tags=["transaction"])


@router.get("/{tx_token}", response_model=TransactionDetailResponse)
async def get_transaction_detail(
    tx_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TransactionDetailResponse:
    tx_id = await resolve_tx_token(tokens, tx_token, user.customer_no)
    tx = await fetch_transaction(tx_id, user.customer_no)

    counterpart = None
    if tx.counterpart_account_no:
        counterpart = MaskedAccount(
            masked=mask_account_no(tx.counterpart_account_no),
            bank_cd=tx.counterpart_bank_cd,
            bank_name=tx.counterpart_bank_name,
            holder_name=tx.counterpart_holder_name,
        )

    # transfer_info(settlement_*)는 v53 컬럼 적용 후 별도 작업으로 채움.
    return TransactionDetailResponse(
        tx_token=tx_token,
        tx_at=tx.tx_at,
        tx_type_cd=tx.tx_type_cd or "UNKNOWN",
        amount=tx.amount,
        balance_after=tx.balance_after,
        memo=tx.memo,
        counterpart=counterpart,
        transfer_info=None,
    )