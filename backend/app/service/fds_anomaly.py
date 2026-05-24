"""FDS Phase B — IsolationForest anomaly 모델.

거래 한 건의 feature 7종을 IsolationForest 에 통과시켜 anomaly_score(0~1) 반환.
1에 가까울수록 이상.

라이프사이클
- 부팅 시점에 한 번 `ensure_model()` 호출 → 캐시 디렉토리에 pkl 없으면 학습 후 저장.
- 학습 데이터: 시드 + 검증 누적 거래 (정상으로 가정한 출금 거래) — IsolationForest 는
  unsupervised 라 라벨 없이 분포만으로 fit.
- 추론: `score(feature_vec)` → [0, 1] 정규화 anomaly_score.

운영 가정: 야간 배치로 재학습. 본 모듈은 시연 환경의 가벼운 in-process 학습/추론.
"""

from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import structlog
from sklearn.ensemble import IsolationForest

from ..db import get_pool

log = structlog.get_logger("fds_anomaly")

_MODEL_PATH = Path("/app/data/fds_isoforest.pkl")
_FEATURE_ORDER = (
    "log_amount",
    "hour_of_day",
    "day_of_week",
    "is_interbank",
    "counterpart_freq",
    "amount_zscore_personal",
    "daily_cum_amount_log",
)

_state: dict[str, Any] = {"model": None, "trained": False}
_lock = asyncio.Lock()


@dataclass
class AnomalyFeatures:
    log_amount: float
    hour_of_day: float
    day_of_week: float
    is_interbank: float          # 0/1
    counterpart_freq: float      # 90일 거래 횟수
    amount_zscore_personal: float
    daily_cum_amount_log: float

    def to_vector(self) -> list[float]:
        return [getattr(self, k) for k in _FEATURE_ORDER]


# ---------------------------------------------------------------------------
# 학습
# ---------------------------------------------------------------------------

async def _fetch_training_rows() -> list[list[float]]:
    """과거 출금 거래 + 보조 통계로 7-feature 벡터 학습 세트 구성."""
    pool = get_pool()
    rows = await pool.fetch(
        'SELECT t."TX_DATETIME", ABS(t."TX_AMOUNT")::bigint AS amount, '
        '       t."COUNTERPART_ACCOUNT_NO", t."OWN_BANK_YN", '
        '       a."CUSTOMER_NO", a."ACCOUNT_NO" '
        'FROM public."TRANSACTION" t '
        'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
        'WHERE t."TX_AMOUNT" < 0 '
        '  AND t."DELETE_YN" = \'N\' '
        '  AND t."TX_STATUS_CD" = \'COMPLETE\' '
        'ORDER BY t."CREATED_AT" DESC LIMIT 1000',
    ) if hasattr(pool, "fetch") else None
    # asyncpg pool 은 직접 fetch 없으니 acquire 패턴으로
    if rows is None:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                'SELECT t."TX_DATETIME", ABS(t."TX_AMOUNT")::bigint AS amount, '
                '       t."COUNTERPART_ACCOUNT_NO", t."OWN_BANK_YN", '
                '       a."CUSTOMER_NO", a."ACCOUNT_NO" '
                'FROM public."TRANSACTION" t '
                'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
                'WHERE t."TX_AMOUNT" < 0 '
                '  AND t."DELETE_YN" = \'N\' '
                '  AND t."TX_STATUS_CD" = \'COMPLETE\' '
                'ORDER BY t."CREATED_AT" DESC LIMIT 1000',
            )

    # 고객별 평균/표준편차 (zscore) 캐시
    customer_stats: dict[int, tuple[float, float]] = {}
    customer_amounts: dict[int, list[float]] = {}
    customer_counterparts: dict[tuple[int, str], int] = {}
    customer_daily: dict[tuple[int, str], int] = {}

    for r in rows:
        cust = int(r["CUSTOMER_NO"])
        amt = float(r["amount"])
        customer_amounts.setdefault(cust, []).append(amt)
        cpa = r["COUNTERPART_ACCOUNT_NO"]
        if cpa:
            customer_counterparts[(cust, cpa)] = customer_counterparts.get((cust, cpa), 0) + 1
        day = (r["TX_DATETIME"] or "")[:8]
        if day:
            customer_daily[(cust, day)] = customer_daily.get((cust, day), 0) + int(amt)

    for cust, lst in customer_amounts.items():
        if len(lst) >= 2:
            avg = sum(lst) / len(lst)
            std = (sum((v - avg) ** 2 for v in lst) / len(lst)) ** 0.5 or 1.0
            customer_stats[cust] = (avg, std)
        else:
            customer_stats[cust] = (lst[0] if lst else 0.0, 1.0)

    vectors: list[list[float]] = []
    for r in rows:
        try:
            dt = r["TX_DATETIME"] or ""
            if len(dt) < 14:
                continue
            from datetime import datetime as _dt
            ts = _dt.strptime(dt[:14], "%Y%m%d%H%M%S")
        except ValueError:
            continue
        cust = int(r["CUSTOMER_NO"])
        amt = float(r["amount"])
        avg, std = customer_stats.get(cust, (amt, 1.0))
        z = (amt - avg) / std if std else 0.0
        cpa = r["COUNTERPART_ACCOUNT_NO"] or ""
        freq = float(customer_counterparts.get((cust, cpa), 0))
        day = dt[:8]
        cum = float(customer_daily.get((cust, day), 0))
        vec = [
            math.log1p(amt),
            float(ts.hour),
            float(ts.weekday()),
            0.0 if (r["OWN_BANK_YN"] == "Y") else 1.0,
            freq,
            z,
            math.log1p(cum),
        ]
        vectors.append(vec)
    return vectors


async def _train_and_save() -> None:
    rows = await _fetch_training_rows()
    if len(rows) < 10:
        # 학습 세트 너무 적으면 fit 보류 — score() 가 호출되면 fallback 0.5 반환.
        log.warning("fds_anomaly_train_skipped", reason="insufficient_data", n=len(rows))
        return
    X = np.array(rows, dtype=np.float64)
    # contamination=0.1: 정상 90% 가정. 시연 환경 합리적 default.
    model = IsolationForest(
        contamination=0.10,
        n_estimators=100,
        random_state=42,
        n_jobs=1,
    )
    model.fit(X)
    _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        joblib.dump(model, _MODEL_PATH)
    except (OSError, PermissionError):
        # 마운트가 read-only 면 디스크 저장 생략, in-memory 만 사용
        log.warning("fds_anomaly_pkl_save_failed", path=str(_MODEL_PATH))
    _state["model"] = model
    _state["trained"] = True
    log.info("fds_anomaly_trained", n=len(rows), path=str(_MODEL_PATH))


async def ensure_model() -> None:
    """부팅 시점 호출 — 모델이 캐시되어 있으면 로드, 없으면 학습."""
    async with _lock:
        if _state["model"] is not None:
            return
        if _MODEL_PATH.exists():
            try:
                _state["model"] = joblib.load(_MODEL_PATH)
                _state["trained"] = True
                log.info("fds_anomaly_loaded", path=str(_MODEL_PATH))
                return
            except Exception:
                log.exception("fds_anomaly_load_failed")
        await _train_and_save()


# ---------------------------------------------------------------------------
# 추론
# ---------------------------------------------------------------------------

def score(features: AnomalyFeatures) -> float:
    """anomaly_score ∈ [0, 1]. 학습 안 됐으면 중립값 0.5."""
    model = _state.get("model")
    if model is None:
        return 0.5
    vec = np.array([features.to_vector()], dtype=np.float64)
    # IsolationForest.decision_function: + 정상 / - 이상 (범위 대략 -0.5 ~ +0.5)
    raw = float(model.decision_function(vec)[0])
    # raw → [0,1]: -0.5 → 1.0 (가장 이상) / +0.5 → 0.0 (정상)
    norm = max(0.0, min(1.0, (0.5 - raw)))
    return norm


def extract_features(
    *,
    amount_krw: int,
    hour_of_day: int,
    day_of_week: int,
    is_interbank: bool,
    counterpart_freq: int,
    amount_zscore_personal: float,
    daily_cum_amount: int,
) -> AnomalyFeatures:
    return AnomalyFeatures(
        log_amount=math.log1p(max(0, amount_krw)),
        hour_of_day=float(hour_of_day),
        day_of_week=float(day_of_week),
        is_interbank=1.0 if is_interbank else 0.0,
        counterpart_freq=float(counterpart_freq),
        amount_zscore_personal=float(amount_zscore_personal),
        daily_cum_amount_log=math.log1p(max(0, daily_cum_amount)),
    )
