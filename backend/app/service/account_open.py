"""상품 가입 트랜잭션 (OP-003~005, 009).

⭐ 시그니처 — OP-009 적금 가입 시 매월 자동이체를 같은 트랜잭션에 자동 등록.
계좌 개설 ✚ 자동이체 등록을 사용자 한 번의 클릭으로 완성하는 핵심 흐름.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError
from .account import fetch_account, resolve_account_token
from .token import ResourceType, TokenService

log = structlog.get_logger("account_open")


def _now_str() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _today_str() -> str:
    return datetime.now().strftime("%Y%m%d")


def _new_account_no(customer_no: int) -> str:
    """`110-{cust 6자리}-{micro 6자리}` 형식. 가입 트랜잭션 동시 호출 대비 microsecond 사용."""
    micro = datetime.now().strftime("%H%M%S%f")[-6:]
    return f"110-{str(customer_no).zfill(6)[-6:]}-{micro}"


def _next_exec_date(start: date, monthly_day: int) -> datetime:
    """다음 자동이체 실행 시각 — 시작일 이후의 transfer_day 첫 발생."""
    base = start
    if base.day <= monthly_day:
        try:
            return datetime(base.year, base.month, monthly_day)
        except ValueError:
            return datetime(base.year, base.month, 28)
    # 시작일이 이미 지남 — 다음 달
    nm_year = base.year + (1 if base.month == 12 else 0)
    nm_month = 1 if base.month == 12 else base.month + 1
    try:
        return datetime(nm_year, nm_month, monthly_day)
    except ValueError:
        return datetime(nm_year, nm_month, 28)


async def open_installment(
    *,
    customer_no: int,
    product_id: int,
    monthly_amount_krw: int,
    period_months: int,
    transfer_day: int,
    withdraw_account_token: str,
    consents: list,
    tokens: TokenService,
) -> tuple[str, str, datetime]:
    """적금 가입 — ACCOUNT(INSTALL) + AUTO_TRANSFER(MONTHLY) 한 트랜잭션.

    반환: (account_token, auto_token, next_execute_at)
    """
    if not (1 <= transfer_day <= 31):
        raise BusinessError(E_VALIDATION, "이체 실행일은 1~31 사이여야 합니다.")
    if monthly_amount_krw <= 0:
        raise BusinessError(E_VALIDATION, "월 납입액이 올바르지 않습니다.")

    # 출금 계좌 본인 검증
    from_account_no = await resolve_account_token(
        tokens, withdraw_account_token, customer_no
    )
    await fetch_account(from_account_no, customer_no)

    pool = get_pool()
    new_acct_no = _new_account_no(customer_no)
    now_str = _now_str()
    today = _today_str()

    # 다음 실행일
    start = date.today()
    next_dt = _next_exec_date(start, transfer_day)
    # 만기일 = 시작 + period_months (단순 30일 환산)
    end_date = (start + timedelta(days=30 * period_months)).strftime("%Y%m%d")

    async with pool.acquire() as conn:
        # 상품 검증
        prod = await conn.fetchrow(
            'SELECT "PRODUCT_ID", "PRODUCT_TYPE_CD", "PRODUCT_NAME" '
            'FROM public."PRODUCT" '
            'WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\'',
            product_id,
        )
        if prod is None:
            raise NotFoundError(E_NOT_FOUND, "상품을 찾을 수 없습니다.")
        if prod["PRODUCT_TYPE_CD"] != "INSTALL":
            raise BusinessError(
                E_VALIDATION,
                "적금 상품이 아닙니다. (PRODUCT_TYPE_CD=INSTALL 만 지원)",
            )

        async with conn.transaction():
            # 약관 동의 영구화 — 가입 실패 시 함께 롤백되도록 같은 트랜잭션에서.
            from ..api.product_open import _persist_consents
            await _persist_consents(
                conn,
                customer_no=customer_no,
                product_id=product_id,
                consents=consents,
            )

            # 적금 계좌 INSERT
            await conn.execute(
                'INSERT INTO public."ACCOUNT" ('
                '  "ACCOUNT_NO", "CUSTOMER_NO", "ACCOUNT_TYPE_CD", '
                '  "OPEN_DATE", "BALANCE", "PENDING_WITHDRAW", '
                '  "ACCOUNT_STATUS_CD", "ACCOUNT_HOLDER_NAME", "ACCOUNT_ALIAS", '
                '  "PRIMARY_ACCOUNT_YN", "HIDDEN_YN", "DELETE_YN"'
                ") VALUES ($1, $2, 'INSTALL', $3, 0, 0, 'NORMAL', "
                "          (SELECT \"PARTY_NAME\" FROM public.\"PARTY\" p "
                "             JOIN public.\"CUSTOMER\" c ON c.\"PARTY_ID\"=p.\"PARTY_ID\" "
                "             WHERE c.\"CUSTOMER_NO\"=$2), "
                "          $4, 'N', 'N', 'N')",
                new_acct_no,
                customer_no,
                today,
                prod["PRODUCT_NAME"] or "적금",
            )

            # 매월 자동이체 INSERT (출금→적금 계좌)
            auto_id = await conn.fetchval(
                'INSERT INTO public."AUTO_TRANSFER" ('
                '  "CUSTOMER_NO", "WITHDRAW_ACCOUNT_NO", "DEPOSIT_ACCOUNT_NO", '
                '  "DEPOSIT_BANK_CD", "DEPOSIT_HOLDER_NAME", "TRANSFER_AMOUNT", '
                '  "CYCLE_TYPE_CD", "MONTHLY_EXEC_DAY", "VALID_START_DATE", '
                '  "VALID_END_DATE", "AUTO_STATUS_CD", "REG_CHANNEL_CD", '
                '  "MAX_RETRY_COUNT", "RETRY_INTERVAL_HOURS", "CARRY_NEXT_MONTH_YN", '
                '  "WITHDRAW_MEMO", "DELETE_YN"'
                ") VALUES ($1, $2, $3, '098', $4, $5, "
                "          'MONTHLY', $6, $7, $8, 'ACTIVE', 'WEB', "
                "          3, 6, 'N', $9, 'N') "
                'RETURNING "AUTO_TRANSFER_ID"',
                customer_no,
                from_account_no,
                new_acct_no,
                prod["PRODUCT_NAME"] or "적금",
                monthly_amount_krw,
                transfer_day,
                today,
                end_date,
                f"적금 자동납입 — {prod['PRODUCT_NAME']}",
            )

    account_token = await tokens.issue(ResourceType.ACCOUNT, new_acct_no, customer_no)
    auto_token = await tokens.issue(ResourceType.AUTO, str(auto_id), customer_no)

    log.info(
        "installment_opened",
        product_id=product_id,
        account_no=new_acct_no,
        auto_transfer_id=int(auto_id),
        monthly_amount=monthly_amount_krw,
        transfer_day=transfer_day,
    )
    return account_token, auto_token, next_dt