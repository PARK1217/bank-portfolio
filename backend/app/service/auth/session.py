"""JWT jti 블랙리스트 — 로그아웃 즉시 무효화.

JWT 는 본질적으로 stateless 라 만료 전까지 유효. 로그아웃 후에도 토큰 캡처해 둔
공격자가 me / 보호 라우트 호출 가능한 문제를 막기 위해, 로그아웃 시 토큰의 jti 를
블랙리스트(set) 에 적재하고 인증 의존성에서 매 호출 체크한다.

저장: in-memory. backend 컨테이너 reload 시 무효화됨 — 운영은 redis 또는
CUSTOMER_SESSION 류 테이블로 영구화 필요. 시연 환경에서는 reload 시 어차피
브라우저가 다시 로그인하므로 영향 없음.

정리: revoke 시 (jti, exp_ts) 튜플로 저장 → 호출마다 만료된 항목 lazy 삭제.
"""

from __future__ import annotations

import time
from threading import Lock

# {jti: exp_epoch_sec} — exp 지난 항목은 lazy 정리
_blacklist: dict[str, int] = {}
_lock = Lock()


def revoke_jti(jti: str, exp_epoch_sec: int) -> None:
    if not jti:
        return
    with _lock:
        _blacklist[jti] = int(exp_epoch_sec)


def is_jti_revoked(jti: str) -> bool:
    if not jti:
        return False
    now = int(time.time())
    with _lock:
        exp = _blacklist.get(jti)
        if exp is None:
            return False
        if exp < now:
            _blacklist.pop(jti, None)
            return False
        return True


def _purge_expired() -> int:
    """주기적 정리용 — 현재는 lazy 정리로 충분하지만 테스트/관측을 위해 노출."""
    now = int(time.time())
    with _lock:
        stale = [k for k, v in _blacklist.items() if v < now]
        for k in stale:
            _blacklist.pop(k, None)
        return len(stale)
