"""ADMIN_AUDIT_LOG 자동 적재 — Phase 6 §9.2.7.

설계
- 미들웨어가 모든 `/api/admin/*` 호출의 응답 직후 `insert_audit_log` 호출.
- `require_admin` Depends 가 인증 성공 시 `request.state.admin = CurrentAdmin` 세팅.
  미들웨어는 이 컨텍스트가 있을 때만 EMPLOYEE_NO 를 정확히 채워 INSERT.
- 인증 실패(401) 호출도 감사 대상이지만 EMPLOYEE_NO 가 unknown 이므로
  로그인 라우터에서 직접 INSERT 함수를 호출(성공/실패 모두). 그 외 401 은
  미들웨어가 EMPLOYEE_NO=`UNKNOWN`, RESULT_CD=`DENIED` 로 적재.
- BEFORE/AFTER_JSON 은 미들웨어에서는 비움(body 재읽기 비용·민감정보 위험).
  필요 시 도메인 라우터가 직접 호출해 채움.

ACTION_CD 매핑 규칙
- 명시 매핑 dict 가 있으면 그 값 사용.
- 없으면 `{METHOD}_{PATH_SEGMENT}` 형식으로 자동 생성 (숫자/UUID 는 `:id` 로 정규화).
  예) `POST /api/admin/loans/123/predict` → `LOAN_PREDICT`
      `GET  /api/admin/loans/decisions`     → `LOAN_DECISIONS_LIST`
      `POST /api/admin/auth/login`           → `AUTH_LOGIN`
"""

from __future__ import annotations

import re
from typing import Any

import structlog

from ..db import get_pool

log = structlog.get_logger("admin_audit")

# ---------------------------------------------------------------------------
# ACTION_CD 명시 매핑 — 명확한 비즈니스 액션은 직접 지정
# ---------------------------------------------------------------------------

_EXPLICIT_ACTIONS: dict[tuple[str, str], str] = {
    ("POST", "/api/admin/auth/login"):                         "AUTH_LOGIN",
    ("POST", "/api/admin/auth/logout"):                        "AUTH_LOGOUT",
    ("GET",  "/api/admin/auth/me"):                            "AUTH_ME",
    ("GET",  "/api/admin/loans/review-queue"):                 "LOAN_REVIEW_QUEUE",
    ("GET",  "/api/admin/loans/decisions"):                    "LOAN_DECISIONS_LIST",
    ("POST", "/api/admin/loans/:id/predict"):                  "LOAN_PREDICT",
    ("POST", "/api/admin/loans/decisions/:id/review"):         "LOAN_HUMAN_REVIEW",
    ("GET",  "/api/admin/customers/overdue"):                  "OVERDUE_LIST",
    ("GET",  "/api/admin/customers/:id/overdue"):              "OVERDUE_DETAIL",
    ("GET",  "/api/admin/health/external"):                    "HEALTH_EXTERNAL_LIST",
}

# ---------------------------------------------------------------------------
# TARGET_TABLE 매핑 — path 패턴별
# ---------------------------------------------------------------------------

_TARGET_TABLE_RULES: list[tuple[re.Pattern[str], str, int | None]] = [
    # (pattern, target_table, group_index for TARGET_ID; None=ID 미사용)
    (re.compile(r"^/api/admin/loans/(\d+)/predict$"),                 "LOAN_APPLICATION", 1),
    (re.compile(r"^/api/admin/loans/decisions/(\d+)/review$"),        "AI_LOAN_DECISION", 1),
    (re.compile(r"^/api/admin/loans/decisions$"),                    "AI_LOAN_DECISION", None),
    (re.compile(r"^/api/admin/loans/review-queue$"),                 "AI_LOAN_DECISION", None),
    (re.compile(r"^/api/admin/auth/(login|logout|me)$"),             "ADMIN_SESSION",    None),
    (re.compile(r"^/api/admin/customers/(\d+)/overdue$"),            "CUSTOMER",         1),
    (re.compile(r"^/api/admin/customers/overdue$"),                  "CUSTOMER",         None),
    (re.compile(r"^/api/admin/health/external/([^/]+)$"),            "EXTERNAL_API_HEALTH", 1),
    (re.compile(r"^/api/admin/health/external$"),                    "EXTERNAL_API_HEALTH", None),
]


# ---------------------------------------------------------------------------
# 정규화 / 매핑
# ---------------------------------------------------------------------------

_ID_SEG = re.compile(r"^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$", re.I)

# prefix 기반 매핑 — enum/string path param(`/health/external/{api_name}`) 처럼
# `_normalize_path` 의 :id 치환으로 못 잡는 경우 사용.
_PREFIX_ACTIONS: list[tuple[str, str, str]] = [
    ("GET", "/api/admin/health/external/", "HEALTH_EXTERNAL_DETAIL"),
]


def _normalize_path(path: str) -> str:
    """숫자·UUID 세그먼트를 `:id` 로 치환해 ACTION_CD 매핑 키로 사용."""
    parts = path.rstrip("/").split("/")
    norm = [":id" if _ID_SEG.match(p) else p for p in parts]
    return "/".join(norm) or "/"


def derive_action_cd(method: str, path: str) -> str:
    m = method.upper()
    key = (m, _normalize_path(path))
    if key in _EXPLICIT_ACTIONS:
        return _EXPLICIT_ACTIONS[key]
    for pm, pp, action in _PREFIX_ACTIONS:
        if m == pm and path.startswith(pp):
            return action
    # 폴백 — 마지막 의미 segment 2 개로 합성
    segs = [s for s in path.split("/") if s and not _ID_SEG.match(s) and s != "api"]
    tail = "_".join(segs[-2:]).upper() if segs else "UNKNOWN"
    return f"{m}_{tail}"[:30]


def derive_target(path: str) -> tuple[str | None, str | None]:
    for pattern, table, group in _TARGET_TABLE_RULES:
        m = pattern.match(path.rstrip("/"))
        if m:
            target_id = m.group(group) if group else None
            return table, target_id
    return None, None


def derive_result_cd(status_code: int) -> str:
    if 200 <= status_code < 300:
        return "OK"
    if status_code in (401, 403):
        return "DENIED"
    return "ERROR"


# ---------------------------------------------------------------------------
# INSERT
# ---------------------------------------------------------------------------

async def insert_audit_log(
    *,
    employee_no: str,
    action_cd: str,
    target_table: str | None = None,
    target_id: str | None = None,
    result_cd: str = "OK",
    access_ip: str | None = None,
    user_agent: str | None = None,
    before_json: dict[str, Any] | None = None,
    after_json: dict[str, Any] | None = None,
    remark: str | None = None,
) -> int:
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            audit_id = await conn.fetchval(
                'INSERT INTO public."ADMIN_AUDIT_LOG" ('
                '  "EMPLOYEE_NO","ACTION_CD","TARGET_TABLE","TARGET_ID",'
                '  "BEFORE_JSON","AFTER_JSON","ACCESS_IP","USER_AGENT","RESULT_CD","REMARK"'
                ') VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10) '
                'RETURNING "AUDIT_ID"',
                employee_no[:20],
                action_cd[:30],
                (target_table or None) and target_table[:50],
                (target_id or None) and str(target_id)[:50],
                _json_or_null(before_json),
                _json_or_null(after_json),
                (access_ip or None) and access_ip[:50],
                (user_agent or None) and user_agent[:500],
                result_cd[:20],
                (remark or None) and remark[:1000],
            )
        return int(audit_id)
    except Exception:
        # 감사 INSERT 실패가 사용자 요청 응답을 깨면 안 됨 — 로그만 남김.
        log.exception("admin_audit_insert_failed",
                      employee_no=employee_no, action_cd=action_cd)
        return 0


def _json_or_null(obj: dict[str, Any] | None) -> str | None:
    if obj is None:
        return None
    import json
    return json.dumps(obj, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# 민감 정보 redaction — 로그인 라우터가 BEFORE_JSON 으로 body 일부 적재 시 사용
# ---------------------------------------------------------------------------

_SENSITIVE_KEYS = {"password", "new_pin", "current_pin", "otp_code"}


def redact(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        k: ("***" if k.lower() in _SENSITIVE_KEYS else v)
        for k, v in payload.items()
    }