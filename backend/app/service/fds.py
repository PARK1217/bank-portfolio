"""FDS 의심거래 — SCR-SC-007.

화면 `/security/fds-alerts` 가 호출하는 list/confirm/report API 의 도메인 로직.

DB 매핑
- FDS_DETECTION (PK: CUSTOMER_NO + DETECT_SEQ)
  - DETECT_SEQ            → 응답 fds_id (고객 컨텍스트 안에서만 유효한 식별자)
  - DETECT_DATETIME       → ISO 8601 detected_at (yyyymmddhhmmss → datetime)
  - TOTAL_SCORE           → score
  - TRANSACTION_ID        → TRANSACTION 조인 후 tx_token 발급
  - REMARK                → "/" 구분으로 reasons 배열 분해
  - INVESTIGATION_STATUS_CD
      PENDING / NULL → PENDING
      CONFIRM        → CONFIRMED_OK (본인 거래로 확인)
      REPORT         → REPORTED   (신고 접수)
- TRANSACTION JOIN
  - TX_AMOUNT             → amount_krw
  - COUNTERPART_*          → to_masked (`마스킹된계좌 (은행) 예금주`)

상태 전이는 PENDING → CONFIRM | REPORT 단방향, 그 외는 409 (이미 처리됨).
신고 시 NOTIFICATION (TYPE_CD=FDS) 1건 발행.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from ..db import get_pool
from ..errors import E_IDEMPOTENCY_CONFLICT, E_NOT_FOUND
from ..exceptions import ConflictError, NotFoundError
from ..logging_setup import mask_account_no
from .account import issue_tx_token
from .notification import insert_notification
from .token import TokenService

log = structlog.get_logger("fds")


_STATUS_DB_TO_API = {
    "PENDING": "PENDING",
    None: "PENDING",
    "": "PENDING",
    "CONFIRM": "CONFIRMED_OK",
    "REPORT": "REPORTED",
}


def _parse_dt14(s: str | None) -> datetime | None:
    if not s or len(s) < 14:
        return None
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


def _split_reasons(remark: str | None) -> list[str]:
    if not remark:
        return []
    # 시드/운영에서 "사유1 / 사유2 / 사유3" 형태로 저장. 빈 토큰은 제외.
    parts = [p.strip() for p in remark.split("/")]
    return [p for p in parts if p]


def _build_to_masked(
    counterpart_no: str | None,
    bank_name: str | None,
    holder_name: str | None,
) -> str | None:
    if not counterpart_no and not holder_name:
        return None
    pieces: list[str] = []
    if counterpart_no:
        pieces.append(mask_account_no(counterpart_no))
    if bank_name:
        pieces.append(f"({bank_name})")
    if holder_name:
        pieces.append(holder_name)
    return " ".join(pieces) if pieces else None


async def list_alerts(customer_no: int, tokens: TokenService) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT f."DETECT_SEQ", f."DETECT_DATETIME", f."TOTAL_SCORE", '
            '       f."TRANSACTION_ID", f."REMARK", f."INVESTIGATION_STATUS_CD", '
            '       t."TX_AMOUNT", t."COUNTERPART_ACCOUNT_NO", '
            '       t."COUNTERPART_BANK_NAME", t."COUNTERPART_HOLDER_NAME", '
            '       d."RULE_FIRED", d."ML_ANOMALY", d."LLM_EXPLAIN" '
            'FROM public."FDS_DETECTION" f '
            'LEFT JOIN public."TRANSACTION" t '
            '       ON t."TRANSACTION_ID" = f."TRANSACTION_ID" '
            'LEFT JOIN public."AI_FDS_DECISION" d '
            '       ON d."CUSTOMER_NO" = f."CUSTOMER_NO" '
            '      AND d."FDS_DETECT_SEQ" = f."DETECT_SEQ" '
            'WHERE f."CUSTOMER_NO" = $1 AND f."DELETE_YN" = \'N\' '
            'ORDER BY f."DETECT_DATETIME" DESC NULLS LAST, '
            '         f."DETECT_SEQ" DESC',
            customer_no,
        )

    items: list[dict[str, Any]] = []
    for r in rows:
        tx_id = r["TRANSACTION_ID"]
        tx_token = (
            await issue_tx_token(tokens, int(tx_id), customer_no)
            if tx_id is not None
            else None
        )
        detected_at = _parse_dt14(r["DETECT_DATETIME"]) or datetime.now()
        # 자동 분류기가 REMARK 에 LLM 자연어 답변을 저장한 경우, 그 자체를 explanation 으로 노출.
        # 룰 코드 → 한국어 desc 매핑은 RULES_META 룩업.
        rule_fired_str = (r["RULE_FIRED"] or "").strip()
        fired_rules: list[str] = []
        rule_reasons: list[str] = []
        if rule_fired_str:
            from .fds_rules import RULES_META as _RULES
            fired_rules = [x.strip() for x in rule_fired_str.split(",") if x.strip()]
            rule_reasons = [_RULES.get(c, (c, 0))[0] for c in fired_rules]
        # 시드 데이터는 RULE_FIRED 가 비어있어 REMARK 슬래시 분리로 fallback.
        reasons = rule_reasons or _split_reasons(r["REMARK"])
        items.append(
            {
                "fds_id": int(r["DETECT_SEQ"]),
                "detected_at": detected_at,
                "tx_token": tx_token,
                # 출금 거래는 TX_AMOUNT 가 음수로 저장됨. 의심거래 화면은 금액을 양수 표시.
                "amount_krw": abs(int(r["TX_AMOUNT"] or 0)),
                "to_masked": _build_to_masked(
                    r["COUNTERPART_ACCOUNT_NO"],
                    r["COUNTERPART_BANK_NAME"],
                    r["COUNTERPART_HOLDER_NAME"],
                ),
                "score": int(r["TOTAL_SCORE"] or 0),
                "reasons": reasons,
                "fired_rules": fired_rules,
                "ml_anomaly": float(r["ML_ANOMALY"]) if r["ML_ANOMALY"] is not None else None,
                "llm_explain": r["LLM_EXPLAIN"] or None,
                "status_cd": _STATUS_DB_TO_API.get(
                    r["INVESTIGATION_STATUS_CD"], "PENDING"
                ),
            }
        )
    return items


async def _load_pending(conn, customer_no: int, fds_id: int) -> dict[str, Any]:
    row = await conn.fetchrow(
        'SELECT "DETECT_SEQ", "INVESTIGATION_STATUS_CD", "TRANSACTION_ID", "TOTAL_SCORE" '
        'FROM public."FDS_DETECTION" '
        'WHERE "CUSTOMER_NO" = $1 AND "DETECT_SEQ" = $2 AND "DELETE_YN" = \'N\' '
        "FOR UPDATE",
        customer_no,
        fds_id,
    )
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "해당 의심 거래를 찾을 수 없어요.")
    status = (row["INVESTIGATION_STATUS_CD"] or "PENDING").strip() or "PENDING"
    if status not in ("PENDING",):
        raise ConflictError(
            E_IDEMPOTENCY_CONFLICT,
            "이미 처리된 의심 거래예요.",
        )
    return dict(row)


async def confirm_alert(customer_no: int, fds_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await _load_pending(conn, customer_no, fds_id)
            await conn.execute(
                'UPDATE public."FDS_DETECTION" '
                'SET "INVESTIGATION_STATUS_CD" = \'CONFIRM\', '
                '    "INVESTIGATION_CONCLUSION" = \'고객 본인 거래로 확인\', '
                '    "UPDATED_BY" = $3, "UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $1 AND "DETECT_SEQ" = $2',
                customer_no,
                fds_id,
                str(customer_no),
            )
    log.info("fds_alert_confirm", customer_no=customer_no, fds_id=fds_id)


async def report_alert(customer_no: int, fds_id: int) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await _load_pending(conn, customer_no, fds_id)
            await conn.execute(
                'UPDATE public."FDS_DETECTION" '
                'SET "INVESTIGATION_STATUS_CD" = \'REPORT\', '
                '    "INVESTIGATION_CONCLUSION" = \'고객 신고 접수\', '
                '    "UPDATED_BY" = $3, "UPDATED_AT" = NOW() '
                'WHERE "CUSTOMER_NO" = $1 AND "DETECT_SEQ" = $2',
                customer_no,
                fds_id,
                str(customer_no),
            )

    # 트랜잭션 밖에서 알림 발행 (insert_notification 이 별도 pool.acquire 사용).
    await insert_notification(
        customer_no,
        type_cd="FDS",
        title="의심 거래 신고가 접수되었어요",
        body=(
            "신고하신 거래에 대해 즉시 조사가 시작됩니다. "
            "추가 확인이 필요할 경우 등록된 연락처로 안내드릴게요."
        ),
        link_url="/security/fds-alerts",
        reference_id=fds_id,
        reference_type="FDS_ALERT",
    )
    log.info("fds_alert_report", customer_no=customer_no, fds_id=fds_id)