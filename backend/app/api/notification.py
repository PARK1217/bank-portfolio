"""알림 라우터 — HM-004."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query

from ..schema.notification import (
    NotificationItem,
    NotificationListResponse,
    NotificationReadRequest,
)
from ..service.auth import CurrentCustomer, current_customer
from ..service.notification import list_notifications, mark_read

router = APIRouter(prefix="/notifications", tags=["notification"])
log = structlog.get_logger("notification")


@router.get("", response_model=NotificationListResponse)
async def list_for_me(
    unread_only: bool = Query(False),
    types: str | None = Query(
        default=None,
        description="콤마 구분 TYPE_CD 필터 (예: TRANSFER,FDS). 생략 시 전체.",
    ),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: CurrentCustomer = Depends(current_customer),
) -> NotificationListResponse:
    type_filter: list[str] | None = None
    if types:
        parsed = [t.strip().upper() for t in types.split(",") if t.strip()]
        type_filter = parsed or None

    items, has_next, total, unread, unread_by_type = await list_notifications(
        user.customer_no,
        unread_only=unread_only,
        types=type_filter,
        limit=size,
        offset=(page - 1) * size,
    )
    return NotificationListResponse(
        items=[NotificationItem(**i) for i in items],
        total=total,
        unread_count=unread,
        unread_by_type=unread_by_type,
        page=page,
        size=size,
        has_next=has_next,
    )


@router.post("/read")
async def post_read(
    req: NotificationReadRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    n = await mark_read(user.customer_no, req.ids)
    log.info("notification_read", count=n, all=req.ids is None)
    return {"updated": n}