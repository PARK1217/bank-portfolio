"""계좌 라우터 — AC-001 목록 / AC-002 상세 / AC-004 거래내역 / AC-009 해지."""

from __future__ import annotations

from datetime import date

import structlog
from fastapi import APIRouter, Depends, Query

from ..schema.account import (
    AccountCloseRequest,
    AccountCloseResponse,
    AccountDetailResponse,
    AccountListResponse,
    DashboardResponse,
    TransactionListResponse,
)
from ..service.account import (
    close_account,
    fetch_account,
    fetch_accounts_for,
    fetch_transactions,
    issue_account_tokens,
    issue_tx_token,
    resolve_account_token,
    to_account_summary,
    to_tx_item,
)
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import TokenService

router = APIRouter(prefix="/accounts", tags=["account"])
log = structlog.get_logger("account")


# /accounts/{account_token} 보다 먼저 등록 — account_token='dashboard' 로 매칭돼서
# 신규 가입자(계좌 0건) 가 404 맞는 사고 방지. /api/dashboard 와 동일 응답을 반환한다.
@router.get("/dashboard", response_model=DashboardResponse)
async def accounts_dashboard_alias(
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> DashboardResponse:
    from .dashboard import get_dashboard

    return await get_dashboard(user, tokens)


@router.get("", response_model=AccountListResponse)
async def list_accounts(
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AccountListResponse:
    accounts = await fetch_accounts_for(user.customer_no)
    account_tokens = await issue_account_tokens(
        tokens, user.customer_no, [a.account_no for a in accounts]
    )
    summaries = [to_account_summary(a, t) for a, t in zip(accounts, account_tokens)]
    total = sum(a.balance for a in accounts)
    log.info("account_list", count=len(summaries), total=total)
    return AccountListResponse(accounts=summaries, total_balance_krw=total)


@router.get("/{account_token}", response_model=AccountDetailResponse)
async def get_account_detail(
    account_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AccountDetailResponse:
    account_no = await resolve_account_token(tokens, account_token, user.customer_no)
    row = await fetch_account(account_no, user.customer_no)
    summary = to_account_summary(row, account_token)

    recent_rows, _ = await fetch_transactions(account_no, user.customer_no, limit=5)
    recent_items = []
    for tx in recent_rows:
        tx_token = await issue_tx_token(tokens, tx.tx_id, user.customer_no)
        recent_items.append(to_tx_item(tx, tx_token))

    return AccountDetailResponse(
        account=summary,
        deposit_contract=None,  # 상품 도메인 구현 후 채움
        daily_limit_krw=row.daily_transfer_limit,
        once_limit_krw=row.daily_withdraw_limit,  # 명세 시트 확정 후 보정
        recent_transactions=recent_items,
    )


@router.post("/{account_token}/close", response_model=AccountCloseResponse)
async def close_account_endpoint(
    account_token: str,
    req: AccountCloseRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AccountCloseResponse:
    account_no = await resolve_account_token(tokens, account_token, user.customer_no)
    target_no: str | None = None
    if req.transfer_target_account_token:
        target_no = await resolve_account_token(
            tokens, req.transfer_target_account_token, user.customer_no
        )
    result = await close_account(
        customer_no=user.customer_no,
        account_no=account_no,
        transfer_target_account_no=target_no,
        password=req.password,
    )
    target_token = req.transfer_target_account_token if result["transferred_to_account_no"] else None
    return AccountCloseResponse(
        account_token=account_token,
        closed_date=result["closed_date"],
        transferred_amount_krw=int(result["transferred_amount_krw"] or 0),
        transferred_to_account_token=target_token,
    )


@router.get("/{account_token}/transactions", response_model=TransactionListResponse)
async def list_transactions(
    account_token: str,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    tx_type_cd: str | None = Query(None),
    q: str | None = Query(
        default=None,
        max_length=100,
        description="메모/상대 예금주명/상대 계좌번호 부분일치",
    ),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> TransactionListResponse:
    account_no = await resolve_account_token(tokens, account_token, user.customer_no)
    rows, has_next = await fetch_transactions(
        account_no,
        user.customer_no,
        from_date=from_date,
        to_date=to_date,
        tx_type_cd=tx_type_cd,
        q=q,
        limit=size,
        offset=(page - 1) * size,
    )
    items = []
    for tx in rows:
        tx_token = await issue_tx_token(tokens, tx.tx_id, user.customer_no)
        items.append(to_tx_item(tx, tx_token))
    return TransactionListResponse(
        items=items, page=page, size=size, has_next=has_next
    )