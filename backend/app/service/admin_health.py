"""외부 통신망 헬스 스냅샷 워커 — Phase 6 §9.2.3.

대상 외부 API 5종
- KFTC      금융결제원 공동망 (이체)
- BOK_WIRE  한은금융망 (거액)
- MY_DATA   마이데이터 (자산조회)
- NICE      NICE 신용평가 (신용조회)
- KCB       코리아크레딧뷰로 (신용조회)

워커
- lifespan asyncio task. env `EXTERNAL_HEALTH_TICK_SEC`(기본 60s)마다 5개 API
  자체 mock ping → latency / success_rate / counts 가짜 생성 → INSERT 5행.
- 운영 환경에서는 실제 health-check 콜로 교체. 지금은 시연/관측 데이터원 확보가 목적.

상태 코드 매핑 (가이드 §9.2.3)
- success_rate ≥ 0.99 → UP
- 0.90 ≤ success_rate < 0.99 → DEGRADED
- success_rate < 0.90 → DOWN
"""

from __future__ import annotations

import asyncio
import os
import random
from datetime import datetime
from typing import Any

import structlog

from ..db import get_pool

log = structlog.get_logger("admin_health")

API_NAMES: tuple[str, ...] = ("KFTC", "BOK_WIRE", "MY_DATA", "NICE", "KCB")

# tick 1회당 생성하는 가짜 request 수 — 실제 환경의 5분 윈도우 카운터처럼 동작
_REQS_PER_TICK = 200

# 운영 5분, dev 60s (env 로 조정 가능)
TICK_SEC = int(os.environ.get("EXTERNAL_HEALTH_TICK_SEC", "60"))


def _status_for(success_rate: float) -> str:
    if success_rate >= 0.99:
        return "UP"
    if success_rate >= 0.90:
        return "DEGRADED"
    return "DOWN"


def _mock_sample(api_name: str) -> dict[str, Any]:
    """랜덤 latency·error 분포 생성. API 별 기본 응답성을 약간 다르게 설정."""
    base_latency = {
        "KFTC": 80, "BOK_WIRE": 120, "MY_DATA": 200, "NICE": 150, "KCB": 160,
    }.get(api_name, 100)
    p50 = max(10, int(random.gauss(base_latency, base_latency * 0.15)))
    p95 = p50 + max(20, int(random.gauss(base_latency * 0.6, base_latency * 0.2)))

    # 일반 분포에서 가끔 일시적 degrade — 90% UP, 8% DEGRADED, 2% DOWN
    roll = random.random()
    if roll < 0.90:
        error_count = random.randint(0, 2)  # 거의 무에러
    elif roll < 0.98:
        error_count = random.randint(_REQS_PER_TICK // 50, _REQS_PER_TICK // 10)  # 2~10%
    else:
        error_count = random.randint(_REQS_PER_TICK // 5, _REQS_PER_TICK // 2)  # 20~50%

    success_count = _REQS_PER_TICK - error_count
    success_rate = round(success_count / _REQS_PER_TICK, 4)

    return {
        "api_name": api_name,
        "latency_p50_ms": p50,
        "latency_p95_ms": p95,
        "success_rate": success_rate,
        "request_count": _REQS_PER_TICK,
        "error_count": error_count,
        "status_cd": _status_for(success_rate),
    }


async def insert_sample(s: dict[str, Any]) -> int:
    pool = get_pool()
    async with pool.acquire() as conn:
        return int(await conn.fetchval(
            'INSERT INTO public."EXTERNAL_API_HEALTH" ('
            '  "API_NAME","STATUS_CD","LATENCY_P50_MS","LATENCY_P95_MS",'
            '  "SUCCESS_RATE","REQUEST_COUNT","ERROR_COUNT","WINDOW_MINUTES"'
            ') VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "HEALTH_ID"',
            s["api_name"], s["status_cd"],
            s["latency_p50_ms"], s["latency_p95_ms"],
            s["success_rate"], s["request_count"], s["error_count"],
            max(1, TICK_SEC // 60),
        ))


async def run_tick() -> list[int]:
    """1회 tick — 5개 API 의 샘플을 모두 적재. 반환: HEALTH_ID 리스트."""
    ids = []
    for name in API_NAMES:
        sample = _mock_sample(name)
        try:
            hid = await insert_sample(sample)
            ids.append(hid)
        except Exception:
            log.exception("external_health_insert_failed", api_name=name)
    log.info("external_health_tick", count=len(ids), tick_sec=TICK_SEC)
    return ids


async def worker_loop() -> None:
    """lifespan 안에서 무한 루프. 부팅 직후 1회 즉시 실행 후 TICK_SEC 간격."""
    log.info("external_health_worker_start", tick_sec=TICK_SEC)
    while True:
        try:
            await run_tick()
        except Exception:
            log.exception("external_health_tick_error")
        await asyncio.sleep(TICK_SEC)


# ---------------------------------------------------------------------------
# 조회
# ---------------------------------------------------------------------------

async def latest_snapshot() -> list[dict[str, Any]]:
    """각 API_NAME 별 가장 최신 스냅 1행 (5개 API → 최대 5행)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT DISTINCT ON ("API_NAME") '
            '       "HEALTH_ID","API_NAME","STATUS_CD",'
            '       "LATENCY_P50_MS","LATENCY_P95_MS","SUCCESS_RATE",'
            '       "REQUEST_COUNT","ERROR_COUNT","WINDOW_MINUTES","SAMPLE_AT" '
            'FROM public."EXTERNAL_API_HEALTH" '
            'ORDER BY "API_NAME", "SAMPLE_AT" DESC'
        )
    return [_row_to_item(r) for r in rows]


async def history_for(api_name: str, limit: int = 50) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "HEALTH_ID","API_NAME","STATUS_CD",'
            '       "LATENCY_P50_MS","LATENCY_P95_MS","SUCCESS_RATE",'
            '       "REQUEST_COUNT","ERROR_COUNT","WINDOW_MINUTES","SAMPLE_AT" '
            'FROM public."EXTERNAL_API_HEALTH" '
            'WHERE "API_NAME" = $1 '
            'ORDER BY "SAMPLE_AT" DESC '
            'LIMIT $2',
            api_name, limit,
        )
    return [_row_to_item(r) for r in rows]


def _row_to_item(r) -> dict[str, Any]:
    return {
        "health_id": int(r["HEALTH_ID"]),
        "api_name": r["API_NAME"],
        "status_cd": r["STATUS_CD"],
        "latency_p50_ms": int(r["LATENCY_P50_MS"] or 0),
        "latency_p95_ms": int(r["LATENCY_P95_MS"] or 0),
        "success_rate": float(r["SUCCESS_RATE"] or 0),
        "request_count": int(r["REQUEST_COUNT"] or 0),
        "error_count": int(r["ERROR_COUNT"] or 0),
        "window_minutes": int(r["WINDOW_MINUTES"] or 0),
        "sample_at": r["SAMPLE_AT"] or datetime.now(),
    }