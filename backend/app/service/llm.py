"""LLM API client — 외부 호스팅 모델 호출 (가이드 §3.7).

Provider 우선순위 (`settings.LLM_PROVIDER`):
  - `groq`      : Llama 3.1 8B Instant (가이드 §0 모델과 호환, 가장 빠름)
  - `mistral`   : open-mistral-7b
  - `huggingface`: meta-llama/Meta-Llama-3.1-8B-Instruct serverless

가이드 §3.7 환각 방지: 호출 측에서 score 가 임계값 미만이면 호출하지 않는다 (본 모듈은 단순 transport).
가이드 §3.7 토큰 모니터링: 응답에 `usage` 가 있으면 로그로 남긴다.
실패 시 None 반환 — 호출 측은 fallback 응답을 사용.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from ..config import settings

log = structlog.get_logger("llm")

_HTTP_TIMEOUT = 15.0


async def chat_completion(
    system_prompt: str, user_prompt: str, *, max_tokens: int = 512
) -> str | None:
    """가용 provider 중 첫 성공을 반환. 모두 실패하면 None."""
    order = _provider_order()
    for provider in order:
        try:
            text = await _call(provider, system_prompt, user_prompt, max_tokens)
            if text:
                return text.strip()
        except Exception:
            log.exception("llm_call_failed", provider=provider)
    return None


def _provider_order() -> list[str]:
    primary = (settings.LLM_PROVIDER or "groq").lower()
    candidates = [primary, "groq", "mistral", "huggingface"]
    seen: list[str] = []
    for c in candidates:
        if c in ("groq", "mistral", "huggingface") and c not in seen and _has_key(c):
            seen.append(c)
    return seen


def _has_key(provider: str) -> bool:
    return {
        "groq": bool(settings.GROQ_API_KEY),
        "mistral": bool(settings.MISTRAL_API_KEY),
        "huggingface": bool(settings.HUGGINGFACE_API_KEY),
    }.get(provider, False)


async def _call(
    provider: str, system_prompt: str, user_prompt: str, max_tokens: int
) -> str | None:
    if provider == "groq":
        return await _call_groq(system_prompt, user_prompt, max_tokens)
    if provider == "mistral":
        return await _call_mistral(system_prompt, user_prompt, max_tokens)
    if provider == "huggingface":
        return await _call_huggingface(system_prompt, user_prompt, max_tokens)
    return None


async def _call_groq(system: str, user: str, max_tokens: int) -> str | None:
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as cli:
        r = await cli.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
    _log_usage("groq", data)
    return _extract_openai_text(data)


async def _call_mistral(system: str, user: str, max_tokens: int) -> str | None:
    payload = {
        "model": "open-mistral-7b",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as cli:
        r = await cli.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"},
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
    _log_usage("mistral", data)
    return _extract_openai_text(data)


async def _call_huggingface(system: str, user: str, max_tokens: int) -> str | None:
    # HF serverless inference — OpenAI-호환 엔드포인트.
    payload = {
        "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as cli:
        r = await cli.post(
            "https://router.huggingface.co/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"},
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
    _log_usage("huggingface", data)
    return _extract_openai_text(data)


def _extract_openai_text(data: dict[str, Any]) -> str | None:
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None


_LAST_USAGE: dict[str, Any] | None = None


def get_last_usage() -> dict[str, Any] | None:
    """호출 직후 마지막 usage 메타 조회 (chatbot 의 Kafka trace 발행용).

    동일 이벤트 루프 컨텍스트 내에서만 의미가 있다 (멀티 워커 X).
    """
    return _LAST_USAGE


def _log_usage(provider: str, data: dict[str, Any]) -> None:
    global _LAST_USAGE
    usage = data.get("usage") if isinstance(data, dict) else None
    if usage:
        log.info(
            "llm_call",
            provider=provider,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
        )
        model_map = {
            "groq": "llama-3.1-8b-instant",
            "mistral": "mistral-small",
            "huggingface": "router-default",
        }
        _LAST_USAGE = {
            "provider": provider,
            "model_name": model_map.get(provider, provider),
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
        }
    else:
        _LAST_USAGE = None