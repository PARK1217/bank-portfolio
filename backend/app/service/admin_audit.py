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
    ("GET",  "/api/admin/loans/:id/attachments"):              "LOAN_ATTACHMENTS",
    ("POST", "/api/admin/loans/:id/attachments/:id/verify"):   "LOAN_ATTACH_VERIFY",
    ("POST", "/api/admin/loans/:id/attachments/:id/reject"):   "LOAN_ATTACH_REJECT",
    ("GET",  "/api/admin/loans/:id/attachments/:id/file"):     "LOAN_ATTACH_FILE",
    ("POST", "/api/admin/loans/decisions/:id/review"):         "LOAN_HUMAN_REVIEW",
    ("GET",  "/api/admin/customers/overdue"):                  "OVERDUE_LIST",
    ("GET",  "/api/admin/customers/:id/overdue"):              "OVERDUE_DETAIL",
    ("GET",  "/api/admin/health/external"):                    "HEALTH_EXTERNAL_LIST",
    ("GET",  "/api/admin/products"):                           "PRODUCT_LIST",
    ("POST", "/api/admin/products"):                           "PRODUCT_CREATE",
    ("GET",  "/api/admin/products/:id"):                       "PRODUCT_DETAIL",
    ("PATCH","/api/admin/products/:id/status"):                "PRODUCT_STATUS_UPDATE",
    ("POST", "/api/admin/chatbot/messages"):                   "CHATBOT_QUERY",
    ("GET",  "/api/admin/chatbot/sessions"):                   "CHATBOT_SESSIONS",
    ("GET",  "/api/admin/chatbot/sessions/:id"):               "CHATBOT_SESSION_DETAIL",
}

# ---------------------------------------------------------------------------
# TARGET_TABLE 매핑 — path 패턴별
# ---------------------------------------------------------------------------

_TARGET_TABLE_RULES: list[tuple[re.Pattern[str], str, int | None]] = [
    # (pattern, target_table, group_index for TARGET_ID; None=ID 미사용)
    (re.compile(r"^/api/admin/loans/(\d+)/predict$"),                 "LOAN_APPLICATION", 1),
    (re.compile(r"^/api/admin/loans/(\d+)/attachments$"),             "LOAN_APPLICATION", 1),
    (re.compile(r"^/api/admin/loans/\d+/attachments/(\d+)/verify$"),  "ATTACHED_DOC", 1),
    (re.compile(r"^/api/admin/loans/\d+/attachments/(\d+)/reject$"),  "ATTACHED_DOC", 1),
    (re.compile(r"^/api/admin/loans/\d+/attachments/(\d+)/file$"),    "ATTACHED_DOC", 1),
    (re.compile(r"^/api/admin/loans/decisions/(\d+)/review$"),        "AI_LOAN_DECISION", 1),
    (re.compile(r"^/api/admin/loans/decisions$"),                    "AI_LOAN_DECISION", None),
    (re.compile(r"^/api/admin/loans/review-queue$"),                 "AI_LOAN_DECISION", None),
    (re.compile(r"^/api/admin/auth/(login|logout|me)$"),             "ADMIN_SESSION",    None),
    (re.compile(r"^/api/admin/customers/(\d+)/overdue$"),            "CUSTOMER",         1),
    (re.compile(r"^/api/admin/customers/overdue$"),                  "CUSTOMER",         None),
    (re.compile(r"^/api/admin/health/external/([^/]+)$"),            "EXTERNAL_API_HEALTH", 1),
    (re.compile(r"^/api/admin/health/external$"),                    "EXTERNAL_API_HEALTH", None),
    (re.compile(r"^/api/admin/products/(\d+)/status$"),              "PRODUCT", 1),
    (re.compile(r"^/api/admin/products/(\d+)$"),                     "PRODUCT", 1),
    (re.compile(r"^/api/admin/products$"),                           "PRODUCT", None),
    # FDS — composite key (customer_no, detect_seq) → TARGET_ID 에 "C:DS" 형태로 적재.
    (re.compile(r"^/api/admin/fds/(\d+/\d+)/investigation$"),        "FDS_DETECTION", 1),
    (re.compile(r"^/api/admin/fds/(\d+/\d+)$"),                      "FDS_DETECTION", 1),
    (re.compile(r"^/api/admin/fds/dashboard$"),                      "FDS_DETECTION", None),
    (re.compile(r"^/api/admin/fds$"),                                "FDS_DETECTION", None),
    (re.compile(r"^/api/admin/chatbot/sessions/(\d+)$"),              "AI_CHATBOT_SESSION", 1),
    (re.compile(r"^/api/admin/chatbot/(messages|sessions)$"),         "AI_CHATBOT_SESSION", None),
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


# ---------------------------------------------------------------------------
# 조회 (관리자 콘솔 /audit 화면용)
# ---------------------------------------------------------------------------

async def list_audit_logs(
    *,
    query: str | None = None,
    employee_no: str | None = None,
    action_cd: str | None = None,
    result_cd: str | None = None,
    target_table: str | None = None,
    date_from: str | None = None,  # 'YYYY-MM-DD'
    date_to: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    from datetime import datetime, timedelta

    pool = get_pool()
    clauses: list[str] = []
    params: list[Any] = []

    def _parse_date(s: str) -> datetime | None:
        for fmt in ("%Y-%m-%d", "%Y%m%d"):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None

    if query:
        params.append(f"%{query}%")
        params.append(f"%{query}%")
        i1, i2 = len(params) - 1, len(params)
        clauses.append(f'("EMPLOYEE_NO" ILIKE ${i1} OR "TARGET_ID" ILIKE ${i2})')
    if employee_no:
        params.append(employee_no)
        clauses.append(f'"EMPLOYEE_NO" = ${len(params)}')
    if action_cd:
        params.append(action_cd)
        clauses.append(f'"ACTION_CD" = ${len(params)}')
    if result_cd:
        params.append(result_cd)
        clauses.append(f'"RESULT_CD" = ${len(params)}')
    if target_table:
        params.append(target_table)
        clauses.append(f'"TARGET_TABLE" = ${len(params)}')
    if date_from:
        dt = _parse_date(date_from)
        if dt is not None:
            params.append(dt)
            clauses.append(f'"CREATED_AT" >= ${len(params)}')
    if date_to:
        dt = _parse_date(date_to)
        if dt is not None:
            params.append(dt + timedelta(days=1))
            clauses.append(f'"CREATED_AT" < ${len(params)}')

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""

    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."ADMIN_AUDIT_LOG"{where}',
            *params,
        )
        params_paged = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT "AUDIT_ID","EMPLOYEE_NO","ACTION_CD","TARGET_TABLE","TARGET_ID",'
            f'       "RESULT_CD","ACCESS_IP","USER_AGENT","REMARK","CREATED_AT",'
            f'       "BEFORE_JSON","AFTER_JSON" '
            f'FROM public."ADMIN_AUDIT_LOG"{where} '
            f'ORDER BY "AUDIT_ID" DESC '
            f"LIMIT ${len(params_paged) - 1} OFFSET ${len(params_paged)}",
            *params_paged,
        )

    items = [
        {
            "audit_id": int(r["AUDIT_ID"]),
            "employee_no": r["EMPLOYEE_NO"],
            "action_cd": r["ACTION_CD"],
            "target_table": r["TARGET_TABLE"],
            "target_id": r["TARGET_ID"],
            "result_cd": r["RESULT_CD"],
            "access_ip": r["ACCESS_IP"],
            "user_agent": r["USER_AGENT"],
            "remark": r["REMARK"],
            "created_at": r["CREATED_AT"],
            "before_json": r["BEFORE_JSON"],
            "after_json": r["AFTER_JSON"],
        }
        for r in rows
    ]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def list_audit_facets() -> dict[str, Any]:
    """필터 드롭다운용 distinct 값 — action_cd / employee_no / target_table."""
    pool = get_pool()
    async with pool.acquire() as conn:
        actions = await conn.fetch(
            'SELECT "ACTION_CD" AS v, COUNT(*) AS c FROM public."ADMIN_AUDIT_LOG" '
            'GROUP BY "ACTION_CD" ORDER BY 2 DESC LIMIT 50'
        )
        employees = await conn.fetch(
            'SELECT "EMPLOYEE_NO" AS v, COUNT(*) AS c FROM public."ADMIN_AUDIT_LOG" '
            'GROUP BY "EMPLOYEE_NO" ORDER BY 2 DESC LIMIT 50'
        )
        tables = await conn.fetch(
            'SELECT "TARGET_TABLE" AS v, COUNT(*) AS c FROM public."ADMIN_AUDIT_LOG" '
            'WHERE "TARGET_TABLE" IS NOT NULL '
            'GROUP BY "TARGET_TABLE" ORDER BY 2 DESC LIMIT 50'
        )
        stats = await conn.fetchrow(
            'SELECT '
            '  COUNT(*) AS total, '
            '  COUNT(*) FILTER (WHERE "RESULT_CD" = \'OK\') AS ok, '
            '  COUNT(*) FILTER (WHERE "RESULT_CD" = \'DENIED\') AS denied, '
            '  COUNT(*) FILTER (WHERE "RESULT_CD" = \'ERROR\') AS err, '
            '  COUNT(*) FILTER (WHERE "CREATED_AT" >= CURRENT_DATE) AS today '
            'FROM public."ADMIN_AUDIT_LOG"'
        )
    return {
        "actions": [{"value": r["v"], "count": int(r["c"])} for r in actions],
        "employees": [{"value": r["v"], "count": int(r["c"])} for r in employees],
        "target_tables": [{"value": r["v"], "count": int(r["c"])} for r in tables],
        "stats": {
            "total": int(stats["total"] or 0),
            "ok": int(stats["ok"] or 0),
            "denied": int(stats["denied"] or 0),
            "error": int(stats["err"] or 0),
            "today": int(stats["today"] or 0),
        },
    }