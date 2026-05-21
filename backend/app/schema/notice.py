"""공지사항 / 이벤트 스키마."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


# --- 공지사항 ---------------------------------------------------------------

class NoticeListItem(BaseModel):
    id: int
    title: str
    category_cd: str | None = None
    pinned: bool = False
    published_at: datetime
    view_count: int = 0


class NoticeListResponse(BaseModel):
    items: list[NoticeListItem]
    total: int
    page: int
    size: int
    has_next: bool


class NoticeDetailResponse(BaseModel):
    id: int
    title: str
    body: str
    category_cd: str | None = None
    pinned: bool = False
    author: str | None = None
    published_at: datetime
    view_count: int = 0
    prev_id: int | None = None
    next_id: int | None = None


# --- 이벤트 ---------------------------------------------------------------

class EventListItem(BaseModel):
    id: int
    title: str
    summary: str | None = None
    banner_url: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    status_cd: str = Field("PUBLISH")
    published_at: datetime
    view_count: int = 0


class EventListResponse(BaseModel):
    items: list[EventListItem]
    total: int
    page: int
    size: int
    has_next: bool


class EventDetailResponse(BaseModel):
    id: int
    title: str
    summary: str | None = None
    body: str
    banner_url: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    status_cd: str
    author: str | None = None
    published_at: datetime
    view_count: int = 0
    prev_id: int | None = None
    next_id: int | None = None