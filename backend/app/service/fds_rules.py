"""FDS 룰 엔진 — Phase A.

거래 한 건이 의심거래인지 판단하는 8개 룰. 각 룰은 점수와 fired 여부를 반환,
호출자가 합산하여 `rule_score` 계산.

룰 평가는 DB 컨텍스트(거래 이력·평균·일일 누적 등)에 의존하므로 한 트랜잭션
내에서 `evaluate(conn, ctx)` 진입점 하나로 묶어 처리. 외부 호출자는
`fds_pipeline` 만 알면 됨.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from datetime import datetime
from typing import Any


# 룰 코드 → (설명, 점수). 점수 합계 ~120 이론 최댓, THRESHOLD=60 권장.
RULES_META: dict[str, tuple[str, int]] = {
    "R_NIGHT":              ("심야 시간대 거래 (00-05시)", 15),
    "R_AMOUNT_ZSCORE":      ("평소 거래액 대비 3σ 초과", 25),
    "R_NEW_COUNTERPART":    ("최근 90일 거래 없던 신규 수취인", 15),
    "R_BURST":              ("10분 안 동일 계좌 출금 3건 이상", 20),
    "R_FOREIGN_IP":         ("해외 IP 접속", 25),
    "R_DAILY_LIMIT_NEAR":   ("일일 출금 한도 90% 임박", 10),
    "R_NEW_DEVICE":         ("미등록 디바이스", 20),
    "R_LARGE_INTERBANK":    ("타행 거액(1천만 이상) 이체", 15),
}


@dataclass
class FdsContext:
    """평가 입력 — 호출자가 채워서 evaluate() 에 넘긴다."""
    customer_no: int
    transaction_id: int
    account_no: str
    amount_krw: int        # 출금이면 양수로 변환
    tx_datetime: datetime
    counterpart_account_no: str | None
    is_interbank: bool
    access_ip: str | None
    access_country: str | None   # ISO 2-letter, e.g. 'KR'
    device_fingerprint: str | None


@dataclass
class FdsEvaluation:
    rule_score: int
    fired: list[str]            # ["R_NIGHT", "R_BURST", ...]
    reasons: list[str]          # 사용자 노출용 한국어 설명 (RULES_META 의 desc)
    features: dict[str, Any]    # ML/LLM 입력용 — z-score 등 raw 값


# ---------------------------------------------------------------------------
# 개별 룰
# ---------------------------------------------------------------------------

def _rule_night(ctx: FdsContext) -> bool:
    return 0 <= ctx.tx_datetime.hour < 5


async def _rule_amount_zscore(conn, ctx: FdsContext) -> tuple[bool, dict[str, float]]:
    """본인 최근 30일 출금 거래액 평균 + 3σ 초과 시 fired.

    표본 5건 미만이면 평가 보류 (False). features 에 평균/std/zscore 노출.
    """
    rows = await conn.fetch(
        'SELECT ABS("TX_AMOUNT")::bigint AS abs_amount '
        'FROM public."TRANSACTION" t '
        'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
        'WHERE a."CUSTOMER_NO" = $1 '
        '  AND t."TX_AMOUNT" < 0 '
        "  AND t.\"TX_DATETIME\" >= to_char(CURRENT_DATE - INTERVAL '30 days', 'YYYYMMDD') "
        '  AND t."DELETE_YN" = \'N\' '
        '  AND t."TRANSACTION_ID" != $2 '
        'ORDER BY t."TX_DATETIME" DESC LIMIT 200',
        ctx.customer_no,
        ctx.transaction_id,
    )
    if len(rows) < 5:
        return False, {"avg": 0.0, "std": 0.0, "zscore": 0.0, "sample_n": len(rows)}
    samples = [float(r["abs_amount"]) for r in rows]
    avg = statistics.fmean(samples)
    std = statistics.pstdev(samples) or 1.0
    z = (ctx.amount_krw - avg) / std
    return z > 3.0, {"avg": avg, "std": std, "zscore": z, "sample_n": len(samples)}


async def _rule_new_counterpart(conn, ctx: FdsContext) -> bool:
    if not ctx.counterpart_account_no:
        return False
    prior = await conn.fetchval(
        'SELECT COUNT(*) FROM public."TRANSACTION" t '
        'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
        'WHERE a."CUSTOMER_NO" = $1 '
        '  AND t."COUNTERPART_ACCOUNT_NO" = $2 '
        "  AND t.\"TX_DATETIME\" >= to_char(CURRENT_DATE - INTERVAL '90 days', 'YYYYMMDD') "
        '  AND t."DELETE_YN" = \'N\' '
        '  AND t."TRANSACTION_ID" != $3',
        ctx.customer_no,
        ctx.counterpart_account_no,
        ctx.transaction_id,
    )
    return int(prior or 0) == 0


async def _rule_burst(conn, ctx: FdsContext) -> bool:
    """최근 10분 안 본인 출금(음수 TX) 3건 이상."""
    window_start = ctx.tx_datetime.replace(second=0, microsecond=0)
    # naive timestamp → 'YYYYMMDDHHMMSS' 비교
    threshold_dt = (
        f"{window_start.strftime('%Y%m%d%H%M%S')}"
    )
    # 10분 전 epoch
    from datetime import timedelta
    earlier = (ctx.tx_datetime - timedelta(minutes=10)).strftime("%Y%m%d%H%M%S")
    cnt = await conn.fetchval(
        'SELECT COUNT(*) FROM public."TRANSACTION" t '
        'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
        'WHERE a."CUSTOMER_NO" = $1 '
        '  AND t."TX_AMOUNT" < 0 '
        '  AND t."TX_DATETIME" BETWEEN $2 AND $3 '
        '  AND t."DELETE_YN" = \'N\'',
        ctx.customer_no,
        earlier,
        threshold_dt,
    )
    return int(cnt or 0) >= 3


def _rule_foreign_ip(ctx: FdsContext) -> bool:
    return bool(ctx.access_country and ctx.access_country.upper() != "KR")


async def _rule_daily_limit_near(conn, ctx: FdsContext) -> tuple[bool, dict[str, float]]:
    """일일 누적 출금이 ACCOUNT.DAILY_WITHDRAW_LIMIT 의 90% 임박."""
    acct = await conn.fetchrow(
        'SELECT "DAILY_WITHDRAW_LIMIT", "DAILY_TRANSFER_LIMIT" '
        'FROM public."ACCOUNT" WHERE "ACCOUNT_NO" = $1',
        ctx.account_no,
    )
    if acct is None or not acct["DAILY_WITHDRAW_LIMIT"]:
        return False, {"daily_cum": 0.0, "daily_limit": 0.0, "ratio": 0.0}
    limit = int(acct["DAILY_WITHDRAW_LIMIT"])
    day_prefix = ctx.tx_datetime.strftime("%Y%m%d")
    cum = await conn.fetchval(
        'SELECT COALESCE(SUM(ABS("TX_AMOUNT")), 0) FROM public."TRANSACTION" '
        'WHERE "ACCOUNT_NO" = $1 AND "TX_AMOUNT" < 0 '
        '  AND "TX_DATETIME" LIKE $2 '
        '  AND "DELETE_YN" = \'N\'',
        ctx.account_no,
        day_prefix + "%",
    )
    cum_v = int(cum or 0)
    ratio = cum_v / limit if limit else 0
    return ratio >= 0.9, {"daily_cum": float(cum_v), "daily_limit": float(limit), "ratio": ratio}


async def _rule_new_device(conn, ctx: FdsContext) -> bool:
    """이 고객에 등록되지 않은 device_fingerprint."""
    if not ctx.device_fingerprint:
        return False
    exists = await conn.fetchval(
        'SELECT 1 FROM public."CUSTOMER_DEVICE" '
        'WHERE "CUSTOMER_NO" = $1 AND "DEVICE_FINGERPRINT" = $2 '
        '  AND "DELETE_YN" = \'N\' LIMIT 1',
        ctx.customer_no,
        ctx.device_fingerprint,
    )
    return exists is None


def _rule_large_interbank(ctx: FdsContext) -> bool:
    return ctx.is_interbank and ctx.amount_krw >= 10_000_000


# ---------------------------------------------------------------------------
# 종합 평가
# ---------------------------------------------------------------------------

async def evaluate(conn, ctx: FdsContext) -> FdsEvaluation:
    """8개 룰을 한 트랜잭션 안에서 평가. fired 된 룰만 점수 합산."""
    fired: list[str] = []
    features: dict[str, Any] = {
        "amount_krw": ctx.amount_krw,
        "hour": ctx.tx_datetime.hour,
        "is_interbank": ctx.is_interbank,
    }

    if _rule_night(ctx):
        fired.append("R_NIGHT")
    z_hit, z_feat = await _rule_amount_zscore(conn, ctx)
    features.update(z_feat)
    if z_hit:
        fired.append("R_AMOUNT_ZSCORE")
    if await _rule_new_counterpart(conn, ctx):
        fired.append("R_NEW_COUNTERPART")
    if await _rule_burst(conn, ctx):
        fired.append("R_BURST")
    if _rule_foreign_ip(ctx):
        fired.append("R_FOREIGN_IP")
    daily_hit, daily_feat = await _rule_daily_limit_near(conn, ctx)
    features.update(daily_feat)
    if daily_hit:
        fired.append("R_DAILY_LIMIT_NEAR")
    if await _rule_new_device(conn, ctx):
        fired.append("R_NEW_DEVICE")
    if _rule_large_interbank(ctx):
        fired.append("R_LARGE_INTERBANK")

    score = sum(RULES_META[r][1] for r in fired)
    reasons = [RULES_META[r][0] for r in fired]
    # NaN/inf 직렬화 안전 (Kafka/asyncpg payload 통과용)
    for k, v in list(features.items()):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            features[k] = 0.0
    return FdsEvaluation(rule_score=score, fired=fired, reasons=reasons, features=features)
