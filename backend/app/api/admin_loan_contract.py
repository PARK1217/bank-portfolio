"""관리자 — 실행된 대출 계약 검색 라우터.

엔드포인트
- GET /api/admin/loans/contracts    LOAN_CONTRACT 전체 검색·필터·페이징

계약 1건의 상세(실행/스케줄/이력)는 기존 admin_loan_repay 의
`/api/admin/loans/repayments/{loan_contract_no}` 가 통합 응답으로 제공한다.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_loan_contract import list_loan_contracts

router = APIRouter(prefix="/admin/loans", tags=["admin-loan-contract"])


@router.get("/contracts")
async def list_contracts_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100, description="계약번호/회원번호/이름/상품명 부분 일치"),
    loan_type_cd: str | None = Query(None, max_length=10, description="TERM/CREDIT/MORTGAGE"),
    status_cd: str | None = Query(None, max_length=10, description="NEW/NORMAL/OVERDUE/CLOSED"),
    repay_method_cd: str | None = Query(None, max_length=10, description="EPI/OD/..."),
    rate_min: float | None = Query(None, ge=0, le=100),
    rate_max: float | None = Query(None, ge=0, le=100),
    date_from: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    date_to: str | None = Query(None, min_length=8, max_length=8, pattern=r"^\d{8}$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_loan_contracts(
        query=query,
        loan_type_cd=loan_type_cd,
        status_cd=status_cd,
        repay_method_cd=repay_method_cd,
        rate_min=rate_min,
        rate_max=rate_max,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
