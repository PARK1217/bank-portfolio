"""관리자 — 약관 운영 라우터.

GET    /api/admin/terms                목록 검색
GET    /api/admin/terms/{terms_id}     상세 + 변경 이력 + 동의 통계 + 같은 약관 다른 버전
POST   /api/admin/terms                신규 발행 (version 자동 채번)
PATCH  /api/admin/terms/{terms_id}     수정
DELETE /api/admin/terms/{terms_id}     소프트 삭제
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field

from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_terms import (
    create_terms,
    delete_terms,
    get_terms_detail,
    list_terms,
    update_terms,
)

router = APIRouter(prefix="/admin/terms", tags=["admin-terms"])


_TYPE_PATTERN = "^(DEPOSIT|GENERAL|LOAN|MARKET|PRD_SPEC|PRIVACY|TRANSFER)$"
_STATUS_PATTERN = "^(ACTIVE|INACTIVE|ARCHIVED)$"


class TermsCreateRequest(BaseModel):
    terms_type_cd: str = Field(..., pattern=_TYPE_PATTERN)
    terms_name: str = Field(..., min_length=1, max_length=80)
    terms_body: str = Field(..., min_length=1)
    effective_date: str | None = Field(None, min_length=8, max_length=8, pattern=r"^\d{8}$")
    expire_date: str | None = Field(None, min_length=8, max_length=8, pattern=r"^\d{8}$")
    agree_required_yn: str = Field("Y", pattern="^(Y|N)$")
    re_agree_yn: str = Field("N", pattern="^(Y|N)$")
    status_cd: str = Field("ACTIVE", pattern=_STATUS_PATTERN)
    owner_dept: str | None = Field(None, max_length=50)


class TermsUpdateRequest(BaseModel):
    terms_name: str | None = Field(None, max_length=80)
    terms_body: str | None = None
    effective_date: str | None = Field(None, min_length=8, max_length=8, pattern=r"^\d{8}$")
    expire_date: str | None = Field(None, min_length=8, max_length=8, pattern=r"^\d{8}$")
    agree_required_yn: str | None = Field(None, pattern="^(Y|N)$")
    re_agree_yn: str | None = Field(None, pattern="^(Y|N)$")
    status_cd: str | None = Field(None, pattern=_STATUS_PATTERN)
    owner_dept: str | None = Field(None, max_length=50)


@router.get("")
async def list_route(
    admin: CurrentAdmin = Depends(require_admin),
    query: str | None = Query(None, max_length=100),
    type_cd: str | None = Query(None),
    status_cd: str | None = Query(None),
    required_yn: str | None = Query(None, pattern="^(Y|N)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_terms(
        query=query, type_cd=type_cd, status_cd=status_cd,
        required_yn=required_yn, limit=limit, offset=offset,
    )


@router.get("/{terms_id}")
async def detail_route(
    terms_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await get_terms_detail(terms_id)


@router.post("")
async def create_route(
    req: TermsCreateRequest,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await create_terms(
        terms_type_cd=req.terms_type_cd,
        terms_name=req.terms_name,
        terms_body=req.terms_body,
        effective_date=req.effective_date,
        expire_date=req.expire_date,
        agree_required_yn=req.agree_required_yn,
        re_agree_yn=req.re_agree_yn,
        status_cd=req.status_cd,
        owner_dept=req.owner_dept,
        employee_no=admin.employee_no,
    )


@router.patch("/{terms_id}")
async def update_route(
    req: TermsUpdateRequest,
    terms_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await update_terms(
        terms_id=terms_id,
        terms_name=req.terms_name,
        terms_body=req.terms_body,
        effective_date=req.effective_date,
        expire_date=req.expire_date,
        agree_required_yn=req.agree_required_yn,
        re_agree_yn=req.re_agree_yn,
        status_cd=req.status_cd,
        owner_dept=req.owner_dept,
        employee_no=admin.employee_no,
    )


@router.delete("/{terms_id}")
async def delete_route(
    terms_id: int = Path(..., gt=0),
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await delete_terms(terms_id, employee_no=admin.employee_no)
