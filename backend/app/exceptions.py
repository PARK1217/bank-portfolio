"""예외 계층 (가이드라인 §3.2).

사용 예:
    from app import errors
    from app.exceptions import BusinessError

    raise BusinessError(
        errors.E_BALANCE_INSUFFICIENT,
        "잔액이 부족합니다.",
        details={"balance": 1000, "amount": 5000},
    )

`details`는 내부 로그 전용. 응답 본문에는 노출되지 않는다(글로벌 핸들러 참조).
"""

from __future__ import annotations


class BankingException(Exception):
    """모든 비즈니스 예외의 부모."""

    default_http_status: int = 500

    def __init__(
        self,
        code: str,
        message: str,
        *,
        http_status: int | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message
        self.http_status = http_status if http_status is not None else self.default_http_status
        self.details = details


class BusinessError(BankingException):
    """비즈니스 룰 위반 (잔액 부족, 한도 초과 등)."""

    default_http_status = 422


class AuthError(BankingException):
    """인증/권한 실패."""

    default_http_status = 401


class NotFoundError(BankingException):
    """자원 없음. 가이드 §3.6에 따라 본인 외 접근도 동일하게 404로 응답."""

    default_http_status = 404


class ConflictError(BankingException):
    """중복/충돌 (멱등성 충돌, 동시 수정 등)."""

    default_http_status = 409


class ExternalError(BankingException):
    """외부 시스템 오류 (LLM, 마이데이터, 결제망)."""

    default_http_status = 502


# 빌트인 `SystemError`와 이름 충돌을 피하기 위해 `InternalError`로 둔다.
class InternalError(BankingException):
    """DB 등 내부 시스템 오류."""

    default_http_status = 500