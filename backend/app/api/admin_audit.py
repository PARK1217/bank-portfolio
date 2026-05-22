"""관리자 — 감사 로그 조회 라우터 (Phase 6 §9.2.7).

엔드포인트
- GET /api/admin/audit/logs    필터된 ADMIN_AUDIT_LOG 목록
- GET /api/admin/audit/facets  필터 드롭다운용 distinct action_cd / employee_no / target_table

⚠️ INSERT 는 AdminAuditMiddleware 가 자동으로 처리. 본 라우터는 조회만.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..service.admin_audit import list_audit_facets, list_audit_logs
from ..service.admin_auth import CurrentAdmin, require_admin

router = APIRouter(prefix="/admin/audit", tags=["admin-audit"])


@router.get("/logs")
async def list_logs_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100, description="EMPLOYEE_NO 또는 TARGET_ID 부분 일치"),
    employee_no: str | None = Query(None, max_length=20),
    action_cd: str | None = Query(None, max_length=30),
    result_cd: str | None = Query(None, max_length=20, description="OK / DENIED / ERROR"),
    target_table: str | None = Query(None, max_length=50),
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_audit_logs(
        query=query,
        employee_no=employee_no,
        action_cd=action_cd,
        result_cd=result_cd,
        target_table=target_table,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


@router.get("/facets")
async def facets_route(admin: CurrentAdmin = Depends(require_admin)) -> dict:
    return await list_audit_facets()