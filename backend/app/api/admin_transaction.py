"""관리자 — 거래내역 통합 검색 라우터.

GET /api/admin/transactions                         검색
GET /api/admin/transactions/{transaction_id}        상세
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_transaction import get_transaction_detail, list_transactions

router = APIRouter(prefix="/admin/transactions", tags=["admin-transaction"])


@router.get("")
async def list_transactions_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100),
    account_no: str | None = Query(None, max_length=30),
    customer_no: int | None = Query(None, gt=0),
    tx_type_cd: str | None = Query(None, max_length=10),
    status_cd: str | None = Query(None, max_length=10),
    own_bank_yn: str | None = Query(None, pattern="^(Y|N)$"),
    date_from: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    date_to: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    amount_min: int | None = Query(None, ge=0),
    amount_max: int | None = Query(None, ge=0),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_transactions(
        query=query,
        account_no=account_no,
        customer_no=customer_no,
        tx_type_cd=tx_type_cd,
        status_cd=status_cd,
        own_bank_yn=own_bank_yn,
        date_from=date_from,
        date_to=date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        limit=limit,
        offset=offset,
    )


@router.get("/{transaction_id}")
async def get_transaction_route(
    transaction_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_transaction_detail(transaction_id)
