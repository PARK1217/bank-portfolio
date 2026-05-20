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
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: CurrentCustomer = Depends(current_customer),
) -> NotificationListResponse:
    items, has_next, unread = await list_notifications(
        user.customer_no,
        unread_only=unread_only,
        limit=size,
        offset=(page - 1) * size,
    )
    return NotificationListResponse(
        items=[NotificationItem(**i) for i in items],
        unread_count=unread,
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