"""관리자 — 회원(고객) 목록·상세 조회.

엔드포인트
- list_customers(query, grade_cd, status_cd, limit, offset)
    검색 기준: customer_no(부분 일치), email(부분 일치), PARTY_NAME(부분 일치).
    필터: CUST_GRADE_CD(VIP/GENERAL/MINOR/SENIOR…), CUST_STATUS_CD(5050/LIMITED/LOCKED…).
- get_customer_detail(customer_no)
    회원 1명의 PARTY/CUSTOMER + 연락처 + 주소 + 계좌 요약 + 대출 요약 + 위임 등.
"""

from __future__ import annotations

from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_NOT_FOUND
from ..exceptions import NotFoundError

log = structlog.get_logger("admin_customer")


async def list_customers(
    query: str | None = None,
    grade_cd: str | None = None,
    status_cd: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        clauses = ['c."DELETE_YN" = \'N\'']
        params: list[Any] = []
        if query:
            params.append(f"%{query}%")
            params.append(f"%{query}%")
            params.append(query)
            i1, i2, i3 = len(params) - 2, len(params) - 1, len(params)
            clauses.append(
                f"(c.\"EMAIL\" ILIKE ${i1} OR p.\"PARTY_NAME\" ILIKE ${i2} "
                f"OR CAST(c.\"CUSTOMER_NO\" AS TEXT) = ${i3})"
            )
        if grade_cd:
            params.append(grade_cd)
            clauses.append(f'c."CUST_GRADE_CD" = ${len(params)}')
        if status_cd:
            params.append(status_cd)
            clauses.append(f'c."CUST_STATUS_CD" = ${len(params)}')
        where = " AND ".join(clauses)

        # 합산 카운트
        total = await conn.fetchval(
            f'SELECT COUNT(*) FROM public."CUSTOMER" c '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where}",
            *params,
        )

        # 목록
        params_with_paging = [*params, limit, offset]
        rows = await conn.fetch(
            f'SELECT c."CUSTOMER_NO", c."EMAIL", c."CUST_GRADE_CD", c."CUST_STATUS_CD", '
            f'       c."JOIN_DATETIME", c."MARKETING_AGREE_YN", '
            f'       p."PARTY_NAME", p."BIRTH_FOUND_DATE", '
            f'       (SELECT COUNT(*) FROM public."ACCOUNT" a '
            f'           WHERE a."CUSTOMER_NO" = c."CUSTOMER_NO" '
            f'             AND a."DELETE_YN" = \'N\') AS account_count, '
            f'       (SELECT COALESCE(SUM(a."BALANCE"), 0) FROM public."ACCOUNT" a '
            f'           WHERE a."CUSTOMER_NO" = c."CUSTOMER_NO" '
            f'             AND a."DELETE_YN" = \'N\') AS total_balance, '
            f'       (SELECT COUNT(*) FROM public."LOAN_CONTRACT" lc '
            f'           WHERE lc."CUSTOMER_NO" = c."CUSTOMER_NO" '
            f'             AND lc."DELETE_YN" = \'N\') AS loan_count '
            f'FROM public."CUSTOMER" c '
            f'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            f"WHERE {where} "
            f'ORDER BY c."CUSTOMER_NO" '
            f"LIMIT ${len(params_with_paging) - 1} OFFSET ${len(params_with_paging)}",
            *params_with_paging,
        )

    items = [
        {
            "customer_no": int(r["CUSTOMER_NO"]),
            "name": r["PARTY_NAME"],
            "email": r["EMAIL"],
            "grade_cd": r["CUST_GRADE_CD"],
            "status_cd": r["CUST_STATUS_CD"],
            "birth_date": r["BIRTH_FOUND_DATE"],
            "join_datetime": r["JOIN_DATETIME"],
            "marketing_agree_yn": r["MARKETING_AGREE_YN"],
            "account_count": int(r["account_count"] or 0),
            "total_balance": int(r["total_balance"] or 0),
            "loan_count": int(r["loan_count"] or 0),
        }
        for r in rows
    ]
    return {"items": items, "count": len(items), "total": int(total or 0)}


async def get_customer_detail(customer_no: int) -> dict[str, Any]:
    pool = get_pool()
    async with pool.acquire() as conn:
        cust = await conn.fetchrow(
            'SELECT c."CUSTOMER_NO", c."EMAIL", c."CUST_GRADE_CD", c."CUST_STATUS_CD", '
            '       c."JOIN_DATETIME", c."MARKETING_AGREE_YN", c."PRIVACY_AGREE_YN", '
            '       c."PARTY_ID", '
            '       p."PARTY_NAME", p."PARTY_TYPE_CD", p."BIRTH_FOUND_DATE", '
            '       ip."GENDER", ip."CURRENT_EMPLOYER", ip."ANNUAL_INCOME" '
            'FROM public."CUSTOMER" c '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'LEFT JOIN public."INDIVIDUAL_PARTY" ip ON ip."PARTY_ID" = c."PARTY_ID" '
            'WHERE c."CUSTOMER_NO" = $1 AND c."DELETE_YN" = \'N\'',
            customer_no,
        )
        if cust is None:
            raise NotFoundError(E_NOT_FOUND, "해당 회원을 찾을 수 없어요.")

        contacts = await conn.fetch(
            'SELECT "CONTACT_TYPE_CD","CONTACT_VALUE","PRIMARY_YN","VERIFIED_YN" '
            'FROM public."CUSTOMER_CONTACT" '
            'WHERE "CUSTOMER_NO" = $1 ORDER BY "CONTACT_SEQ"',
            customer_no,
        )
        addresses = await conn.fetch(
            'SELECT "ADDR_TYPE_CD","POSTAL_CODE","ADDR_LINE1","ADDR_LINE2","PRIMARY_YN" '
            'FROM public."CUSTOMER_ADDRESS" '
            'WHERE "CUSTOMER_NO" = $1 ORDER BY "ADDR_SEQ"',
            customer_no,
        )
        accounts = await conn.fetch(
            'SELECT "ACCOUNT_NO","ACCOUNT_TYPE_CD","ACCOUNT_STATUS_CD","BALANCE",'
            '       "ACCOUNT_ALIAS","DAILY_WITHDRAW_LIMIT","DAILY_TRANSFER_LIMIT",'
            '       "PRIMARY_ACCOUNT_YN","OPEN_DATE","LIMITED_ACCOUNT_YN","HIDDEN_YN" '
            'FROM public."ACCOUNT" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "PRIMARY_ACCOUNT_YN" DESC, "ACCOUNT_NO"',
            customer_no,
        )
        loans = await conn.fetch(
            'SELECT "LOAN_CONTRACT_NO","PRODUCT_NAME_SNAPSHOT","LOAN_TYPE_CD",'
            '       "CONTRACT_LIMIT","CURRENT_USAGE","CONTRACT_RATE","OVERDUE_SPREAD_RATE",'
            '       "LOAN_STATUS_CD","OVERDUE_STAGE_CD","CONTRACT_DATE","MATURITY_DATE" '
            'FROM public."LOAN_CONTRACT" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "CONTRACT_DATE" DESC',
            customer_no,
        )
        delegations_out = await conn.fetch(
            'SELECT "DELEGATION_ID","TARGET_CUST_NO","AGENT_CUST_NO","ROLE_TYPE_CD",'
            '       "INQUIRY_PERM","WITHDRAW_PERM","TRANSFER_PERM","CLOSE_PERM",'
            '       "DELEG_START_DATE" '
            'FROM public."DELEGATION" '
            'WHERE "TARGET_CUST_NO" = $1 OR "AGENT_CUST_NO" = $1 '
            'ORDER BY "DELEGATION_ID" DESC LIMIT 20',
            customer_no,
        )

    return {
        "customer": {
            "customer_no": int(cust["CUSTOMER_NO"]),
            "party_id": int(cust["PARTY_ID"]) if cust["PARTY_ID"] is not None else None,
            "name": cust["PARTY_NAME"],
            "email": cust["EMAIL"],
            "grade_cd": cust["CUST_GRADE_CD"],
            "status_cd": cust["CUST_STATUS_CD"],
            "join_datetime": cust["JOIN_DATETIME"],
            "marketing_agree_yn": cust["MARKETING_AGREE_YN"],
            "privacy_agree_yn": cust["PRIVACY_AGREE_YN"],
            "party_type_cd": cust["PARTY_TYPE_CD"],
            "birth_date": cust["BIRTH_FOUND_DATE"],
            "gender": cust["GENDER"],
            "current_employer": cust["CURRENT_EMPLOYER"],
            "annual_income": int(cust["ANNUAL_INCOME"]) if cust["ANNUAL_INCOME"] is not None else None,
        },
        "contacts": [
            {
                "contact_type_cd": c["CONTACT_TYPE_CD"],
                "value": c["CONTACT_VALUE"],
                "primary_yn": c["PRIMARY_YN"],
                "verified_yn": c["VERIFIED_YN"],
            }
            for c in contacts
        ],
        "addresses": [
            {
                "addr_type_cd": a["ADDR_TYPE_CD"],
                "postal_code": a["POSTAL_CODE"],
                "line1": a["ADDR_LINE1"],
                "line2": a["ADDR_LINE2"],
                "primary_yn": a["PRIMARY_YN"],
            }
            for a in addresses
        ],
        "accounts": [
            {
                "account_no": a["ACCOUNT_NO"],
                "account_type_cd": a["ACCOUNT_TYPE_CD"],
                "status_cd": a["ACCOUNT_STATUS_CD"],
                "balance": int(a["BALANCE"] or 0),
                "alias": a["ACCOUNT_ALIAS"],
                "daily_withdraw_limit": int(a["DAILY_WITHDRAW_LIMIT"] or 0),
                "daily_transfer_limit": int(a["DAILY_TRANSFER_LIMIT"] or 0),
                "primary_yn": a["PRIMARY_ACCOUNT_YN"],
                "open_date": a["OPEN_DATE"],
                "limited_yn": a["LIMITED_ACCOUNT_YN"],
                "hidden_yn": a["HIDDEN_YN"],
            }
            for a in accounts
        ],
        "loans": [
            {
                "loan_contract_no": l["LOAN_CONTRACT_NO"],
                "product_name": l["PRODUCT_NAME_SNAPSHOT"],
                "loan_type_cd": l["LOAN_TYPE_CD"],
                "contract_limit": int(l["CONTRACT_LIMIT"] or 0),
                "current_usage": int(l["CURRENT_USAGE"] or 0),
                "contract_rate": float(l["CONTRACT_RATE"] or 0),
                "overdue_spread_rate": float(l["OVERDUE_SPREAD_RATE"] or 0),
                "loan_status_cd": l["LOAN_STATUS_CD"],
                "overdue_stage_cd": l["OVERDUE_STAGE_CD"],
                "contract_date": l["CONTRACT_DATE"],
                "maturity_date": l["MATURITY_DATE"],
            }
            for l in loans
        ],
        "delegations": [
            {
                "delegation_id": int(d["DELEGATION_ID"]),
                "target_cust_no": int(d["TARGET_CUST_NO"]) if d["TARGET_CUST_NO"] is not None else None,
                "agent_cust_no": int(d["AGENT_CUST_NO"]) if d["AGENT_CUST_NO"] is not None else None,
                "role_type_cd": d["ROLE_TYPE_CD"],
                "inquiry_perm": d["INQUIRY_PERM"],
                "withdraw_perm": d["WITHDRAW_PERM"],
                "transfer_perm": d["TRANSFER_PERM"],
                "close_perm": d["CLOSE_PERM"],
                "start_date": d["DELEG_START_DATE"],
                "direction": "AS_TARGET" if d["TARGET_CUST_NO"] == customer_no else "AS_AGENT",
            }
            for d in delegations_out
        ],
    }