"""관리자 — 대출 신청 첨부서류 검증 라우터 (Phase 6 §9.2.4).

엔드포인트
- GET  /api/admin/loans/{application_id}/attachments              — 매트릭스 조회
- POST /api/admin/loans/{application_id}/attachments/{attach_id}/verify  — 승인 (ADMIN 만)
- POST /api/admin/loans/{application_id}/attachments/{attach_id}/reject  — 반려 + 사유 (ADMIN 만)
- GET  /api/admin/loans/{application_id}/attachments/{attach_id}/file    — 파일 다운로드/미리보기
"""

from __future__ import annotations

from pathlib import Path as PPath

from fastapi import APIRouter, Depends, Path
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from ..service.admin_attach import (
    get_attachments,
    reject_attachment,
    resolve_attach_file,
    verify_attachment,
)
from ..service.admin_auth import CurrentAdmin, require_admin

router = APIRouter(prefix="/admin/loans", tags=["admin-loan-attach"])


# ---------------------------------------------------------------------------
# 조회
# ---------------------------------------------------------------------------

@router.get("/{application_id}/attachments")
async def get_loan_attachments(
    application_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_attachments(application_id)


# ---------------------------------------------------------------------------
# 승인 / 반려
# ---------------------------------------------------------------------------

class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)


@router.post("/{application_id}/attachments/{attach_id}/verify")
async def post_verify_attachment(
    application_id: int = Path(..., gt=0),
    attach_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await verify_attachment(
        application_id,
        attach_id,
        employee_no=admin.employee_no,
        auth_level_cd=admin.auth_level_cd,
    )


@router.post("/{application_id}/attachments/{attach_id}/reject")
async def post_reject_attachment(
    req: RejectRequest,
    application_id: int = Path(..., gt=0),
    attach_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await reject_attachment(
        application_id,
        attach_id,
        employee_no=admin.employee_no,
        auth_level_cd=admin.auth_level_cd,
        reason=req.reason,
    )


# ---------------------------------------------------------------------------
# 파일 다운로드 / 미리보기
# ---------------------------------------------------------------------------

# 컨테이너 안 마운트 위치: /app + /app/data (docker-compose.yml 의 `./data:/app/data` 마운트).
_FILES_ROOT = PPath("/app")


@router.get("/{application_id}/attachments/{attach_id}/file")
async def get_attach_file(
    application_id: int = Path(..., gt=0),
    attach_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> FileResponse:
    disk_rel, file_name = await resolve_attach_file(application_id, attach_id)
    disk_path = (_FILES_ROOT / disk_rel).resolve()
    # `_FILES_ROOT` 밖으로 빠지면 차단 (resolve 후 prefix 검증).
    if not str(disk_path).startswith(str(_FILES_ROOT.resolve())):
        raise NotFoundError(E_NOT_FOUND, "첨부 파일을 찾을 수 없어요.")
    if not disk_path.is_file():
        raise NotFoundError(E_NOT_FOUND, f"첨부 파일이 디스크에 없어요: {file_name}")
    return FileResponse(
        path=str(disk_path),
        filename=file_name or "attachment",
    )