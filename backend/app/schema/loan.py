"""대출 스키마 — SCR-LN-001 ~ 010.

핵심:
- LN-002 (가신청) 은 시뮬레이션 — 신용조회 동의 X
- LN-003 (정식 신청) 은 신용조회 동의 필수
- LN-006 (약정) ≠ LN-007 (실행). LN-007 은 Idempotency-Key 헤더 필수.
- 시그니처 어필: 약정·실행 분리 / 멱등성 / DSR 시뮬
"""

from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field


# ----------------------------------------------------------------------
# SCR-LN-001 대출상품 목록
# ----------------------------------------------------------------------

class LoanProductItem(BaseModel):
    product_id: int
    product_name: str
    base_rate: float
    min_amount: int
    max_amount: int
    max_period_months: int
    target_customer_cd: str | None = None
    min_age: int | None = None
    max_age: int | None = None
    # 자격 분기용 — 상품명 기반 추론. MORTGAGE/JEONSE/BIZ/FOREIGN_LOAN/SUBPRIME/GENERAL
    loan_subtype: str = "GENERAL"


class LoanProductListResponse(BaseModel):
    items: list[LoanProductItem]


# ----------------------------------------------------------------------
# SCR-LN-002 가신청 (DSR 시뮬)
# ----------------------------------------------------------------------

class LoanPrecheckRequest(BaseModel):
    annual_income_krw: int = Field(..., ge=0)
    annual_debt_total_krw: int = Field(..., ge=0)
    desired_amount_krw: int = Field(..., gt=0)
    period_months: int = Field(..., ge=1, le=360)


class LoanPrecheckResponse(BaseModel):
    eligible: bool
    simulated_dsr_pct: float = Field(..., description="0~100. 40 초과 = 부적격")
    max_amount_krw: int
    applicable_rate: float
    rejection_code: str | None = Field(None, description="E_LOAN_DSR_OVER 등")


# ----------------------------------------------------------------------
# SCR-LN-003 정식 신청
# ----------------------------------------------------------------------

class LoanApplyRequest(BaseModel):
    product_id: int
    amount_krw: int = Field(..., gt=0)
    period_months: int = Field(..., ge=1, le=360)
    credit_inquiry_consent: bool = Field(..., description="신용정보조회 동의")
    purpose_code: str | None = None


class LoanApplyResponse(BaseModel):
    app_token: str
    status_cd: str
    required_documents: list[str] = Field(default_factory=list)


# ----------------------------------------------------------------------
# SCR-LN-004 서류 제출
# ----------------------------------------------------------------------

class LoanDocumentItem(BaseModel):
    doc_type_cd: str
    attachment_id: int


class LoanDocumentsSubmit(BaseModel):
    documents: list[LoanDocumentItem] = Field(..., min_length=1)


# ----------------------------------------------------------------------
# SCR-LN-005 심사 진행 상황 — Long-polling 또는 SSE
# ----------------------------------------------------------------------

class LoanReviewStep(BaseModel):
    step_cd: str
    status_cd: str = Field(..., description="WAITING/IN_PROGRESS/DONE/REJECTED")
    started_at: datetime | None = None
    completed_at: datetime | None = None
    note: str | None = None


class LoanStatusResponse(BaseModel):
    app_token: str
    status_cd: str
    review_steps: list[LoanReviewStep]
    missing_documents: list[str] = Field(default_factory=list)
    current_step_cd: str | None = None


# ----------------------------------------------------------------------
# SCR-LN-006 약정 (Signature — 약정 ≠ 실행)
# ----------------------------------------------------------------------

class LoanContractRequest(BaseModel):
    agreed_terms: list[dict] = Field(
        ..., description="각 항목 = {terms_id, version, agreed}"
    )
    covenant_codes: list[str] = Field(default_factory=list)
    signature_blob_id: int = Field(..., description="ATTACHED_DOC.id (전자서명 이미지)")
    password: str


class LoanContractResponse(BaseModel):
    loan_token: str
    loan_contract_no_masked: str
    masked_loan_account_no: str = Field(..., description="대출전용 계좌 (v51 계좌-계약 일원화)")
    rate_applied: float
    monthly_payment_krw: int


# ----------------------------------------------------------------------
# SCR-LN-007 실행 (Signature — Idempotency-Key 필수)
# ----------------------------------------------------------------------

class LoanExecuteRequest(BaseModel):
    deposit_account_token: str = Field(..., description="대출금 입금 받을 계좌")
    password: str


class LoanExecuteResponse(BaseModel):
    exec_seq: int
    tx_token: str
    executed_at: datetime
    principal_krw: int
    idempotent_replay: bool = False


# ----------------------------------------------------------------------
# SCR-LN-008 상세 조회
# ----------------------------------------------------------------------

class LoanExecHistoryItem(BaseModel):
    exec_seq: int
    exec_datetime: datetime
    exec_type_cd: str
    exec_amount_krw: int
    post_exec_balance_krw: int


class LoanRepayItem(BaseModel):
    repay_seq: int
    repaid_at: datetime
    principal_krw: int
    interest_krw: int
    overdue_interest_krw: int = 0
    method_cd: str = Field(..., description="AUTO / MANUAL / PREPAY")


class LoanDetailResponse(BaseModel):
    loan_token: str
    loan_contract_no_masked: str
    product_name: str
    principal_krw: int
    balance_krw: int
    rate_applied: float
    period_months: int
    next_payment_date: date | None = None
    monthly_payment_krw: int
    overdue_days: int = 0
    exec_histories: list[LoanExecHistoryItem]
    repay_histories: list[LoanRepayItem]


# ----------------------------------------------------------------------
# SCR-LN-009 상환 스케줄
# ----------------------------------------------------------------------

class LoanScheduleItem(BaseModel):
    seq: int
    due_date: date
    principal_krw: int
    interest_krw: int
    total_krw: int
    balance_after_krw: int
    status_cd: str = Field(..., description="WAITING/PAID/OVERDUE/PREPAID")
    repaid_at: datetime | None = None


class LoanScheduleResponse(BaseModel):
    loan_token: str
    schedule: list[LoanScheduleItem]


# ----------------------------------------------------------------------
# SCR-LN-010 중도상환 / 조건변경 (Later)
# ----------------------------------------------------------------------

class LoanPrepayRequest(BaseModel):
    amount_krw: int = Field(..., gt=0)
    apply_fee: bool = Field(True, description="중도상환수수료 부과 여부 (BR-REPAY-04)")


class LoanChangeRequest(BaseModel):
    new_period_months: int | None = None
    new_rate: float | None = None
    note: str | None = None