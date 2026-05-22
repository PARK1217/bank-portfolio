"""관리자 — 대출 상환 목록·계약별 상환 상세 라우터.

엔드포인트
- GET /api/admin/loans/repayments                       목록 (검색·필터·페이징)
- GET /api/admin/loans/repayments/{loan_contract_no}    계약 1건의 스케줄·이력·합계

require_admin Depends 게이팅. AdminAuditMiddleware 가 자동 적재.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_loan_repay import get_contract_repayment_detail, list_repayments

router = APIRouter(prefix="/admin/loans", tags=["admin-loan-repay"])


@router.get("/repayments")
async def list_repayments_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100, description="계약번호/회원번호/이름 부분 일치"),
    repay_type_cd: str | None = Query(None, max_length=10, description="정상/중도/연체"),
    channel_cd: str | None = Query(None, max_length=10, description="APP/COUNTER/AUTO_TRANSFER"),
    status_cd: str | None = Query(None, max_length=10, description="COMPLETE/CANCEL"),
    date_from: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    date_to: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_repayments(
        query=query,
        repay_type_cd=repay_type_cd,
        channel_cd=channel_cd,
        status_cd=status_cd,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


@router.get("/repayments/{loan_contract_no}")
async def get_repayment_detail_route(
    loan_contract_no: str = Path(..., min_length=4, max_length=30),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_contract_repayment_detail(loan_contract_no)
