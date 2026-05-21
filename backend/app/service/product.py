"""상품 카탈로그/상세 조회 (OP-001, OP-002).

PRODUCT 테이블 + 4개 연관 테이블(PRODUCT_PERIOD/RATE_POLICY/BONUS_CONDITION/
TERMS_MAPPING) 조합. 조회 전용 — 가입 트랜잭션은 별도 모듈.
"""

from __future__ import annotations

from datetime import date, datetime

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from ..schema.product import (
    ProductBonusConditionEntry,
    ProductCatalogItem,
    ProductDetailResponse,
    ProductPeriodEntry,
    ProductRatePolicyEntry,
    ProductTermsMapping,
)


def _parse_yyyymmdd(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:8], "%Y%m%d").date()
    except ValueError:
        return None


def _yn_to_bool(v) -> bool:
    return v == "Y"


_PRODUCT_COLS = (
    '"PRODUCT_ID", "PRODUCT_NAME", "PRODUCT_TYPE_CD", "SPECIAL_YN", '
    '"MIN_AMOUNT", "MAX_AMOUNT", "SALE_START_DATE", "SALE_END_DATE"'
)


def _row_to_catalog_item(r, base_rate: float = 0.0) -> ProductCatalogItem:
    return ProductCatalogItem(
        product_id=int(r["PRODUCT_ID"]),
        product_name=r["PRODUCT_NAME"] or "",
        product_type_cd=r["PRODUCT_TYPE_CD"] or "UNKNOWN",
        base_rate=base_rate,
        min_amount=r["MIN_AMOUNT"],
        max_amount=r["MAX_AMOUNT"],
        special_yn=_yn_to_bool(r["SPECIAL_YN"]),
        sale_start_date=_parse_yyyymmdd(r["SALE_START_DATE"]),
        sale_end_date=_parse_yyyymmdd(r["SALE_END_DATE"]),
    )


async def fetch_catalog() -> list[ProductCatalogItem]:
    """판매 가능 상품 카탈로그. base_rate는 RATE_POLICY 첫 행 APPLY_RATE 대표값."""
    today = date.today().strftime("%Y%m%d")
    pool = get_pool()
    sql = (
        f'SELECT {_PRODUCT_COLS}, '
        '  (SELECT "APPLY_RATE" FROM public."PRODUCT_RATE_POLICY" rp '
        '     WHERE rp."PRODUCT_ID" = p."PRODUCT_ID" AND rp."DELETE_YN" = \'N\' '
        '     ORDER BY rp."RATE_SEQ" LIMIT 1) AS base_rate '
        'FROM public."PRODUCT" p '
        'WHERE p."DELETE_YN" = \'N\' '
        "  AND p.\"PRODUCT_STATUS_CD\" = 'SALE' "
        "  AND (p.\"SALE_START_DATE\" IS NULL OR p.\"SALE_START_DATE\" <= $1) "
        "  AND (p.\"SALE_END_DATE\" IS NULL OR p.\"SALE_END_DATE\" >= $1) "
        'ORDER BY p."PRODUCT_ID"'
    )
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, today)
    return [
        _row_to_catalog_item(r, float(r["base_rate"] or 0.0))
        for r in rows
    ]


async def fetch_product_detail(product_id: int) -> ProductDetailResponse:
    today = date.today().strftime("%Y%m%d")
    pool = get_pool()
    async with pool.acquire() as conn:
        # 목록(fetch_catalog)과 동일한 판매 상태/기간 조건 적용 (검증 인계 ⚠️)
        prod = await conn.fetchrow(
            f'SELECT {_PRODUCT_COLS} FROM public."PRODUCT" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' '
            "  AND \"PRODUCT_STATUS_CD\" = 'SALE' "
            "  AND (\"SALE_START_DATE\" IS NULL OR \"SALE_START_DATE\" <= $2) "
            "  AND (\"SALE_END_DATE\" IS NULL OR \"SALE_END_DATE\" >= $2)",
            product_id,
            today,
        )
        if prod is None:
            raise NotFoundError(E_NOT_FOUND, "상품을 찾을 수 없습니다.")

        # PERIOD_ID = PERIOD_SEQ 매핑 규약 (db/02_seed.sql §11) 으로 기간별 금리 left-join
        periods = await conn.fetch(
            'SELECT pp."MIN_MONTHS", pp."MAX_MONTHS", rp."APPLY_RATE" '
            'FROM public."PRODUCT_PERIOD" pp '
            'LEFT JOIN public."PRODUCT_RATE_POLICY" rp '
            '  ON rp."PRODUCT_ID" = pp."PRODUCT_ID" '
            ' AND rp."PERIOD_ID" = pp."PERIOD_SEQ" '
            ' AND rp."DELETE_YN" = \'N\' '
            'WHERE pp."PRODUCT_ID" = $1 AND pp."DELETE_YN" = \'N\' '
            'ORDER BY pp."PERIOD_SEQ"',
            product_id,
        )
        rate_rows = await conn.fetch(
            'SELECT "TIER_MIN_AMOUNT", "APPLY_RATE" FROM public."PRODUCT_RATE_POLICY" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "RATE_SEQ"',
            product_id,
        )
        bonus_rows = await conn.fetch(
            'SELECT "BONUS_TYPE_CD", "CONDITION_DESC", "BONUS_RATE" '
            'FROM public."PRODUCT_BONUS_CONDITION" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "BONUS_SEQ"',
            product_id,
        )
        terms_rows = await conn.fetch(
            'SELECT t."TERMS_ID", t."VERSION", t."TERMS_NAME", m."AGREE_REQUIRED_YN" '
            'FROM public."PRODUCT_TERMS_MAPPING" m '
            'JOIN public."TERMS_MASTER" t ON t."TERMS_ID" = m."TERMS_ID" '
            'WHERE m."PRODUCT_ID" = $1 AND m."DELETE_YN" = \'N\' '
            '  AND t."DELETE_YN" = \'N\' '
            'ORDER BY m."MAPPING_SEQ"',
            product_id,
        )

    base_rate = float(rate_rows[0]["APPLY_RATE"] or 0.0) if rate_rows else 0.0

    return ProductDetailResponse(
        product=_row_to_catalog_item(prod, base_rate),
        periods=[
            ProductPeriodEntry(
                # MIN_MONTHS 대표값(범위는 명세 시트 확정 후 분리)
                period_months=int(p["MIN_MONTHS"] or 0),
                rate=float(p["APPLY_RATE"] or 0.0),  # PERIOD_ID join 결과; 없으면 0
            )
            for p in periods
        ],
        rate_policies=[
            ProductRatePolicyEntry(
                tier_min_amount=int(r["TIER_MIN_AMOUNT"] or 0),
                base_rate=float(r["APPLY_RATE"] or 0.0),
                bonus_rate_max=0.0,  # 명세 시트 확정 후 보정
            )
            for r in rate_rows
        ],
        bonus_conditions=[
            ProductBonusConditionEntry(
                condition_cd=b["BONUS_TYPE_CD"] or "UNKNOWN",
                description=b["CONDITION_DESC"] or "",
                bonus_rate=float(b["BONUS_RATE"] or 0.0),
            )
            for b in bonus_rows
        ],
        terms_mappings=[
            ProductTermsMapping(
                terms_id=int(t["TERMS_ID"]),
                version=int(t["VERSION"] or 1),
                title=t["TERMS_NAME"] or "",
                required=_yn_to_bool(t["AGREE_REQUIRED_YN"]),
            )
            for t in terms_rows
        ],
    )