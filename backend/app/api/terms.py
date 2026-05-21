"""약관 라우터 — 약관 목록 / 상세 조회 (공개, 인증 불필요).

TERMS_MASTER 메타는 DB, 본문(body)은 `data/seed-terms/{NN}-*.md` 파일에서 로드.
DB 컬럼 TERMS_BODY 는 RAG 코퍼스용 long-text 보관소로 남겨두고, UI 노출용 본문은 파일 시스템에서 가져온다.
"""

from __future__ import annotations

import re
from pathlib import Path

import structlog
from fastapi import APIRouter
from pydantic import BaseModel

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError

router = APIRouter(prefix="/terms", tags=["terms"])
log = structlog.get_logger("terms")


# 시드 약관 마크다운 디렉터리. docker-compose 마운트(`./data:/app/data:ro`) 기준 `/app/data/seed-terms`.
# 로컬(IDE) 직접 실행 시엔 repo 루트의 `data/seed-terms` 로 fallback.
_DOCKER_DIR = Path("/app/data/seed-terms")
_LOCAL_DIR = Path(__file__).resolve().parents[3] / "data" / "seed-terms"
_SEED_TERMS_DIR = _DOCKER_DIR if _DOCKER_DIR.exists() else _LOCAL_DIR

_FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)

# DB TERMS_TYPE_CD 는 varchar(8) 한도라 'MARKET' 으로 저장되지만 UI 라벨/필터키는 풀네임 'MARKETING' 을 기대.
_CATEGORY_DB_TO_UI = {"MARKET": "MARKETING"}


def _norm_category(c: str | None) -> str:
    if not c:
        return "GENERAL"
    return _CATEGORY_DB_TO_UI.get(c, c)


class TermsListItem(BaseModel):
    terms_id: int
    title: str
    version: int
    category: str
    effective_date: str
    required: bool


class TermsListResponse(BaseModel):
    items: list[TermsListItem]


class TermsDetailResponse(BaseModel):
    terms_id: int
    version: int
    title: str
    category: str
    effective_date: str
    body: str | None = None
    clauses: list[dict] | None = None  # 현재는 마크다운 통문장으로만 응답 (clauses=None)
    required: bool


def _yyyymmdd_to_iso(s: str | None) -> str:
    if not s or len(s) < 8:
        return ""
    return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"


def _load_body_for(terms_id: int) -> str | None:
    """data/seed-terms/{NN}-*.md 파일에서 본문 로드. frontmatter 제거."""
    if not _SEED_TERMS_DIR.exists():
        return None
    prefix = f"{terms_id:02d}-"
    for fp in _SEED_TERMS_DIR.iterdir():
        if fp.name.startswith(prefix) and fp.suffix == ".md":
            text = fp.read_text(encoding="utf-8")
            return _FRONTMATTER_RE.sub("", text).strip()
    return None


@router.get("", response_model=TermsListResponse)
async def list_terms() -> TermsListResponse:
    """활성 약관 목록. SCR-TM-001 / 푸터 「약관·정책」 진입."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "TERMS_ID","TERMS_TYPE_CD","TERMS_NAME","VERSION",'
            '       "EFFECTIVE_DATE","AGREE_REQUIRED_YN" '
            'FROM public."TERMS_MASTER" '
            "WHERE \"DELETE_YN\" = 'N' AND \"TERMS_STATUS_CD\" = 'ACTIVE' "
            'ORDER BY "TERMS_ID"'
        )
    items = [
        TermsListItem(
            terms_id=int(r["TERMS_ID"]),
            title=r["TERMS_NAME"] or "",
            version=int(r["VERSION"] or 1),
            category=_norm_category(r["TERMS_TYPE_CD"]),
            effective_date=_yyyymmdd_to_iso(r["EFFECTIVE_DATE"]),
            required=(r["AGREE_REQUIRED_YN"] == "Y"),
        )
        for r in rows
    ]
    log.info("terms_list", count=len(items))
    return TermsListResponse(items=items)


@router.get("/{terms_id}", response_model=TermsDetailResponse)
async def get_terms_detail(terms_id: int) -> TermsDetailResponse:
    """약관 단건 + 본문. SCR-TM-002 / 상품 상세 약관 링크 클릭 진입."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "TERMS_ID","TERMS_TYPE_CD","TERMS_NAME","VERSION",'
            '       "EFFECTIVE_DATE","AGREE_REQUIRED_YN" '
            'FROM public."TERMS_MASTER" '
            'WHERE "TERMS_ID" = $1 AND "DELETE_YN" = \'N\' '
            "  AND \"TERMS_STATUS_CD\" = 'ACTIVE'",
            terms_id,
        )
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "약관을 찾을 수 없습니다.")
    body = _load_body_for(terms_id)
    if body is None:
        log.warning("terms_body_missing", terms_id=terms_id)
    return TermsDetailResponse(
        terms_id=int(row["TERMS_ID"]),
        version=int(row["VERSION"] or 1),
        title=row["TERMS_NAME"] or "",
        category=_norm_category(row["TERMS_TYPE_CD"]),
        effective_date=_yyyymmdd_to_iso(row["EFFECTIVE_DATE"]),
        body=body,
        clauses=None,
        required=(row["AGREE_REQUIRED_YN"] == "Y"),
    )