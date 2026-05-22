"""자동이체 실행 워커 — ACTIVE 자동이체 스캔 + 도래 시 이체 실행 + AUTO_TRANSFER_EXEC 적재.

lifespan 백그라운드 태스크로 동작. 매 TICK 마다:
  1) AUTO_TRANSFER WHERE AUTO_STATUS_CD='ACTIVE' AND DELETE_YN='N' 조회
  2) 각 건에 대해 _next_execute_at 으로 다음 실행 시각 산출
  3) next <= now() 이면 실행 시도 (멱등키: AUTO-{auto_id}-{YYYYMMDD})
     - INTRA_BANK / KFTC_SMALL / BOK_LARGE 라우팅 (transfer.execute_transfer 와 동일 분기)
     - PIN/OTP 검증은 등록 시점에 통과한 것으로 신뢰 → 워커는 _process_* 직접 호출
  4) 성공/실패/지연 결과를 AUTO_TRANSFER_EXEC INSERT
  5) ONCE 는 처리 후 AUTO_STATUS_CD='COMPLETE'
  6) VALID_END_DATE 경과 시 COMPLETED

멱등성: AUTO_TRANSFER_EXEC.SCHEDULED_DATE + AUTO_TRANSFER_ID 조합으로 같은 날
중복 실행 차단. transfer 레벨 멱등키도 같은 형태로 부여.
"""

from __future__ import annotations

import asyncio
import os
from datetime import date, datetime

import structlog

from ..db import get_pool
from ..errors import E_BALANCE_INSUFFICIENT, E_IDEMPOTENCY_CONFLICT, E_NOT_FOUND
from ..exceptions import BankingException
from .auto_transfer import _next_execute_at
from .transfer import (
    LARGE_AMOUNT_THRESHOLD,
    OWN_BANK_CODE,
    _is_bok_wire_open_now,
    _post_transfer_hooks,
    _process_inter_bank,
    _process_intra_bank,
)

log = structlog.get_logger("auto_transfer_worker")

TICK_INTERVAL_SEC = int(os.getenv("AUTO_TRANSFER_TICK_SEC", "60"))

# 에러코드 → DELAY_REASON_CD(varchar(8)) 매핑. 시트 컬럼 한계.
_REASON_MAP = {
    E_BALANCE_INSUFFICIENT: "NO_BAL",
    E_NOT_FOUND: "NO_ACCT",
    E_IDEMPOTENCY_CONFLICT: "DUP",
    "E_BOK_WIRE_CLOSED": "BOKCLS",
}


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:8], "%Y%m%d").date()
    except ValueError:
        return None


def _reason_code(banking_code: str | None) -> str:
    if not banking_code:
        return "ERR"
    return _REASON_MAP.get(banking_code, "ERR")


async def _fetch_active() -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "AUTO_TRANSFER_ID", "CUSTOMER_NO", "WITHDRAW_ACCOUNT_NO", '
            '       "DEPOSIT_ACCOUNT_NO", "DEPOSIT_BANK_CD", "DEPOSIT_HOLDER_NAME", '
            '       "TRANSFER_AMOUNT", "CYCLE_TYPE_CD", "MONTHLY_EXEC_DAY", '
            '       "VALID_START_DATE", "VALID_END_DATE", '
            '       "WITHDRAW_MEMO", "DEPOSIT_MEMO" '
            'FROM public."AUTO_TRANSFER" '
            "WHERE \"AUTO_STATUS_CD\" = 'ACTIVE' AND \"DELETE_YN\" = 'N'"
        )
    return [dict(r) for r in rows]


async def _exec_exists(auto_id: int, scheduled_yyyymmdd: str) -> bool:
    pool = get_pool()
    async with pool.acquire() as conn:
        return bool(
            await conn.fetchval(
                'SELECT 1 FROM public."AUTO_TRANSFER_EXEC" '
                'WHERE "AUTO_TRANSFER_ID" = $1 AND "SCHEDULED_DATE" = $2 '
                "  AND \"DELETE_YN\" = 'N'",
                auto_id,
                scheduled_yyyymmdd,
            )
        )


async def _insert_exec(
    *,
    auto_id: int,
    scheduled: str,
    status: str,
    exec_dt: str,
    transfer_id: int | None,
    transaction_id: int | None,
    delay_reason: str | None,
    idem: str,
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'INSERT INTO public."AUTO_TRANSFER_EXEC" ('
            '  "AUTO_TRANSFER_ID", "SCHEDULED_DATE", "EXEC_DATETIME", '
            '  "EXEC_STATUS_CD", "TRANSFER_ID", "TRANSACTION_ID", '
            '  "DELAY_REASON_CD", "IDEMPOTENCY_KEY", "DELETE_YN", "CREATED_BY"'
            ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'N', 'AUTO')",
            auto_id,
            scheduled,
            exec_dt,
            status,
            transfer_id,
            transaction_id,
            delay_reason,
            idem,
        )


async def _mark_completed(auto_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."AUTO_TRANSFER" SET "AUTO_STATUS_CD" = \'COMPLETE\', '
            '"UPDATED_AT" = NOW() WHERE "AUTO_TRANSFER_ID" = $1',
            auto_id,
        )


async def _try_execute(row: dict, now: datetime) -> str:
    """반환: 처리 결과 라벨 ('skipped'/'success'/'fail'/'delay'/'completed')."""
    auto_id = int(row["AUTO_TRANSFER_ID"])
    customer_no = int(row["CUSTOMER_NO"])
    cycle = row["CYCLE_TYPE_CD"]
    start = _parse_date(row["VALID_START_DATE"])
    end = _parse_date(row["VALID_END_DATE"])
    if start is None:
        return "skipped"

    today = now.date()
    if end and today > end:
        await _mark_completed(auto_id)
        return "completed"

    next_dt = _next_execute_at(cycle, start, row["MONTHLY_EXEC_DAY"])
    if next_dt is None or next_dt > now:
        return "skipped"

    scheduled = next_dt.strftime("%Y%m%d")
    if await _exec_exists(auto_id, scheduled):
        if cycle == "ONCE":
            await _mark_completed(auto_id)
            return "completed"
        return "skipped"

    amount = int(row["TRANSFER_AMOUNT"] or 0)
    to_bank = row["DEPOSIT_BANK_CD"]
    idem = f"AUTO-{auto_id}-{scheduled}"
    exec_dt_str = now.strftime("%Y%m%d%H%M%S")

    try:
        if to_bank == OWN_BANK_CODE:
            settlement_type = "INTRA_BANK"
            result = await _process_intra_bank(
                from_account_no=row["WITHDRAW_ACCOUNT_NO"],
                to_account_no=row["DEPOSIT_ACCOUNT_NO"],
                to_bank_cd=to_bank,
                to_holder_name=row["DEPOSIT_HOLDER_NAME"],
                amount_krw=amount,
                withdraw_memo=row["WITHDRAW_MEMO"],
                deposit_memo=row["DEPOSIT_MEMO"],
                idempotency_key=idem,
            )
        elif amount >= LARGE_AMOUNT_THRESHOLD:
            if not _is_bok_wire_open_now():
                await _insert_exec(
                    auto_id=auto_id,
                    scheduled=scheduled,
                    status="DELAY",
                    exec_dt=exec_dt_str,
                    transfer_id=None,
                    transaction_id=None,
                    delay_reason="BOKCLS",
                    idem=idem,
                )
                return "delay"
            settlement_type = "BOK_LARGE"
            result = await _process_inter_bank(
                from_account_no=row["WITHDRAW_ACCOUNT_NO"],
                to_bank_cd=to_bank,
                to_account_no=row["DEPOSIT_ACCOUNT_NO"],
                to_holder_name=row["DEPOSIT_HOLDER_NAME"],
                amount_krw=amount,
                withdraw_memo=row["WITHDRAW_MEMO"],
                deposit_memo=row["DEPOSIT_MEMO"],
                idempotency_key=idem,
                settlement_type=settlement_type,
                customer_no=customer_no,
            )
        else:
            settlement_type = "KFTC_SMALL"
            result = await _process_inter_bank(
                from_account_no=row["WITHDRAW_ACCOUNT_NO"],
                to_bank_cd=to_bank,
                to_account_no=row["DEPOSIT_ACCOUNT_NO"],
                to_holder_name=row["DEPOSIT_HOLDER_NAME"],
                amount_krw=amount,
                withdraw_memo=row["WITHDRAW_MEMO"],
                deposit_memo=row["DEPOSIT_MEMO"],
                idempotency_key=idem,
                settlement_type=settlement_type,
                customer_no=customer_no,
            )
    except BankingException as e:
        await _insert_exec(
            auto_id=auto_id,
            scheduled=scheduled,
            status="FAIL",
            exec_dt=exec_dt_str,
            transfer_id=None,
            transaction_id=None,
            delay_reason=_reason_code(e.code),
            idem=idem,
        )
        log.warning(
            "auto_transfer_exec_failed",
            auto_id=auto_id,
            scheduled=scheduled,
            code=e.code,
            msg=e.message,
        )
        return "fail"
    except Exception:
        log.exception("auto_transfer_exec_error", auto_id=auto_id, scheduled=scheduled)
        await _insert_exec(
            auto_id=auto_id,
            scheduled=scheduled,
            status="FAIL",
            exec_dt=exec_dt_str,
            transfer_id=None,
            transaction_id=None,
            delay_reason="INTERNAL",
            idem=idem,
        )
        return "fail"

    await _insert_exec(
        auto_id=auto_id,
        scheduled=scheduled,
        status="SUCCESS",
        exec_dt=exec_dt_str,
        transfer_id=result.transfer_id,
        transaction_id=result.tx_id_withdraw,
        delay_reason=None,
        idem=idem,
    )

    try:
        await _post_transfer_hooks(
            customer_no=customer_no,
            result=result,
            to_bank_cd=to_bank,
            to_account_no=row["DEPOSIT_ACCOUNT_NO"],
            amount_krw=amount,
        )
    except Exception:
        log.exception("auto_transfer_hooks_failed", auto_id=auto_id)

    log.info(
        "auto_transfer_executed",
        auto_id=auto_id,
        scheduled=scheduled,
        amount=amount,
        settlement=settlement_type,
        transfer_id=result.transfer_id,
    )

    if cycle == "ONCE":
        await _mark_completed(auto_id)
    return "success"


async def tick_once() -> dict[str, int]:
    """한 tick 처리. 반환 결과 집계는 e2e 테스트/로그용."""
    rows = await _fetch_active()
    stats: dict[str, int] = {
        "scanned": len(rows),
        "success": 0,
        "fail": 0,
        "delay": 0,
        "completed": 0,
        "skipped": 0,
    }
    now = datetime.now()
    for row in rows:
        try:
            label = await _try_execute(row, now)
            stats[label] = stats.get(label, 0) + 1
        except Exception:
            log.exception(
                "auto_transfer_tick_row_failed",
                auto_id=row.get("AUTO_TRANSFER_ID"),
            )
    return stats


async def run() -> None:
    """무한 루프 — lifespan 의 background task 로 시작."""
    log.info("auto_transfer_worker_started", tick_sec=TICK_INTERVAL_SEC)
    try:
        while True:
            try:
                stats = await tick_once()
                if any(stats.get(k, 0) for k in ("success", "fail", "delay", "completed")):
                    log.info("auto_transfer_worker_tick", **stats)
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("auto_transfer_worker_tick_failed")
            await asyncio.sleep(TICK_INTERVAL_SEC)
    except asyncio.CancelledError:
        log.info("auto_transfer_worker_stopped")
        raise
