"""자동이체·예약이체 백엔드 — TR-005/006/007/008.

설계:
- TR-005 등록: AUTO_TRANSFER INSERT, auto_token(AUTO) 발급
- TR-006 목록/관리: SELECT 본인 자동이체 / AUTO_STATUS_CD UPDATE (PAUSE/RESUME/CANCEL)
- TR-007 실행 이력: AUTO_TRANSFER_EXEC 조회
- TR-008 예약이체: AUTO_TRANSFER + CYCLE_TYPE_CD='ONCE'

⚠️ v53 컬럼(LINKED_TO/LINKED_ID/SCHEDULE_RULE/IDEMPOTENCY_KEY)은 미적용 — 요청 body의
   linked_to/linked_id/schedule_rule 은 받기만 하고 저장하지 않음. 마이그 후 보강.
배치 잡(스케줄러)은 별도 워커 — 본 모듈은 CRUD 만.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError
from .account import fetch_account
from .token import ResourceType, TokenService


def _yyyymmdd(d: date | datetime) -> str:
    return d.strftime("%Y%m%d")


def _yyyymmddhhmmss(d: datetime) -> str:
    return d.strftime("%Y%m%d%H%M%S")


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:8], "%Y%m%d").date()
    except ValueError:
        return None


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


def _next_execute_at(
    cycle: str, start: date, monthly_day: int | None
) -> datetime | None:
    """단순 다음 실행 시각 계산. 운영 워커는 별도."""
    today = date.today()
    base = start if start >= today else today
    if cycle == "ONCE":
        return datetime.combine(base, datetime.min.time())
    if cycle == "DAILY":
        return datetime.combine(base + timedelta(days=1), datetime.min.time())
    if cycle == "WEEKLY":
        return datetime.combine(base + timedelta(days=7), datetime.min.time())
    if cycle == "MONTHLY":
        day = monthly_day or base.day
        # 이번 달 day 가 base 이상이면 이번 달, 미만이면 다음 달.
        # 예: today=2026-05-21, start=2026-06-01, day=15 → base=2026-06-01,
        #     이번 달(6월) 15일이 base 보다 이전이므로 다음 달 7/15 가 아니라
        #     base 시점 기준 이번 달이 day < base.day 면 다음 달로 보낸다.
        for year, month in (
            (base.year, base.month),
            (base.year + (1 if base.month == 12 else 0),
             1 if base.month == 12 else base.month + 1),
        ):
            try:
                cand = datetime(year, month, day)
            except ValueError:
                cand = datetime(year, month, 28)
            if cand.date() >= base:
                return cand
        return None
    return None


# ---------------------------------------------------------------------------
# TR-005 등록
# ---------------------------------------------------------------------------

async def create_auto_transfer(
    *,
    customer_no: int,
    from_account_no: str,
    to_bank_cd: str,
    to_account_no: str,
    to_holder_name: str,
    amount_krw: int,
    cycle_type_cd: str,
    monthly_exec_day: int | None,
    valid_start_date: date,
    valid_end_date: date | None,
    memo: str | None,
    tokens: TokenService,
) -> tuple[str, datetime | None]:
    """반환: (auto_token, next_execute_at)."""
    if cycle_type_cd not in ("DAILY", "WEEKLY", "MONTHLY", "ONCE"):
        raise BusinessError(E_VALIDATION, "지원하지 않는 주기입니다.")
    # 출금계좌 본인 검증
    await fetch_account(from_account_no, customer_no)

    pool = get_pool()
    async with pool.acquire() as conn:
        auto_id = await conn.fetchval(
            'INSERT INTO public."AUTO_TRANSFER" ('
            '  "CUSTOMER_NO", "WITHDRAW_ACCOUNT_NO", "DEPOSIT_ACCOUNT_NO", '
            '  "DEPOSIT_BANK_CD", "DEPOSIT_HOLDER_NAME", "TRANSFER_AMOUNT", '
            '  "CYCLE_TYPE_CD", "MONTHLY_EXEC_DAY", "VALID_START_DATE", '
            '  "VALID_END_DATE", "AUTO_STATUS_CD", "REG_CHANNEL_CD", '
            '  "MAX_RETRY_COUNT", "RETRY_INTERVAL_HOURS", "CARRY_NEXT_MONTH_YN", '
            '  "WITHDRAW_MEMO", "DELETE_YN"'
            ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', 'WEB', "
            "          3, 6, 'N', $11, 'N') "
            'RETURNING "AUTO_TRANSFER_ID"',
            customer_no,
            from_account_no,
            to_account_no,
            to_bank_cd,
            to_holder_name,
            amount_krw,
            cycle_type_cd,
            monthly_exec_day,
            _yyyymmdd(valid_start_date),
            _yyyymmdd(valid_end_date) if valid_end_date else None,
            memo,
        )

    auto_token = await tokens.issue(ResourceType.AUTO, str(auto_id), customer_no)
    next_dt = _next_execute_at(cycle_type_cd, valid_start_date, monthly_exec_day)
    return auto_token, next_dt


async def resolve_auto(
    tokens: TokenService, auto_token: str, customer_no: int
) -> int:
    payload = await tokens.resolve(
        auto_token, customer_no, expected_type=ResourceType.AUTO
    )
    if payload is None:
        raise NotFoundError(E_NOT_FOUND, "자동이체를 찾을 수 없습니다.")
    return int(payload.resource_id)


# ---------------------------------------------------------------------------
# TR-006 목록 / 관리
# ---------------------------------------------------------------------------

async def fetch_auto_list(customer_no: int) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "AUTO_TRANSFER_ID", "WITHDRAW_ACCOUNT_NO", "DEPOSIT_ACCOUNT_NO", '
            '"DEPOSIT_BANK_CD", "DEPOSIT_BANK_NAME", "DEPOSIT_HOLDER_NAME", '
            '"TRANSFER_AMOUNT", "CYCLE_TYPE_CD", "MONTHLY_EXEC_DAY", '
            '"VALID_START_DATE", "VALID_END_DATE", "AUTO_STATUS_CD" '
            'FROM public."AUTO_TRANSFER" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "AUTO_TRANSFER_ID" DESC',
            customer_no,
        )
    return [dict(r) for r in rows]


_ACTION_TO_STATUS = {
    "PAUSE": "PAUSED",
    "RESUME": "ACTIVE",
    "CANCEL": "CANCEL",
}


async def patch_status(
    customer_no: int, auto_id: int, action: str
) -> str:
    status = _ACTION_TO_STATUS.get(action.upper())
    if status is None:
        raise BusinessError(E_VALIDATION, "지원하지 않는 작업입니다.")
    pool = get_pool()
    async with pool.acquire() as conn:
        updated = await conn.execute(
            'UPDATE public."AUTO_TRANSFER" SET "AUTO_STATUS_CD" = $1, '
            '"UPDATED_AT" = NOW() '
            'WHERE "AUTO_TRANSFER_ID" = $2 AND "CUSTOMER_NO" = $3 '
            '  AND "DELETE_YN" = \'N\'',
            status,
            auto_id,
            customer_no,
        )
    if updated.endswith(" 0"):
        raise NotFoundError(E_NOT_FOUND, "자동이체를 찾을 수 없습니다.")
    return status


# ---------------------------------------------------------------------------
# TR-007 실행 이력
# ---------------------------------------------------------------------------

async def fetch_exec_history(customer_no: int, auto_id: int) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        # 본인 검증
        owns = await conn.fetchval(
            'SELECT 1 FROM public."AUTO_TRANSFER" '
            'WHERE "AUTO_TRANSFER_ID" = $1 AND "CUSTOMER_NO" = $2 '
            '  AND "DELETE_YN" = \'N\'',
            auto_id,
            customer_no,
        )
        if not owns:
            raise NotFoundError(E_NOT_FOUND, "자동이체를 찾을 수 없습니다.")
        rows = await conn.fetch(
            'SELECT "SCHEDULED_DATE", "BIZ_DAY_ADJUSTED", "EXEC_DATETIME", '
            '"EXEC_STATUS_CD", "DELAY_REASON_CD", "TRANSACTION_ID" '
            'FROM public."AUTO_TRANSFER_EXEC" '
            'WHERE "AUTO_TRANSFER_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "SCHEDULED_DATE" DESC',
            auto_id,
        )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# TR-008 1회성 예약 이체
# ---------------------------------------------------------------------------

async def create_scheduled(
    *,
    customer_no: int,
    from_account_no: str,
    to_bank_cd: str,
    to_account_no: str,
    to_holder_name: str,
    amount_krw: int,
    scheduled_at: datetime,
    memo: str | None,
    tokens: TokenService,
) -> tuple[str, datetime]:
    await fetch_account(from_account_no, customer_no)
    # 프론트가 ISO8601(Z suffix UTC) 로 보내면 tz-aware datetime 으로 파싱됨.
    # datetime.now() 는 naive 라 직접 비교하면 TypeError. tz 있으면 로컬로 변환 후 naive 화.
    if scheduled_at.tzinfo is not None:
        scheduled_at = scheduled_at.astimezone().replace(tzinfo=None)
    if scheduled_at < datetime.now():
        raise BusinessError(E_VALIDATION, "과거 시각으로 예약할 수 없습니다.")

    pool = get_pool()
    async with pool.acquire() as conn:
        auto_id = await conn.fetchval(
            'INSERT INTO public."AUTO_TRANSFER" ('
            '  "CUSTOMER_NO", "WITHDRAW_ACCOUNT_NO", "DEPOSIT_ACCOUNT_NO", '
            '  "DEPOSIT_BANK_CD", "DEPOSIT_HOLDER_NAME", "TRANSFER_AMOUNT", '
            '  "CYCLE_TYPE_CD", "VALID_START_DATE", "AUTO_STATUS_CD", '
            '  "REG_CHANNEL_CD", "WITHDRAW_MEMO", "DELETE_YN"'
            ") VALUES ($1, $2, $3, $4, $5, $6, 'ONCE', $7, 'ACTIVE', 'WEB', $8, 'N') "
            'RETURNING "AUTO_TRANSFER_ID"',
            customer_no,
            from_account_no,
            to_account_no,
            to_bank_cd,
            to_holder_name,
            amount_krw,
            _yyyymmdd(scheduled_at.date()),
            memo,
        )
    token = await tokens.issue(ResourceType.AUTO, str(auto_id), customer_no)
    return token, scheduled_at