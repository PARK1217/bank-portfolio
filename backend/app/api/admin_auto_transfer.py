"""관리자 — 자동이체 워커 모니터링 라우터.

GET /api/admin/auto-transfers/dashboard       워커 현황·실패 사유·예정
GET /api/admin/auto-transfers                 자동이체 목록 검색
GET /api/admin/auto-transfers/exec-history    실행 이력 통합 검색
GET /api/admin/auto-transfers/{auto_id}       1건 + 실행 이력
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_auto_transfer import (
    get_auto_transfer_detail,
    get_dashboard,
    list_auto_transfers,
    list_exec_history,
)

router = APIRouter(prefix="/admin/auto-transfers", tags=["admin-auto-transfer"])


@router.get("/dashboard")
async def dashboard_route(admin: CurrentAdmin = Depends(require_admin)) -> dict:
    return await get_dashboard()


@router.get("/exec-history")
async def exec_history_route(
    admin: CurrentAdmin = Depends(require_admin),
    status_cd: str | None = Query(None, max_length=10, description="SUCCESS/FAIL/DELAY"),
    delay_reason_cd: str | None = Query(None, max_length=10, description="NO_BAL/NO_ACCT/DUP/BOKCLS/INTERNAL/ERR"),
    date_from: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    date_to: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_exec_history(
        status_cd=status_cd,
        delay_reason_cd=delay_reason_cd,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


@router.get("")
async def list_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100),
    status_cd: str | None = Query(None, max_length=10),
    cycle_cd: str | None = Query(None, max_length=10),
    customer_no: int | None = Query(None, gt=0),
    account_no: str | None = Query(None, max_length=30),
    amount_min: int | None = Query(None, ge=0),
    amount_max: int | None = Query(None, ge=0),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_auto_transfers(
        query=query,
        status_cd=status_cd,
        cycle_cd=cycle_cd,
        customer_no=customer_no,
        account_no=account_no,
        amount_min=amount_min,
        amount_max=amount_max,
        limit=limit,
        offset=offset,
    )


@router.get("/{auto_id}")
async def detail_route(
    auto_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_auto_transfer_detail(auto_id)
