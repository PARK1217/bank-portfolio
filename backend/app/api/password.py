"""비밀번호 찾기·재설정 라우터 — SC-AU-011.

흐름 (3단계, 비로그인 접근):
  1) POST /api/password/reset/init
       입력: email + phone + resident_no(앞 6자리 또는 13자리)
       동작: 이메일로 CUSTOMER 존재 확인 + 휴대폰/주민번호 매칭 검증
             mock SMS 전송 — 운영은 OTP 인증사 연동 (NICE, KCB 등)
       응답: {sent: true}

  2) POST /api/password/reset/verify
       입력: email + otp_code  (mock: "123456")
       응답: {verification_id} — 다음 단계 토큰 (in-memory, TTL 30분)

  3) POST /api/password/reset
       입력: verification_id + new_password + new_password_confirm
       동작: CUSTOMER.PASSWORD bcrypt UPDATE + 단기 토큰 폐기는 별도 작업
       응답: {success}

OTP 인증/주민번호 매칭은 mock — 운영은 본인인증 인증사 연동(NICE, PASS, 공동인증서 등).
계정 비밀번호는 *OTP(TOTP) 와 분리* — 분실 시 영업점 방문 없이 본인인증만으로 재설정 가능해야 함.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import TypedDict

import structlog
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError
from ..service.auth.passwords import hash_password

router = APIRouter(prefix="/password", tags=["password"])
log = structlog.get_logger("password")


# ---------------------------------------------------------------------------
# in-memory 세션 (운영은 Redis 권장)
# ---------------------------------------------------------------------------

class _PendingIdent(TypedDict):
    customer_no: int
    email: str
    phone: str
    expires_at: datetime


class _Verified(TypedDict):
    customer_no: int
    expires_at: datetime


_pending: dict[str, _PendingIdent] = {}      # key = email (소문자) → 본인인증 요청 임시 저장
_verified: dict[str, _Verified] = {}          # key = verification_id → 새 비번 단계로 넘기는 토큰
_TTL = timedelta(minutes=30)
_MOCK_OTP_CODE = "123456"


def _now() -> datetime:
    return datetime.now()


def _norm_email(email: str) -> str:
    return email.strip().lower()


# ---------------------------------------------------------------------------
# 스키마
# ---------------------------------------------------------------------------

class ResetInitRequest(BaseModel):
    email: EmailStr
    phone: str = Field(..., description="등록 휴대폰 — 숫자만 또는 하이픈 포함")
    resident_no: str = Field(
        ...,
        description="주민번호 — 앞 6자리 또는 13자리(하이픈 포함 가능)",
    )


class ResetInitResponse(BaseModel):
    sent: bool = True


class ResetVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResetVerifyResponse(BaseModel):
    verification_id: str


class ResetRequest(BaseModel):
    verification_id: str
    new_password: str = Field(..., min_length=8, max_length=128)
    new_password_confirm: str


class ResetResponse(BaseModel):
    success: bool = True


# ---------------------------------------------------------------------------
# 1) 본인 확인 시작
# ---------------------------------------------------------------------------

@router.post("/reset/init", response_model=ResetInitResponse)
async def reset_init(req: ResetInitRequest) -> ResetInitResponse:
    email = _norm_email(req.email)
    phone_digits = "".join(ch for ch in req.phone if ch.isdigit())
    resident_digits = "".join(ch for ch in req.resident_no if ch.isdigit())
    if len(resident_digits) not in (6, 13):
        raise BusinessError(E_VALIDATION, "주민번호는 앞 6자리 또는 13자리로 입력해 주세요.")

    pool = get_pool()
    async with pool.acquire() as conn:
        # 이메일 → CUSTOMER · PARTY 매칭
        row = await conn.fetchrow(
            'SELECT c."CUSTOMER_NO", c."PARTY_ID", p."PARTY_ID_NO" '
            'FROM public."CUSTOMER" c '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE c."EMAIL" = $1 AND c."DELETE_YN" = \'N\'',
            email,
        )
        if row is None:
            # 회원 정보 노출 방지를 위해 일부러 모호한 메시지를 쓰는 정책도 있지만,
            # 데모에서는 사용자 친화적으로 명시한다.
            raise NotFoundError(E_NOT_FOUND, "입력하신 정보와 일치하는 계정을 찾을 수 없어요.")

        # 휴대폰 매칭 — CUSTOMER_CONTACT 주연락처
        contact = await conn.fetchval(
            'SELECT "CONTACT_VALUE" FROM public."CUSTOMER_CONTACT" '
            "WHERE \"CUSTOMER_NO\" = $1 AND \"CONTACT_TYPE_CD\" = 'PHONE' "
            "AND \"PRIMARY_YN\" = 'Y' AND \"DELETE_YN\" = 'N' "
            'ORDER BY "CONTACT_SEQ" LIMIT 1',
            row["CUSTOMER_NO"],
        )
        contact_digits = "".join(ch for ch in (contact or "") if ch.isdigit())
        if contact_digits and contact_digits != phone_digits:
            raise BusinessError(E_VALIDATION, "입력하신 휴대폰이 가입 정보와 달라요.")

        # 주민번호 매칭 — PARTY_ID_NO 앞 6자리 또는 전체
        party_id_no = row["PARTY_ID_NO"] or ""
        party_digits = "".join(ch for ch in party_id_no if ch.isdigit())
        if party_digits:
            if len(resident_digits) == 6 and party_digits[:6] != resident_digits:
                raise BusinessError(E_VALIDATION, "주민번호 앞자리가 일치하지 않아요.")
            if len(resident_digits) == 13 and party_digits != resident_digits:
                raise BusinessError(E_VALIDATION, "주민번호가 일치하지 않아요.")

    _pending[email] = _PendingIdent(
        customer_no=int(row["CUSTOMER_NO"]),
        email=email,
        phone=phone_digits,
        expires_at=_now() + _TTL,
    )
    log.info("password_reset_init", customer_no=int(row["CUSTOMER_NO"]))
    # mock SMS — 실제 발송 없음. 사용자 화면은 OTP "123456" 으로 통과한다.
    return ResetInitResponse(sent=True)


# ---------------------------------------------------------------------------
# 2) OTP 검증 → verification_id 발급
# ---------------------------------------------------------------------------

@router.post("/reset/verify", response_model=ResetVerifyResponse)
async def reset_verify(req: ResetVerifyRequest) -> ResetVerifyResponse:
    email = _norm_email(req.email)
    sess = _pending.get(email)
    if sess is None or _now() > sess["expires_at"]:
        _pending.pop(email, None)
        raise NotFoundError(E_NOT_FOUND, "본인 확인 정보가 만료되었어요. 처음부터 다시 시도해 주세요.")

    if req.otp_code != _MOCK_OTP_CODE:
        raise BusinessError(E_VALIDATION, "OTP 코드가 올바르지 않아요.")

    vid = str(uuid.uuid4())
    _verified[vid] = _Verified(
        customer_no=sess["customer_no"],
        expires_at=_now() + _TTL,
    )
    _pending.pop(email, None)
    log.info("password_reset_verified", customer_no=sess["customer_no"])
    return ResetVerifyResponse(verification_id=vid)


# ---------------------------------------------------------------------------
# 3) 새 비밀번호 설정
# ---------------------------------------------------------------------------

@router.post("/reset", response_model=ResetResponse)
async def reset_password(req: ResetRequest) -> ResetResponse:
    if req.new_password != req.new_password_confirm:
        raise BusinessError(E_VALIDATION, "새 비밀번호 확인이 일치하지 않아요.")

    sess = _verified.get(req.verification_id)
    if sess is None or _now() > sess["expires_at"]:
        _verified.pop(req.verification_id, None)
        raise NotFoundError(E_NOT_FOUND, "본인 확인 토큰이 만료되었어요. 처음부터 다시 시도해 주세요.")

    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE public."CUSTOMER" '
            'SET "PASSWORD" = $1, "UPDATED_AT" = NOW() '
            'WHERE "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
            hash_password(req.new_password),
            sess["customer_no"],
        )

    _verified.pop(req.verification_id, None)
    log.info("password_reset_done", customer_no=sess["customer_no"])
    return ResetResponse(success=True)