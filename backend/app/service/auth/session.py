"""JWT jti 블랙리스트 + 발급 인덱스 — 로그아웃 / 비번 변경 즉시 무효화.

JWT 는 본질적으로 stateless 라 만료 전까지 유효. 로그아웃·비번 변경 후에도
토큰을 캡처해 둔 공격자가 me / 보호 라우트 호출 가능한 문제를 막기 위해:
  - 로그아웃: 해당 토큰의 jti 만 블랙리스트
  - 비번 변경: 해당 customer 가 발급받은 모든 jti 일괄 블랙리스트
인증 의존성에서 매 호출 jti revoke 여부 체크.

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
# {customer_no: {jti: exp_epoch_sec}} — 발급된 활성 토큰 인덱스. customer 단위 일괄 폐기용.
_issued_by_customer: dict[int, dict[str, int]] = {}
_lock = Lock()


def record_issued(jti: str, customer_no: int, exp_epoch_sec: int) -> None:
    """JWT 발급 시점에 (jti, customer_no, exp) 인덱스 적재 — customer 단위 폐기 가능하게."""
    if not jti:
        return
    with _lock:
        _issued_by_customer.setdefault(int(customer_no), {})[jti] = int(exp_epoch_sec)


def revoke_jti(jti: str, exp_epoch_sec: int) -> None:
    if not jti:
        return
    with _lock:
        _blacklist[jti] = int(exp_epoch_sec)


def revoke_all_for_customer(customer_no: int) -> int:
    """특정 customer 가 발급받은 모든 활성 jti 를 블랙리스트에 일괄 적재.

    반환: 폐기된 jti 개수. 비번 변경·보안 사고 응답에 사용.
    """
    now = int(time.time())
    revoked = 0
    with _lock:
        idx = _issued_by_customer.get(int(customer_no))
        if not idx:
            return 0
        for jti, exp in list(idx.items()):
            if exp < now:
                idx.pop(jti, None)
                continue
            _blacklist[jti] = exp
            revoked += 1
        # 인덱스 비우기 — 이후 발급은 다시 채워짐
        _issued_by_customer.pop(int(customer_no), None)
    return revoked


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
        stale_b = [k for k, v in _blacklist.items() if v < now]
        for k in stale_b:
            _blacklist.pop(k, None)
        for cust, idx in list(_issued_by_customer.items()):
            for jti, exp in list(idx.items()):
                if exp < now:
                    idx.pop(jti, None)
            if not idx:
                _issued_by_customer.pop(cust, None)
        return len(stale_b)
