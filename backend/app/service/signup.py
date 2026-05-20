"""회원가입 백엔드 — AU-002 약관 / AU-003 본인인증 / AU-004 계정 / AU-008 PIN.

흐름:
  1) AU-002 약관 동의 — 검증만 수행 (실제 CUSTOMER_TERMS_AGREE INSERT는 가입 후 보강)
  2) AU-003 본인인증 — mock OTP 검증, PARTY INSERT, verification_id 발급
  3) AU-004 계정정보 — CUSTOMER + CUSTOMER_ADDRESS + CUSTOMER_CONTACT 다중 INSERT 트랜잭션
  4) AU-008 PIN — CUSTOMER.SIMPLE_PIN UPDATE (인증 필요)

verification_id 는 모듈 in-memory dict. 운영은 Redis 권장.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import TypedDict

from ..db import get_pool
from ..errors import (
    E_IDEMPOTENCY_CONFLICT,
    E_NOT_FOUND,
    E_VALIDATION,
)
from ..exceptions import BusinessError, ConflictError, NotFoundError
from .auth.passwords import hash_password


class SignupSessionData(TypedDict):
    party_id: int
    resident_no: str
    phone: str
    verified_at: datetime
    expires_at: datetime


_sessions: dict[str, SignupSessionData] = {}
_SESSION_TTL = timedelta(minutes=30)
_MOCK_OTP_CODE = "123456"  # 데모용 — 운영은 실제 OTP 발송/검증으로 교체


def _now_str() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _today_str() -> str:
    return datetime.now().strftime("%Y%m%d")


# ---------------------------------------------------------------------------
# AU-002 약관 동의 (검증만 — INSERT 는 가입 후 보강)
# ---------------------------------------------------------------------------

def count_agreed(agreements) -> int:
    return sum(1 for a in agreements if a.agreed)


# ---------------------------------------------------------------------------
# AU-003 본인인증
# ---------------------------------------------------------------------------

async def verify_identity(
    resident_no: str,
    phone: str,
    otp_code: str,
) -> tuple[str, int]:
    """mock OTP 검증 → PARTY INSERT(기존 주민번호면 재사용) → verification_id 발급."""
    if otp_code != _MOCK_OTP_CODE:
        raise BusinessError(E_VALIDATION, "OTP 코드가 일치하지 않습니다.")
    if not resident_no or "-" not in resident_no:
        raise BusinessError(E_VALIDATION, "주민번호 형식이 올바르지 않습니다.")
    head, _, tail = resident_no.partition("-")
    if len(head) != 6 or len(tail) < 7:
        raise BusinessError(E_VALIDATION, "주민번호 형식이 올바르지 않습니다.")

    pool = get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            'SELECT "PARTY_ID" FROM public."PARTY" '
            'WHERE "PARTY_ID_NO" = $1 AND "ID_NO_TYPE_CD" = $2 AND "DELETE_YN" = \'N\'',
            resident_no,
            "RRN",
        )
        if existing:
            party_id = int(existing["PARTY_ID"])
        else:
            century = "19" if int(head[:2]) > 25 else "20"
            birth = century + head
            party_id = await conn.fetchval(
                'INSERT INTO public."PARTY" '
                '("PARTY_TYPE_CD", "PARTY_NAME", "PARTY_ID_NO", "ID_NO_TYPE_CD", '
                ' "BIRTH_FOUND_DATE", "DELETE_YN") '
                "VALUES ('PERSON', '미입력', $1, 'RRN', $2, 'N') "
                'RETURNING "PARTY_ID"',
                resident_no,
                birth,
            )

    verification_id = str(uuid.uuid4())
    _sessions[verification_id] = SignupSessionData(
        party_id=int(party_id),
        resident_no=resident_no,
        phone=phone,
        verified_at=datetime.now(),
        expires_at=datetime.now() + _SESSION_TTL,
    )
    return verification_id, int(party_id)


def _resolve_session(verification_id: str) -> SignupSessionData:
    sess = _sessions.get(verification_id)
    if sess is None:
        raise NotFoundError(E_NOT_FOUND, "유효하지 않은 본인인증입니다.")
    if datetime.now() > sess["expires_at"]:
        _sessions.pop(verification_id, None)
        raise NotFoundError(E_NOT_FOUND, "본인인증 세션이 만료되었습니다.")
    return sess


# ---------------------------------------------------------------------------
# AU-004 계정 생성 (다중 INSERT 트랜잭션)
# ---------------------------------------------------------------------------

async def create_account(
    *,
    verification_id: str,
    password: str,
    password_confirm: str,
    email: str,
    address_main: str,
    address_detail: str | None,
    zip_code: str | None,
    phone_main: str,
) -> int:
    if password != password_confirm:
        raise BusinessError(E_VALIDATION, "비밀번호 확인이 일치하지 않습니다.")
    sess = _resolve_session(verification_id)

    pwd_hash = hash_password(password)
    now_str = _now_str()
    today = _today_str()

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            dup = await conn.fetchval(
                'SELECT 1 FROM public."CUSTOMER" '
                'WHERE "EMAIL" = $1 AND "DELETE_YN" = \'N\'',
                email,
            )
            if dup:
                raise ConflictError(
                    E_IDEMPOTENCY_CONFLICT, "이미 사용 중인 이메일입니다."
                )

            customer_no = await conn.fetchval(
                'INSERT INTO public."CUSTOMER" ('
                '  "PARTY_ID", "EMAIL", "PASSWORD", "JOIN_DATETIME", '
                '  "CUST_GRADE_CD", "CUST_STATUS_CD", "PRIVACY_AGREE_YN", "DELETE_YN"'
                ") VALUES ($1, $2, $3, $4, 'G100', '5050', 'Y', 'N') "
                'RETURNING "CUSTOMER_NO"',
                sess["party_id"],
                email,
                pwd_hash,
                now_str,
            )
            await conn.execute(
                'INSERT INTO public."CUSTOMER_ADDRESS" ('
                '  "CUSTOMER_NO", "ADDR_SEQ", "ADDR_TYPE_CD", "POSTAL_CODE", '
                '  "ADDR_LINE1", "ADDR_LINE2", "PRIMARY_YN", "ADDR_START_DATE", "DELETE_YN"'
                ") VALUES ($1, 1, 'HOME', $2, $3, $4, 'Y', $5, 'N')",
                customer_no,
                zip_code,
                address_main,
                address_detail,
                today,
            )
            # CUSTOMER_CONTACT.CONTACT_VALUE 는 varchar(20) — 전화번호만 보관.
            # 이메일은 CUSTOMER.EMAIL 컬럼에 이미 저장됨.
            await conn.execute(
                'INSERT INTO public."CUSTOMER_CONTACT" ('
                '  "CUSTOMER_NO", "CONTACT_SEQ", "CONTACT_TYPE_CD", "CONTACT_VALUE", '
                '  "PRIMARY_YN", "VERIFIED_YN", "CONTACT_REG_DATE", "DELETE_YN"'
                ") VALUES ($1, 1, 'PHONE', $2, 'Y', 'Y', $3, 'N')",
                customer_no,
                phone_main,
                today,
            )

    _sessions.pop(verification_id, None)
    return int(customer_no)


# ---------------------------------------------------------------------------
# AU-008 간편 PIN 설정
# ---------------------------------------------------------------------------

async def set_simple_pin(customer_no: int, pin: str, pin_confirm: str) -> None:
    if pin != pin_confirm:
        raise BusinessError(E_VALIDATION, "PIN 확인이 일치하지 않습니다.")
    pin_hash = hash_password(pin)
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."CUSTOMER" SET "SIMPLE_PIN" = $1, "UPDATED_AT" = NOW() '
            'WHERE "CUSTOMER_NO" = $2',
            pin_hash,
            customer_no,
        )