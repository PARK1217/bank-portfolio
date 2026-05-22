"""관리자 — 회원(고객) 관리 라우터.

엔드포인트
- GET /api/admin/customers           회원 목록 (query/grade/status 필터)
- GET /api/admin/customers/{cust_no} 회원 1명 종합 상세

`require_admin` Depends 게이팅. AdminAuditMiddleware 가 자동 적재.

⚠️ /admin/customers/overdue 와 /admin/customers/{cust}/overdue 는
admin_overdue.py 에 별도 라우터로 등록돼 있음 (FastAPI 가 prefix 가
같은 두 라우터의 path 를 합쳐서 처리). overdue 가 먼저 매칭되도록
main.py 에 admin_customer_router 보다 admin_overdue_router 를 *나중*
에 등록하면 충돌 — 그래서 본 라우터에선 /overdue path 를 정의하지
않고, /{cust_no} 만 두어 충돌을 피한다.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_customer import get_customer_detail, list_customers

router = APIRouter(prefix="/admin/customers", tags=["admin-customer"])


@router.get("")
async def list_customers_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100, description="customer_no/email/PARTY_NAME 부분 일치"),
    grade_cd: str | None = Query(None, max_length=10),
    status_cd: str | None = Query(None, max_length=10),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_customers(
        query=query,
        grade_cd=grade_cd,
        status_cd=status_cd,
        limit=limit,
        offset=offset,
    )


@router.get("/{customer_no}")
async def get_customer_route(
    customer_no: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_customer_detail(customer_no)