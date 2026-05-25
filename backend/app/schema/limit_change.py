"""계좌 한도 변경 신청 스키마 — SCR-SC-006."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


LimitTypeCd = Literal["DAILY_WITHDRAW", "DAILY_TRANSFER"]
StatusCd = Literal["PENDING", "APPLIED", "CANCELED", "REJECTED"]


class LimitChangeRequest(BaseModel):
    limit_type_cd: LimitTypeCd = Field(..., description="DAILY_WITHDRAW / DAILY_TRANSFER")
    new_limit_krw: int = Field(..., ge=0, le=10_000_000_000)
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class LimitChangeItem(BaseModel):
    request_id: int
    account_no: str
    limit_type_cd: LimitTypeCd
    old_limit_krw: int | None
    new_limit_krw: int
    request_datetime: datetime
    apply_datetime: datetime
    applied_datetime: datetime | None = None
    canceled_datetime: datetime | None = None
    status_cd: StatusCd
    verify_method_cd: str
    days_remaining: int = Field(
        0, description="APPLY_DATETIME 까지 남은 일수 (PENDING 한정). 음수면 적용 대기 중."
    )


class LimitChangeStatusResponse(BaseModel):
    current_daily_withdraw_krw: int | None
    current_daily_transfer_krw: int | None
    pending: list[LimitChangeItem]
    history: list[LimitChangeItem]


class LimitChangeAccountStatus(LimitChangeStatusResponse):
    account_no: str


class LimitChangeStatusBatchResponse(BaseModel):
    items: list[LimitChangeAccountStatus]


class LimitChangeResponse(BaseModel):
    request_id: int
    apply_datetime: datetime
    days_until_apply: int