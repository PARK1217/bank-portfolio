"""인증/가입 스키마 — SCR-AU-001 ~ 012, SCR-SC-002.

⚠️ 인증 세션 보강 (2026-05-20):
- `LoginRequest.user_id` → `email: EmailStr` — DB `CUSTOMER.EMAIL` (UNIQUE
  로그인 ID) 정합. v53 결정 "스키마 = 진리".
- 응답 모델 4개 추가: `SignupTermsResponse`, `SignupAccountResponse`,
  `PasswordChangeResponse`, `SimplePinSetupResponse` — 라우터 구현 차단요소 해소.
  형태는 합리적 default이며 명세서 시트 확정 시 조정 필요.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, EmailStr


# ----------------------------------------------------------------------
# SCR-AU-001 로그인
# ----------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="로그인 ID — CUSTOMER.EMAIL")
    password: str = Field(..., min_length=8, max_length=128)
    device_fingerprint: str | None = Field(
        None, description="브라우저 지문 (미등록 기기 OTP 분기용)"
    )


class LoginResponse(BaseModel):
    access_token: str = Field(..., description="JWT")
    expires_in: int = Field(..., description="JWT 만료 초")
    customer_no: int
    requires_device_otp: bool = Field(
        False, description="신규 기기 → 추가 OTP 인증 필요"
    )
    account_tokens: list[str] = Field(
        default_factory=list,
        description="로그인 시 본인 보유 계좌 accountToken 일괄 발급 (sheet 02)",
    )


# ----------------------------------------------------------------------
# SCR-AU-002 약관 동의
# ----------------------------------------------------------------------

class TermsAgreement(BaseModel):
    terms_id: int
    version: int
    agreed: bool


class SignupTermsRequest(BaseModel):
    agreements: list[TermsAgreement]


class SignupTermsResponse(BaseModel):
    agreed_count: int = Field(..., description="동의 처리된 약관 개수")


# ----------------------------------------------------------------------
# SCR-AU-003 본인인증
# ----------------------------------------------------------------------

class SignupVerifyRequest(BaseModel):
    resident_no: str = Field(..., description="900101-1234567 형식")
    phone: str
    otp_code: str = Field(..., min_length=4, max_length=8)


class SignupVerifyResponse(BaseModel):
    verification_id: str = Field(..., description="다음 단계까지 유지되는 임시 ID")
    party_id: int


# ----------------------------------------------------------------------
# SCR-AU-004 계정정보
# ----------------------------------------------------------------------

class SignupAccountRequest(BaseModel):
    verification_id: str
    password: str = Field(..., min_length=8, max_length=128)
    password_confirm: str
    email: EmailStr = Field(..., description="로그인 ID로 사용 — CUSTOMER.EMAIL UNIQUE")
    address_main: str
    address_detail: str | None = None
    zip_code: str | None = None
    phone_main: str


class SignupAccountResponse(BaseModel):
    """가입 완료 시 자동 로그인 — JWT 즉시 발급."""
    customer_no: int
    access_token: str = Field(..., description="JWT")
    expires_in: int


# ----------------------------------------------------------------------
# SCR-AU-008 간편비밀번호
# ----------------------------------------------------------------------

class SimplePinSetupRequest(BaseModel):
    pin: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    pin_confirm: str = Field(..., min_length=6, max_length=6)


class SimplePinSetupResponse(BaseModel):
    success: bool = True


# ----------------------------------------------------------------------
# SCR-AU-010 OTP 등록  (Signature)
# ----------------------------------------------------------------------

class OtpSetupInitResponse(BaseModel):
    secret: str = Field(..., description="TOTP 시크릿 (Base32)")
    otpauth_uri: str = Field(..., description="QR 인코딩 대상 URI")


class OtpSetupVerifyRequest(BaseModel):
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


# ----------------------------------------------------------------------
# SCR-SC-002 비밀번호 변경
# ----------------------------------------------------------------------

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    new_password_confirm: str


class PasswordChangeResponse(BaseModel):
    """변경 성공 — 모든 단기 토큰 폐기 + JWT 재발급 필요."""
    revoked_tokens: int = Field(0, description="폐기된 단기 토큰 개수")
    requires_relogin: bool = Field(True, description="JWT 재발급 필요")


# ----------------------------------------------------------------------
# SCR-AU-012 로그아웃 — body 없음
# ----------------------------------------------------------------------

class LogoutResponse(BaseModel):
    revoked_tokens: int = Field(0, description="해당 고객의 단기 토큰 폐기 개수")