"""사용자측 대출 첨부 — 본인 신청에 대한 요구 목록 조회 + multipart 업로드.

설계
- admin_attach.get_attachments 와 매트릭스 구조 동일하지만, 사용자 본인 검증
  (LOAN_APPLICATION.CUSTOMER_NO 일치) + 파일 디스크 저장 + ATTACHED_DOC INSERT 로 확장.
- ATTACHED_DOC 에 LOAN_APP_ID FK 가 없어 신청 단계는 CONTRACT_NO='LA-{LOAN_APP_ID}'
  표기. 계약 발급 후 'L-{contract_no}' 로 마이그레이션 시에도 같은 매트릭스 그대로.

업로드 정책
- 허용 MIME : image/jpeg / image/png / image/webp / application/pdf
- 최대 크기 : 10 MiB (=10*1024*1024)
- 저장 경로 : data/files/loan/{app_id}/{uuid}.{ext}
- 상태      : VERIFY_STATUS_CD='PENDING' (관리자 검토 대기)
- 같은 DOC_TYPE_ID 재업로드 시 기존 행은 DELETE_YN='Y' soft delete 후 새 행 INSERT
  (관리자 admin_attach.get_attachments 가 최신 SUBMIT_DATETIME 만 노출).
"""

from __future__ import annotations

import secrets
from datetime import datetime
from pathlib import Path
from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("loan_attach")


ALLOWED_MIMES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MiB

# 컨테이너 안 마운트 위치. api/admin_attach 의 _FILES_ROOT 와 동일 베이스.
_FILES_ROOT = Path("/app")
_DATA_PREFIX = "data/files/loan"


def _contract_key(application_id: int) -> str:
    return f"LA-{application_id}"


async def _resolve_app_for_customer(conn, application_id: int, customer_no: int) -> dict | None:
    return await conn.fetchrow(
        'SELECT "LOAN_APP_ID","CUSTOMER_NO","APPLY_PRODUCT_ID","APPLY_STATUS_CD" '
        'FROM public."LOAN_APPLICATION" '
        'WHERE "LOAN_APP_ID" = $1 AND "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
        application_id,
        customer_no,
    )


async def get_required_docs(application_id: int, customer_no: int) -> dict[str, Any]:
    """본인 신청의 요구 서류 + 제출 상태 매트릭스.

    관리자 admin_attach.get_attachments 와 유사하지만 사용자 응답에 맞게 축약.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        app = await _resolve_app_for_customer(conn, application_id, customer_no)
        if app is None:
            raise NotFoundError(E_NOT_FOUND, "대출 신청을 찾을 수 없습니다.")

        requirements = await conn.fetch(
            'SELECT dr."REQUIREMENT_ID", dr."DOC_TYPE_ID", dr."REQUIRED_YN", dr."CONDITION", '
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

        attached = await conn.fetch(
            'SELECT "ATTACH_ID","DOC_TYPE_ID","SUBMIT_DATETIME","FILE_PATH",'
            '       "VERIFY_STATUS_CD","REJECT_REASON" '
            'FROM public."ATTACHED_DOC" '
            'WHERE "DELETE_YN" = \'N\' AND "CONTRACT_NO" = $1 '
            'ORDER BY "DOC_TYPE_ID","SUBMIT_DATETIME" DESC',
            _contract_key(application_id),
        )

    # 같은 DOC_TYPE 의 가장 최근 제출만 노출.
    latest: dict[int, dict] = {}
    for r in attached:
        tid = int(r["DOC_TYPE_ID"])
        cand = {
            "attach_id": int(r["ATTACH_ID"]),
            "submitted_at_raw": r["SUBMIT_DATETIME"],
            "file_name": (r["FILE_PATH"] or "").rsplit("/", 1)[-1] or None,
            "status_cd": (r["VERIFY_STATUS_CD"] or "PENDING").upper(),
            "reject_reason": r["REJECT_REASON"],
        }
        prev = latest.get(tid)
        if prev is None or (cand["submitted_at_raw"] or "") >= (prev["submitted_at_raw"] or ""):
            latest[tid] = cand

    items: list[dict[str, Any]] = []
    required_total = required_verified = required_missing = 0
    for req in requirements:
        tid = int(req["DOC_TYPE_ID"])
        is_required = (req["REQUIRED_YN"] or "N") == "Y"
        sub = latest.get(tid)
        status = "MISSING" if sub is None else sub["status_cd"]
        items.append({
            "requirement_id": int(req["REQUIREMENT_ID"]),
            "doc_type_id": tid,
            "doc_name": req["DOC_NAME"] or "",
            "doc_category_cd": req["DOC_CATEGORY_CD"],
            "required_yn": req["REQUIRED_YN"] or "N",
            "condition": req["CONDITION"],
            "valid_months": int(req["VALID_MONTHS"] or 0) or None,
            "status_cd": status,
            "submission": {
                "attach_id": sub["attach_id"],
                "file_name": sub["file_name"],
                "status_cd": sub["status_cd"],
                "reject_reason": sub["reject_reason"],
            } if sub else None,
        })
        if is_required:
            required_total += 1
            if status == "VERIFIED":
                required_verified += 1
            if status == "MISSING":
                required_missing += 1

    return {
        "application_id": application_id,
        "apply_status_cd": app["APPLY_STATUS_CD"],
        "summary": {
            "required_total": required_total,
            "required_verified": required_verified,
            "required_missing": required_missing,
            "complete_yn": "Y" if required_total > 0 and required_verified == required_total else "N",
        },
        "items": items,
    }


def _next_attach_id_sql() -> str:
    """ATTACH_ID 가 IDENTITY 가 아니므로 MAX+1. 동시성 충돌은 매우 낮은 시연 부하에서 무시."""
    return 'SELECT COALESCE(MAX("ATTACH_ID"),0) + 1 FROM public."ATTACHED_DOC"'


async def upload_attachment(
    application_id: int,
    customer_no: int,
    *,
    doc_type_id: int,
    file_bytes: bytes,
    content_type: str,
    original_name: str,
) -> dict[str, Any]:
    """multipart 업로드 — 본인 신청 + DOC_REQUIREMENT 매칭 검증 후 디스크 저장 + DB INSERT."""
    # 1. MIME / size 검증
    mime = (content_type or "").lower().split(";")[0].strip()
    ext = ALLOWED_MIMES.get(mime)
    if ext is None:
        raise BusinessError(
            E_VALIDATION,
            "이미지(JPG/PNG/WEBP) 또는 PDF 파일만 업로드할 수 있어요.",
        )
    if len(file_bytes) > MAX_FILE_SIZE:
        raise BusinessError(
            E_VALIDATION,
            f"파일이 너무 큽니다. {MAX_FILE_SIZE // (1024 * 1024)}MB 이하로 다시 시도해 주세요.",
        )
    if len(file_bytes) == 0:
        raise BusinessError(E_VALIDATION, "빈 파일은 업로드할 수 없어요.")

    pool = get_pool()
    async with pool.acquire() as conn:
        # 2. 본인 신청 + product_id 확인
        app = await _resolve_app_for_customer(conn, application_id, customer_no)
        if app is None:
            raise NotFoundError(E_NOT_FOUND, "대출 신청을 찾을 수 없습니다.")
        # 3. 요구사항에 정의된 DOC_TYPE_ID 만 허용
        req = await conn.fetchrow(
            'SELECT "REQUIREMENT_ID" FROM public."DOC_REQUIREMENT" '
            'WHERE "PRODUCT_ID" = $1 AND "DOC_TYPE_ID" = $2 '
            '  AND "TRANSACTION_TYPE" = \'대출\' '
            '  AND COALESCE("INACTIVE_YN",\'N\') = \'N\' '
            '  AND "DELETE_YN" = \'N\'',
            app["APPLY_PRODUCT_ID"],
            doc_type_id,
        )
        if req is None:
            raise BusinessError(E_VALIDATION, "이 상품에 해당하지 않는 서류 종류입니다.")

        # 4. 디스크 저장
        rel_dir = f"{_DATA_PREFIX}/{application_id}"
        abs_dir = _FILES_ROOT / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)
        token = secrets.token_hex(8)
        stored_name = f"{token}.{ext}"
        abs_path = abs_dir / stored_name
        abs_path.write_bytes(file_bytes)
        file_path = f"/files/loan/{application_id}/{stored_name}"

        # 5. 같은 DOC_TYPE 의 기존 행 soft-delete
        await conn.execute(
            'UPDATE public."ATTACHED_DOC" '
            'SET "DELETE_YN" = \'Y\', "UPDATED_AT" = NOW(), "UPDATED_BY" = $1 '
            'WHERE "CONTRACT_NO" = $2 AND "DOC_TYPE_ID" = $3 AND "DELETE_YN" = \'N\'',
            str(customer_no),
            _contract_key(application_id),
            doc_type_id,
        )

        # 6. 새 행 INSERT
        attach_id = int(await conn.fetchval(_next_attach_id_sql()))
        submit_dt = datetime.now().strftime("%Y%m%d%H%M%S")
        await conn.execute(
            'INSERT INTO public."ATTACHED_DOC" ('
            '  "ATTACH_ID","CUSTOMER_NO","CONTRACT_NO","DOC_TYPE_ID",'
            '  "SUBMIT_DATETIME","FILE_PATH","VERIFY_STATUS_CD","DELETE_YN","CREATED_BY"'
            ") VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 'N', $7)",
            attach_id,
            customer_no,
            _contract_key(application_id),
            doc_type_id,
            submit_dt,
            file_path,
            str(customer_no),
        )

    log.info(
        "attachment_uploaded",
        application_id=application_id,
        customer_no=customer_no,
        doc_type_id=doc_type_id,
        attach_id=attach_id,
        bytes=len(file_bytes),
        mime=mime,
    )
    return {
        "attach_id": attach_id,
        "doc_type_id": doc_type_id,
        "file_name": original_name or stored_name,
        "status_cd": "PENDING",
    }
