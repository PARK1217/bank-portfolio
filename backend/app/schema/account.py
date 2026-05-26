"""계좌·거래 스키마 — SCR-AC-001 ~ 010, SCR-HM-001."""

from __future__ import annotations

from datetime import datetime, date
from pydantic import BaseModel, Field

from .common import MaskedAccount


# ----------------------------------------------------------------------
# SCR-AC-001 계좌 목록 / SCR-HM-001 대시보드
# ----------------------------------------------------------------------

class AccountSummary(BaseModel):
    account_token: str
    alias: str | None = None
    account_type_cd: str = Field(..., description="SAVING/DEPOSIT/INSTALLMENT/LOAN/...")
    currency: str = "KRW"
    balance: int = Field(..., description="원화 KRW 정수. 외화는 별도 표현")
    status_cd: str
    hidden: bool = False
    # 본인 계좌 컨텍스트 — 평문 노출 (가이드 §3.9: 본인 화면은 평문).
    # 거래 상대방 계좌는 MaskedAccount 스키마로 별도 표현.
    account_no: str = Field(..., examples=["110-001-123456"])
    # 대시보드 그룹·정렬용 — 주거래 우선 + 최근 거래순.
    primary_yn: str = Field("N", description="Y=주거래")
    last_tx_datetime: str | None = Field(
        None, description="YYYYMMDDHHMMSS — 마지막 거래 시각",
    )


class AccountListResponse(BaseModel):
    accounts: list[AccountSummary]
    total_balance_krw: int


class LoanSummaryItem(BaseModel):
    loan_token: str
    product_name: str | None = None
    loan_contract_no_masked: str
    principal: int
    balance: int
    next_payment_date: date | None = None
    overdue_days: int = 0


class MonthSummary(BaseModel):
    year_month: str  # YYYYMM
    income_krw: int = 0
    expense_krw: int = 0


class DashboardResponse(BaseModel):
    customer_no: int
    accounts: list[AccountSummary]
    total_balance_krw: int
    loans: list[LoanSummaryItem]
    recent_transactions: list["TransactionItem"]
    unread_notifications: int = 0
    month_summary: MonthSummary | None = None


# ----------------------------------------------------------------------
# SCR-AC-002 계좌 상세
# ----------------------------------------------------------------------

class DepositContractInfo(BaseModel):
    product_id: int
    product_name: str
    base_rate: float
    period_months: int | None = None
    maturity_date: date | None = None


class AccountDetailResponse(BaseModel):
    account: AccountSummary
    deposit_contract: DepositContractInfo | None = None
    daily_limit_krw: int | None = None
    once_limit_krw: int | None = None
    recent_transactions: list["TransactionItem"]


# ----------------------------------------------------------------------
# SCR-AC-004 거래 내역 조회
# ----------------------------------------------------------------------

class TransactionListParams(BaseModel):
    from_date: date | None = None
    to_date: date | None = None
    tx_type_cd: str | None = None
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=200)


class TransactionItem(BaseModel):
    tx_token: str
    tx_at: datetime
    tx_type_cd: str = Field(..., description="DEPOSIT/WITHDRAW/INTEREST/FEE/...")
    amount: int = Field(..., description="음수 = 출금, 양수 = 입금")
    balance_after: int
    memo: str | None = None
    counterpart: MaskedAccount | None = None


class TransactionListResponse(BaseModel):
    items: list[TransactionItem]
    page: int
    size: int
    has_next: bool


# ----------------------------------------------------------------------
# SCR-AC-005 거래 상세 — 이체면 settlement_* 포함
# ----------------------------------------------------------------------

class TransactionDetailResponse(BaseModel):
    tx_token: str
    tx_at: datetime
    tx_type_cd: str
    amount: int
    balance_after: int
    memo: str | None = None
    counterpart: MaskedAccount | None = None
    transfer_info: "TransferInfoEmbed | None" = None


class TransferInfoEmbed(BaseModel):
    transfer_id_masked: str
    settlement_type: str = Field(..., description="INTRA_BANK / KFTC_SMALL / BOK_LARGE")
    settlement_status: str = Field(..., description="REQUESTED / PENDING / SETTLED / FAILED / REVERSED")
    settlement_requested_at: datetime | None = None
    settlement_completed_at: datetime | None = None
    cancel_yn: bool = False


# ----------------------------------------------------------------------
# SCR-AC-003 통장 페이지 (Signature) — SVG 렌더링용 페이지 데이터
# ----------------------------------------------------------------------

class PassbookPageQuery(BaseModel):
    page: int = Field(1, ge=1)
    rows_per_page: int = Field(20, ge=1, le=60)


class PassbookPageResponse(BaseModel):
    account_token: str
    page: int
    rows: list[TransactionItem]
    rendered_svg: str | None = Field(
        None, description="서버 사이드 렌더 시 SVG 문자열. 클라이언트 렌더 시 None"
    )


# ----------------------------------------------------------------------
# SCR-AC-006 ~ 010 변경 / 해지 / 분실
# ----------------------------------------------------------------------

class AccountAliasPatch(BaseModel):
    alias: str = Field(..., max_length=50)


class AccountHidePatch(BaseModel):
    hidden: bool


class AccountLimitPatch(BaseModel):
    daily_limit_krw: int = Field(..., ge=0)
    once_limit_krw: int = Field(..., ge=0)
    otp_code: str = Field(..., min_length=6, max_length=6)


class AccountCloseRequest(BaseModel):
    transfer_target_account_token: str | None = Field(
        None, description="잔액 이전 대상. 잔액 0 이면 None 허용"
    )
    password: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class AccountCloseResponse(BaseModel):
    account_token: str
    closed_date: str = Field(..., description="YYYYMMDD")
    transferred_amount_krw: int = Field(0, description="해지 직전 잔액 이체 금액")
    transferred_to_account_token: str | None = None


class LostReportRequest(BaseModel):
    lost_type_cd: str = Field(..., description="PASSBOOK / CARD / BOTH")
    note: str | None = None


# Forward refs
AccountDetailResponse.model_rebuild()
TransactionDetailResponse.model_rebuild()
DashboardResponse.model_rebuild()