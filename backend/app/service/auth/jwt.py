"""JWT 발급/검증 (HS256, settings.JWT_SECRET / JWT_ALGORITHM / JWT_EXPIRE_MINUTES)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt as pyjwt
from jwt import ExpiredSignatureError, InvalidTokenError

from ...config import settings
from ...errors import E_UNAUTHORIZED
from ...exceptions import AuthError


def issue_access_token(customer_no: int) -> tuple[str, int]:
    """JWT 발급. 반환: (token, expires_in_seconds)."""
    now = datetime.now(timezone.utc)
    expires_in = settings.JWT_EXPIRE_MINUTES * 60
    payload = {
        "sub": str(customer_no),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }
    token = pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


def decode_access_token(token: str) -> int:
    """JWT → customer_no. 검증 실패 시 AuthError(E_UNAUTHORIZED)."""
    try:
        payload = pyjwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ExpiredSignatureError as e:
        raise AuthError(E_UNAUTHORIZED, "세션이 만료되었습니다.") from e
    except InvalidTokenError as e:
        raise AuthError(E_UNAUTHORIZED, "유효하지 않은 토큰입니다.") from e

    sub = payload.get("sub")
    if sub is None:
        raise AuthError(E_UNAUTHORIZED, "유효하지 않은 토큰입니다.")
    try:
        return int(sub)
    except (ValueError, TypeError) as e:
        raise AuthError(E_UNAUTHORIZED, "유효하지 않은 토큰입니다.") from e