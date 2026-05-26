"""관리자 — 대출 신청 첨부서류 일치성 검증 (Phase 6 §9.2.4).

설계 결정
- v53 ATTACHED_DOC 에 `LOAN_APP_ID` FK 가 없어, 신청 단계 첨부는 `CONTRACT_NO` 컬럼에
  `LA-{LOAN_APP_ID}` 임시 표기로 매핑한다. 운영에서는 신청→계약 발급 시 실 CONTRACT_NO 로
  마이그레이션하면 같은 라우터에서 그대로 동작.
- DOC_REQUIREMENT 매칭은 `PRODUCT_ID + TRANSACTION_TYPE='대출'` 키.

일치성 매핑
- VERIFIED  : 제출 + 검토 통과 (VERIFY_STATUS_CD='VERIFIED')
- PENDING   : 제출됐지만 검토 대기 (NULL 또는 'PENDING')
- REJECTED  : 검토 거절 (VERIFY_STATUS_CD='REJECTED')
- MISSING   : 필수인데 미제출

요약 카운트(summary)
- required_total / required_submitted / required_verified / required_missing
- optional_total / optional_submitted
- complete_yn : 필수 모두 VERIFIED 면 'Y'
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_attach")


_LA_PREFIX = "LA-"


def _contract_key(application_id: int) -> str:
    return f"{_LA_PREFIX}{application_id}"


def _parse_dt14(s: str | None) -> datetime | None:
    if not s or len(s) < 14:
        return None
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


def _status_for(submitted: dict | None) -> str:
    """제출 행 → 일치성 상태."""
    if submitted is None:
        return "MISSING"
    v = (submitted.get("verify_status_cd") or "").upper()
    if v == "VERIFIED":
        return "VERIFIED"
    if v == "REJECTED":
        return "REJECTED"
    return "PENDING"


async def get_attachments(application_id: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        app = await conn.fetchrow(
            'SELECT la."LOAN_APP_ID", la."CUSTOMER_NO", la."APPLY_PRODUCT_ID", '
            '       la."DESIRED_AMOUNT", la."APPLY_STATUS_CD", '
            '       p."PRODUCT_NAME", '
            '       COALESCE(pt."PARTY_NAME", \'-\') AS customer_name '
            'FROM public."LOAN_APPLICATION" la '
            'LEFT JOIN public."PRODUCT" p ON p."PRODUCT_ID" = la."APPLY_PRODUCT_ID" '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = la."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" pt ON pt."PARTY_ID" = c."PARTY_ID" '
            'WHERE la."LOAN_APP_ID" = $1 AND la."DELETE_YN" = \'N\'',
            application_id,
        )
        if app is None:
            raise NotFoundError(E_NOT_FOUND, "해당 대출 신청을 찾을 수 없어요.")

        requirements = await conn.fetch(
            'SELECT dr."REQUIREMENT_ID", dr."DOC_TYPE_ID", dr."REQUIRED_YN", '
            '       dr."CONDITION", '
            '       dt."DOC_NAME", dt."DOC_CATEGORY_CD", dt."VALID_MONTHS" '
            'FROM public."DOC_REQUIREMENT" dr '
            'LEFT JOIN public."DOC_TYPE_MASTER" dt ON dt."DOC_TYPE_ID" = dr."DOC_TYPE_ID" '
            'WHERE dr."PRODUCT_ID" = $1 '
            '  AND dr."TRANSACTION_TYPE" = \'대출\' '
            '  AND COALESCE(dr."INACTIVE_YN",\'N\') = \'N\' '
            '  AND dr."DELETE_YN" = \'N\' '
            'ORDER BY dr."REQUIRED_YN" DESC, dr."DOC_TYPE_ID"',
            app["APPLY_PRODUCT_ID"],
        )

        # CONTRACT_NO 매칭은 신청 단계 표기 'LA-{id}' 와 실 계약번호(LOAN_CONTRACT 발급 후) 둘 다 허용.
        attached = await conn.fetch(
            'SELECT "ATTACH_ID","DOC_TYPE_ID","DOC_ISSUE_DATE","DOC_EXPIRE_DATE",'
            '       "SUBMIT_DATETIME","FILE_PATH",'
            '       "FILE_NAME","MIME_TYPE","FILE_SIZE",'
            '       "VERIFIER_EMP_NO","VERIFY_STATUS_CD","REJECT_REASON" '
            'FROM public."ATTACHED_DOC" '
            'WHERE "DELETE_YN" = \'N\' '
            '  AND ("CONTRACT_NO" = $1 OR "CONTRACT_NO" = $2) '
            'ORDER BY "DOC_TYPE_ID", "SUBMIT_DATETIME"',
            _contract_key(application_id),
            # 발급된 계약이 있다면 그것도 함께 (현재 시드 범위는 신청 단계만 사용).
            f"L-{application_id}",
        )

    # DOC_TYPE_ID 기준으로 첨부 매핑 (1대1, 같은 type 여러 건이면 가장 최신).
    submissions: dict[int, dict] = {}
    for r in attached:
        type_id = int(r["DOC_TYPE_ID"])
        # FILE_NAME 컬럼 있으면 그것을, 없으면 FILE_PATH 끝 토큰명 폴백 (db/20 마이그 이전 데이터 호환).
        fn = r["FILE_NAME"] or (r["FILE_PATH"] or "").rsplit("/", 1)[-1] or None
        cand = {
            "attach_id": int(r["ATTACH_ID"]),
            "doc_type_id": type_id,
            "doc_issue_date": r["DOC_ISSUE_DATE"],
            "doc_expire_date": r["DOC_EXPIRE_DATE"],
            "submit_at": _parse_dt14(r["SUBMIT_DATETIME"]),
            "file_path": r["FILE_PATH"],
            "file_name": fn,
            "mime_type": r["MIME_TYPE"],
            "file_size": int(r["FILE_SIZE"]) if r["FILE_SIZE"] is not None else None,
            "verifier_emp_no": r["VERIFIER_EMP_NO"],
            "verify_status_cd": r["VERIFY_STATUS_CD"],
            "reject_reason": r["REJECT_REASON"],
        }
        prev = submissions.get(type_id)
        if prev is None or (cand["submit_at"] or datetime.min) >= (prev["submit_at"] or datetime.min):
            submissions[type_id] = cand

    items: list[dict[str, Any]] = []
    required_total = required_verified = required_submitted = 0
    optional_total = optional_submitted = 0
    required_missing = 0
    for req in requirements:
        type_id = int(req["DOC_TYPE_ID"])
        is_required = (req["REQUIRED_YN"] or "N") == "Y"
        sub = submissions.get(type_id)
        status = _status_for(sub)
        items.append({
            "requirement_id": int(req["REQUIREMENT_ID"]),
            "doc_type_id": type_id,
            "doc_name": req["DOC_NAME"] or "",
            "doc_category_cd": req["DOC_CATEGORY_CD"],
            "valid_months": int(req["VALID_MONTHS"] or 0) or None,
            "required_yn": req["REQUIRED_YN"] or "N",
            "condition": req["CONDITION"],
            "status_cd": status,
            "submission": sub,
        })
        if is_required:
            required_total += 1
            if status == "VERIFIED":
                required_verified += 1
            if status != "MISSING":
                required_submitted += 1
            else:
                required_missing += 1
        else:
            optional_total += 1
            if status != "MISSING":
                optional_submitted += 1

    summary = {
        "required_total": required_total,
        "required_submitted": required_submitted,
        "required_verified": required_verified,
        "required_missing": required_missing,
        "optional_total": optional_total,
        "optional_submitted": optional_submitted,
        "complete_yn": "Y" if required_total > 0 and required_verified == required_total else "N",
    }

    return {
        "application": {
            "loan_app_id": int(app["LOAN_APP_ID"]),
            "customer_no": int(app["CUSTOMER_NO"]),
            "customer_name": app["customer_name"],
            "product_id": int(app["APPLY_PRODUCT_ID"] or 0),
            "product_name": app["PRODUCT_NAME"] or "",
            "desired_amount": int(app["DESIRED_AMOUNT"] or 0),
            "apply_status_cd": app["APPLY_STATUS_CD"] or "",
        },
        "summary": summary,
        "items": items,
    }

# ---------------------------------------------------------------------------
# 첨부 본인 application 매칭 조회 — 신청('LA-{id}')·발급 후('L-{id}') 양쪽 허용
# ---------------------------------------------------------------------------

async def _fetch_attach_for_app(conn, application_id: int, attach_id: int) -> dict | None:
    return await conn.fetchrow(
        'SELECT "ATTACH_ID", "CONTRACT_NO", "FILE_PATH", "VERIFY_STATUS_CD" '
        'FROM public."ATTACHED_DOC" '
        'WHERE "ATTACH_ID" = $1 AND "DELETE_YN" = \'N\' '
        '  AND ("CONTRACT_NO" = $2 OR "CONTRACT_NO" = $3)',
        attach_id,
        _contract_key(application_id),
        f"L-{application_id}",
    )


def _require_admin_level(auth_level_cd: str) -> None:
    """AUTH_LEVEL_CD='ADMIN' 만 검토 가능. 'AUDIT' 등은 422."""
    if (auth_level_cd or "").upper() != "ADMIN":
        raise BusinessError(
            E_VALIDATION,
            "감사 권한(AUDIT)은 첨부 검토를 수행할 수 없어요.",
        )


# ---------------------------------------------------------------------------
# 승인 (VERIFIED)
# ---------------------------------------------------------------------------

async def verify_attachment(
    application_id: int,
    attach_id: int,
    *,
    employee_no: str,
    auth_level_cd: str,
) -> dict[str, Any]:
    _require_admin_level(auth_level_cd)
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await _fetch_attach_for_app(conn, application_id, attach_id)
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "첨부 서류를 찾을 수 없어요.")
        await conn.execute(
            'UPDATE public."ATTACHED_DOC" '
            'SET "VERIFY_STATUS_CD" = \'VERIFIED\', '
            '    "VERIFIER_EMP_NO" = $1, '
            '    "REJECT_REASON" = NULL, '
            '    "UPDATED_BY" = $1, '
            '    "UPDATED_AT" = NOW() '
            'WHERE "ATTACH_ID" = $2',
            employee_no,
            attach_id,
        )
    log.info(
        "attachment_verified",
        application_id=application_id,
        attach_id=attach_id,
        employee_no=employee_no,
    )
    return {
        "success": True,
        "attach_id": attach_id,
        "status_cd": "VERIFIED",
        "verifier_emp_no": employee_no,
    }


# ---------------------------------------------------------------------------
# 반려 (REJECTED) — 사유 필수
# ---------------------------------------------------------------------------

async def reject_attachment(
    application_id: int,
    attach_id: int,
    *,
    employee_no: str,
    auth_level_cd: str,
    reason: str,
) -> dict[str, Any]:
    _require_admin_level(auth_level_cd)
    reason_clean = (reason or "").strip()
    if not reason_clean:
        raise BusinessError(E_VALIDATION, "반려 사유를 입력해 주세요.")
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await _fetch_attach_for_app(conn, application_id, attach_id)
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "첨부 서류를 찾을 수 없어요.")
        await conn.execute(
            'UPDATE public."ATTACHED_DOC" '
            'SET "VERIFY_STATUS_CD" = \'REJECTED\', '
            '    "REJECT_REASON" = $1, '
            '    "VERIFIER_EMP_NO" = $2, '
            '    "UPDATED_BY" = $2, '
            '    "UPDATED_AT" = NOW() '
            'WHERE "ATTACH_ID" = $3',
            reason_clean,
            employee_no,
            attach_id,
        )
    log.info(
        "attachment_rejected",
        application_id=application_id,
        attach_id=attach_id,
        employee_no=employee_no,
    )
    return {
        "success": True,
        "attach_id": attach_id,
        "status_cd": "REJECTED",
        "verifier_emp_no": employee_no,
        "reject_reason": reason_clean,
    }


# ---------------------------------------------------------------------------
# 파일 경로 해석 — DB FILE_PATH("/files/loan/..") + 마운트 prefix.
# `api/admin_attach.py:_FILES_ROOT=/app` 와 합쳐 path-traversal 검증 후 응답.
# 반환: (disk_rel, file_name) — disk_rel 은 _FILES_ROOT 기준 상대.
# ---------------------------------------------------------------------------

async def resolve_attach_file(
    application_id: int,
    attach_id: int,
) -> tuple[str, str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await _fetch_attach_for_app(conn, application_id, attach_id)
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "첨부 파일을 찾을 수 없어요.")
    file_path = (row["FILE_PATH"] or "").strip()
    if not file_path:
        raise NotFoundError(E_NOT_FOUND, "첨부 파일 경로가 비어 있어요.")
    # DB 예: "/files/loan/20001/id.pdf" → disk_rel "data/files/loan/20001/id.pdf"
    rel = file_path.lstrip("/")
    disk_rel = f"data/{rel}"
    file_name = rel.split("/")[-1] or "attachment"
    return disk_rel, file_name
