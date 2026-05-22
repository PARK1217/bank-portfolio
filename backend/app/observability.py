"""Phoenix / OpenTelemetry 트레이스 초기화 (가이드 §9.2.2).

`init_tracing(app)` 을 lifespan 진입 시 1회 호출. Phoenix 미가동·미설정 시 환경 변수가 없어도
register/exporter 초기화가 조용히 실패하도록 try/except 로 감싼다 — 트레이스가 안 보일 뿐
서비스 자체는 계속 동작.

작동:
  1. `phoenix.otel.register(project_name=..., endpoint=...)` 로 글로벌 TracerProvider 설정
  2. `FastAPIInstrumentor.instrument_app(app)` — 모든 라우트가 자동 span 캡처
  3. `HTTPXClientInstrumentor().instrument()` — LLM 호출(Groq/Mistral/HF) httpx span 캡처

Phoenix UI: `http://localhost:6006` 에서 trace 확인.
"""

from __future__ import annotations

import os

import structlog
from fastapi import FastAPI

log = structlog.get_logger("observability")

_initialized = False


def init_tracing(app: FastAPI) -> bool:
    """Phoenix OTLP exporter + FastAPI/HTTPX 자동 계측 등록.

    Returns:
        True 면 정상 등록, False 면 미설정 또는 실패(서비스 계속 정상 동작).
    """
    global _initialized
    if _initialized:
        return True

    endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
    if not endpoint:
        log.info("phoenix_disabled", reason="PHOENIX_COLLECTOR_ENDPOINT not set")
        return False

    project = os.getenv("PHOENIX_PROJECT_NAME", "banking-rag")

    try:
        from phoenix.otel import register
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    except ImportError as e:
        log.warning("phoenix_import_failed", error=str(e))
        return False

    # OTEL exporter 가 HTTP/protobuf 로 발행하도록 강제 (phoenix 6006 통합 endpoint).
    os.environ.setdefault("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
    os.environ.setdefault("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL", "http/protobuf")

    try:
        register(project_name=project, endpoint=f"{endpoint}/v1/traces")
        FastAPIInstrumentor.instrument_app(app)
        HTTPXClientInstrumentor().instrument()
        _initialized = True
        log.info("phoenix_initialized", project=project, endpoint=endpoint)
        return True
    except Exception as e:
        log.warning("phoenix_init_failed", error=str(e))
        return False