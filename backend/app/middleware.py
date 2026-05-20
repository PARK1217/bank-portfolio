"""HTTP 미들웨어 (가이드라인 §3.1).

`RequestContextMiddleware` — UUID v4 `request_id`를 발급/전파하고
요청 시작/종료 로그를 남긴다. `request_id`는 structlog contextvars로
자동 주입되므로 하위 코드에서 `log.info("event", ...)`만 호출하면
모든 로그에 `request_id`가 따라붙는다.
"""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .logging_setup import get_logger

log = get_logger("request")

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = rid

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=rid,
            endpoint=f"{request.method} {request.url.path}",
        )

        start = time.perf_counter()
        log.info("request_start")
        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = int((time.perf_counter() - start) * 1000)
            log.exception("request_unhandled_error", duration_ms=duration_ms)
            raise
        duration_ms = int((time.perf_counter() - start) * 1000)
        response.headers[REQUEST_ID_HEADER] = rid
        log.info(
            "request_end",
            status=response.status_code,
            duration_ms=duration_ms,
        )
        return response