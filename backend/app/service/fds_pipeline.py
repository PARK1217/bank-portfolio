"""FDS 분류기 파이프라인 — Phase A+B+C orchestrator.

거래 발생 → Kafka topic `fds.transaction.detected` → consumer 가 본 모듈
`handle_fds_evaluation` 을 호출. 호출자는 컨슈머 핸들러만 보면 되고,
룰/ML/LLM 의 세부는 본 모듈 안에 캡슐화.

흐름:
  ① ctx 로드 (TRANSACTION + ACCOUNT JOIN)
  ② fds_rules.evaluate → rule_score, fired, features
  ③ fds_anomaly.score → ml_anomaly, ml_score
  ④ total_score = round(0.6 * rule_score + 0.4 * ml_score * 2.5)
  ⑤ total_score ≥ THRESHOLD → LLM 설명 생성, FDS_DETECTION INSERT,
     AI_FDS_DECISION INSERT, NOTIFICATION INSERT
  ⑥ total_score < THRESHOLD → AI_FDS_DECISION 만 INSERT (감사 추적)

threshold 미만은 FDS 카드에 안 떠도, 분석용 row 는 누적.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import structlog

from ..db import get_pool
from ..logging_setup import mask_account_no
from . import fds_anomaly
from . import fds_rules
from .fds_llm_explain import explain as llm_explain
from .notification import insert_notification

log = structlog.get_logger("fds_pipeline")


# 거래 발생 시 점수 ≥ THRESHOLD 이면 FDS_DETECTION 적재.
THRESHOLD = 60


# ---------------------------------------------------------------------------
# Kafka 핸들러
# ---------------------------------------------------------------------------

async def handle_fds_evaluation(record_value: bytes) -> None:
    try:
        payload = json.loads(record_value.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        log.exception("fds_payload_invalid")
        return
    tx_id = int(payload.get("transaction_id") or 0)
    if tx_id <= 0:
        log.warning("fds_payload_missing_tx_id", payload=payload)
        return
    await evaluate_transaction(
        transaction_id=tx_id,
        access_ip=payload.get("access_ip"),
        access_country=payload.get("access_country"),
        device_fingerprint=payload.get("device_fingerprint"),
    )


# ---------------------------------------------------------------------------
# 평가 본체
# ---------------------------------------------------------------------------

async def evaluate_transaction(
    *,
    transaction_id: int,
    access_ip: str | None = None,
    access_country: str | None = None,
    device_fingerprint: str | None = None,
) -> dict[str, Any] | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        tx = await conn.fetchrow(
            'SELECT t."TRANSACTION_ID", t."ACCOUNT_NO", t."TX_AMOUNT", t."TX_DATETIME", '
            '       t."COUNTERPART_ACCOUNT_NO", t."COUNTERPART_BANK_NAME", '
            '       t."COUNTERPART_HOLDER_NAME", t."OWN_BANK_YN", '
            '       a."CUSTOMER_NO", '
            '       p."PARTY_NAME" '
            'FROM public."TRANSACTION" t '
            'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
            'LEFT JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = a."CUSTOMER_NO" '
            'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE t."TRANSACTION_ID" = $1 AND t."DELETE_YN" = \'N\' '
            "  AND t.\"TX_AMOUNT\" < 0",
            transaction_id,
        )
        if tx is None:
            log.info("fds_evaluate_skip", reason="not_withdrawal_or_missing", tx_id=transaction_id)
            return None

        amount_krw = abs(int(tx["TX_AMOUNT"]))
        try:
            tx_dt = datetime.strptime(tx["TX_DATETIME"][:14], "%Y%m%d%H%M%S")
        except (TypeError, ValueError):
            tx_dt = datetime.now()

        ctx = fds_rules.FdsContext(
            customer_no=int(tx["CUSTOMER_NO"]),
            transaction_id=transaction_id,
            account_no=tx["ACCOUNT_NO"],
            amount_krw=amount_krw,
            tx_datetime=tx_dt,
            counterpart_account_no=tx["COUNTERPART_ACCOUNT_NO"],
            is_interbank=(tx["OWN_BANK_YN"] != "Y"),
            access_ip=access_ip,
            access_country=access_country,
            device_fingerprint=device_fingerprint,
        )

        # ① 룰
        rule_eval = await fds_rules.evaluate(conn, ctx)

        # ② ML — features 추출은 conn 필요 (counterpart_freq / daily_cum)
        counterpart_freq = 0
        if ctx.counterpart_account_no:
            counterpart_freq = int(await conn.fetchval(
                'SELECT COUNT(*) FROM public."TRANSACTION" t '
                'JOIN public."ACCOUNT" a ON a."ACCOUNT_NO" = t."ACCOUNT_NO" '
                'WHERE a."CUSTOMER_NO" = $1 '
                '  AND t."COUNTERPART_ACCOUNT_NO" = $2 '
                "  AND t.\"TX_DATETIME\" >= to_char(CURRENT_DATE - INTERVAL '90 days', 'YYYYMMDD') "
                '  AND t."DELETE_YN" = \'N\' AND t."TRANSACTION_ID" != $3',
                ctx.customer_no, ctx.counterpart_account_no, transaction_id,
            ) or 0)
        daily_cum = int(rule_eval.features.get("daily_cum", 0) or 0)
        anomaly_features = fds_anomaly.extract_features(
            amount_krw=amount_krw,
            hour_of_day=tx_dt.hour,
            day_of_week=tx_dt.weekday(),
            is_interbank=ctx.is_interbank,
            counterpart_freq=counterpart_freq,
            amount_zscore_personal=float(rule_eval.features.get("zscore", 0.0) or 0.0),
            daily_cum_amount=daily_cum,
        )
        ml_anomaly = fds_anomaly.score(anomaly_features)  # [0,1]
        ml_score = int(round(ml_anomaly * 40))            # 0~40

        # ③ 합산 — 룰 60% + ML 40% 가중치
        total_score = int(round(rule_eval.rule_score * 0.6 + ml_score))

        # ④ 임계치 미만 → 감사용 DECISION 만 적재
        if total_score < THRESHOLD:
            await _insert_decision_only(
                conn,
                customer_no=ctx.customer_no,
                transaction_id=transaction_id,
                rule_eval=rule_eval,
                ml_anomaly=ml_anomaly,
                ml_score=ml_score,
                total_score=total_score,
                explain_text="",
            )
            log.info(
                "fds_below_threshold",
                tx_id=transaction_id, total=total_score,
                rule=rule_eval.rule_score, ml=ml_score,
            )
            return {"total_score": total_score, "above_threshold": False}

        # ⑤ 임계치 이상 → LLM 설명 + FDS_DETECTION + AI_FDS_DECISION + NOTIFICATION
        counterpart_masked = None
        if tx["COUNTERPART_ACCOUNT_NO"]:
            cp = mask_account_no(tx["COUNTERPART_ACCOUNT_NO"])
            bank = tx["COUNTERPART_BANK_NAME"] or ""
            counterpart_masked = f"{cp} ({bank})" if bank else cp
        personal_avg = rule_eval.features.get("avg")

    # LLM 호출은 트랜잭션 밖에서 (latency 길어도 conn lock 안 잡도록)
    llm_text = await llm_explain(
        customer_name=tx["PARTY_NAME"] or f"고객 #{ctx.customer_no}",
        tx_time=tx_dt,
        amount_krw=amount_krw,
        counterpart_masked=counterpart_masked,
        is_interbank=ctx.is_interbank,
        fired_rules=rule_eval.fired,
        rule_features=rule_eval.features,
        ml_anomaly=ml_anomaly,
        personal_avg=personal_avg if isinstance(personal_avg, (int, float)) else None,
    )

    # FDS_DETECTION INSERT — PK (CUSTOMER_NO, DETECT_SEQ) 라 다음 SEQ 계산.
    async with pool.acquire() as conn:
        async with conn.transaction():
            next_seq = await conn.fetchval(
                'SELECT COALESCE(MAX("DETECT_SEQ"), 0) + 1 '
                'FROM public."FDS_DETECTION" '
                'WHERE "CUSTOMER_NO" = $1',
                ctx.customer_no,
            )
            # smallint 한계 32767 — 시연 환경에선 충분
            detect_seq = min(int(next_seq), 32767)
            judgment = "ALARM" if total_score >= 90 else ("WARN" if total_score >= 75 else "REVIEW")
            await conn.execute(
                'INSERT INTO public."FDS_DETECTION" '
                '("CUSTOMER_NO","DETECT_SEQ","TRANSACTION_ID","ACCOUNT_NO",'
                ' "DETECT_DATETIME","TOTAL_SCORE","JUDGMENT_CD",'
                ' "ACCESS_IP","ACCESS_COUNTRY","REMARK",'
                ' "INVESTIGATION_STATUS_CD","CREATED_BY") '
                "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING','FDS_AUTO')",
                ctx.customer_no, detect_seq, transaction_id, ctx.account_no,
                datetime.now().strftime("%Y%m%d%H%M%S"),
                total_score, judgment,
                access_ip, access_country,
                llm_text[:1000] or " / ".join(rule_eval.reasons)[:1000],
            )
            await _insert_decision_only(
                conn,
                customer_no=ctx.customer_no,
                transaction_id=transaction_id,
                rule_eval=rule_eval,
                ml_anomaly=ml_anomaly,
                ml_score=ml_score,
                total_score=total_score,
                explain_text=llm_text,
                detect_seq=detect_seq,
            )

    # 트랜잭션 밖에서 NOTIFICATION (insert_notification 이 별도 pool.acquire)
    try:
        await insert_notification(
            ctx.customer_no,
            type_cd="FDS",
            title="새 의심 거래가 감지됐어요",
            body=(llm_text or " / ".join(rule_eval.reasons))[:400],
            link_url="/security/fds-alerts",
            reference_id=detect_seq,
            reference_type="FDS_ALERT",
        )
    except Exception:
        log.exception("fds_notification_failed")

    log.info(
        "fds_detection_created",
        tx_id=transaction_id, customer_no=ctx.customer_no, detect_seq=detect_seq,
        total=total_score, rule=rule_eval.rule_score, ml=ml_score,
        fired=rule_eval.fired,
    )
    return {
        "total_score": total_score,
        "above_threshold": True,
        "detect_seq": detect_seq,
        "fired_rules": rule_eval.fired,
        "ml_anomaly": ml_anomaly,
    }


async def _insert_decision_only(
    conn,
    *,
    customer_no: int,
    transaction_id: int,
    rule_eval: fds_rules.FdsEvaluation,
    ml_anomaly: float,
    ml_score: int,
    total_score: int,
    explain_text: str,
    detect_seq: int | None = None,
) -> None:
    """AI_FDS_DECISION INSERT — threshold 미만에도 감사 추적용 적재."""
    # detect_seq 없으면 0 — UNIQUE(customer_no, detect_seq) 회피용 가짜값.
    # 다만 동일 customer 가 미발동(below threshold) 거래 여러 건이면 0 자리 충돌 → ON CONFLICT DO NOTHING.
    fired_str = ",".join(rule_eval.fired)[:500]
    seq_for_uq = detect_seq if detect_seq is not None else 0
    await conn.execute(
        'INSERT INTO public."AI_FDS_DECISION" '
        '("CUSTOMER_NO","FDS_DETECT_SEQ","TRANSACTION_ID",'
        ' "RULE_SCORE","RULE_FIRED","ML_SCORE","ML_ANOMALY",'
        ' "TOTAL_SCORE","LLM_EXPLAIN","DECISION_AT") '
        "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) "
        'ON CONFLICT ("CUSTOMER_NO","FDS_DETECT_SEQ") DO UPDATE SET '
        '"TRANSACTION_ID" = EXCLUDED."TRANSACTION_ID", '
        '"RULE_SCORE" = EXCLUDED."RULE_SCORE", '
        '"RULE_FIRED" = EXCLUDED."RULE_FIRED", '
        '"ML_SCORE" = EXCLUDED."ML_SCORE", '
        '"ML_ANOMALY" = EXCLUDED."ML_ANOMALY", '
        '"TOTAL_SCORE" = EXCLUDED."TOTAL_SCORE", '
        '"LLM_EXPLAIN" = EXCLUDED."LLM_EXPLAIN", '
        '"DECISION_AT" = NOW()',
        customer_no, seq_for_uq, transaction_id,
        rule_eval.rule_score, fired_str,
        ml_score, round(ml_anomaly, 4),
        total_score, explain_text[:1000],
    )
