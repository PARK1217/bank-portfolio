"""챗봇 VECTOR tier 응답 캐시 — in-memory LRU + TTL.

배경: `chat_send` 가 매 호출마다 임베딩 → pgvector → LLM 풀체인을 새로 수행.
같은 질문 반복(시연·재현 케이스) 에서 LLM 호출이 전부 신규로 발생 →
1초 내외 지연 + 토큰 비용. RAG 결정적 답변(같은 질문 → 같은 답) 이라는
시연 특성과도 잘 맞음 → 결과 캐시 도입.

캐시 정책:
  - 대상: VECTOR tier (LLM 합성) 만. KEYWORD/FAQ tier 는 이미 FAQ 본문 그대로
    반환이라 캐시 의미 없음.
  - 키: f"{audience}|{normalized_question}"  (USER/ADMIN 분리 필수)
        normalize = lower + 양끝 strip + 연속 공백 1개로 압축 + 양끝 !?.… 제거
  - 저장 값: answer, sources_meta(doc_token 제외), retrieved_context_json,
            system_prompt, user_prompt, model_name, prompt_tokens, completion_tokens
            (doc_token 은 본인별이라 호출 시 재발급)
  - 구조: collections.OrderedDict 기반 LRU. maxsize 초과 시 가장 오래된 항목 제거.
  - TTL: 3600초 (1시간). 만료 시 자동 무효화.
  - 무효화: backend 재시작 (FAQ 변경 드뭄). 필요 시 외부에서 `_CACHE.clear()`.

hit 시 호출 측 처리:
  - LLM 호출 스킵
  - AI_LLM_CALL_LOG 에 새 row INSERT (CACHE_HIT_YN='Y', tokens=0, latency=실제)
  - sources 의 doc_token 은 캐시된 doc_id 로 본인 customer_no 별 재발급
"""

from __future__ import annotations

import re
import time
from collections import OrderedDict
from typing import Any, TypedDict


_WS_RE = re.compile(r"\s+")
_TRAILING_PUNCT = "!?.…。"


def normalize_question(q: str) -> str:
    """캐시 키용 정규화. 의미 동일한 짧은 표현 변형을 같은 키로."""
    if not q:
        return ""
    s = _WS_RE.sub(" ", q.strip()).lower()
    while s and s[-1] in _TRAILING_PUNCT:
        s = s[:-1]
    return s.rstrip()


def cache_key(audience: str, question: str) -> str:
    return f"{(audience or 'USER').upper()}|{normalize_question(question)}"


class CachedAnswer(TypedDict):
    answer: str
    sources_meta: list[dict]  # doc_token 제외 [{doc_type,doc_id,title,clause,snippet,score}]
    retrieved_context_json: str  # AI_LLM_CALL_LOG.RETRIEVED_CONTEXT 그대로
    system_prompt: str
    user_prompt: str
    model_name: str
    prompt_tokens: int | None
    completion_tokens: int | None
    confidence: str


class _LRU:
    def __init__(self, maxsize: int = 256, ttl_sec: int = 3600) -> None:
        self.maxsize = maxsize
        self.ttl_sec = ttl_sec
        self._store: OrderedDict[str, tuple[CachedAnswer, float]] = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> CachedAnswer | None:
        item = self._store.get(key)
        if item is None:
            self.misses += 1
            return None
        value, ts = item
        if time.time() - ts > self.ttl_sec:
            self._store.pop(key, None)
            self.misses += 1
            return None
        self._store.move_to_end(key)
        self.hits += 1
        return value

    def put(self, key: str, value: CachedAnswer) -> None:
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (value, time.time())
        while len(self._store) > self.maxsize:
            self._store.popitem(last=False)

    def clear(self) -> None:
        self._store.clear()
        self.hits = 0
        self.misses = 0

    def stats(self) -> dict[str, Any]:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self._store),
            "maxsize": self.maxsize,
            "ttl_sec": self.ttl_sec,
            "hit_rate": round(self.hits / total, 4) if total else 0.0,
        }


# 프로세스 전역 캐시. backend 단일 컨테이너이므로 일관성 OK.
_CACHE = _LRU(maxsize=256, ttl_sec=3600)


def get_cached(audience: str, question: str) -> CachedAnswer | None:
    return _CACHE.get(cache_key(audience, question))


def put_cached(audience: str, question: str, value: CachedAnswer) -> None:
    _CACHE.put(cache_key(audience, question), value)


def cache_stats() -> dict[str, Any]:
    return _CACHE.stats()


def clear_cache() -> None:
    _CACHE.clear()
