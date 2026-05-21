"""공지사항 / 이벤트 라우터 — 비로그인 공개."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Query

from ..schema.notice import (
    EventDetailResponse,
    EventListItem,
    EventListResponse,
    NoticeDetailResponse,
    NoticeListItem,
    NoticeListResponse,
)
from ..service.notice import (
    get_event,
    get_notice,
    hit_event,
    hit_notice,
    list_events,
    list_notices,
)

router = APIRouter(tags=["notice-event"])
log = structlog.get_logger("notice")


def _yn(v) -> bool:
    return v == "Y"


# --- 공지사항 ---------------------------------------------------------------

@router.get("/notices", response_model=NoticeListResponse)
async def list_notice(
    category_cd: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> NoticeListResponse:
    rows, total = await list_notices(
        category_cd=category_cd, limit=size, offset=(page - 1) * size
    )
    items = [
        NoticeListItem(
            id=int(r["NOTICE_ID"]),
            title=r["TITLE"],
            category_cd=r["CATEGORY_CD"],
            pinned=_yn(r["PINNED_YN"]),
            published_at=r["PUBLISHED_AT"],
            view_count=int(r["VIEW_COUNT"] or 0),
        )
        for r in rows
    ]
    return NoticeListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        has_next=(page * size) < total,
    )


@router.get("/notices/{notice_id}", response_model=NoticeDetailResponse)
async def detail_notice(notice_id: int) -> NoticeDetailResponse:
    r = await get_notice(notice_id)
    return NoticeDetailResponse(
        id=int(r["NOTICE_ID"]),
        title=r["TITLE"],
        body=r["BODY"],
        category_cd=r["CATEGORY_CD"],
        pinned=_yn(r["PINNED_YN"]),
        author=r["AUTHOR"],
        published_at=r["PUBLISHED_AT"],
        view_count=int(r["VIEW_COUNT"] or 0),
        prev_id=r["prev_id"],
        next_id=r["next_id"],
    )


@router.post("/notices/{notice_id}/hit")
async def hit_notice_view(notice_id: int) -> dict:
    await hit_notice(notice_id)
    return {"ok": True}


# --- 이벤트 ---------------------------------------------------------------

@router.get("/events", response_model=EventListResponse)
async def list_event(
    status_cd: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> EventListResponse:
    rows, total = await list_events(
        status_cd=status_cd, limit=size, offset=(page - 1) * size
    )
    items = [
        EventListItem(
            id=int(r["EVENT_ID"]),
            title=r["TITLE"],
            summary=r["SUMMARY"],
            banner_url=r["BANNER_URL"],
            period_start=r["PERIOD_START"],
            period_end=r["PERIOD_END"],
            status_cd=r["STATUS_CD"] or "PUBLISH",
            published_at=r["PUBLISHED_AT"],
            view_count=int(r["VIEW_COUNT"] or 0),
        )
        for r in rows
    ]
    return EventListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        has_next=(page * size) < total,
    )


@router.get("/events/{event_id}", response_model=EventDetailResponse)
async def detail_event(event_id: int) -> EventDetailResponse:
    r = await get_event(event_id)
    return EventDetailResponse(
        id=int(r["EVENT_ID"]),
        title=r["TITLE"],
        summary=r["SUMMARY"],
        body=r["BODY"],
        banner_url=r["BANNER_URL"],
        period_start=r["PERIOD_START"],
        period_end=r["PERIOD_END"],
        status_cd=r["STATUS_CD"] or "PUBLISH",
        author=r["AUTHOR"],
        published_at=r["PUBLISHED_AT"],
        view_count=int(r["VIEW_COUNT"] or 0),
        prev_id=r["prev_id"],
        next_id=r["next_id"],
    )


@router.post("/events/{event_id}/hit")
async def hit_event_view(event_id: int) -> dict:
    await hit_event(event_id)
    return {"ok": True}