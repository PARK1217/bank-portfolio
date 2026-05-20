"""상품 카탈로그·개설 스키마 — SCR-OP-001 ~ 010."""

from __future__ import annotations

from datetime import date
from pydantic import BaseModel, Field


# ----------------------------------------------------------------------
# SCR-OP-001 / 002 카탈로그 / 상세
# ----------------------------------------------------------------------

class ProductCatalogItem(BaseModel):
    product_id: int
    product_name: str
    product_type_cd: str = Field(..., description="SAVING/DEPOSIT/INSTALLMENT/LOAN/...")
    base_rate: float
    min_amount: int | None = None
    max_amount: int | None = None
    special_yn: bool = False
    sale_start_date: date | None = None
    sale_end_date: date | None = None


class ProductCatalogResponse(BaseModel):
    items: list[ProductCatalogItem]


class ProductPeriodEntry(BaseModel):
    period_months: int
    rate: float


class ProductRatePolicyEntry(BaseModel):
    tier_min_amount: int
    base_rate: float
    bonus_rate_max: float


class ProductBonusConditionEntry(BaseModel):
    condition_cd: str = Field(..., description="SALARY/CARD/AUTO_TRANSFER/HOLDING/...")
    description: str
    bonus_rate: float


class ProductTermsMapping(BaseModel):
    terms_id: int
    version: int
    title: str
    required: bool


class ProductDetailResponse(BaseModel):
    product: ProductCatalogItem
    periods: list[ProductPeriodEntry]
    rate_policies: list[ProductRatePolicyEntry]
    bonus_conditions: list[ProductBonusConditionEntry]
    terms_mappings: list[ProductTermsMapping]


# ----------------------------------------------------------------------
# SCR-OP-003 자유입출금
# ----------------------------------------------------------------------

class OpenSavingRequest(BaseModel):
    alias: str | None = Field(None, max_length=50)
    initial_deposit_krw: int = Field(0, ge=0)
    withdraw_password: str = Field(..., min_length=4, max_length=8)


class OpenAccountResponse(BaseModel):
    """공통 개설 응답 — accountToken 만 노출."""
    account_token: str


# ----------------------------------------------------------------------
# SCR-OP-004 정기예금
# ----------------------------------------------------------------------

class OpenDepositRequest(BaseModel):
    amount_krw: int = Field(..., gt=0)
    period_months: int = Field(..., ge=1, le=120)
    interest_payment_cd: str = Field(..., description="MONTHLY/QUARTERLY/MATURITY")
    withdraw_account_token: str = Field(..., description="자금 출처 계좌")
    password: str


# ----------------------------------------------------------------------
# SCR-OP-005 적금 (Signature — transfer_schedule 연계)
# ----------------------------------------------------------------------

class OpenInstallmentRequest(BaseModel):
    monthly_amount_krw: int = Field(..., gt=0)
    period_months: int = Field(..., ge=1, le=120)
    transfer_day: int = Field(..., ge=1, le=31, description="매월 자동이체 실행일")
    withdraw_account_token: str
    bonus_condition_codes: list[str] = Field(default_factory=list)


# ----------------------------------------------------------------------
# SCR-OP-006 공동명의 (Signature)
# ----------------------------------------------------------------------

class JointParticipant(BaseModel):
    customer_no: int
    role_cd: str = Field(..., description="OWNER / JOINT_OWNER")
    delegation_power_codes: list[str] = Field(
        default_factory=list,
        description="위임 권한 코드 (WITHDRAW/TRANSFER/CLOSE/...)",
    )


class OpenJointRequest(BaseModel):
    alias: str | None = None
    initial_deposit_krw: int = Field(0, ge=0)
    co_owners: list[JointParticipant] = Field(..., min_length=1, max_length=10)
    attachment_ids: list[int] = Field(default_factory=list)


# ----------------------------------------------------------------------
# SCR-OP-008 미성년 자녀 (Signature — 위임 8권한)
# ----------------------------------------------------------------------

class MinorOpenRequest(BaseModel):
    child_party_id: int
    guardian_customer_no: int
    delegation_power_codes: list[str] = Field(
        ...,
        description="친권자 위임 권한 8종 (WITHDRAW/TRANSFER/CLOSE/LIMIT/...)",
        min_length=1,
    )
    attachment_ids: list[int] = Field(..., min_length=1, description="가족관계증명서 등")


# ----------------------------------------------------------------------
# SCR-OP-007 외화계좌 (Later)
# ----------------------------------------------------------------------

class OpenForeignRequest(BaseModel):
    currency: str = Field(..., pattern=r"^[A-Z]{3}$", examples=["USD"])
    foreign_amount: float | None = None
    krw_amount: int | None = None
    withdraw_account_token: str | None = None
    password: str


# ----------------------------------------------------------------------
# SCR-OP-009 개설 완료
# ----------------------------------------------------------------------

class ProductCompleteResponse(BaseModel):
    account_token: str
    masked_account_no: str
    product_name: str


# ----------------------------------------------------------------------
# SCR-OP-010 약관/특약 동의
# ----------------------------------------------------------------------

class TermsConsentItem(BaseModel):
    terms_id: int
    version: int
    agreed: bool


class ProductTermsAgreeRequest(BaseModel):
    product_id: int
    consents: list[TermsConsentItem]
    covenant_codes: list[str] = Field(default_factory=list, description="계약특약 코드")