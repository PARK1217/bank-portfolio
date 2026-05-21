"""관리자 — 외부 통신망 헬스 라우터 (Phase 6 §9.2.3).

엔드포인트
- GET /api/admin/health/external                   각 API 최신 스냅
- GET /api/admin/health/external/{api_name}        해당 API 시계열
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_health import API_NAMES, history_for, latest_snapshot

router = APIRouter(prefix="/admin/health", tags=["admin-health"])


@router.get("/external")
async def list_external_health(
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    items = await latest_snapshot()
    return {"items": items, "count": len(items)}


@router.get("/external/{api_name}")
async def get_external_history(
    api_name: str = Path(..., min_length=1, max_length=50),
    limit: int = Query(50, ge=1, le=500),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    upper = api_name.upper()
    if upper not in API_NAMES:
        raise HTTPException(404, f"알 수 없는 API_NAME: {api_name}")
    items = await history_for(upper, limit=limit)
    return {"api_name": upper, "items": items, "count": len(items)}