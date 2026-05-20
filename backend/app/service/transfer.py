"""이체 본체 서비스 — TR-001 / TR-002 / TR-003.

가이드 §2 의사코드 기반. 현 단계는 **당행이체(INTRA_BANK)만 처리**.
타행(KFTC/BOK) 3-tier + Kafka 발행은 후속 작업.

핵심 보장:
- 멱등성 (가이드 §3.4): TRANSFER.IDEMPOTENCY_KEY UNIQUE + 재호출 시 기존 응답 재구성
- 잔액 동시성 (가이드 §3.5): SELECT FOR UPDATE + atomic UPDATE
- Deadlock 회피: 양쪽 계좌 잠금을 account_no 사전순 정렬

v53 settlement_* 컬럼은 미적용 — 응답의 settlement_type/status는 코드에서 결정.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import structlog

from ..db import get_pool
from ..errors import (
    E_BALANCE_INSUFFICIENT,
    E_IDEMPOTENCY_CONFLICT,
    E_NOT_FOUND,
    E_UNAUTHORIZED,
    E_VALIDATION,
)
from ..exceptions import AuthError, BusinessError, ConflictError, NotFoundError
from .account import fetch_account, issue_tx_token, resolve_account_token
from .auth.passwords import verify_password
from .token import TokenService

log = structlog.get_logger("transfer")

# 본행 코드 — 임시 상수. 운영 시 settings.BANK_CODE로 외부화.
OWN_BANK_CODE = "098"


@dataclass
class TransferResult:
    transfer_id: int
    tx_id_withdraw: int
    settlement_type: str       # INTRA_BANK / KFTC_SMALL / BOK_LARGE
    settlement_status: str     # SETTLED / PENDING
    requested_at: datetime
    completed_at: datetime | None
    idempotent_replay: bool


def _now_str() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# 비밀번호/PIN 검증 (CUSTOMER.SIMPLE_PIN 우선, PASSWORD fallback)
# ---------------------------------------------------------------------------

async def _verify_pin_or_password(customer_no: int, secret: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "PASSWORD", "SIMPLE_PIN" FROM public."CUSTOMER" WHERE "CUSTOMER_NO" = $1',
            customer_no,
        )
    if row is None:
        raise AuthError(E_UNAUTHORIZED, "유효하지 않은 세션입니다.")
    if row["SIMPLE_PIN"] and verify_password(secret, row["SIMPLE_PIN"]):
        return
    if row["PASSWORD"] and verify_password(secret, row["PASSWORD"]):
        return
    raise AuthError(E_UNAUTHORIZED, "비밀번호 또는 OTP가 올바르지 않습니다.")


# ---------------------------------------------------------------------------
# 멱등성 — 기존 TRANSFER 조회
# ---------------------------------------------------------------------------

async def _find_by_idempotency(idem_key: str) -> dict | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "TRANSFER_ID", "WITHDRAW_ACCOUNT_NO", "DEPOSIT_ACCOUNT_NO", '
            '       "TRANSFER_AMOUNT", "REQUEST_DATETIME", "COMPLETE_DATETIME", '
            '       "TRANSFER_TYPE_CD", "TRANSFER_STATUS_CD" '
            'FROM public."TRANSFER" WHERE "IDEMPOTENCY_KEY" = $1',
            idem_key,
        )
    if row is None:
        return None
    return dict(row)


# ---------------------------------------------------------------------------
# 메인 흐름
# ---------------------------------------------------------------------------

async def execute_transfer(
    *,
    user_customer_no: int,
    from_account_no: str,
    to_bank_cd: str,
    to_account_no: str,
    to_holder_name: str | None,
    amount_krw: int,
    memo: str | None,
    password_or_otp: str,
    idempotency_key: str,
    tokens: TokenService,
) -> TransferResult:
    """이체 실행 (당행이체만). 멱등성 보장."""

    # 1. 멱등성 — 기존 TRANSFER 있으면 응답 재구성
    existing = await _find_by_idempotency(idempotency_key)
    if existing is not None:
        if (
            existing["WITHDRAW_ACCOUNT_NO"] != from_account_no
            or existing["DEPOSIT_ACCOUNT_NO"] != to_account_no
            or int(existing["TRANSFER_AMOUNT"] or 0) != amount_krw
        ):
            raise ConflictError(
                E_IDEMPOTENCY_CONFLICT,
                "같은 키로 다른 페이로드의 이체가 이미 존재합니다.",
            )
        # 재구성 — TX 토큰 발급은 출금 거래(TRANSACTION) 기반
        tx_id = await _find_withdraw_tx_id(int(existing["TRANSFER_ID"]))
        if tx_id is None:
            raise BusinessError(E_VALIDATION, "이전 이체의 거래 기록을 찾을 수 없습니다.")
        # tx_token 재발급 (사용자별 토큰 신규 발급은 무해)
        return TransferResult(
            transfer_id=int(existing["TRANSFER_ID"]),
            tx_id_withdraw=tx_id,
            settlement_type=_settle_type_for(existing["TRANSFER_TYPE_CD"]),
            settlement_status=_settle_status_for(existing["TRANSFER_STATUS_CD"]),
            requested_at=_parse_dt(existing["REQUEST_DATETIME"]) or datetime.now(),
            completed_at=_parse_dt(existing["COMPLETE_DATETIME"]),
            idempotent_replay=True,
        )

    # 2. 비밀번호/PIN 검증
    await _verify_pin_or_password(user_customer_no, password_or_otp)

    # 3. 출금계좌 본인 검증
    from_acct = await fetch_account(from_account_no, user_customer_no)

    # 4. 결제 채널 결정 — 현재는 당행만 지원
    settlement_type = "INTRA_BANK" if to_bank_cd == OWN_BANK_CODE else (
        "BOK_LARGE" if amount_krw >= 1_000_000_000 else "KFTC_SMALL"
    )
    if settlement_type != "INTRA_BANK":
        raise BusinessError(
            E_VALIDATION,
            "타행/거액 이체는 아직 지원하지 않습니다. (KFTC/BOK 채널은 후속 작업)",
        )

    return await _process_intra_bank(
        from_account_no=from_account_no,
        to_account_no=to_account_no,
        to_bank_cd=to_bank_cd,
        to_holder_name=to_holder_name,
        amount_krw=amount_krw,
        memo=memo,
        idempotency_key=idempotency_key,
    )


# ---------------------------------------------------------------------------
# 당행이체 — 단일 트랜잭션 즉시 처리
# ---------------------------------------------------------------------------

async def _process_intra_bank(
    *,
    from_account_no: str,
    to_account_no: str,
    to_bank_cd: str,
    to_holder_name: str | None,
    amount_krw: int,
    memo: str | None,
    idempotency_key: str,
) -> TransferResult:
    if from_account_no == to_account_no:
        raise BusinessError(E_VALIDATION, "출금계좌와 입금계좌가 같습니다.")

    pool = get_pool()
    now_str = _now_str()
    now_dt = datetime.now()

    # Deadlock 회피 — account_no 사전순으로 잠금
    lock_first, lock_second = sorted([from_account_no, to_account_no])

    async with pool.acquire() as conn:
        async with conn.transaction():
            # 출금/입금 계좌 사전순 잠금
            rows = await conn.fetch(
                'SELECT "ACCOUNT_NO", "CUSTOMER_NO", "BALANCE", "ACCOUNT_STATUS_CD", '
                '       "ACCOUNT_HOLDER_NAME", "DELETE_YN" '
                'FROM public."ACCOUNT" WHERE "ACCOUNT_NO" IN ($1, $2) FOR UPDATE',
                lock_first,
                lock_second,
            )
            by_no = {r["ACCOUNT_NO"]: r for r in rows}
            from_row = by_no.get(from_account_no)
            to_row = by_no.get(to_account_no)

            if from_row is None or from_row["DELETE_YN"] == "Y":
                raise NotFoundError(E_NOT_FOUND, "출금 계좌를 찾을 수 없습니다.")
            if to_row is None or to_row["DELETE_YN"] == "Y":
                raise NotFoundError(E_NOT_FOUND, "입금 계좌를 찾을 수 없습니다.")

            from_balance = int(from_row["BALANCE"] or 0)
            to_balance = int(to_row["BALANCE"] or 0)
            if from_balance < amount_krw:
                raise BusinessError(
                    E_BALANCE_INSUFFICIENT,
                    "잔액이 부족합니다.",
                    details={"balance": from_balance, "amount": amount_krw},
                )

            # TRANSFER INSERT — IDEMPOTENCY_KEY UNIQUE 가정. 충돌 시 ConflictError로 전환.
            try:
                transfer_id = await conn.fetchval(
                    'INSERT INTO public."TRANSFER" ('
                    '  "WITHDRAW_ACCOUNT_NO", "WITHDRAW_BANK_CD", "WITHDRAW_HOLDER_NAME", '
                    '  "DEPOSIT_ACCOUNT_NO", "DEPOSIT_BANK_CD", "DEPOSIT_HOLDER_NAME", '
                    '  "ENTERED_HOLDER_NAME", "HOLDER_MATCH_YN", '
                    '  "TRANSFER_AMOUNT", "FEE", '
                    '  "REQUEST_DATETIME", "COMPLETE_DATETIME", '
                    '  "TRANSFER_TYPE_CD", "TRANSFER_STATUS_CD", '
                    '  "TRANSFER_MEMO", "IDEMPOTENCY_KEY", "CANCEL_YN", "DELETE_YN"'
                    ') VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, '
                    "          'INTRA', 'SETTLED', $12, $13, 'N', 'N') "
                    'RETURNING "TRANSFER_ID"',
                    from_account_no,
                    OWN_BANK_CODE,
                    from_row["ACCOUNT_HOLDER_NAME"],
                    to_account_no,
                    to_bank_cd,
                    to_row["ACCOUNT_HOLDER_NAME"],
                    to_holder_name,
                    "Y" if (to_holder_name and to_holder_name == to_row["ACCOUNT_HOLDER_NAME"]) else "N",
                    amount_krw,
                    0,
                    now_str,
                    memo,
                    idempotency_key,
                )
            except Exception as e:
                # UniqueViolation 등 — 멱등성 race condition
                msg = str(e)
                if "IDEMPOTENCY" in msg.upper() or "duplicate" in msg.lower():
                    raise ConflictError(
                        E_IDEMPOTENCY_CONFLICT,
                        "동일한 멱등성 키로 이체가 동시 처리되었습니다.",
                    ) from e
                raise

            # TRANSACTION 2건 — 출금(-X), 입금(+X)
            tx_id_withdraw = await conn.fetchval(
                'INSERT INTO public."TRANSACTION" ('
                '  "ACCOUNT_NO", "TX_DATETIME", "TX_TYPE_CD", "TX_AMOUNT", '
                '  "POST_TX_BALANCE", "COUNTERPART_ACCOUNT_NO", "COUNTERPART_BANK_CD", '
                '  "COUNTERPART_HOLDER_NAME", "OWN_BANK_YN", "TX_STATUS_CD", '
                '  "TRANSFER_ID", "TX_MEMO", "CANCEL_YN"'
                ") VALUES ($1, $2, 'WITHDRAW', $3, $4, $5, $6, $7, 'Y', 'COMPLETE', "
                "          $8, $9, 'N') "
                'RETURNING "TRANSACTION_ID"',
                from_account_no,
                now_str,
                -amount_krw,
                from_balance - amount_krw,
                to_account_no,
                to_bank_cd,
                to_row["ACCOUNT_HOLDER_NAME"],
                transfer_id,
                memo,
            )
            await conn.execute(
                'INSERT INTO public."TRANSACTION" ('
                '  "ACCOUNT_NO", "TX_DATETIME", "TX_TYPE_CD", "TX_AMOUNT", '
                '  "POST_TX_BALANCE", "COUNTERPART_ACCOUNT_NO", "COUNTERPART_BANK_CD", '
                '  "COUNTERPART_HOLDER_NAME", "OWN_BANK_YN", "TX_STATUS_CD", '
                '  "TRANSFER_ID", "TX_MEMO", "CANCEL_YN"'
                ") VALUES ($1, $2, 'DEPOSIT', $3, $4, $5, $6, $7, 'Y', 'COMPLETE', "
                "          $8, $9, 'N')",
                to_account_no,
                now_str,
                amount_krw,
                to_balance + amount_krw,
                from_account_no,
                OWN_BANK_CODE,
                from_row["ACCOUNT_HOLDER_NAME"],
                transfer_id,
                memo,
            )

            # ACCOUNT BALANCE atomic UPDATE
            await conn.execute(
                'UPDATE public."ACCOUNT" SET "BALANCE" = "BALANCE" - $1, '
                '"LAST_TX_DATETIME" = $2 WHERE "ACCOUNT_NO" = $3',
                amount_krw,
                now_str,
                from_account_no,
            )
            await conn.execute(
                'UPDATE public."ACCOUNT" SET "BALANCE" = "BALANCE" + $1, '
                '"LAST_TX_DATETIME" = $2 WHERE "ACCOUNT_NO" = $3',
                amount_krw,
                now_str,
                to_account_no,
            )

    log.info(
        "intra_bank_transfer_settled",
        transfer_id=transfer_id,
        amount=amount_krw,
    )

    return TransferResult(
        transfer_id=int(transfer_id),
        tx_id_withdraw=int(tx_id_withdraw),
        settlement_type="INTRA_BANK",
        settlement_status="SETTLED",
        requested_at=now_dt,
        completed_at=now_dt,
        idempotent_replay=False,
    )


# ---------------------------------------------------------------------------
# 코드 매핑 헬퍼
# ---------------------------------------------------------------------------

def _settle_type_for(cd: str | None) -> str:
    return {"INTRA": "INTRA_BANK", "KFTC": "KFTC_SMALL", "BOK": "BOK_LARGE"}.get(
        cd or "", cd or "INTRA_BANK"
    )


def _settle_status_for(cd: str | None) -> str:
    return cd or "SETTLED"


async def _find_withdraw_tx_id(transfer_id: int) -> int | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "TRANSACTION_ID" FROM public."TRANSACTION" '
            'WHERE "TRANSFER_ID" = $1 AND "TX_TYPE_CD" = \'WITHDRAW\' LIMIT 1',
            transfer_id,
        )
    return int(row["TRANSACTION_ID"]) if row else None


# ---------------------------------------------------------------------------
# 조회 — TR-003
# ---------------------------------------------------------------------------

@dataclass
class TransferRow:
    transfer_id: int
    withdraw_account_no: str
    withdraw_bank_cd: str | None
    withdraw_bank_name: str | None
    withdraw_holder_name: str | None
    deposit_account_no: str
    deposit_bank_cd: str | None
    deposit_bank_name: str | None
    deposit_holder_name: str | None
    amount: int
    fee: int
    memo: str | None
    request_dt: datetime | None
    complete_dt: datetime | None
    transfer_type_cd: str | None
    transfer_status_cd: str | None
    counterpart_approval_no: str | None


async def fetch_transfer_by_tx(tx_id: int, customer_no: int) -> TransferRow:
    """tx_id → TRANSACTION.TRANSFER_ID → TRANSFER 조회. 본인 검증."""
    pool = get_pool()
    async with pool.acquire() as conn:
        tx = await conn.fetchrow(
            'SELECT t."TRANSFER_ID", t."ACCOUNT_NO" '
            'FROM public."TRANSACTION" t '
            'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            'WHERE t."TRANSACTION_ID" = $1 AND a."CUSTOMER_NO" = $2 '
            '  AND a."DELETE_YN" = \'N\'',
            tx_id,
            customer_no,
        )
        if tx is None or tx["TRANSFER_ID"] is None:
            raise NotFoundError(E_NOT_FOUND, "이체 내역을 찾을 수 없습니다.")
        tr = await conn.fetchrow(
            'SELECT "TRANSFER_ID", "WITHDRAW_ACCOUNT_NO", "WITHDRAW_BANK_CD", '
            '"WITHDRAW_BANK_NAME", "WITHDRAW_HOLDER_NAME", "DEPOSIT_ACCOUNT_NO", '
            '"DEPOSIT_BANK_CD", "DEPOSIT_BANK_NAME", "DEPOSIT_HOLDER_NAME", '
            '"TRANSFER_AMOUNT", "FEE", "TRANSFER_MEMO", "REQUEST_DATETIME", '
            '"COMPLETE_DATETIME", "TRANSFER_TYPE_CD", "TRANSFER_STATUS_CD", '
            '"COUNTERPART_APPROVAL_NO" '
            'FROM public."TRANSFER" WHERE "TRANSFER_ID" = $1',
            tx["TRANSFER_ID"],
        )
    if tr is None:
        raise NotFoundError(E_NOT_FOUND, "이체 내역을 찾을 수 없습니다.")
    return TransferRow(
        transfer_id=int(tr["TRANSFER_ID"]),
        withdraw_account_no=tr["WITHDRAW_ACCOUNT_NO"],
        withdraw_bank_cd=tr["WITHDRAW_BANK_CD"],
        withdraw_bank_name=tr["WITHDRAW_BANK_NAME"],
        withdraw_holder_name=tr["WITHDRAW_HOLDER_NAME"],
        deposit_account_no=tr["DEPOSIT_ACCOUNT_NO"],
        deposit_bank_cd=tr["DEPOSIT_BANK_CD"],
        deposit_bank_name=tr["DEPOSIT_BANK_NAME"],
        deposit_holder_name=tr["DEPOSIT_HOLDER_NAME"],
        amount=int(tr["TRANSFER_AMOUNT"] or 0),
        fee=int(tr["FEE"] or 0),
        memo=tr["TRANSFER_MEMO"],
        request_dt=_parse_dt(tr["REQUEST_DATETIME"]),
        complete_dt=_parse_dt(tr["COMPLETE_DATETIME"]),
        transfer_type_cd=tr["TRANSFER_TYPE_CD"],
        transfer_status_cd=tr["TRANSFER_STATUS_CD"],
        counterpart_approval_no=tr["COUNTERPART_APPROVAL_NO"],
    )