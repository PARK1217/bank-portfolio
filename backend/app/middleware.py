"""HTTP 미들웨어 (가이드라인 §3.1, Phase 6 §9.2.7).

`RequestContextMiddleware` — UUID v4 `request_id`를 발급/전파하고
요청 시작/종료 로그를 남긴다. `request_id`는 structlog contextvars로
자동 주입되므로 하위 코드에서 `log.info("event", ...)`만 호출하면
모든 로그에 `request_id`가 따라붙는다.

`AdminAuditMiddleware` — `/api/admin/*` 호출에 대해 응답 직후
ADMIN_AUDIT_LOG INSERT. require_admin Depends 가 세팅한
`request.state.admin` 이 있으면 EMPLOYEE_NO 정확히 채우고,
없으면 인증 실패로 간주해 EMPLOYEE_NO=`UNKNOWN`+RESULT_CD=`DENIED`.
로그인 라우터는 별도로 service.admin_audit.insert_audit_log 직호출.
"""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .logging_setup import get_logger
from .service.admin_audit import (
    derive_action_cd,
    derive_result_cd,
    derive_target,
    insert_audit_log,
)

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


# admin_auth 라우터가 자체적으로 감사 INSERT 하는 경로 — 미들웨어는 중복 INSERT 회피.
_ADMIN_AUDIT_SKIP_PATHS = {
    "/api/admin/auth/login",
}


class AdminAuditMiddleware(BaseHTTPMiddleware):
    """`/api/admin/*` 호출 응답 직후 ADMIN_AUDIT_LOG INSERT."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        path = request.url.path
        if not path.startswith("/api/admin/"):
            return response
        if path in _ADMIN_AUDIT_SKIP_PATHS:
            return response

        # require_admin Depends 가 세팅했으면 사용, 없으면 인증 실패로 간주.
        admin = getattr(request.state, "admin", None)
        employee_no = admin.employee_no if admin is not None else "UNKNOWN"

        target_table, target_id = derive_target(path)
        await insert_audit_log(
            employee_no=employee_no,
            action_cd=derive_action_cd(request.method, path),
            target_table=target_table,
            target_id=target_id,
            result_cd=derive_result_cd(response.status_code),
            access_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            remark=f"status={response.status_code} req={getattr(request.state, 'request_id', None)}",
        )
        return response