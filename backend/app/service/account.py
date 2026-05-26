"""계좌·거래 조회 + account_token / tx_token 발급·검증 헬퍼.

DB 조회 → 가벼운 도메인 dataclass → Pydantic view helper.
본인 외 자원은 404 (가이드 §3.6).
"""

from __future__ import annotations

import structlog
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from ..db import get_pool
from ..errors import (
    E_BALANCE_INSUFFICIENT,
    E_NOT_FOUND,
    E_UNAUTHORIZED,
    E_VALIDATION,
)
from ..exceptions import AuthError, BusinessError, NotFoundError
from ..logging_setup import mask_account_no
from ..schema.account import AccountSummary, TransactionItem
from ..schema.common import MaskedAccount
from .auth.passwords import verify_password
from .account_verify import OWN_BANK_CODE
from .notification import insert_notification
from .token import ResourceType, TokenService

log = structlog.get_logger("account")


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
    # ACCOUNT 테이블에 CURRENCY 컬럼이 없어 ACCOUNT_TYPE_CD 기준 추론.
    # FOREIGN 시드는 현재 USD 1종 — 다른 통화 추가되면 ACCOUNT 또는
    # PRODUCT join 으로 확장 필요.
    currency = "USD" if (row.account_type_cd or "") == "FOREIGN" else "KRW"
    return AccountSummary(
        account_token=account_token,
        alias=row.account_alias,
        account_type_cd=row.account_type_cd or "UNKNOWN",
        currency=currency,
        balance=row.balance,
        status_cd=row.account_status_cd or "UNKNOWN",
        hidden=(row.hidden_yn == "Y"),
        account_no=row.account_no,
        primary_yn=row.primary_account_yn or "N",
        last_tx_datetime=row.last_tx_datetime,
    )


# ---------------------------------------------------------------------------
# AC-009 계좌 해지
# ---------------------------------------------------------------------------

async def close_account(
    *,
    customer_no: int,
    account_no: str,
    transfer_target_account_no: str | None,
    password: str,
) -> dict[str, Any]:
    """계좌 해지 — 잔액 > 0 이면 본인 계좌로 INTRA 이체 후 CLOSED 전이.

    가드:
    - 본인 계좌만 (DELETE_YN='N')
    - 이미 CLOSED 면 idempotent — 첫 해지 row 그대로 회신 (잔액 이체 없음)
    - LOAN 타입 계좌는 별도 (대출 메뉴에서 상환)
    - 외화(FOREIGN) + 잔액>0 은 거부 (영업점 안내)
    - AUTO_TRANSFER ACTIVE 출금계좌면 거부
    - WITHDRAW_PWD_HASH verify_password 실패 시 PWD_ERROR_COUNT++,
      5회 도달 시 LIMITED_ACCOUNT_YN='Y'
    - 잔액>0 인데 transfer_target 미지정 시 422
    - 잔액 이체는 본인 계좌(다른 KRW 계좌)로만, INTRA 패턴 (TRANSFER + TRANSACTION 2 + 잔액 atomic)
    """
    pool = get_pool()
    today = date.today().strftime("%Y%m%d")
    now_str = datetime.now().strftime("%Y%m%d%H%M%S")

    async with pool.acquire() as conn:
        async with conn.transaction():
            # 1) 출금(해지) 계좌 + 대상 계좌 FOR UPDATE 락 — 사전순
            lock_ids = [account_no]
            if transfer_target_account_no and transfer_target_account_no != account_no:
                lock_ids.append(transfer_target_account_no)
            lock_ids.sort()
            rows = await conn.fetch(
                'SELECT "ACCOUNT_NO", "CUSTOMER_NO", "ACCOUNT_TYPE_CD", '
                '       "BALANCE", "ACCOUNT_STATUS_CD", "ACCOUNT_HOLDER_NAME", '
                '       "WITHDRAW_PWD_HASH", "PWD_ERROR_COUNT", '
                '       "LIMITED_ACCOUNT_YN", "DELETE_YN", "CLOSE_DATE" '
                'FROM public."ACCOUNT" WHERE "ACCOUNT_NO" = ANY($1::varchar[]) '
                'FOR UPDATE',
                lock_ids,
            )
            by_no = {r["ACCOUNT_NO"]: r for r in rows}
            row = by_no.get(account_no)
            if row is None or row["DELETE_YN"] == "Y" or row["CUSTOMER_NO"] != customer_no:
                raise NotFoundError(E_NOT_FOUND, "계좌를 찾을 수 없습니다.")

            # 2) 이미 CLOSED — idempotent 회신
            if row["ACCOUNT_STATUS_CD"] == "CLOSED":
                return {
                    "account_no": account_no,
                    "closed_date": row["CLOSE_DATE"] or today,
                    "transferred_amount_krw": 0,
                    "transferred_to_account_no": None,
                    "idempotent": True,
                }

            # 3) 계좌 타입 / 통화 / 상태 가드
            acct_type = (row["ACCOUNT_TYPE_CD"] or "").upper()
            if acct_type == "LOAN":
                raise BusinessError(
                    E_VALIDATION,
                    "대출 계좌는 대출 상환 메뉴에서 해지하실 수 있습니다.",
                )
            balance = int(row["BALANCE"] or 0)
            if acct_type == "FOREIGN" and balance > 0:
                raise BusinessError(
                    E_VALIDATION,
                    "외화 계좌는 영업점에서 잔액을 정리한 후 해지 가능합니다.",
                )
            if row["LIMITED_ACCOUNT_YN"] == "Y":
                raise BusinessError(
                    E_VALIDATION,
                    "거래제한 계좌입니다. 영업점에서 제한 해제 후 다시 시도해 주세요.",
                )

            # 4) 활성 자동이체 가드 (출금 또는 입금 모두)
            auto_count = await conn.fetchval(
                'SELECT COUNT(*) FROM public."AUTO_TRANSFER" '
                'WHERE ("WITHDRAW_ACCOUNT_NO" = $1 OR "DEPOSIT_ACCOUNT_NO" = $1) '
                '  AND "AUTO_STATUS_CD" = \'ACTIVE\' '
                '  AND "DELETE_YN" = \'N\'',
                account_no,
            )
            if int(auto_count or 0) > 0:
                raise BusinessError(
                    E_VALIDATION,
                    "등록된 자동이체가 있어 해지할 수 없습니다. 자동이체를 먼저 해지하거나 다른 계좌로 변경해 주세요.",
                )

            # 5) 비밀번호 검증 — 실패 시 트랜잭션 종료 후 카운트 적재 (rollback 회피)
            pwd_hash = row["WITHDRAW_PWD_HASH"]
            pwd_failed_count: int | None = (
                None
                if bool(pwd_hash) and verify_password(password, pwd_hash)
                else int(row["PWD_ERROR_COUNT"] or 0) + 1
            )
            prev_limited_yn = row["LIMITED_ACCOUNT_YN"] or "N"

            # 6) 잔액 이체 (잔액 > 0 인 경우만, 비번 실패면 skip 후 트랜잭션 정상 종료)
            transferred_amount = 0
            target_no: str | None = None
            if pwd_failed_count is None and balance > 0:
                if not transfer_target_account_no:
                    raise BusinessError(
                        E_VALIDATION,
                        "잔액이 있어 이체 대상 계좌가 필요합니다.",
                    )
                if transfer_target_account_no == account_no:
                    raise BusinessError(
                        E_VALIDATION,
                        "이체 대상 계좌가 해지 대상과 같습니다.",
                    )
                target = by_no.get(transfer_target_account_no)
                if (
                    target is None
                    or target["DELETE_YN"] == "Y"
                    or target["CUSTOMER_NO"] != customer_no
                ):
                    raise NotFoundError(E_NOT_FOUND, "이체 대상 계좌를 찾을 수 없습니다.")
                if target["ACCOUNT_STATUS_CD"] == "CLOSED":
                    raise BusinessError(
                        E_VALIDATION, "이체 대상 계좌가 이미 해지 상태입니다.",
                    )
                target_type = (target["ACCOUNT_TYPE_CD"] or "").upper()
                # FOREIGN 끼리만 가능, 그 외는 KRW 간에만
                src_currency = "USD" if acct_type == "FOREIGN" else "KRW"
                tgt_currency = "USD" if target_type == "FOREIGN" else "KRW"
                if src_currency != tgt_currency:
                    raise BusinessError(
                        E_VALIDATION, "통화가 다른 계좌로는 이체할 수 없습니다.",
                    )

                target_balance = int(target["BALANCE"] or 0)
                # TRANSFER INSERT (INTRA, SETTLED)
                transfer_id = await conn.fetchval(
                    'INSERT INTO public."TRANSFER" ('
                    '  "WITHDRAW_ACCOUNT_NO", "WITHDRAW_BANK_CD", "WITHDRAW_HOLDER_NAME", '
                    '  "DEPOSIT_ACCOUNT_NO", "DEPOSIT_BANK_CD", "DEPOSIT_HOLDER_NAME", '
                    '  "ENTERED_HOLDER_NAME", "HOLDER_MATCH_YN", '
                    '  "TRANSFER_AMOUNT", "FEE", '
                    '  "REQUEST_DATETIME", "COMPLETE_DATETIME", '
                    '  "TRANSFER_TYPE_CD", "TRANSFER_STATUS_CD", '
                    '  "SETTLEMENT_TYPE", "SETTLEMENT_STATUS", '
                    '  "SETTLEMENT_REQUESTED_AT", "SETTLEMENT_COMPLETED_AT", '
                    '  "WITHDRAW_MEMO", "DEPOSIT_MEMO", "TRANSFER_MEMO", '
                    '  "CANCEL_YN", "DELETE_YN"'
                    ") VALUES ($1, $2, $3, $4, $2, $5, $5, 'Y', $6, 0, "
                    "          $7, $7, 'INTRA', 'SETTLED', "
                    "          'INTRA_BANK', 'SETTLED', NOW(), NOW(), "
                    "          '계좌 해지', '계좌 해지', '계좌 해지', 'N', 'N') "
                    'RETURNING "TRANSFER_ID"',
                    account_no,
                    OWN_BANK_CODE,
                    row["ACCOUNT_HOLDER_NAME"],
                    transfer_target_account_no,
                    target["ACCOUNT_HOLDER_NAME"],
                    balance,
                    now_str,
                )
                # TRANSACTION 2 (출금/입금)
                await conn.execute(
                    'INSERT INTO public."TRANSACTION" ('
                    '  "ACCOUNT_NO", "TX_DATETIME", "TX_TYPE_CD", "TX_AMOUNT", '
                    '  "POST_TX_BALANCE", "COUNTERPART_ACCOUNT_NO", "COUNTERPART_BANK_CD", '
                    '  "COUNTERPART_HOLDER_NAME", "OWN_BANK_YN", "TX_STATUS_CD", '
                    '  "TRANSFER_ID", "TX_MEMO", "CANCEL_YN"'
                    ") VALUES ($1, $2, 'WITHDRAW', $3, $4, $5, $6, $7, 'Y', 'COMPLETE', "
                    "          $8, '계좌 해지 잔액 이체', 'N')",
                    account_no,
                    now_str,
                    -balance,
                    0,
                    transfer_target_account_no,
                    OWN_BANK_CODE,
                    target["ACCOUNT_HOLDER_NAME"],
                    transfer_id,
                )
                await conn.execute(
                    'INSERT INTO public."TRANSACTION" ('
                    '  "ACCOUNT_NO", "TX_DATETIME", "TX_TYPE_CD", "TX_AMOUNT", '
                    '  "POST_TX_BALANCE", "COUNTERPART_ACCOUNT_NO", "COUNTERPART_BANK_CD", '
                    '  "COUNTERPART_HOLDER_NAME", "OWN_BANK_YN", "TX_STATUS_CD", '
                    '  "TRANSFER_ID", "TX_MEMO", "CANCEL_YN"'
                    ") VALUES ($1, $2, 'DEPOSIT', $3, $4, $5, $6, $7, 'Y', 'COMPLETE', "
                    "          $8, '해지 계좌 잔액 수신', 'N')",
                    transfer_target_account_no,
                    now_str,
                    balance,
                    target_balance + balance,
                    account_no,
                    OWN_BANK_CODE,
                    row["ACCOUNT_HOLDER_NAME"],
                    transfer_id,
                )
                # ACCOUNT BALANCE atomic
                await conn.execute(
                    'UPDATE public."ACCOUNT" SET "BALANCE" = 0, '
                    '"LAST_TX_DATETIME" = $1 WHERE "ACCOUNT_NO" = $2',
                    now_str,
                    account_no,
                )
                await conn.execute(
                    'UPDATE public."ACCOUNT" SET "BALANCE" = "BALANCE" + $1, '
                    '"LAST_TX_DATETIME" = $2 WHERE "ACCOUNT_NO" = $3',
                    balance,
                    now_str,
                    transfer_target_account_no,
                )
                transferred_amount = balance
                target_no = transfer_target_account_no

            # 7) 상태 전이 → CLOSED (비번 실패면 skip)
            if pwd_failed_count is None:
                await conn.execute(
                    'UPDATE public."ACCOUNT" SET '
                    '  "ACCOUNT_STATUS_CD" = \'CLOSED\', '
                    '  "CLOSE_DATE" = $1, '
                    '  "PRIMARY_ACCOUNT_YN" = \'N\', '
                    '  "HIDDEN_YN" = \'N\', '
                    '  "UPDATED_AT" = NOW() '
                    'WHERE "ACCOUNT_NO" = $2',
                    today,
                    account_no,
                )

    # 5b) 비번 실패 — 트랜잭션 종료 후 별도 conn 으로 카운트 누적 + raise
    if pwd_failed_count is not None:
        new_limited = "Y" if pwd_failed_count >= 5 else prev_limited_yn
        async with pool.acquire() as conn2:
            await conn2.execute(
                'UPDATE public."ACCOUNT" SET '
                '  "PWD_ERROR_COUNT" = $1, "LIMITED_ACCOUNT_YN" = $2, '
                '  "UPDATED_AT" = NOW() '
                'WHERE "ACCOUNT_NO" = $3',
                pwd_failed_count,
                new_limited,
                account_no,
            )
        if pwd_failed_count >= 5:
            raise AuthError(
                E_UNAUTHORIZED,
                "비밀번호 5회 오류로 거래제한 처리되었습니다. 영업점 또는 비밀번호 재설정을 통해 해제해 주세요.",
            )
        raise AuthError(
            E_UNAUTHORIZED,
            f"계좌 비밀번호가 일치하지 않습니다. ({pwd_failed_count}/5)",
        )

    # 8) NOTIFICATION (트랜잭션 밖)
    try:
        body = (
            f"잔액 {transferred_amount:,}원이 이체되었으며 계좌가 해지되었습니다."
            if transferred_amount > 0
            else "잔액 0원으로 계좌가 해지되었습니다."
        )
        await insert_notification(
            customer_no,
            type_cd="SYSTEM",
            title="계좌 해지 완료",
            body=body,
            link_url="/accounts",
            reference_type="ACCOUNT",
        )
    except Exception:
        log.exception("close_notification_failed", account_no=mask_account_no(account_no))

    log.info(
        "account_closed",
        customer_no=customer_no,
        account_no=mask_account_no(account_no),
        transferred=transferred_amount,
    )
    return {
        "account_no": account_no,
        "closed_date": today,
        "transferred_amount_krw": transferred_amount,
        "transferred_to_account_no": target_no,
        "idempotent": False,
    }


# ---------------------------------------------------------------------------
# View helper — domain row → Pydantic schema
# ---------------------------------------------------------------------------

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