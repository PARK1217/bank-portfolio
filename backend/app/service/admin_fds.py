"""관리자 — 의심거래(FDS_DETECTION) 모니터링·조사.

엔드포인트 흐름
- list_admin_fds(...) : 의심거래 큐 (필터: 판정/조사 상태/회원)
- get_admin_fds_detail(customer_no, detect_seq) : 단건 + TRANSACTION/ACCESS_LOG 컨텍스트
- update_investigation(...) : 조사 상태·결론 갱신

코드값
- JUDGMENT_CD             : NORMAL / WARN / BLOCK (판정)
- INVESTIGATION_STATUS_CD : PENDING / CONFIRM / REPORT / CLOSE
- EXTRA_AUTH_SUCCESS      : Y/N (추가인증 통과 여부)
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError

log = structlog.get_logger("admin_fds")


_ALLOWED_STATUS = ("PENDING", "CONFIRM", "REPORT", "CLOSE")


async def get_admin_fds_dashboard() -> dict[str, Any]:
    """FDS 메인 진입 시 KPI 카드.

    - pending           : 미조사(INVESTIGATION_STATUS_CD='PENDING') 건
    - today_detected    : 오늘 발생 건 (DETECT_DATETIME prefix=YYYYMMDD)
    - high_risk_pending : WARN/BLOCK 판정 + PENDING 건
    - by_judgment       : 판정별 분포 [{judgment_cd, count}]
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        pending = await conn.fetchval(
            'SELECT COUNT(*) FROM public."FDS_DETECTION" '
            'WHERE "DELETE_YN"=\'N\' AND COALESCE("INVESTIGATION_STATUS_CD",\'PENDING\')=\'PENDING\''
        )
        today_detected = await conn.fetchval(
            'SELECT COUNT(*) FROM public."FDS_DETECTION" '
            'WHERE "DELETE_YN"=\'N\' '
            "  AND SUBSTRING(\"DETECT_DATETIME\",1,8) = to_char(CURRENT_DATE, 'YYYYMMDD')"
        )
        high_risk_pending = await conn.fetchval(
            'SELECT COUNT(*) FROM public."FDS_DETECTION" '
            'WHERE "DELETE_YN"=\'N\' AND "JUDGMENT_CD" IN (\'WARN\',\'BLOCK\') '
            "  AND COALESCE(\"INVESTIGATION_STATUS_CD\",'PENDING')='PENDING'"
        )
        by_judgment = await conn.fetch(
            'SELECT COALESCE("JUDGMENT_CD",\'UNKNOWN\') AS jcd, COUNT(*) AS cnt '
            'FROM public."FDS_DETECTION" WHERE "DELETE_YN"=\'N\' '
            'GROUP BY "JUDGMENT_CD" ORDER BY cnt DESC'
        )
    return {
        "pending": int(pending or 0),
        "today_detected": int(today_detected or 0),
        "high_risk_pending": int(high_risk_pending or 0),
        "by_judgment": [
            {"judgment_cd": r["jcd"], "count": int(r["cnt"])} for r in by_judgment
        ],
    }


async def list_admin_fds(
    judgment_cd: str | None = None,
    investigation_status_cd: str | None = None,
    query: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['fd."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if judgment_cd:
            params.append(judgment_cd)
            clauses.append(f'fd."JUDGMENT_CD" = ${len(params)}')
        if investigation_status_cd:
            params.append(investigation_status_cd)
            clauses.append(
                f'COALESCE(fd."INVESTIGATION_STATUS_CD",\'PENDING\') = ${len(params)}'
            )
        if query:
            params.append(f"%{query}%")
            params.append(query)
            i1, i2 = len(params) - 1, len(params)
            clauses.append(
                f"(p.\"PARTY_NAME\" ILIKE ${i1} OR CAST(fd.\"CUSTOMER_NO\" AS TEXT) = ${i2})"
            )
        where = " AND ".join(clauses)

        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."FDS_DETECTION" fd '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = fd."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )
        params_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT fd."CUSTOMER_NO", fd."DETECT_SEQ", fd."DETECT_DATETIME", '
            f'       fd."TOTAL_SCORE", fd."JUDGMENT_CD", '
            f'       COALESCE(fd."INVESTIGATION_STATUS_CD",\'PENDING\') AS investigation_status_cd, '
            f'       fd."EXTRA_AUTH_SUCCESS", fd."ACCESS_IP", fd."ACCESS_COUNTRY", '
            f'       fd."RESPONSE_TIME_MS", fd."REMARK", fd."TRANSACTION_ID", fd."ACCOUNT_NO", '
            f'       p."PARTY_NAME" AS customer_name '
            f'FROM public."FDS_DETECTION" fd '
            f'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = fd."CUSTOMER_NO" '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY fd."DETECT_DATETIME" DESC NULLS LAST '
            f'LIMIT ${len(params_paging) - 1} OFFSET ${len(params_paging)}',
            *params_paging,
        )

    items = [_row(r) for r in rows]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_admin_fds_detail(customer_no: int, detect_seq: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        fd = await conn.fetchrow(
            'SELECT fd.*, p."PARTY_NAME" AS customer_name, c."EMAIL" '
            'FROM public."FDS_DETECTION" fd '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = fd."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE fd."CUSTOMER_NO" = $1 AND fd."DETECT_SEQ" = $2 AND fd."DELETE_YN" = \'N\'',
            customer_no,
            detect_seq,
        )
        if fd is None:
            raise NotFoundError(E_NOT_FOUND, "해당 의심거래를 찾을 수 없어요.")

        # 거래 컨텍스트 — TRANSACTION_ID 가 있으면 한 건 조회.
        tx: dict | None = None
        if fd["TRANSACTION_ID"] is not None:
            tx_row = await conn.fetchrow(
                'SELECT "TRANSACTION_ID","ACCOUNT_NO","TX_DATETIME","TX_TYPE_CD","TX_AMOUNT",'
                '       "POST_TX_BALANCE","COUNTERPART_ACCOUNT_NO","COUNTERPART_BANK_CD",'
                '       "COUNTERPART_HOLDER_NAME","OWN_BANK_YN","TX_STATUS_CD","TX_MEMO" '
                'FROM public."TRANSACTION" WHERE "TRANSACTION_ID" = $1',
                int(fd["TRANSACTION_ID"]),
            )
            if tx_row:
                tx = {
                    "transaction_id": int(tx_row["TRANSACTION_ID"]),
                    "account_no": tx_row["ACCOUNT_NO"],
                    "tx_datetime": tx_row["TX_DATETIME"],
                    "tx_type_cd": tx_row["TX_TYPE_CD"],
                    "tx_amount": int(tx_row["TX_AMOUNT"] or 0),
                    "post_tx_balance": int(tx_row["POST_TX_BALANCE"] or 0),
                    "counterpart_account_no": tx_row["COUNTERPART_ACCOUNT_NO"],
                    "counterpart_bank_cd": tx_row["COUNTERPART_BANK_CD"],
                    "counterpart_holder_name": tx_row["COUNTERPART_HOLDER_NAME"],
                    "own_bank_yn": tx_row["OWN_BANK_YN"],
                    "tx_status_cd": tx_row["TX_STATUS_CD"],
                    "tx_memo": tx_row["TX_MEMO"],
                }

    return {
        "detection": _row_full(fd),
        "transaction": tx,
    }


async def update_investigation(
    customer_no: int,
    detect_seq: int,
    status_cd: str,
    conclusion: str | None,
    employee_no: str,
) -> dict[str, Any]:
    """조사 상태 갱신. PENDING → CONFIRM/REPORT/CLOSE."""
    if status_cd not in _ALLOWED_STATUS:
        raise BusinessError(
            E_VALIDATION,
            f"investigation_status_cd 는 {'/'.join(_ALLOWED_STATUS)} 만 허용",
        )
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'UPDATE public."FDS_DETECTION" '
            '   SET "INVESTIGATION_STATUS_CD" = $1, '
            '       "INVESTIGATION_CONCLUSION" = COALESCE($2, "INVESTIGATION_CONCLUSION"), '
            '       "INVESTIGATOR_EMP_NO" = COALESCE("INVESTIGATOR_EMP_NO", $3), '
            '       "REVIEWER_EMP_NO" = $3, '
            '       "UPDATED_BY" = $3, '
            '       "UPDATED_AT" = NOW() '
            ' WHERE "CUSTOMER_NO" = $4 AND "DETECT_SEQ" = $5 AND "DELETE_YN" = \'N\' '
            'RETURNING "CUSTOMER_NO","DETECT_SEQ","INVESTIGATION_STATUS_CD","INVESTIGATION_CONCLUSION"',
            status_cd,
            conclusion,
            employee_no,
            customer_no,
            detect_seq,
        )
        if row is None:
            raise NotFoundError(E_NOT_FOUND, "해당 의심거래를 찾을 수 없어요.")
    log.info(
        "fds_investigation_updated",
        customer_no=customer_no,
        detect_seq=detect_seq,
        status_cd=status_cd,
        by=employee_no,
    )
    return {
        "customer_no": int(row["CUSTOMER_NO"]),
        "detect_seq": int(row["DETECT_SEQ"]),
        "investigation_status_cd": row["INVESTIGATION_STATUS_CD"],
        "investigation_conclusion": row["INVESTIGATION_CONCLUSION"],
    }


def _row(r: Any) -> dict[str, Any]:
    return {
        "customer_no": int(r["CUSTOMER_NO"]),
        "detect_seq": int(r["DETECT_SEQ"]),
        "customer_name": r["customer_name"],
        "detect_datetime": r["DETECT_DATETIME"],
        "total_score": int(r["TOTAL_SCORE"]) if r["TOTAL_SCORE"] is not None else None,
        "judgment_cd": r["JUDGMENT_CD"],
        "investigation_status_cd": r["investigation_status_cd"],
        "extra_auth_success": r["EXTRA_AUTH_SUCCESS"],
        "access_ip": r["ACCESS_IP"],
        "access_country": r["ACCESS_COUNTRY"],
        "response_time_ms": int(r["RESPONSE_TIME_MS"]) if r["RESPONSE_TIME_MS"] is not None else None,
        "remark": r["REMARK"],
        "transaction_id": int(r["TRANSACTION_ID"]) if r["TRANSACTION_ID"] is not None else None,
        "account_no": r["ACCOUNT_NO"],
    }


def _row_full(r: Any) -> dict[str, Any]:
    base = _row(r) if "investigation_status_cd" in r.keys() else _row({
        **{k: r[k] for k in r.keys()},
        "investigation_status_cd": r["INVESTIGATION_STATUS_CD"] or "PENDING",
        "customer_name": r["customer_name"],
    })
    base["customer_email"] = r["EMAIL"]
    base["investigator_emp_no"] = r["INVESTIGATOR_EMP_NO"]
    base["reviewer_emp_no"] = r["REVIEWER_EMP_NO"]
    base["investigation_detail"] = r["INVESTIGATION_DETAIL"]
    base["investigation_conclusion"] = r["INVESTIGATION_CONCLUSION"]
    base["linked_restriction_id"] = (
        int(r["LINKED_RESTRICTION_ID"]) if r["LINKED_RESTRICTION_ID"] is not None else None
    )
    return base
