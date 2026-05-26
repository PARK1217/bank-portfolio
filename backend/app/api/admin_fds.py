"""관리자 — 의심거래(FDS_DETECTION) 라우터.

엔드포인트
- GET   /api/admin/fds/dashboard               메인 진입 KPI
- GET   /api/admin/fds                         의심거래 큐 (필터·페이징)
- GET   /api/admin/fds/{customer_no}/{detect_seq}
                                               단건 + TRANSACTION 컨텍스트
- PATCH /api/admin/fds/{customer_no}/{detect_seq}/investigation
                                               조사 상태/결론 갱신
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, Request
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_fds import (
    get_admin_fds_dashboard,
    get_admin_fds_detail,
    list_admin_fds,
    update_investigation,
)

router = APIRouter(prefix="/admin/fds", tags=["admin-fds"])


class InvestigationPatch(BaseModel):
    investigation_status_cd: str = Field(
        ..., pattern="^(PENDING|CONFIRM|REPORT|CLOSE)$"
    )
    conclusion: str | None = Field(None, max_length=200)


@router.get("/dashboard")
async def fds_dashboard(
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_admin_fds_dashboard()


@router.get("")
async def fds_list(
    admin: CurrentAdmin = Depends(require_admin),
    judgment_cd: str | None = Query(None, max_length=10),
    investigation_status_cd: str | None = Query(None, max_length=10),
    query: str | None = Query(None, max_length=100, description="회원이름·회원번호"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_admin_fds(
        judgment_cd=judgment_cd,
        investigation_status_cd=investigation_status_cd,
        query=query,
        limit=limit,
        offset=offset,
    )


@router.get("/{customer_no}/{detect_seq}")
async def fds_detail(
    customer_no: int = Path(..., ge=1),
    detect_seq: int = Path(..., ge=1, le=32767),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_admin_fds_detail(customer_no, detect_seq)


@router.patch("/{customer_no}/{detect_seq}/investigation")
async def fds_investigation_patch(
    req: InvestigationPatch,
    request: Request,
    customer_no: int = Path(..., ge=1),
    detect_seq: int = Path(..., ge=1, le=32767),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    result = await update_investigation(
        customer_no=customer_no,
        detect_seq=detect_seq,
        status_cd=req.investigation_status_cd,
        conclusion=req.conclusion,
        employee_no=admin.employee_no,
    )
    request.state.audit_after = {
        "customer_no": customer_no,
        "detect_seq": detect_seq,
        "new_status_cd": req.investigation_status_cd,
        "conclusion": (req.conclusion or "")[:500],
    }
    return result
