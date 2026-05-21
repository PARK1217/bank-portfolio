"""관리자 — 대출 신청 첨부서류 일치성 검증 라우터 (Phase 6 §9.2.4).

엔드포인트
- GET /api/admin/loans/{application_id}/attachments
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path

from ..service.admin_attach import get_attachments
from ..service.admin_auth import CurrentAdmin, require_admin

router = APIRouter(prefix="/admin/loans", tags=["admin-loan-attach"])


@router.get("/{application_id}/attachments")
async def get_loan_attachments(
    application_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_attachments(application_id)