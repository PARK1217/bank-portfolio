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
import json as _json
from typing import Any

import httpx
import structlog

from ..config import settings
from ..observability import get_tracer

log = structlog.get_logger("llm")
_tracer = get_tracer("banking.llm")

_HTTP_TIMEOUT = 15.0


def _attach_llm_span_attrs(
    span,
    *,
    provider: str,
    model: str,
    system: str,
    user: str,
    max_tokens: int,
    response_text: str | None,
    usage: dict | None,
) -> None:
    """OpenInference 의미속성 — Phoenix UI 가 LLM trace 로 표시하도록.

    `openinference.instrumentation.SpanAttributes` 컨벤션:
        - openinference.span.kind = LLM
        - llm.model_name / llm.provider / llm.invocation_parameters
        - input.value (messages JSON) / output.value (응답 텍스트)
        - llm.token_count.prompt / completion / total
    """
    span.set_attribute("openinference.span.kind", "LLM")
    span.set_attribute("llm.system", "openai")  # provider 공통 — OpenAI 호환 API
    span.set_attribute("llm.provider", provider)
    span.set_attribute("llm.model_name", model)
    span.set_attribute(
        "llm.invocation_parameters",
        _json.dumps({"temperature": 0.3, "max_tokens": max_tokens}, ensure_ascii=False),
    )
    span.set_attribute(
        "input.value",
        _json.dumps(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            ensure_ascii=False,
        ),
    )
    span.set_attribute("input.mime_type", "application/json")
    # 메시지를 개별 attr 로도 (Phoenix Messages UI)
    span.set_attribute("llm.input_messages.0.message.role", "system")
    span.set_attribute("llm.input_messages.0.message.content", system[:2000])
    span.set_attribute("llm.input_messages.1.message.role", "user")
    span.set_attribute("llm.input_messages.1.message.content", user[:2000])
    if response_text is not None:
        span.set_attribute("output.value", response_text[:4000])
        span.set_attribute("output.mime_type", "text/plain")
        span.set_attribute("llm.output_messages.0.message.role", "assistant")
        span.set_attribute("llm.output_messages.0.message.content", response_text[:2000])
    if usage:
        if "prompt_tokens" in usage:
            span.set_attribute("llm.token_count.prompt", int(usage["prompt_tokens"]))
        if "completion_tokens" in usage:
            span.set_attribute("llm.token_count.completion", int(usage["completion_tokens"]))
        if "total_tokens" in usage:
            span.set_attribute("llm.token_count.total", int(usage["total_tokens"]))


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
    model = "llama-3.1-8b-instant"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    with _tracer.start_as_current_span("llm.chat groq") as span:
        try:
            async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as cli:
                r = await cli.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
            _log_usage("groq", data)
            text = _extract_openai_text(data)
            _attach_llm_span_attrs(
                span, provider="groq", model=model, system=system, user=user,
                max_tokens=max_tokens, response_text=text,
                usage=data.get("usage") if isinstance(data, dict) else None,
            )
            return text
        except Exception as exc:
            span.record_exception(exc)
            _attach_llm_span_attrs(
                span, provider="groq", model=model, system=system, user=user,
                max_tokens=max_tokens, response_text=None, usage=None,
            )
            raise


async def _call_mistral(system: str, user: str, max_tokens: int) -> str | None:
    model = "open-mistral-7b"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    with _tracer.start_as_current_span("llm.chat mistral") as span:
        try:
            async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as cli:
                r = await cli.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"},
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
            _log_usage("mistral", data)
            text = _extract_openai_text(data)
            _attach_llm_span_attrs(
                span, provider="mistral", model=model, system=system, user=user,
                max_tokens=max_tokens, response_text=text,
                usage=data.get("usage") if isinstance(data, dict) else None,
            )
            return text
        except Exception as exc:
            span.record_exception(exc)
            _attach_llm_span_attrs(
                span, provider="mistral", model=model, system=system, user=user,
                max_tokens=max_tokens, response_text=None, usage=None,
            )
            raise


async def _call_huggingface(system: str, user: str, max_tokens: int) -> str | None:
    # HF serverless inference — OpenAI-호환 엔드포인트.
    model = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    with _tracer.start_as_current_span("llm.chat huggingface") as span:
        try:
            async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as cli:
                r = await cli.post(
                    "https://router.huggingface.co/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"},
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
            _log_usage("huggingface", data)
            text = _extract_openai_text(data)
            _attach_llm_span_attrs(
                span, provider="huggingface", model=model, system=system, user=user,
                max_tokens=max_tokens, response_text=text,
                usage=data.get("usage") if isinstance(data, dict) else None,
            )
            return text
        except Exception as exc:
            span.record_exception(exc)
            _attach_llm_span_attrs(
                span, provider="huggingface", model=model, system=system, user=user,
                max_tokens=max_tokens, response_text=None, usage=None,
            )
            raise


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