"""Phoenix / OpenTelemetry 트레이스 초기화 (가이드 §9.2.2).

`init_tracing(app)` 을 lifespan 진입 시 1회 호출. Phoenix 미가동·미설정 시 환경 변수가 없어도
register/exporter 초기화가 조용히 실패하도록 try/except 로 감싼다 — 트레이스가 안 보일 뿐
서비스 자체는 계속 동작.

자동 계측 4종
  1. FastAPI — 모든 라우트가 자동 span (HTTP method/route/status)
  2. HTTPX  — LLM 호출(Groq/Mistral/HF) 외부 httpx span
  3. asyncpg — DB 쿼리 자동 span (SQL statement attr)
  4. Phoenix register() — OTLP 글로벌 TracerProvider

수동 계측 (각 모듈에서 `get_tracer()` 로 가져와 직접 span 생성)
  - service/llm.py: LLM 호출에 OpenInference 의미 속성 부여
  - service/chatbot.py: RAG 흐름(retrieve / generate) 부모-자식 span
  - service/kafka.py: 메시지 publish span

Phoenix UI: `http://localhost:6006` 에서 trace 확인.
"""

from __future__ import annotations

import os

import structlog
from fastapi import FastAPI

log = structlog.get_logger("observability")

_initialized = False


def init_tracing(app: FastAPI) -> bool:
    """Phoenix OTLP exporter + FastAPI/HTTPX/asyncpg 자동 계측 등록.

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
        # asyncpg 자동 계측 — DB 쿼리 SQL/duration/exception 캡처.
        try:
            from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
            AsyncPGInstrumentor().instrument()
        except Exception as e:  # pragma: no cover
            log.warning("phoenix_asyncpg_instr_failed", error=str(e))
        _initialized = True
        log.info("phoenix_initialized", project=project, endpoint=endpoint)
        return True
    except Exception as e:
        log.warning("phoenix_init_failed", error=str(e))
        return False


def get_tracer(name: str):
    """모듈별 tracer — Phoenix 미가동이면 noop tracer 반환(서비스 영향 X)."""
    try:
        from opentelemetry import trace
        return trace.get_tracer(name)
    except Exception:  # pragma: no cover
        from contextlib import contextmanager

        class _NoopTracer:
            @contextmanager
            def start_as_current_span(self, name: str, **kw):  # type: ignore[no-untyped-def]
                yield _NoopSpan()

        class _NoopSpan:
            def set_attribute(self, *a, **kw):  # type: ignore[no-untyped-def]
                return None

            def set_status(self, *a, **kw):  # type: ignore[no-untyped-def]
                return None

            def record_exception(self, *a, **kw):  # type: ignore[no-untyped-def]
                return None

        return _NoopTracer()