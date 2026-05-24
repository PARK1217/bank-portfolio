"""관리자 — 공지·이벤트 발행 라우터.

NOTICE
  GET    /api/admin/notices
  GET    /api/admin/notices/{notice_id}
  POST   /api/admin/notices
  PATCH  /api/admin/notices/{notice_id}
  DELETE /api/admin/notices/{notice_id}    (soft DELETE_YN='Y')

EVENT
  GET    /api/admin/events
  GET    /api/admin/events/{event_id}
  POST   /api/admin/events
  PATCH  /api/admin/events/{event_id}
  DELETE /api/admin/events/{event_id}
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_notice import (
    create_event,
    create_notice,
    delete_event,
    delete_notice,
    get_event_detail,
    get_notice_detail,
    list_events,
    list_notices,
    update_event,
    update_notice,
)

notice_router = APIRouter(prefix="/admin/notices", tags=["admin-notice"])
event_router = APIRouter(prefix="/admin/events", tags=["admin-event"])


# ---------------------------------------------------------------------------
# Notice
# ---------------------------------------------------------------------------

class NoticeCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)
    category_cd: str = Field(..., pattern="^(SERVICE|SECURITY|SYSTEM|POLICY)$")
    pinned_yn: str = Field("N", pattern="^(Y|N)$")
    status_cd: str = Field("PUBLISH", pattern="^(PUBLISH|DRAFT|ARCHIVE)$")
    expires_at: str | None = None


class NoticeUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=200)
    body: str | None = None
    category_cd: str | None = Field(None, pattern="^(SERVICE|SECURITY|SYSTEM|POLICY)$")
    pinned_yn: str | None = Field(None, pattern="^(Y|N)$")
    status_cd: str | None = Field(None, pattern="^(PUBLISH|DRAFT|ARCHIVE)$")
    expires_at: str | None = None


@notice_router.get("")
async def list_notice_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100),
    category_cd: str | None = Query(None),
    status_cd: str | None = Query(None),
    pinned_yn: str | None = Query(None, pattern="^(Y|N)$"),
    date_from: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    date_to: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_notices(
        query=query, category_cd=category_cd, status_cd=status_cd,
        pinned_yn=pinned_yn, date_from=date_from, date_to=date_to,
        limit=limit, offset=offset,
    )


@notice_router.get("/{notice_id}")
async def get_notice_route(
    notice_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_notice_detail(notice_id)


@notice_router.post("")
async def create_notice_route(
    req: NoticeCreateRequest,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await create_notice(
        title=req.title, body=req.body, category_cd=req.category_cd,
        pinned_yn=req.pinned_yn, status_cd=req.status_cd,
        expires_at=req.expires_at, author=admin.name or admin.employee_no,
    )


@notice_router.patch("/{notice_id}")
async def update_notice_route(
    req: NoticeUpdateRequest,
    notice_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await update_notice(
        notice_id=notice_id,
        title=req.title, body=req.body, category_cd=req.category_cd,
        pinned_yn=req.pinned_yn, status_cd=req.status_cd,
        expires_at=req.expires_at, employee_no=admin.employee_no,
    )


@notice_router.delete("/{notice_id}")
async def delete_notice_route(
    notice_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await delete_notice(notice_id, employee_no=admin.employee_no)


# ---------------------------------------------------------------------------
# Event
# ---------------------------------------------------------------------------

class EventCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: str | None = Field(None, max_length=500)
    body: str = Field(..., min_length=1)
    banner_url: str | None = Field(None, max_length=500)
    period_start: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    period_end: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    status_cd: str = Field("PUBLISH", pattern="^(PUBLISH|DRAFT|ENDED)$")


class EventUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=200)
    summary: str | None = Field(None, max_length=500)
    body: str | None = None
    banner_url: str | None = Field(None, max_length=500)
    period_start: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    period_end: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    status_cd: str | None = Field(None, pattern="^(PUBLISH|DRAFT|ENDED)$")


@event_router.get("")
async def list_event_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100),
    status_cd: str | None = Query(None),
    date_from: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    date_to: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_events(
        query=query, status_cd=status_cd,
        date_from=date_from, date_to=date_to,
        limit=limit, offset=offset,
    )


@event_router.get("/{event_id}")
async def get_event_route(
    event_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_event_detail(event_id)


@event_router.post("")
async def create_event_route(
    req: EventCreateRequest,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await create_event(
        title=req.title, summary=req.summary, body=req.body,
        banner_url=req.banner_url,
        period_start=req.period_start, period_end=req.period_end,
        status_cd=req.status_cd, author=admin.name or admin.employee_no,
    )


@event_router.patch("/{event_id}")
async def update_event_route(
    req: EventUpdateRequest,
    event_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await update_event(
        event_id=event_id,
        title=req.title, summary=req.summary, body=req.body,
        banner_url=req.banner_url,
        period_start=req.period_start, period_end=req.period_end,
        status_cd=req.status_cd, employee_no=admin.employee_no,
    )


@event_router.delete("/{event_id}")
async def delete_event_route(
    event_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await delete_event(event_id, employee_no=admin.employee_no)
