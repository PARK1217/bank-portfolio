"""대시보드 라우터 — HM-001."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..schema.account import DashboardResponse
from ..service.account import (
    fetch_accounts_for,
    fetch_transactions,
    issue_account_tokens,
    issue_tx_token,
    to_account_summary,
    to_tx_item,
)
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import TokenService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> DashboardResponse:
    accounts = await fetch_accounts_for(user.customer_no)
    account_tokens = await issue_account_tokens(
        tokens, user.customer_no, [a.account_no for a in accounts]
    )
    summaries = [to_account_summary(a, t) for a, t in zip(accounts, account_tokens)]
    total = sum(a.balance for a in accounts)

    # 최근 거래 — 첫 계좌 5건. 전 계좌 통합 정렬은 후속 작업.
    recent_items = []
    if accounts:
        recent_rows, _ = await fetch_transactions(
            accounts[0].account_no, user.customer_no, limit=5
        )
        for tx in recent_rows:
            tx_token = await issue_tx_token(tokens, tx.tx_id, user.customer_no)
            recent_items.append(to_tx_item(tx, tx_token))

    return DashboardResponse(
        customer_no=user.customer_no,
        accounts=summaries,
        total_balance_krw=total,
        loans=[],  # 대출 도메인 구현 후
        recent_transactions=recent_items,
        unread_notifications=0,  # 알림 도메인 구현 후
    )