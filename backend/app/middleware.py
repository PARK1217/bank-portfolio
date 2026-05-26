"""HTTP 미들웨어 (가이드라인 §3.1, Phase 6 §9.2.7).

`RequestContextMiddleware` — UUID v4 `request_id`를 발급/전파하고
요청 시작/종료 로그를 남긴다. `request_id`는 structlog contextvars로
자동 주입되므로 하위 코드에서 `log.info("event", ...)`만 호출하면
모든 로그에 `request_id`가 따라붙는다.

`AdminAuditMiddleware` — `/api/admin/*` 호출에 대해 응답 직후
ADMIN_AUDIT_LOG INSERT.

- `require_admin` Depends 가 세팅한 `request.state.admin` 이 있으면
  EMPLOYEE_NO 정확히 채우고, 없으면 인증 실패로 간주해
  EMPLOYEE_NO=`UNKNOWN`+RESULT_CD=`DENIED`.
- BEFORE_JSON: POST/PATCH/PUT/DELETE 요청의 JSON body + query string 자동 캡처.
  민감 필드는 `redact()` 로 마스킹. 요청 본문은 1회만 읽고 receive 큐 재주입.
- AFTER_JSON: 라우터가 `request.state.audit_after = {...}` 로 채워두면
  미들웨어가 가져가 INSERT (예: 챗봇 답변 요약·작업 결과 ID 등).
- 로그인 라우터는 별도로 service.admin_audit.insert_audit_log 직호출.
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

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
    redact,
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

# body 캡처 대상 method
_BODY_METHODS = {"POST", "PATCH", "PUT", "DELETE"}

# 큰 첨부물 업로드 경로는 body 캡처 스킵 (multipart binary)
_BODY_CAPTURE_SKIP_SUFFIX = (
    "/attachments",      # 대출 첨부 업로드 (다용도)
)


def _looks_binary(content_type: str | None) -> bool:
    if not content_type:
        return False
    ct = content_type.lower()
    return (
        "multipart/" in ct
        or "octet-stream" in ct
        or ct.startswith("image/")
        or ct.startswith("video/")
        or ct.startswith("audio/")
        or "application/pdf" in ct
    )


async def _read_body_for_audit(request: Request) -> dict[str, Any] | None:
    """요청 본문을 1회 읽고 receive 큐 재주입 후 redact 된 dict 반환.

    - JSON 본문이 아니면 None
    - 16KB 초과 시 잘림 표시
    - 실패는 None 으로 silent (감사 INSERT 가 사용자 응답을 깨면 안 됨)
    """
    try:
        if request.method.upper() not in _BODY_METHODS:
            return None
        ct = request.headers.get("content-type", "")
        if _looks_binary(ct):
            return None
        if any(request.url.path.endswith(s) for s in _BODY_CAPTURE_SKIP_SUFFIX):
            return None

        body_bytes = await request.body()

        # receive 큐 재주입 — 다운스트림이 같은 body 를 다시 읽을 수 있도록
        async def _receive() -> dict:
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        request._receive = _receive  # type: ignore[attr-defined]

        if not body_bytes:
            return None

        # JSON 파싱
        if "application/json" not in ct and not body_bytes.lstrip().startswith((b"{", b"[")):
            # JSON 이 아니면 원문 일부만 적재 (form 등)
            txt = body_bytes[:2000].decode("utf-8", errors="replace")
            return redact({"_raw": txt}) if txt else None

        if len(body_bytes) > 16_384:
            head = body_bytes[:16_384].decode("utf-8", errors="replace")
            return {"_truncated": True, "_size": len(body_bytes), "_head": head}

        parsed = json.loads(body_bytes.decode("utf-8"))
        if isinstance(parsed, (dict, list)):
            return redact(parsed) if isinstance(parsed, dict) else {"_list": redact(parsed)}
        return {"_value": parsed}
    except Exception:
        return None


def _query_params_dict(request: Request) -> dict[str, Any] | None:
    qp = dict(request.query_params)
    if not qp:
        return None
    return redact(qp)


class AdminAuditMiddleware(BaseHTTPMiddleware):
    """`/api/admin/*` 호출 응답 직후 ADMIN_AUDIT_LOG INSERT.

    캡처 정책
    - BEFORE_JSON: 요청 body (POST/PATCH/PUT/DELETE) + query string. redact 적용.
    - AFTER_JSON: 라우터가 `request.state.audit_after` 채워둔 경우 사용.
                  예) 챗봇 답변 요약, 생성된 리소스 ID 등.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        is_admin_path = path.startswith("/api/admin/") and path not in _ADMIN_AUDIT_SKIP_PATHS

        # admin path 만 body 캡처 (성능 비용 회피)
        before_json: dict[str, Any] | None = None
        if is_admin_path:
            body_dict = await _read_body_for_audit(request)
            qp = _query_params_dict(request)
            if body_dict is not None or qp is not None:
                before_json = {}
                if body_dict is not None:
                    before_json["body"] = body_dict
                if qp is not None:
                    before_json["query"] = qp

        response: Response = await call_next(request)

        if not is_admin_path:
            return response

        # require_admin Depends 가 세팅했으면 사용, 없으면 인증 실패로 간주.
        admin = getattr(request.state, "admin", None)
        employee_no = admin.employee_no if admin is not None else "UNKNOWN"

        # 라우터가 채운 audit_after 가져오기
        after_raw = getattr(request.state, "audit_after", None)
        after_json: dict[str, Any] | None
        if isinstance(after_raw, dict):
            after_json = redact(after_raw)
        else:
            after_json = None

        target_table, target_id = derive_target(path)
        await insert_audit_log(
            employee_no=employee_no,
            action_cd=derive_action_cd(request.method, path),
            target_table=target_table,
            target_id=target_id,
            result_cd=derive_result_cd(response.status_code),
            access_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            before_json=before_json,
            after_json=after_json,
            remark=f"status={response.status_code} req={getattr(request.state, 'request_id', None)}",
        )
        return response
