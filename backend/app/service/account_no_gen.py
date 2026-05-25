"""ACCOUNT_NO 생성기 — `110-200-{6자리 random}` 통일 형식.

이전 상태: `product_open.py` (SAVING/DEPOSIT/FOREIGN/JOINT/MINOR) 는 `110-200-*` 형식,
`service/account_open.py` (INSTALL) 는 `110-{customer_no}-*` 형식으로 갈렸음.
공통 함수로 통일하여 데이터 일관성 확보 (시드 110-001-* ~ 110-007-* 와 별도 namespace 로 `110-200-*` 사용).
"""

from __future__ import annotations

import secrets

import asyncpg


async def generate_account_no(conn: asyncpg.Connection) -> str:
    """신규 `110-200-{6자리}` ACCOUNT_NO — 중복 회피 단순 retry."""
    for _ in range(10):
        suffix = f"{secrets.randbelow(900_000) + 100_000:06d}"
        candidate = f"110-200-{suffix}"
        exists = await conn.fetchval(
            'SELECT 1 FROM public."ACCOUNT" WHERE "ACCOUNT_NO" = $1',
            candidate,
        )
        if not exists:
            return candidate
    raise RuntimeError("ACCOUNT_NO 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.")