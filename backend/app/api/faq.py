"""FAQ 카탈로그 — 비로그인 공개 (SCR-CB-002 외부 진입점).

기존 `/api/chatbot/faq` 는 in-memory 시연용 코퍼스만 보여줬는데, 본 라우터는 DB 의
AI_FAQ 전체 (~100건)를 카테고리 필터 + 키워드 검색 + 페이지네이션으로 노출.

비로그인도 조회 가능 — 약관·공지처럼 마케팅 페이지 성격.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..db import get_pool

router = APIRouter(prefix="/faqs", tags=["faq"])


CATEGORY_LABELS = {
    "ACCOUNT": "계좌",
    "TRANSFER": "이체",
    "AUTO_TRANSFER": "자동이체",
    "LOAN": "대출",
    "PRODUCT": "상품",
    "SIGNUP": "가입·인증",
    "SECURITY": "보안",
    "TERMS": "약관",
    "OTHER": "기타",
}


class FaqItem(BaseModel):
    faq_id: int
    category: str
    category_label: str
    question: str
    answer: str
    hit_count: int


class FaqCategory(BaseModel):
    code: str
    label: str
    count: int


class FaqListResponse(BaseModel):
    items: list[FaqItem]
    total: int
    categories: list[FaqCategory]


@router.get("", response_model=FaqListResponse)
async def list_faqs(
    category: str | None = Query(None, description="카테고리 코드 (ACCOUNT/TRANSFER 등)"),
    q: str | None = Query(None, description="질문·답변 본문 키워드"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> FaqListResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        # 카테고리 분포 — 사이드 필터 칩 노출용
        cats = await conn.fetch(
            'SELECT "CATEGORY" AS code, COUNT(*) AS cnt '
            'FROM public."AI_FAQ" WHERE "DELETE_YN" = \'N\' '
            'GROUP BY "CATEGORY" ORDER BY cnt DESC'
        )

        # 본 목록
        where = ['"DELETE_YN" = \'N\'']
        args: list = []
        if category:
            where.append(f'"CATEGORY" = ${len(args) + 1}')
            args.append(category.upper())
        if q:
            where.append(
                f'("QUESTION" ILIKE ${len(args) + 1} OR "ANSWER" ILIKE ${len(args) + 1})'
            )
            args.append(f"%{q}%")
        where_sql = " AND ".join(where)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."AI_FAQ" WHERE {where_sql}', *args
        )

        rows = await conn.fetch(
            f'SELECT "FAQ_ID", "CATEGORY", "QUESTION", "ANSWER", '
            f'       COALESCE("HIT_COUNT", 0) AS hit '
            f'FROM public."AI_FAQ" WHERE {where_sql} '
            f'ORDER BY hit DESC, "FAQ_ID" '
            f'LIMIT ${len(args) + 1} OFFSET ${len(args) + 2}',
            *args, limit, offset,
        )

    items = [
        FaqItem(
            faq_id=int(r["FAQ_ID"]),
            category=r["CATEGORY"] or "OTHER",
            category_label=CATEGORY_LABELS.get(r["CATEGORY"] or "OTHER", r["CATEGORY"] or "기타"),
            question=r["QUESTION"] or "",
            answer=r["ANSWER"] or "",
            hit_count=int(r["hit"]),
        )
        for r in rows
    ]
    categories = [
        FaqCategory(
            code=c["code"] or "OTHER",
            label=CATEGORY_LABELS.get(c["code"] or "OTHER", c["code"] or "기타"),
            count=int(c["cnt"]),
        )
        for c in cats
    ]
    return FaqListResponse(items=items, total=int(total or 0), categories=categories)
