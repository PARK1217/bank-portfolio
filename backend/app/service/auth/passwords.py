"""bcrypt 비밀번호 해싱/검증 (가이드 §3.6 — cost=12)."""

from __future__ import annotations

import bcrypt

_BCRYPT_ROUNDS = 12


def hash_password(plain: str) -> str:
    """평문 → bcrypt 해시 (str)."""
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """평문 vs 저장된 해시. 입력이 비었거나 해시 형식이 잘못되면 False."""
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False