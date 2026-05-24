"""관리자 — 약관(TERMS_MASTER) 운영.

조회 + 발행 + 개정 + 동의 통계.

TERMS_MASTER
- TERMS_TYPE_CD : DEPOSIT / GENERAL / LOAN / MARKET / PRD_SPEC / PRIVACY / TRANSFER
- TERMS_STATUS_CD : ACTIVE / INACTIVE / ARCHIVED
- AGREE_REQUIRED_YN / RE_AGREE_YN
- VERSION (smallint) — 신규 발행 시 자동 채번 (같은 TYPE+NAME 의 MAX+1)
- TERMS_BODY (text)
- EFFECTIVE_DATE / EXPIRE_DATE (yyyymmdd)

기존 frontend 공개 API (`/api/terms`) 는 본문을 markdown 파일에서 읽어옴 — admin 은
DB TERMS_BODY 를 1차 소스로 다룬다. 화면에 둘 다 보여주는 건 추후 과제.

CUSTOMER_TERMS_AGREE 는 admin 화면에서 동의율 집계만 (TERMS_ID 별).

PRD_SPEC 은 상품 등록 자동 생성이라 일반 admin 흐름과 분리 — 노출은 하되 별도 라벨로
표시. delete/update 는 운영 결정 따라 차단 가능. 본 구현은 자유롭게 허용 (운영자 책임).
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_terms")

TERMS_TYPES = {"DEPOSIT", "GENERAL", "LOAN", "MARKET", "PRD_SPEC", "PRIVACY", "TRANSFER"}
TERMS_STATUSES = {"ACTIVE", "INACTIVE", "ARCHIVED"}


async def list_terms(
    query: str | None = None,
    type_cd: str | None = None,
    status_cd: str | None = None,
    required_yn: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['"DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            i1, i2 = len(params) - 1, len(params)
            clauses.append(f'("TERMS_NAME" ILIKE ${i1} OR "OWNER_DEPT" ILIKE ${i2})')
        if type_cd:
            params.append(type_cd)
            clauses.append(f'"TERMS_TYPE_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f'"TERMS_STATUS_CD" = ${len(params)}')
        if required_yn:
            params.append(required_yn)
            clauses.append(f'"AGREE_REQUIRED_YN" = ${len(params)}')
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."TERMS_MASTER" WHERE {where}', *params,
        )
        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT "TERMS_ID","TERMS_TYPE_CD","TERMS_NAME","VERSION",'
            f'       "AGREE_REQUIRED_YN","RE_AGREE_YN","EFFECTIVE_DATE","EXPIRE_DATE",'
            f'       "TERMS_STATUS_CD","OWNER_DEPT","CREATED_AT" '
            f'FROM public."TERMS_MASTER" WHERE {where} '
            f'ORDER BY "TERMS_TYPE_CD", "TERMS_NAME", "VERSION" DESC, "TERMS_ID" DESC '
            f'LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}',
            *params_with_paging,
        )

    items = [_row(r) for r in rows]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_terms_detail(terms_id: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "TERMS_ID","TERMS_TYPE_CD","TERMS_NAME","VERSION",'
            '       "AGREE_REQUIRED_YN","RE_AGREE_YN","EFFECTIVE_DATE","EXPIRE_DATE",'
            '       "TERMS_BODY","TERMS_STATUS_CD","OWNER_DEPT","CREATED_AT","UPDATED_AT" '
            'FROM public."TERMS_MASTER" WHERE "TERMS_ID" = $1 AND "DELETE_YN" = \'N\'',
            terms_id,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 약관을 찾을 수 없어요.")

        # 변경 이력
        history = await conn.fetch(
            'SELECT "CHANGE_SEQ","PREV_TERMS_ID","CHANGE_TYPE_CD","CHANGE_REASON",'
            '       "ORDER_NO","EFFECTIVE_DATE","OWNER","CREATED_AT","CREATED_BY" '
            'FROM public."TERMS_CHANGE_HISTORY" '
            'WHERE "TERMS_ID" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "CHANGE_SEQ" DESC',
            terms_id,
        )

        # 동의 통계
        agree_total = await conn.fetchval(
            'SELECT COUNT(*) FROM public."CUSTOMER_TERMS_AGREE" '
            'WHERE "TERMS_ID" = $1 AND "DELETE_YN" = \'N\'',
            terms_id,
        )
        agree_yes = await conn.fetchval(
            'SELECT COUNT(*) FROM public."CUSTOMER_TERMS_AGREE" '
            'WHERE "TERMS_ID" = $1 AND "AGREE_YN" = \'Y\' AND "DELETE_YN" = \'N\'',
            terms_id,
        )
        # 동일 TYPE+NAME 다른 버전
        siblings = await conn.fetch(
            'SELECT "TERMS_ID","VERSION","EFFECTIVE_DATE","TERMS_STATUS_CD" '
            'FROM public."TERMS_MASTER" '
            'WHERE "TERMS_TYPE_CD" = $1 AND "TERMS_NAME" = $2 AND "DELETE_YN" = \'N\' '
            '  AND "TERMS_ID" <> $3 '
            'ORDER BY "VERSION" DESC, "TERMS_ID" DESC',
            row["TERMS_TYPE_CD"], row["TERMS_NAME"], terms_id,
        )

    return {
        "terms": {
            **_row(row),
            "body": row["TERMS_BODY"],
            "updated_at": row["UPDATED_AT"],
        },
        "history": [
            {
                "change_seq": int(h["CHANGE_SEQ"]),
                "prev_terms_id": int(h["PREV_TERMS_ID"]) if h["PREV_TERMS_ID"] is not None else None,
                "change_type_cd": h["CHANGE_TYPE_CD"],
                "change_reason": h["CHANGE_REASON"],
                "order_no": h["ORDER_NO"],
                "effective_date": h["EFFECTIVE_DATE"],
                "owner": h["OWNER"],
                "created_at": h["CREATED_AT"],
                "created_by": h["CREATED_BY"],
            }
            for h in history
        ],
        "agree_stats": {
            "total": int(agree_total or 0),
            "agreed": int(agree_yes or 0),
            "rate": round((agree_yes / agree_total) * 100, 1) if agree_total and agree_yes else 0.0,
        },
        "siblings": [
            {
                "terms_id": int(s["TERMS_ID"]),
                "version": int(s["VERSION"]) if s["VERSION"] is not None else None,
                "effective_date": s["EFFECTIVE_DATE"],
                "status_cd": s["TERMS_STATUS_CD"],
            }
            for s in siblings
        ],
    }


async def create_terms(
    terms_type_cd: str,
    terms_name: str,
    terms_body: str,
    effective_date: str | None,
    expire_date: str | None,
    agree_required_yn: str,
    re_agree_yn: str,
    status_cd: str,
    owner_dept: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if terms_type_cd not in TERMS_TYPES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 약관 유형: {terms_type_cd}")
    if status_cd not in TERMS_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태: {status_cd}")
    if agree_required_yn not in ("Y", "N"):
        raise BusinessError(E_VALIDATION, "AGREE_REQUIRED_YN 은 Y/N 만 허용")
    if re_agree_yn not in ("Y", "N"):
        raise BusinessError(E_VALIDATION, "RE_AGREE_YN 은 Y/N 만 허용")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 신규 ID — MAX+1
            next_id = await conn.fetchval(
                'SELECT COALESCE(MAX("TERMS_ID"), 0) + 1 FROM public."TERMS_MASTER"'
            )
            # 같은 TYPE+NAME 의 다음 버전
            next_version = await conn.fetchval(
                'SELECT COALESCE(MAX("VERSION"), 0) + 1 FROM public."TERMS_MASTER" '
                'WHERE "TERMS_TYPE_CD" = $1 AND "TERMS_NAME" = $2 AND "DELETE_YN" = \'N\'',
                terms_type_cd, terms_name,
            )
            await conn.execute(
                'INSERT INTO public."TERMS_MASTER" ('
                '  "TERMS_ID","TERMS_TYPE_CD","TERMS_NAME","VERSION",'
                '  "AGREE_REQUIRED_YN","RE_AGREE_YN","EFFECTIVE_DATE","EXPIRE_DATE",'
                '  "TERMS_BODY","TERMS_STATUS_CD","OWNER_DEPT","CREATED_BY"'
                ") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
                next_id, terms_type_cd, terms_name, next_version,
                agree_required_yn, re_agree_yn, effective_date, expire_date,
                terms_body, status_cd, owner_dept, employee_no,
            )
    log.info("terms_created", terms_id=int(next_id), type=terms_type_cd, version=int(next_version), by=employee_no)
    return {"terms_id": int(next_id), "version": int(next_version)}


async def update_terms(
    terms_id: int,
    terms_name: str | None,
    terms_body: str | None,
    effective_date: str | None,
    expire_date: str | None,
    agree_required_yn: str | None,
    re_agree_yn: str | None,
    status_cd: str | None,
    owner_dept: str | None,
    employee_no: str,
) -> dict[str, Any]:
    if status_cd is not None and status_cd not in TERMS_STATUSES:
        raise BusinessError(E_VALIDATION, f"허용되지 않는 상태: {status_cd}")
    if agree_required_yn is not None and agree_required_yn not in ("Y", "N"):
        raise BusinessError(E_VALIDATION, "AGREE_REQUIRED_YN 은 Y/N 만 허용")
    if re_agree_yn is not None and re_agree_yn not in ("Y", "N"):
        raise BusinessError(E_VALIDATION, "RE_AGREE_YN 은 Y/N 만 허용")

    sets: list[str] = []
    params: list[Any] = []
    for col, val in [
        ("TERMS_NAME", terms_name),
        ("TERMS_BODY", terms_body),
        ("EFFECTIVE_DATE", effective_date),
        ("EXPIRE_DATE", expire_date),
        ("AGREE_REQUIRED_YN", agree_required_yn),
        ("RE_AGREE_YN", re_agree_yn),
        ("TERMS_STATUS_CD", status_cd),
        ("OWNER_DEPT", owner_dept),
    ]:
        if val is not None:
            params.append(val)
            sets.append(f'"{col}" = ${len(params)}')
    if not sets:
        raise BusinessError(E_VALIDATION, "변경할 항목이 없습니다.")

    sets.append('"UPDATED_BY" = $' + str(len(params) + 1))
    params.append(employee_no)
    sets.append('"UPDATED_AT" = NOW()')
    params.append(terms_id)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval(
                'SELECT 1 FROM public."TERMS_MASTER" WHERE "TERMS_ID" = $1 AND "DELETE_YN" = \'N\'',
                terms_id,
            )
            if not exists:
                raise NotFoundError(E_NOT_FOUND, "해당 약관을 찾을 수 없어요.")
            await conn.execute(
                f'UPDATE public."TERMS_MASTER" SET {", ".join(sets)} '
                f'WHERE "TERMS_ID" = ${len(params)}',
                *params,
            )
    log.info("terms_updated", terms_id=terms_id, by=employee_no)
    return {"terms_id": terms_id}


async def delete_terms(terms_id: int, employee_no: str) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval(
                'SELECT 1 FROM public."TERMS_MASTER" WHERE "TERMS_ID" = $1 AND "DELETE_YN" = \'N\'',
                terms_id,
            )
            if not exists:
                raise NotFoundError(E_NOT_FOUND, "해당 약관을 찾을 수 없어요.")
            await conn.execute(
                'UPDATE public."TERMS_MASTER" SET "DELETE_YN" = \'Y\', '
                '"UPDATED_BY" = $1, "UPDATED_AT" = NOW() WHERE "TERMS_ID" = $2',
                employee_no, terms_id,
            )
    log.info("terms_deleted", terms_id=terms_id, by=employee_no)
    return {"terms_id": terms_id, "deleted": True}


def _row(r: Any) -> dict[str, Any]:
    return {
        "terms_id": int(r["TERMS_ID"]),
        "type_cd": r["TERMS_TYPE_CD"],
        "name": r["TERMS_NAME"],
        "version": int(r["VERSION"]) if r["VERSION"] is not None else None,
        "agree_required_yn": r["AGREE_REQUIRED_YN"],
        "re_agree_yn": r["RE_AGREE_YN"],
        "effective_date": r["EFFECTIVE_DATE"],
        "expire_date": r["EXPIRE_DATE"],
        "status_cd": r["TERMS_STATUS_CD"],
        "owner_dept": r["OWNER_DEPT"],
        "created_at": r["CREATED_AT"],
    }
