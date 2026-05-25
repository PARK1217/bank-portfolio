"""대시보드 라우터 — HM-001."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends

from ..db import get_pool
from ..logging_setup import mask_account_no
from ..schema.account import DashboardResponse, LoanSummaryItem, MonthSummary
from ..service.account import (
    fetch_accounts_for,
    fetch_transactions,
    issue_account_tokens,
    issue_tx_token,
    to_account_summary,
    to_tx_item,
)
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import ResourceType, TokenService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _fetch_loan_summaries(
    customer_no: int, tokens: TokenService,
) -> list[LoanSummaryItem]:
    """본행 보유 대출 (NORMAL/OVERDUE) 요약 — 다음 상환 + 최장 연체일."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT lc."LOAN_CONTRACT_NO", lc."PRODUCT_NAME_SNAPSHOT", '
            '       lc."CONTRACT_LIMIT", lc."CURRENT_USAGE", '
            '       (SELECT MIN(lrs."SCHEDULED_DATE") '
            '        FROM public."LOAN_REPAY_SCHEDULE" lrs '
            '        WHERE lrs."LOAN_CONTRACT_NO" = lc."LOAN_CONTRACT_NO" '
            "          AND lrs.\"SCHEDULE_STATUS_CD\" IN ('WAITING','PENDING','OVERDUE') "
            "          AND lrs.\"DELETE_YN\" = 'N') AS next_due_str, "
            '       COALESCE('
            '         (SELECT MAX(CURRENT_DATE - to_date(lrs."SCHEDULED_DATE",\'YYYYMMDD\')) '
            '          FROM public."LOAN_REPAY_SCHEDULE" lrs '
            '          WHERE lrs."LOAN_CONTRACT_NO" = lc."LOAN_CONTRACT_NO" '
            "            AND lrs.\"SCHEDULE_STATUS_CD\" = 'OVERDUE' "
            "            AND lrs.\"DELETE_YN\" = 'N'), 0) AS max_overdue_days "
            'FROM public."LOAN_CONTRACT" lc '
            'WHERE lc."CUSTOMER_NO" = $1 '
            "  AND lc.\"LOAN_STATUS_CD\" IN ('NORMAL','OVERDUE') "
            "  AND lc.\"DELETE_YN\" = 'N' "
            'ORDER BY lc."CONTRACT_DATE" DESC, lc."LOAN_CONTRACT_NO"',
            customer_no,
        )

    items: list[LoanSummaryItem] = []
    for r in rows:
        contract_no = r["LOAN_CONTRACT_NO"]
        loan_token = await tokens.issue(ResourceType.LOAN, contract_no, customer_no)
        next_due_str = r["next_due_str"]
        next_due_date = None
        if next_due_str:
            try:
                next_due_date = datetime.strptime(next_due_str[:8], "%Y%m%d").date()
            except ValueError:
                pass
        items.append(
            LoanSummaryItem(
                loan_token=loan_token,
                product_name=r["PRODUCT_NAME_SNAPSHOT"],
                loan_contract_no_masked=mask_account_no(contract_no),
                principal=int(r["CONTRACT_LIMIT"] or 0),
                balance=int(r["CURRENT_USAGE"] or 0),
                next_payment_date=next_due_date,
                overdue_days=int(r["max_overdue_days"] or 0),
            )
        )
    return items


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
    # 외화 계좌(FOREIGN)는 단위가 다르므로 total_balance_krw 합산에서 제외.
    total = sum(a.balance for a in accounts if (a.account_type_cd or "") != "FOREIGN")

    # 최근 거래 — 첫 계좌 5건. 전 계좌 통합 정렬은 후속 작업.
    recent_items = []
    if accounts:
        recent_rows, _ = await fetch_transactions(
            accounts[0].account_no, user.customer_no, limit=5
        )
        for tx in recent_rows:
            tx_token = await issue_tx_token(tokens, tx.tx_id, user.customer_no)
            recent_items.append(to_tx_item(tx, tx_token))

    loans = await _fetch_loan_summaries(user.customer_no, tokens)

    # 이번 달 KRW 입출금 합계 (외화 거래는 단위 다르므로 KRW 합산 제외) +
    # 미읽음 알림 카운트 — 한 conn 에서 2 쿼리.
    year_month = date.today().strftime("%Y%m")
    pool = get_pool()
    async with pool.acquire() as conn:
        month_row = await conn.fetchrow(
            'SELECT '
            '  COALESCE(SUM(CASE WHEN t."TX_AMOUNT" > 0 THEN t."TX_AMOUNT" ELSE 0 END), 0) AS income, '
            '  COALESCE(SUM(CASE WHEN t."TX_AMOUNT" < 0 THEN -t."TX_AMOUNT" ELSE 0 END), 0) AS expense '
            'FROM public."TRANSACTION" t '
            'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            'WHERE a."CUSTOMER_NO" = $1 '
            '  AND t."DELETE_YN" = \'N\' '
            '  AND a."ACCOUNT_TYPE_CD" != \'FOREIGN\' '
            '  AND t."TX_DATETIME" LIKE $2 '
            '  AND (t."TX_STATUS_CD" IS NULL OR t."TX_STATUS_CD" NOT IN (\'FAILED\',\'CANCELED\'))',
            user.customer_no,
            f"{year_month}%",
        )
        unread = await conn.fetchval(
            'SELECT count(*) FROM public."NOTIFICATION" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' AND "IS_READ" = FALSE',
            user.customer_no,
        )

    return DashboardResponse(
        customer_no=user.customer_no,
        accounts=summaries,
        total_balance_krw=total,
        loans=loans,
        recent_transactions=recent_items,
        unread_notifications=int(unread or 0),
        month_summary=MonthSummary(
            year_month=year_month,
            income_krw=int(month_row["income"] or 0),
            expense_krw=int(month_row["expense"] or 0),
        ),
    )