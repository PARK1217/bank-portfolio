"""관리자 — 상품 관리 서비스 (Phase 6 신설).

운영자 시점의 PRODUCT 조회·운영 액션. 고객용 카탈로그(`service/product.py`)는
`PRODUCT_STATUS_CD='SALE'` + 판매기간 필터만 반환하지만, 관리자 화면은:

- 모든 상태(SALE / SUSPEND / CLOSED 등) 노출
- 판매 기간 무관
- 운영 정보: 가입자 수·총 잔액 *실시간 집계* (DEPOSIT_CONTRACT / LOAN_CONTRACT)
  - LOAN 타입: LOAN_CONTRACT.LOAN_PRODUCT_ID 매핑
  - SAVING/DEPOSIT/INSTALL/FOREIGN: DEPOSIT_CONTRACT.PRODUCT_ID 매핑
  - PRODUCT.SUBSCRIBER_COUNT / TOTAL_BALANCE 컬럼은 batch 캐시일 가능성 → 무시하고 실시간 집계
- 상태 변경 액션: SALE / SUSPEND / CLOSED

require_admin 게이팅은 라우터에서 처리, 본 서비스는 비즈니스 로직만.
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_product")


# 운영 상태 — PRODUCT_STATUS_CD varchar(8) 한계 안에서 사용.
ALLOWED_STATUSES = {"SALE", "SUSPEND", "CLOSED"}

# 타입 분류 (집계 분기용)
_LOAN_TYPES = {"LOAN"}
_DEPOSIT_LIKE_TYPES = {"SAVING", "DEPOSIT", "INSTALL", "FOREIGN"}


def _row_to_list_item(r: Any) -> dict:
    return {
        "product_id": int(r["PRODUCT_ID"]),
        "product_name": r["PRODUCT_NAME"] or "",
        "product_type_cd": r["PRODUCT_TYPE_CD"] or "UNKNOWN",
        "product_status_cd": r["PRODUCT_STATUS_CD"] or "UNKNOWN",
        "special_yn": (r["SPECIAL_YN"] == "Y"),
        "min_amount": int(r["MIN_AMOUNT"]) if r["MIN_AMOUNT"] is not None else None,
        "max_amount": int(r["MAX_AMOUNT"]) if r["MAX_AMOUNT"] is not None else None,
        "sale_start_date": r["SALE_START_DATE"],
        "sale_end_date": r["SALE_END_DATE"],
        "owner_dept": r["OWNER_DEPT"],
        "subscriber_count": int(r["live_subscriber_count"] or 0),
        "total_balance_krw": int(r["live_total_balance"] or 0),
        "base_rate": float(r["base_rate"]) if r["base_rate"] is not None else None,
    }


# ---------------------------------------------------------------------------
# 목록 (필터·집계)
# ---------------------------------------------------------------------------

async def list_products(
    *,
    type_cd: str | None = None,
    status_cd: str | None = None,
) -> list[dict]:
    """관리자용 상품 목록 — 필터 + 실시간 가입자/잔액 집계.

    집계 쿼리는 한 SQL 안에서 LEFT JOIN LATERAL 두 개로 처리:
      - DEPOSIT_CONTRACT (SAVING/DEPOSIT/INSTALL/FOREIGN): CONTRACT_STATUS_CD='ACTIVE' COUNT + SUM(BALANCE)
      - LOAN_CONTRACT    (LOAN): CONTRACT_STATUS_CD IN ('ACTIVE','OVERDUE') COUNT + SUM(CURRENT_USAGE|CONTRACT_AMOUNT)
    상품 타입에 따라 어느 쪽 집계가 의미 있는지 분기.
    """
    where_clauses = ["p.\"DELETE_YN\" = 'N'"]
    params: list[Any] = []
    if type_cd:
        params.append(type_cd.upper())
        where_clauses.append(f'p."PRODUCT_TYPE_CD" = ${len(params)}')
    if status_cd:
        params.append(status_cd.upper())
        where_clauses.append(f'p."PRODUCT_STATUS_CD" = ${len(params)}')

    where = " AND ".join(where_clauses)
    sql = f"""
        SELECT
            p."PRODUCT_ID", p."PRODUCT_NAME", p."PRODUCT_TYPE_CD",
            p."PRODUCT_STATUS_CD", p."SPECIAL_YN",
            p."MIN_AMOUNT", p."MAX_AMOUNT",
            p."SALE_START_DATE", p."SALE_END_DATE",
            p."OWNER_DEPT",
            COALESCE(dep.subscriber_count, 0) + COALESCE(lon.subscriber_count, 0) AS live_subscriber_count,
            COALESCE(dep.total_balance, 0)  + COALESCE(lon.total_balance, 0)   AS live_total_balance,
            (
                SELECT "APPLY_RATE" FROM public."PRODUCT_RATE_POLICY" rp
                 WHERE rp."PRODUCT_ID" = p."PRODUCT_ID" AND rp."DELETE_YN" = 'N'
                 ORDER BY rp."RATE_SEQ" LIMIT 1
            ) AS base_rate
        FROM public."PRODUCT" p
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS subscriber_count,
                   COALESCE(SUM(a."BALANCE"), 0) AS total_balance
            FROM public."DEPOSIT_CONTRACT" dc
            JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = dc."ACCOUNT_NO"
            WHERE dc."PRODUCT_ID" = p."PRODUCT_ID"
              AND dc."DELETE_YN" = 'N'
              AND a."DELETE_YN" = 'N'
        ) dep ON p."PRODUCT_TYPE_CD" IN ('SAVING','DEPOSIT','INSTALL','FOREIGN')
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS subscriber_count,
                   COALESCE(SUM(COALESCE(lc."CURRENT_USAGE", lc."CONTRACT_LIMIT", 0)), 0) AS total_balance
            FROM public."LOAN_CONTRACT" lc
            WHERE lc."LOAN_PRODUCT_ID" = p."PRODUCT_ID"
              AND lc."DELETE_YN" = 'N'
              AND lc."LOAN_STATUS_CD" IN ('NORMAL','OVERDUE')
        ) lon ON p."PRODUCT_TYPE_CD" = 'LOAN'
        WHERE {where}
        ORDER BY p."PRODUCT_ID"
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)
    return [_row_to_list_item(r) for r in rows]


# ---------------------------------------------------------------------------
# 상세
# ---------------------------------------------------------------------------

async def get_product_detail(product_id: int) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        prod = await conn.fetchrow(
            'SELECT "PRODUCT_ID", "PRODUCT_NAME", "PRODUCT_TYPE_CD", "PRODUCT_STATUS_CD", '
            '       "SPECIAL_YN", "PREPAY_DEFER_YN", "EARLY_CLOSE_YN", "EXTEND_YN", '
            '       "MIN_AGE", "MAX_AGE", "MATURITY_POLICY_CD", "TARGET_CUSTOMER_CD", '
            '       "MIN_AMOUNT", "MAX_AMOUNT", "MIN_MONTHLY_AMT", "MAX_MONTHLY_AMT", '
            '       "INTEREST_CYCLE_CD", "LAUNCH_DATE", "SALE_START_DATE", "SALE_END_DATE", '
            '       "PRODUCT_DESC", "PRODUCT_FEATURES", "OWNER_DEPT", "REMARK", '
            '       "PENALTY_RATE", "CREATED_AT", "UPDATED_AT" '
            'FROM public."PRODUCT" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\'',
            product_id,
        )
        if prod is None:
            raise NotFoundError(E_NOT_FOUND, "상품을 찾을 수 없습니다.")

        periods = await conn.fetch(
            'SELECT pp."PERIOD_SEQ", pp."MIN_MONTHS", pp."MAX_MONTHS", rp."APPLY_RATE" '
            'FROM public."PRODUCT_PERIOD" pp '
            'LEFT JOIN public."PRODUCT_RATE_POLICY" rp '
            '  ON rp."PRODUCT_ID" = pp."PRODUCT_ID" '
            ' AND rp."PERIOD_ID" = pp."PERIOD_SEQ" '
            ' AND rp."DELETE_YN" = \'N\' '
            'WHERE pp."PRODUCT_ID" = $1 AND pp."DELETE_YN" = \'N\' '
            'ORDER BY pp."PERIOD_SEQ"',
            product_id,
        )
        rates = await conn.fetch(
            'SELECT "RATE_SEQ", "TIER_MIN_AMOUNT", "APPLY_RATE" '
            'FROM public."PRODUCT_RATE_POLICY" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "RATE_SEQ"',
            product_id,
        )
        bonuses = await conn.fetch(
            'SELECT "BONUS_SEQ", "BONUS_TYPE_CD", "CONDITION_DESC", "BONUS_RATE" '
            'FROM public."PRODUCT_BONUS_CONDITION" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "BONUS_SEQ"',
            product_id,
        )
        terms = await conn.fetch(
            'SELECT t."TERMS_ID", t."VERSION", t."TERMS_NAME", m."AGREE_REQUIRED_YN" '
            'FROM public."PRODUCT_TERMS_MAPPING" m '
            'JOIN public."TERMS_MASTER" t ON t."TERMS_ID" = m."TERMS_ID" '
            'WHERE m."PRODUCT_ID" = $1 AND m."DELETE_YN" = \'N\' '
            '  AND t."DELETE_YN" = \'N\' '
            'ORDER BY m."MAPPING_SEQ"',
            product_id,
        )

        # 실시간 집계 — 타입별 분기
        type_cd = prod["PRODUCT_TYPE_CD"]
        subscriber_count = 0
        total_balance = 0
        if type_cd == "LOAN":
            agg = await conn.fetchrow(
                'SELECT COUNT(*) AS cnt, '
                '       COALESCE(SUM(COALESCE("CURRENT_USAGE","CONTRACT_LIMIT",0)), 0) AS bal '
                'FROM public."LOAN_CONTRACT" '
                'WHERE "LOAN_PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' '
                "  AND \"LOAN_STATUS_CD\" IN ('NORMAL','OVERDUE')",
                product_id,
            )
            subscriber_count = int(agg["cnt"] or 0)
            total_balance = int(agg["bal"] or 0)
        elif type_cd in _DEPOSIT_LIKE_TYPES:
            agg = await conn.fetchrow(
                'SELECT COUNT(*) AS cnt, COALESCE(SUM(a."BALANCE"), 0) AS bal '
                'FROM public."DEPOSIT_CONTRACT" dc '
                'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = dc."ACCOUNT_NO" '
                'WHERE dc."PRODUCT_ID" = $1 AND dc."DELETE_YN" = \'N\' AND a."DELETE_YN" = \'N\'',
                product_id,
            )
            subscriber_count = int(agg["cnt"] or 0)
            total_balance = int(agg["bal"] or 0)

    return {
        "product": {
            "product_id": int(prod["PRODUCT_ID"]),
            "product_name": prod["PRODUCT_NAME"] or "",
            "product_type_cd": prod["PRODUCT_TYPE_CD"] or "UNKNOWN",
            "product_status_cd": prod["PRODUCT_STATUS_CD"] or "UNKNOWN",
            "special_yn": prod["SPECIAL_YN"] == "Y",
            "prepay_defer_yn": prod["PREPAY_DEFER_YN"] == "Y",
            "early_close_yn": prod["EARLY_CLOSE_YN"] == "Y",
            "extend_yn": prod["EXTEND_YN"] == "Y",
            "min_age": int(prod["MIN_AGE"]) if prod["MIN_AGE"] is not None else None,
            "max_age": int(prod["MAX_AGE"]) if prod["MAX_AGE"] is not None else None,
            "maturity_policy_cd": prod["MATURITY_POLICY_CD"],
            "target_customer_cd": prod["TARGET_CUSTOMER_CD"],
            "min_amount": int(prod["MIN_AMOUNT"]) if prod["MIN_AMOUNT"] is not None else None,
            "max_amount": int(prod["MAX_AMOUNT"]) if prod["MAX_AMOUNT"] is not None else None,
            "min_monthly_amt": int(prod["MIN_MONTHLY_AMT"]) if prod["MIN_MONTHLY_AMT"] is not None else None,
            "max_monthly_amt": int(prod["MAX_MONTHLY_AMT"]) if prod["MAX_MONTHLY_AMT"] is not None else None,
            "interest_cycle_cd": prod["INTEREST_CYCLE_CD"],
            "launch_date": prod["LAUNCH_DATE"],
            "sale_start_date": prod["SALE_START_DATE"],
            "sale_end_date": prod["SALE_END_DATE"],
            "product_desc": prod["PRODUCT_DESC"],
            "product_features": prod["PRODUCT_FEATURES"],
            "owner_dept": prod["OWNER_DEPT"],
            "remark": prod["REMARK"],
            "penalty_rate": float(prod["PENALTY_RATE"]) if prod["PENALTY_RATE"] is not None else None,
            "created_at": prod["CREATED_AT"],
            "updated_at": prod["UPDATED_AT"],
        },
        "live_subscriber_count": subscriber_count,
        "live_total_balance_krw": total_balance,
        "periods": [
            {
                "period_seq": int(p["PERIOD_SEQ"]),
                "min_months": int(p["MIN_MONTHS"] or 0),
                "max_months": int(p["MAX_MONTHS"] or 0),
                "apply_rate": float(p["APPLY_RATE"]) if p["APPLY_RATE"] is not None else None,
            }
            for p in periods
        ],
        "rates": [
            {
                "rate_seq": int(r["RATE_SEQ"]),
                "tier_min_amount": int(r["TIER_MIN_AMOUNT"] or 0),
                "apply_rate": float(r["APPLY_RATE"]) if r["APPLY_RATE"] is not None else None,
            }
            for r in rates
        ],
        "bonuses": [
            {
                "bonus_seq": int(b["BONUS_SEQ"]),
                "bonus_type_cd": b["BONUS_TYPE_CD"] or "",
                "condition_desc": b["CONDITION_DESC"] or "",
                "bonus_rate": float(b["BONUS_RATE"]) if b["BONUS_RATE"] is not None else None,
            }
            for b in bonuses
        ],
        "terms": [
            {
                "terms_id": int(t["TERMS_ID"]),
                "version": int(t["VERSION"] or 1),
                "terms_name": t["TERMS_NAME"] or "",
                "agree_required_yn": t["AGREE_REQUIRED_YN"] == "Y",
            }
            for t in terms
        ],
    }


# ---------------------------------------------------------------------------
# 상태 변경 — SALE / SUSPEND / CLOSED
# ---------------------------------------------------------------------------

async def update_product_status(
    *,
    product_id: int,
    new_status: str,
    employee_no: str,
) -> dict:
    new_status = (new_status or "").strip().upper()
    if new_status not in ALLOWED_STATUSES:
        raise BusinessError(
            E_VALIDATION,
            f"지원하지 않는 상태값이에요. 사용 가능: {', '.join(sorted(ALLOWED_STATUSES))}",
        )

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            prev = await conn.fetchrow(
                'SELECT "PRODUCT_STATUS_CD" FROM public."PRODUCT" '
                'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\' FOR UPDATE',
                product_id,
            )
            if prev is None:
                raise NotFoundError(E_NOT_FOUND, "상품을 찾을 수 없습니다.")
            prev_status = prev["PRODUCT_STATUS_CD"] or "UNKNOWN"
            if prev_status == new_status:
                raise BusinessError(E_VALIDATION, "현재 상태와 동일합니다.")
            await conn.execute(
                'UPDATE public."PRODUCT" '
                'SET "PRODUCT_STATUS_CD" = $1, "UPDATED_BY" = $2, "UPDATED_AT" = NOW() '
                'WHERE "PRODUCT_ID" = $3',
                new_status,
                str(employee_no)[:20],
                product_id,
            )

    log.info(
        "admin_product_status_changed",
        product_id=product_id,
        prev=prev_status,
        new=new_status,
        employee_no=employee_no,
    )
    return {"product_id": product_id, "prev_status": prev_status, "new_status": new_status}
