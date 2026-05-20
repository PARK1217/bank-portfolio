"""단기 식별자 토큰 서비스 — 02_보안정책 시트 / 가이드 §3.6.

목적
----
민감 식별자(계좌번호 / 거래ID / 대출계약번호 / 대출신청ID / 자동이체ID / 민원ID
 / 기기ID / 약관조항ID / 분석세션ID)의 URL 직접 노출 방지.

정책
----
- 토큰 형식 : UUID v4 (충분한 무작위성)
- TTL      : 기본 1시간, 활동(resolve) 시 자동 갱신(rolling)
- 저장     : Redis ("token:<uuid>" → JSON payload)
- 본인 검증 : JWT 의 customer_no 와 토큰 payload 의 customer_no 이중 검증
- 실패 응답 : *호출 측에서* 404 변환 — 본 모듈은 None 반환만 함
              (403 X — 자원 존재 여부 비공개 정책)
- 폐기     : 로그아웃 / 비밀번호 변경 시 해당 고객의 모든 토큰 revoke

의존
----
저장소는 `TokenStore` Protocol 로 추상화. 운영용은 `RedisTokenStore`(redis.asyncio).
테스트에선 in-memory dict 어댑터로 대체 가능.

requirements.txt 추가 필요(인프라 세션 결과에 합류)
    redis>=5.0
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import AsyncIterator, Protocol


# ----------------------------------------------------------------------
# 도메인 상수 — sheet 02 의 토큰 종류와 1:1 매핑
# ----------------------------------------------------------------------

class ResourceType:
    ACCOUNT = "ACCOUNT"   # 계좌번호  → accountToken
    TX      = "TX"        # 거래ID    → txToken
    LOAN    = "LOAN"      # 대출계약번호 → loanToken
    APP     = "APP"       # 대출신청ID → appToken
    AUTO    = "AUTO"      # 자동이체ID → autoToken
    CM      = "CM"        # 민원ID    → cmToken
    DEVICE  = "DEVICE"    # 기기ID    → deviceToken
    DOC     = "DOC"       # 약관/조항ID → docToken
    SESSION = "SESSION"   # 분석/챗봇 세션ID → sessionId


@dataclass(frozen=True)
class TokenPayload:
    """토큰이 매핑하는 실제 자원 정보."""
    resource_type: str
    resource_id: str
    customer_no: int


# ----------------------------------------------------------------------
# 저장소 추상화 — Redis 미설치 환경/테스트에서 대체 가능
# ----------------------------------------------------------------------

class TokenStore(Protocol):
    """비동기 Key-Value 저장소 인터페이스 (Redis 호환 부분집합)."""

    async def setex(self, key: str, ttl: int, value: str) -> None: ...
    async def get(self, key: str) -> str | None: ...
    async def delete(self, key: str) -> None: ...
    def scan_iter(self, match: str) -> AsyncIterator[str]: ...  # async generator


class InMemoryTokenStore:
    """테스트용 in-memory 어댑터 (TTL 무시, 단순 dict).

    실제 TTL/롤링은 운영 환경의 Redis 에서만 검증됨.
    """

    def __init__(self) -> None:
        self._d: dict[str, str] = {}

    async def setex(self, key: str, ttl: int, value: str) -> None:  # noqa: ARG002
        self._d[key] = value

    async def get(self, key: str) -> str | None:
        return self._d.get(key)

    async def delete(self, key: str) -> None:
        self._d.pop(key, None)

    async def scan_iter(self, match: str) -> AsyncIterator[str]:
        prefix = match.rstrip("*")
        for k in list(self._d.keys()):
            if k.startswith(prefix):
                yield k


# ----------------------------------------------------------------------
# 메인 서비스
# ----------------------------------------------------------------------

KEY_PREFIX = "token:"
DEFAULT_TTL_SECONDS = 3600  # 1시간


class TokenService:
    """단기 토큰 발급·해제·검증.

    사용 예
    -------
        # 로그인 시
        token = await tokens.issue(ResourceType.ACCOUNT, "110-001-100001", customer_no=42)
        # → 클라이언트엔 토큰만 전달

        # 보호 라우트에서
        payload = await tokens.resolve(token, customer_no=42, expected_type=ResourceType.ACCOUNT)
        if payload is None:
            raise NotFoundError("E_NOT_FOUND")
        real_account_no = payload.resource_id
    """

    def __init__(self, store: TokenStore, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
        self._store = store
        self._ttl = ttl_seconds

    # ---- issue / resolve ----------------------------------------------

    async def issue(self, resource_type: str, resource_id: str, customer_no: int) -> str:
        token = str(uuid.uuid4())
        payload = json.dumps(
            {
                "resource_type": resource_type,
                "resource_id": str(resource_id),
                "customer_no": int(customer_no),
            },
            separators=(",", ":"),
        )
        await self._store.setex(self._k(token), self._ttl, payload)
        return token

    async def resolve(
        self,
        token: str,
        customer_no: int,
        expected_type: str | None = None,
    ) -> TokenPayload | None:
        """본인 검증 + (선택) 타입 검증. 실패 시 None — 호출 측이 404 변환.

        활동 시 TTL 롤링(다시 setex)으로 사용자 세션 유지.
        """
        if not token:
            return None
        raw = await self._store.get(self._k(token))
        if raw is None:
            return None
        try:
            data = json.loads(raw)
            payload = TokenPayload(
                resource_type=data["resource_type"],
                resource_id=data["resource_id"],
                customer_no=int(data["customer_no"]),
            )
        except (ValueError, KeyError, TypeError):
            return None

        # 본인 검증 — JWT 고객번호와 매핑 고객번호 이중 검증
        if payload.customer_no != int(customer_no):
            return None
        if expected_type and payload.resource_type != expected_type:
            return None

        # TTL 롤링
        await self._store.setex(self._k(token), self._ttl, raw)
        return payload

    # ---- revoke -------------------------------------------------------

    async def revoke(self, token: str) -> None:
        await self._store.delete(self._k(token))

    async def revoke_all_for_customer(self, customer_no: int) -> int:
        """비밀번호 변경 / 로그아웃 시 해당 고객 토큰 일괄 폐기.

        주의: 전체 키 스캔이라 운영 환경에선 비용 발생.
              대규모 환경에선 customer 별 인덱스 set 을 별도 운영하는 게 안전.
        """
        target = int(customer_no)
        deleted = 0
        async for key in self._store.scan_iter(match=f"{KEY_PREFIX}*"):
            raw = await self._store.get(key)
            if not raw:
                continue
            try:
                if int(json.loads(raw).get("customer_no", -1)) == target:
                    await self._store.delete(key)
                    deleted += 1
            except (ValueError, TypeError):
                continue
        return deleted

    # ---- internal -----------------------------------------------------

    @staticmethod
    def _k(token: str) -> str:
        return f"{KEY_PREFIX}{token}"


# ----------------------------------------------------------------------
# Redis 어댑터 — 운영용
# ----------------------------------------------------------------------

class RedisTokenStore:
    """redis.asyncio.Redis 어댑터.

    사용 예
    -------
        from redis.asyncio import Redis
        from .token import TokenService, RedisTokenStore

        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        tokens = TokenService(RedisTokenStore(redis))
    """

    def __init__(self, redis_client) -> None:  # redis.asyncio.Redis
        self._r = redis_client

    async def setex(self, key: str, ttl: int, value: str) -> None:
        await self._r.setex(key, ttl, value)

    async def get(self, key: str) -> str | None:
        v = await self._r.get(key)
        return v.decode() if isinstance(v, (bytes, bytearray)) else v

    async def delete(self, key: str) -> None:
        await self._r.delete(key)

    async def scan_iter(self, match: str) -> AsyncIterator[str]:
        async for key in self._r.scan_iter(match=match):
            yield key.decode() if isinstance(key, (bytes, bytearray)) else key