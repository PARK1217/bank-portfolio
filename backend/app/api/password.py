"""비밀번호 찾기·재설정 라우터 — SC-AU-011.

흐름 (3단계, 비로그인 접근):
  1) POST /api/password/reset/init
       입력: email + phone
       동작: 이메일로 CUSTOMER 존재 확인 + 휴대폰 매칭 검증
             mock SMS 전송 — 운영은 본인인증사 연동 (NICE, PASS, KMC 등)
       응답: {sent: true, dev_auth_code: "123456"}
             dev_auth_code 는 mock 임시 노출용 — 운영 전환 시 제거

  2) POST /api/password/reset/verify
       입력: email + auth_code  (mock: "123456")
       응답: {verification_id} — 다음 단계 토큰 (in-memory, TTL 30분)

  3) POST /api/password/reset
       입력: verification_id + new_password + new_password_confirm
       동작: CUSTOMER.PASSWORD bcrypt UPDATE + 단기 토큰 폐기는 별도 작업
       응답: {success}

본인인증(SMS 인증번호)은 mock — 운영은 본인인증사 연동(NICE, PASS, 공동인증서 등).
"인증번호"는 *계정 비밀번호와도, 인증앱 OTP(TOTP) 와도 분리* — 분실 시 영업점 방문 없이
휴대폰 본인인증만으로 재설정 가능해야 함.
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
_MOCK_AUTH_CODE = "123456"


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


class ResetInitResponse(BaseModel):
    sent: bool = True
    dev_auth_code: str | None = Field(
        default=None,
        description="mock SMS 미발송 환경에서 화면에 노출하기 위한 임시 인증번호. 운영 전환 시 제거.",
    )


class ResetVerifyRequest(BaseModel):
    email: EmailStr
    auth_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


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

    pool = get_pool()
    async with pool.acquire() as conn:
        # 이메일 → CUSTOMER 매칭
        row = await conn.fetchrow(
            'SELECT "CUSTOMER_NO" FROM public."CUSTOMER" '
            'WHERE "EMAIL" = $1 AND "DELETE_YN" = \'N\'',
            email,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "입력하신 정보와 일치하는 계정을 찾을 수 없어요.")

        # 휴대폰 매칭 — CUSTOMER_CONTACT 주연락처
        # 시드는 'MOBILE', signup 라우터는 'PHONE' 으로 저장 중이라 둘 다 허용.
        contact = await conn.fetchval(
            'SELECT "CONTACT_VALUE" FROM public."CUSTOMER_CONTACT" '
            "WHERE \"CUSTOMER_NO\" = $1 AND \"CONTACT_TYPE_CD\" IN ('MOBILE','PHONE') "
            "AND \"PRIMARY_YN\" = 'Y' AND \"DELETE_YN\" = 'N' "
            'ORDER BY "CONTACT_SEQ" LIMIT 1',
            row["CUSTOMER_NO"],
        )
        contact_digits = "".join(ch for ch in (contact or "") if ch.isdigit())
        if not contact_digits:
            raise BusinessError(E_VALIDATION, "가입 시 등록된 휴대폰 정보가 없어요. 영업점에서 본인 확인이 필요합니다.")
        if contact_digits != phone_digits:
            raise BusinessError(E_VALIDATION, "입력하신 휴대폰이 가입 정보와 달라요.")

    _pending[email] = _PendingIdent(
        customer_no=int(row["CUSTOMER_NO"]),
        email=email,
        phone=phone_digits,
        expires_at=_now() + _TTL,
    )
    log.info("password_reset_init", customer_no=int(row["CUSTOMER_NO"]), phone=phone_digits)
    # mock SMS — 실제 발송 없음. 응답 본문에 dev_auth_code 를 임시 노출해
    # 화면에서 다이얼로그로 보여준다. 운영 전환 시 본인인증사 연동 + 이 필드 제거.
    return ResetInitResponse(sent=True, dev_auth_code=_MOCK_AUTH_CODE)


# ---------------------------------------------------------------------------
# 2) 인증번호 검증 → verification_id 발급
# ---------------------------------------------------------------------------

@router.post("/reset/verify", response_model=ResetVerifyResponse)
async def reset_verify(req: ResetVerifyRequest) -> ResetVerifyResponse:
    email = _norm_email(req.email)
    sess = _pending.get(email)
    if sess is None or _now() > sess["expires_at"]:
        _pending.pop(email, None)
        raise NotFoundError(E_NOT_FOUND, "본인 확인 정보가 만료되었어요. 처음부터 다시 시도해 주세요.")

    if req.auth_code != _MOCK_AUTH_CODE:
        raise BusinessError(E_VALIDATION, "인증번호가 올바르지 않아요.")

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