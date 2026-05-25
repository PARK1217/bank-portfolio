"""계좌·거래 조회 + account_token / tx_token 발급·검증 헬퍼.

DB 조회 → 가벼운 도메인 dataclass → Pydantic view helper.
본인 외 자원은 404 (가이드 §3.6).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError
from ..logging_setup import mask_account_no
from ..schema.account import AccountSummary, TransactionItem
from ..schema.common import MaskedAccount
from .token import ResourceType, TokenService


# ---------------------------------------------------------------------------
# 토큰 발급/검증
# ---------------------------------------------------------------------------

async def issue_account_tokens(
    tokens: TokenService, customer_no: int, account_nos: list[str]
) -> list[str]:
    return [
        await tokens.issue(ResourceType.ACCOUNT, no, customer_no)
        for no in account_nos
    ]


async def resolve_account_token(
    tokens: TokenService, token: str, customer_no: int
) -> str:
    payload = await tokens.resolve(
        token, customer_no, expected_type=ResourceType.ACCOUNT
    )
    if payload is None:
        raise NotFoundError(E_NOT_FOUND, "계좌를 찾을 수 없습니다.")
    return payload.resource_id


async def issue_tx_token(tokens: TokenService, tx_id: int, customer_no: int) -> str:
    return await tokens.issue(ResourceType.TX, str(tx_id), customer_no)


async def resolve_tx_token(
    tokens: TokenService, token: str, customer_no: int
) -> int:
    payload = await tokens.resolve(
        token, customer_no, expected_type=ResourceType.TX
    )
    if payload is None:
        raise NotFoundError(E_NOT_FOUND, "거래를 찾을 수 없습니다.")
    return int(payload.resource_id)


# ---------------------------------------------------------------------------
# 도메인 DTO
# ---------------------------------------------------------------------------

@dataclass
class AccountRow:
    account_no: str
    customer_no: int
    account_type_cd: str | None
    balance: int
    account_status_cd: str | None
    account_alias: str | None
    hidden_yn: str | None
    daily_withdraw_limit: int | None
    daily_transfer_limit: int | None
    display_order: int | None
    primary_account_yn: str | None = None
    last_tx_datetime: str | None = None


@dataclass
class TransactionRow:
    tx_id: int
    account_no: str
    tx_at: datetime
    tx_type_cd: str | None
    amount: int
    balance_after: int
    counterpart_account_no: str | None
    counterpart_bank_cd: str | None
    counterpart_bank_name: str | None
    counterpart_holder_name: str | None
    memo: str | None
    tx_status_cd: str | None
    transfer_id: int | None
    cancel_yn: str | None


# ---------------------------------------------------------------------------
# DB 조회
# ---------------------------------------------------------------------------

_ACCOUNT_COLS = (
    '"ACCOUNT_NO", "CUSTOMER_NO", "ACCOUNT_TYPE_CD", "BALANCE", '
    '"ACCOUNT_STATUS_CD", "ACCOUNT_ALIAS", "HIDDEN_YN", '
    '"DAILY_WITHDRAW_LIMIT", "DAILY_TRANSFER_LIMIT", "DISPLAY_ORDER", '
    '"PRIMARY_ACCOUNT_YN", "LAST_TX_DATETIME"'
)

_TX_COLS = (
    '"TRANSACTION_ID", "ACCOUNT_NO", "TX_DATETIME", "TX_TYPE_CD", '
    '"TX_AMOUNT", "POST_TX_BALANCE", "COUNTERPART_ACCOUNT_NO", '
    '"COUNTERPART_BANK_CD", "COUNTERPART_BANK_NAME", "COUNTERPART_HOLDER_NAME", '
    '"TX_MEMO", "TX_STATUS_CD", "TRANSFER_ID", "CANCEL_YN"'
)


def _row_to_account(r) -> AccountRow:
    return AccountRow(
        account_no=r["ACCOUNT_NO"],
        customer_no=r["CUSTOMER_NO"],
        account_type_cd=r["ACCOUNT_TYPE_CD"],
        balance=int(r["BALANCE"] or 0),
        account_status_cd=r["ACCOUNT_STATUS_CD"],
        account_alias=r["ACCOUNT_ALIAS"],
        hidden_yn=r["HIDDEN_YN"],
        daily_withdraw_limit=r["DAILY_WITHDRAW_LIMIT"],
        daily_transfer_limit=r["DAILY_TRANSFER_LIMIT"],
        display_order=r["DISPLAY_ORDER"],
        primary_account_yn=r["PRIMARY_ACCOUNT_YN"],
        last_tx_datetime=r["LAST_TX_DATETIME"],
    )


def _parse_tx_dt(s: str | None) -> datetime:
    if not s:
        return datetime.min
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return datetime.min


def _row_to_tx(r) -> TransactionRow:
    return TransactionRow(
        tx_id=int(r["TRANSACTION_ID"]),
        account_no=r["ACCOUNT_NO"],
        tx_at=_parse_tx_dt(r["TX_DATETIME"]),
        tx_type_cd=r["TX_TYPE_CD"],
        amount=int(r["TX_AMOUNT"] or 0),
        balance_after=int(r["POST_TX_BALANCE"] or 0),
        counterpart_account_no=r["COUNTERPART_ACCOUNT_NO"],
        counterpart_bank_cd=r["COUNTERPART_BANK_CD"],
        counterpart_bank_name=r["COUNTERPART_BANK_NAME"],
        counterpart_holder_name=r["COUNTERPART_HOLDER_NAME"],
        memo=r["TX_MEMO"],
        tx_status_cd=r["TX_STATUS_CD"],
        transfer_id=r["TRANSFER_ID"],
        cancel_yn=r["CANCEL_YN"],
    )


async def fetch_accounts_for(customer_no: int) -> list[AccountRow]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f'SELECT {_ACCOUNT_COLS} FROM public."ACCOUNT" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "DISPLAY_ORDER" NULLS LAST, "ACCOUNT_NO"',
            customer_no,
        )
    return [_row_to_account(r) for r in rows]


async def fetch_account(account_no: str, customer_no: int) -> AccountRow:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f'SELECT {_ACCOUNT_COLS} FROM public."ACCOUNT" '
            'WHERE "ACCOUNT_NO" = $1 AND "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
            account_no,
            customer_no,
        )
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "계좌를 찾을 수 없습니다.")
    return _row_to_account(row)


async def fetch_transactions(
    account_no: str,
    customer_no: int,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    tx_type_cd: str | None = None,
    q: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[TransactionRow], bool]:
    """본인 검증을 거친 후 거래 페이지 조회. 반환: (rows, has_next).

    q: 메모/상대 예금주명/상대 계좌번호 부분일치 ILIKE.
    """
    await fetch_account(account_no, customer_no)  # 본인 검증

    where = ['"ACCOUNT_NO" = $1']
    args: list[Any] = [account_no]
    if from_date:
        args.append(from_date.strftime("%Y%m%d") + "000000")
        where.append(f'"TX_DATETIME" >= ${len(args)}')
    if to_date:
        args.append(to_date.strftime("%Y%m%d") + "235959")
        where.append(f'"TX_DATETIME" <= ${len(args)}')
    if tx_type_cd:
        args.append(tx_type_cd)
        where.append(f'"TX_TYPE_CD" = ${len(args)}')
    if q:
        needle = q.strip()
        if needle:
            args.append(f"%{needle}%")
            i = len(args)
            where.append(
                f'(COALESCE("TX_MEMO", \'\') ILIKE ${i} '
                f'OR COALESCE("COUNTERPART_HOLDER_NAME", \'\') ILIKE ${i} '
                f'OR COALESCE("COUNTERPART_ACCOUNT_NO", \'\') ILIKE ${i})'
            )

    where_sql = " AND ".join(where)
    args.extend([limit + 1, offset])
    sql = (
        f'SELECT {_TX_COLS} FROM public."TRANSACTION" '
        f"WHERE {where_sql} "
        f'ORDER BY "TX_DATETIME" DESC, "TRANSACTION_ID" DESC '
        f"LIMIT ${len(args) - 1} OFFSET ${len(args)}"
    )

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)

    has_next = len(rows) > limit
    return [_row_to_tx(r) for r in rows[:limit]], has_next


async def fetch_transaction(tx_id: int, customer_no: int) -> TransactionRow:
    """본인 소유 계좌의 거래만 반환."""
    pool = get_pool()
    # TRANSACTION, ACCOUNT 테이블 모두 ACCOUNT_NO 컬럼이 있어 명시적 t. prefix 필요
    tx_cols_prefixed = ", ".join([f"t.{col}" for col in _TX_COLS.split(", ")])
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT {tx_cols_prefixed} FROM public.\"TRANSACTION\" t "
            'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            'WHERE t."TRANSACTION_ID" = $1 AND a."CUSTOMER_NO" = $2 '
            '  AND a."DELETE_YN" = \'N\'',
            tx_id,
            customer_no,
        )
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "거래를 찾을 수 없습니다.")
    return _row_to_tx(row)


# ---------------------------------------------------------------------------
# View helper — domain row → Pydantic schema
# ---------------------------------------------------------------------------

def to_account_summary(row: AccountRow, account_token: str) -> AccountSummary:
    return AccountSummary(
        account_token=account_token,
        alias=row.account_alias,
        account_type_cd=row.account_type_cd or "UNKNOWN",
        balance=row.balance,
        status_cd=row.account_status_cd or "UNKNOWN",
        hidden=(row.hidden_yn == "Y"),
        account_no=row.account_no,
        primary_yn=row.primary_account_yn or "N",
        last_tx_datetime=row.last_tx_datetime,
    )


def to_tx_item(row: TransactionRow, tx_token: str) -> TransactionItem:
    counterpart = None
    if row.counterpart_account_no:
        counterpart = MaskedAccount(
            masked=mask_account_no(row.counterpart_account_no),
            bank_cd=row.counterpart_bank_cd,
            bank_name=row.counterpart_bank_name,
            holder_name=row.counterpart_holder_name,
        )
    return TransactionItem(
        tx_token=tx_token,
        tx_at=row.tx_at,
        tx_type_cd=row.tx_type_cd or "UNKNOWN",
        amount=row.amount,
        balance_after=row.balance_after,
        memo=row.memo,
        counterpart=counterpart,
    )