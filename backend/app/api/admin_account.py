"""관리자 — 계좌 관리 라우터.

엔드포인트
- GET /api/admin/accounts                목록 (query/type/status 필터)
- GET /api/admin/accounts/{account_no}   계좌 상세 + 최근 거래 20건
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query

from ..service.admin_account import get_account_detail, list_accounts
from ..service.admin_auth import CurrentAdmin, require_admin

router = APIRouter(prefix="/admin/accounts", tags=["admin-account"])


@router.get("")
async def list_accounts_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100, description="account_no/holder_name/customer_no 부분 일치"),
    account_type_cd: str | None = Query(None, max_length=10),
    status_cd: str | None = Query(None, max_length=10),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_accounts(
        query=query,
        account_type_cd=account_type_cd,
        status_cd=status_cd,
        limit=limit,
        offset=offset,
    )


@router.get("/{account_no}")
async def get_account_route(
    account_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_account_detail(account_no)