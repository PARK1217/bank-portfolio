"""공통 스키마 — 에러 응답 / 페이지네이션 / 멱등성 헤더 등."""

from __future__ import annotations

from typing import Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


# ----------------------------------------------------------------------
# 에러 응답 — 41_에러코드 시트 / 가이드 §3.2
# ----------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """글로벌 예외 핸들러가 반환하는 통일 응답 포맷.

    ⚠️ 인프라 세션의 글로벌 예외 핸들러와 정렬:
        `{code, message, request_id}` 3필드 고정 (가이드 §3.2 예시와 일치).
        필드 추가 시 핸들러 동시 갱신 필요.
    필드별 검증 실패(E_VALIDATION_FAIL)가 부가 정보 필드를 요구하면
    별도의 `ValidationErrorResponse` 모델을 신설하여 핸들러와 함께 확장.
    """

    code: str = Field(..., examples=["E_BALANCE_INSUFFICIENT"])
    message: str = Field(..., examples=["잔액이 부족합니다."])
    request_id: str | None = Field(None, description="문의 시 참조용 — middleware 가 주입")


# ----------------------------------------------------------------------
# 멱등성 헤더 — 가이드 §3.4
# ----------------------------------------------------------------------

IDEMPOTENCY_HEADER_NAME = "Idempotency-Key"
IDEMPOTENCY_HEADER_DESC = (
    "UUID v4. 동일 키 재호출 시 같은 응답 반환(Idempotent-Replay). "
    "같은 키 + 다른 페이로드 → 409 E_IDEMPOTENCY_CONFLICT."
)


# ----------------------------------------------------------------------
# 페이지네이션
# ----------------------------------------------------------------------

class PaginationQuery(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=200)


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    page: int
    size: int
    total: int
    has_next: bool


# ----------------------------------------------------------------------
# 공용 값 객체
# ----------------------------------------------------------------------

class MaskedAccount(BaseModel):
    """이체 화면 등에서 출력용 — 평문 계좌번호 노출 금지."""

    masked: str = Field(..., examples=["110-001-****01"])
    bank_cd: str | None = None
    bank_name: str | None = None
    holder_name: str | None = None