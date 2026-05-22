"""이체·자동이체 스키마 — SCR-TR-001 ~ 009.

핵심:
- TR-002 (이체 확인) 은 Idempotency-Key 헤더 필수 (가이드 §3.4)
- 자동이체는 transfer_schedule 미생성 결정 → AUTO_TRANSFER 확장 컬럼 그대로 매핑
- 결제 채널은 settlement_type 으로 응답에 노출 (당행/소액/거액 시그니처 어필)
"""

from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field

from .common import MaskedAccount


# ----------------------------------------------------------------------
# SCR-TR-001 즉시이체 — 초기 화면 진입용 정보
# ----------------------------------------------------------------------

class TransferInitParams(BaseModel):
    from_account_token: str


class TransferInitResponse(BaseModel):
    from_account: MaskedAccount
    balance: int
    daily_remaining_limit: int
    once_limit: int


# ----------------------------------------------------------------------
# SCR-TR-002 이체 확인 — Idempotency-Key 헤더 필수
# ----------------------------------------------------------------------

class TransferConfirmRequest(BaseModel):
    from_account_token: str
    to_bank_cd: str
    to_account_no: str = Field(..., description="평문 — 입금 대상은 토큰화 대상 아님")
    to_holder_name: str | None = Field(
        None, description="사용자 입력 예금주명 (실명 일치 검증용)"
    )
    amount_krw: int = Field(..., gt=0)
    withdraw_memo: str | None = Field(
        None, max_length=30, description="내 통장에 표시될 메모 (출금 거래)"
    )
    deposit_memo: str | None = Field(
        None, max_length=30, description="받는 분 통장에 표시될 메모 (입금 거래)"
    )
    password_or_otp: str = Field(..., description="간편비밀번호 또는 OTP")


class TransferConfirmResponse(BaseModel):
    tx_token: str
    settlement_type: str = Field(..., description="INTRA_BANK / KFTC_SMALL / BOK_LARGE")
    settlement_status: str = Field(..., description="SETTLED (당행) / PENDING (타행)")
    requested_at: datetime
    completed_at: datetime | None = None
    idempotent_replay: bool = Field(False, description="같은 키 재호출이면 true")


# ----------------------------------------------------------------------
# SCR-TR-003 이체 완료 — 조회
# ----------------------------------------------------------------------

class TransferDetailResponse(BaseModel):
    tx_token: str
    from_account: MaskedAccount
    to_account: MaskedAccount
    amount_krw: int
    fee: int = 0
    withdraw_memo: str | None = None
    deposit_memo: str | None = None
    settlement_type: str
    settlement_status: str
    requested_at: datetime
    completed_at: datetime | None = None
    counterpart_approval_no: str | None = None


# ----------------------------------------------------------------------
# SCR-TR-004 자주 쓰는 계좌 (Signature — FREQUENT_ACCOUNT)
# ----------------------------------------------------------------------

class FavoriteAccountItem(BaseModel):
    id: int
    alias: str
    bank_cd: str
    account_no: str = Field(..., description="평문 — 즐겨찾기→이체 prefill 용도")
    masked_account_no: str = Field(..., description="목록 표시용 마스킹")
    account_holder_name: str
    use_count: int
    last_used_at: datetime | None = None


class FavoriteAccountCreate(BaseModel):
    alias: str = Field(..., max_length=50)
    bank_cd: str
    account_no: str
    account_holder_name: str
    display_order: int | None = None


# ----------------------------------------------------------------------
# SCR-TR-005 자동이체 등록 (Signature — AUTO_TRANSFER 확장 후)
# ----------------------------------------------------------------------

class AutoTransferCreate(BaseModel):
    from_account_token: str
    to_bank_cd: str
    to_account_no: str
    to_holder_name: str
    amount_krw: int = Field(..., gt=0)
    cycle_type_cd: str = Field(..., description="DAILY/WEEKLY/MONTHLY")
    monthly_exec_day: int | None = Field(None, ge=1, le=31)
    schedule_rule: dict | None = Field(
        None,
        description="격주/매주N요일 등 monthly_exec_day 로 표현 불가능한 룰",
        examples=[{"interval_weeks": 2, "day_of_week": "MON"}],
    )
    valid_start_date: date
    valid_end_date: date | None = None
    withdraw_memo: str | None = Field(
        None, max_length=100, description="내 통장에 표시될 메모"
    )
    deposit_memo: str | None = Field(
        None, max_length=100, description="받는 분 통장에 표시될 메모"
    )
    linked_to: str | None = Field(None, description="INSTALLMENT/LOAN/UTILITY/USER")
    linked_id: int | None = None


class AutoTransferResponse(BaseModel):
    auto_token: str
    next_execute_at: datetime | None = None


# ----------------------------------------------------------------------
# SCR-TR-006 자동이체 목록 / 관리
# ----------------------------------------------------------------------

class AutoTransferItem(BaseModel):
    auto_token: str
    from_account: MaskedAccount
    to_account: MaskedAccount
    amount_krw: int
    cycle_type_cd: str
    monthly_exec_day: int | None = None
    auto_status_cd: str
    valid_start_date: date
    valid_end_date: date | None = None
    next_execute_at: datetime | None = None
    linked_to: str | None = None


class AutoTransferListResponse(BaseModel):
    items: list[AutoTransferItem]


class AutoTransferStatusPatch(BaseModel):
    action: str = Field(..., description="PAUSE / RESUME / CANCEL")


# ----------------------------------------------------------------------
# SCR-TR-007 실행 이력 (AUTO_TRANSFER_EXEC)
# ----------------------------------------------------------------------

class AutoTransferExecItem(BaseModel):
    scheduled_date: date
    biz_day_adjusted: date | None = None
    exec_status_cd: str = Field(..., description="SUCCESS/FAIL/DELAY")
    exec_datetime: datetime | None = None
    delay_reason_cd: str | None = None
    tx_token: str | None = Field(None, description="성공 시 거래 → 토큰화 노출")


class AutoTransferExecHistoryResponse(BaseModel):
    auto_token: str
    items: list[AutoTransferExecItem]


# ----------------------------------------------------------------------
# SCR-TR-008 예약 이체 — schedule_type=ONCE (AUTO_TRANSFER 1회성)
# ----------------------------------------------------------------------

class ScheduledTransferCreate(BaseModel):
    from_account_token: str
    to_bank_cd: str
    to_account_no: str
    to_holder_name: str
    amount_krw: int = Field(..., gt=0)
    scheduled_at: datetime
    withdraw_memo: str | None = Field(
        None, max_length=100, description="내 통장에 표시될 메모"
    )
    deposit_memo: str | None = Field(
        None, max_length=100, description="받는 분 통장에 표시될 메모"
    )


# ----------------------------------------------------------------------
# SCR-TR-009 오송금 회수 (Later)
# ----------------------------------------------------------------------

class TransferRecallRequest(BaseModel):
    tx_token: str
    reason: str = Field(..., max_length=500)