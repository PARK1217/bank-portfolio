"""비밀번호 찾기·재설정 라우터 — SC-AU-011.

흐름 (3단계, 비로그인 접근):
  1) POST /api/password/reset/init
       입력: email + name + birth_date(YYYYMMDD) + carrier + phone
       동작: 이메일 → CUSTOMER 매칭 후 PARTY.PARTY_NAME + INDIVIDUAL_PARTY.BIRTH_DATE
             + CUSTOMER_CONTACT 주연락처 휴대폰 4단 매칭. 모든 필드 일치해야 통과.
             통신사(carrier) 는 시드/운영 모두 인증사(NICE/PASS/KMC) 에 위임하는 정보이며
             현 백엔드에서는 보관·로깅 용도로만 수용 (운영 전환 시 검증 단계 추가).
             mock SMS 전송 — 실제 발송은 본인인증사 연동 자리 placeholder.
       응답: {sent: true}
             ※ 인증번호 본문 노출은 보안 사고 위험으로 제거. mock 번호 "123456" 은
                화면이 자체적으로 안내 (운영 전환 시 그 안내만 제거).

  2) POST /api/password/reset/verify
       입력: email + auth_code  (mock: "123456")
       시도 제한: 한 init 세션당 5회. 초과 시 폐기 후 재시작 강제.
       응답: {verification_id} — 다음 단계 토큰 (in-memory, TTL 30분)

  3) POST /api/password/reset
       입력: verification_id + new_password + new_password_confirm
       동작: CUSTOMER.PASSWORD bcrypt UPDATE + 해당 customer 의 모든 JWT 일괄 폐기.
             모든 단기 토큰(account/auto-transfer)도 함께 정리하면 더 좋지만
             현 라우트는 비로그인 흐름이라 TokenService 가 없으므로 JWT 만 처리.
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
from ..service.auth.session import revoke_all_for_customer

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
    attempts: int  # 인증번호 시도 횟수 (MAX_VERIFY_ATTEMPTS 초과 시 폐기)


class _Verified(TypedDict):
    customer_no: int
    expires_at: datetime


_pending: dict[str, _PendingIdent] = {}      # key = email (소문자) → 본인인증 요청 임시 저장
_verified: dict[str, _Verified] = {}          # key = verification_id → 새 비번 단계로 넘기는 토큰
_TTL = timedelta(minutes=30)
_MOCK_AUTH_CODE = "123456"
MAX_VERIFY_ATTEMPTS = 5

# 운영 본인인증 인증사 — UI/로그 식별 용도. 운영 전환 시 실제 SDK 호출로 대체.
_KNOWN_CARRIERS = {"SKT", "KT", "LGU", "MVNO"}


def _now() -> datetime:
    return datetime.now()


def _norm_email(email: str) -> str:
    return email.strip().lower()


def _norm_birth(birth: str) -> str:
    return "".join(ch for ch in birth if ch.isdigit())


# ---------------------------------------------------------------------------
# 스키마
# ---------------------------------------------------------------------------

class ResetInitRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100, description="가입 시 등록 이름")
    birth_date: str = Field(
        ...,
        min_length=8,
        max_length=10,
        description="YYYYMMDD 또는 YYYY-MM-DD",
    )
    carrier: str = Field(
        ...,
        description="이동통신사 — SKT/KT/LGU/MVNO. 운영은 인증사가 직접 검증, 현 백엔드는 로깅만.",
    )
    phone: str = Field(..., description="등록 휴대폰 — 숫자만 또는 하이픈 포함")


class ResetInitResponse(BaseModel):
    sent: bool = True


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
    revoked_sessions: int = Field(0, description="비번 변경으로 폐기된 활성 JWT 개수")


# ---------------------------------------------------------------------------
# 1) 본인 확인 시작
# ---------------------------------------------------------------------------

@router.post("/reset/init", response_model=ResetInitResponse)
async def reset_init(req: ResetInitRequest) -> ResetInitResponse:
    email = _norm_email(req.email)
    phone_digits = "".join(ch for ch in req.phone if ch.isdigit())
    birth_digits = _norm_birth(req.birth_date)
    name = req.name.strip()
    carrier = req.carrier.strip().upper()

    if len(birth_digits) != 8:
        raise BusinessError(E_VALIDATION, "생년월일은 YYYYMMDD 형식으로 입력해주세요.")
    if carrier not in _KNOWN_CARRIERS:
        raise BusinessError(E_VALIDATION, "지원하지 않는 통신사예요.")

    # 사용자 열거 공격 방지 — 본인 정보 불일치 응답을 단일 메시지로 통일.
    fail_msg = "입력하신 정보와 일치하는 계정을 찾을 수 없어요."

    pool = get_pool()
    async with pool.acquire() as conn:
        # 이메일 + 이름 + 생년월일 4단 매칭 (휴대폰은 별도 검증).
        row = await conn.fetchrow(
            'SELECT c."CUSTOMER_NO", p."PARTY_NAME", ip."BIRTH_DATE" '
            'FROM public."CUSTOMER" c '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'LEFT JOIN public."INDIVIDUAL_PARTY" ip ON ip."PARTY_ID" = c."PARTY_ID" '
            'WHERE c."EMAIL" = $1 AND c."DELETE_YN" = \'N\'',
            email,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, fail_msg)
        if not row["PARTY_NAME"] or row["PARTY_NAME"].strip() != name:
            raise NotFoundError(E_NOT_FOUND, fail_msg)
        if not row["BIRTH_DATE"] or row["BIRTH_DATE"] != birth_digits:
            raise NotFoundError(E_NOT_FOUND, fail_msg)

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
            raise BusinessError(
                E_VALIDATION,
                "가입 시 등록된 휴대폰 정보가 없어요. 영업점에서 본인 확인이 필요합니다.",
            )
        if contact_digits != phone_digits:
            raise NotFoundError(E_NOT_FOUND, fail_msg)

    _pending[email] = _PendingIdent(
        customer_no=int(row["CUSTOMER_NO"]),
        email=email,
        phone=phone_digits,
        expires_at=_now() + _TTL,
        attempts=0,
    )
    log.info(
        "password_reset_init",
        customer_no=int(row["CUSTOMER_NO"]),
        phone=phone_digits,
        carrier=carrier,
    )
    # mock SMS — 실제 발송 없음. 운영 전환 자리에 인증사 SDK 호출.
    # 인증번호 본문 노출은 제거(보안). 화면이 자체적으로 mock 안내(123456) 표시.
    return ResetInitResponse(sent=True)


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

    sess["attempts"] += 1
    if sess["attempts"] > MAX_VERIFY_ATTEMPTS:
        _pending.pop(email, None)
        raise BusinessError(
            E_VALIDATION,
            f"인증번호를 {MAX_VERIFY_ATTEMPTS}회 이상 잘못 입력해 본인 확인이 차단됐어요. 처음부터 다시 시도해 주세요.",
        )

    if req.auth_code != _MOCK_AUTH_CODE:
        remaining = MAX_VERIFY_ATTEMPTS - sess["attempts"]
        raise BusinessError(
            E_VALIDATION,
            f"인증번호가 올바르지 않아요. (남은 시도 {max(remaining, 0)}회)",
        )

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
        # 비번 재설정과 함께 로그인 잠금 해제: LOGIN_FAIL_COUNT=0 + 5052(잠금)→5050(정상) 복원.
        await conn.execute(
            'UPDATE public."CUSTOMER" '
            'SET "PASSWORD" = $1, '
            '    "LOGIN_FAIL_COUNT" = 0, '
            '    "CUST_STATUS_CD" = CASE WHEN "CUST_STATUS_CD" = \'5052\' '
            '                            THEN \'5050\' ELSE "CUST_STATUS_CD" END, '
            '    "UPDATED_AT" = NOW() '
            'WHERE "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
            hash_password(req.new_password),
            sess["customer_no"],
        )

    # 비번이 바뀌었으니 발급된 모든 활성 JWT 를 즉시 무효화 — 캡처된 토큰 차단.
    revoked = revoke_all_for_customer(sess["customer_no"])
    _verified.pop(req.verification_id, None)
    log.info(
        "password_reset_done",
        customer_no=sess["customer_no"],
        revoked_sessions=revoked,
    )
    return ResetResponse(success=True, revoked_sessions=revoked)
