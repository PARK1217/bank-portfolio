"""알림 스키마 — SCR-HM-004 (Signature)."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class NotificationItem(BaseModel):
    id: int
    type_cd: str = Field(..., description="TRANSFER/AUTO_TRANSFER/LOAN_DUE/FDS/MARKETING/...")
    title: str
    body_snippet: str
    link_url: str | None = None
    reference_id: int | None = None
    reference_type: str | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class NotificationListParams(BaseModel):
    unread_only: bool = False
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    total: int = Field(0, description="필터 적용 후 전체 건수 (paging 도 기준)")
    unread_count: int
    unread_by_type: dict[str, int] = Field(
        default_factory=dict,
        description="TYPE_CD 별 미읽음 건수. 필터와 무관하게 본인 전체 기준.",
    )
    page: int
    size: int
    has_next: bool


class NotificationReadRequest(BaseModel):
    ids: list[int] | None = Field(None, description="None = 전체 읽음 처리")