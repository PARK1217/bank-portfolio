"""대출 자동 승인 추론 서비스 — Phase 6 §9.2.6.

LOAN_APPLICATION 한 건의 6개 피처를 우리 DB 에서 직접 집계해 추출하고,
joblib 으로 직렬화된 XGBoost 모델로 추론한 뒤, AI_LOAN_DECISION 에 결정을
영구화한다 (멱등 — 같은 application 재호출 시 새 행만 추가).

피처 출처 (모두 본 서비스 자체 수집):
    credit_score      : CUST_GRADE_CD + 연체이력·연봉 기반 룰 (CREDIT_INFO_REPORT 실연동 전 임시)
    overdue_days_24m  : LOAN_REPAY_HISTORY.OVERDUE_DAYS 합계 (해당 고객 보유 대출들)
    overdue_ratio     : LOAN_REPAY_HISTORY OVERDUE 회차 / 총 회차
    deposit_balance   : ACCOUNT.BALANCE 양수 합계
    annual_income     : INDIVIDUAL_PARTY.ANNUAL_INCOME
    request_ratio     : DESIRED_AMOUNT / 권장한도 (credit_score × 10만)

임계값 (ML_MODEL_REGISTRY 에서 로드):
    SCORE ≥ THRESHOLD_HIGH → AUTO_APPROVE
    SCORE ≤ THRESHOLD_LOW  → AUTO_REJECT
    그 사이                → HUMAN_REVIEW (관리자 큐)
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import structlog

from ..db import get_pool

log = structlog.get_logger("loan_decision")

_MODELS_DIR = Path(__file__).parent.parent / "scripts" / "models"
_MODEL_CACHE: dict[str, object] = {}
_FEATURE_ORDER = [
    "credit_score",
    "overdue_days_24m",
    "overdue_ratio",
    "deposit_balance",
    "annual_income",
    "request_ratio",
]

DEFAULT_MODEL = "loan_xgb_v1"      # XGBoost 가 AUC 더 높음
THRESH_HIGH = 0.85
THRESH_LOW = 0.30


def _load_model(model_key: str):
    """`loan_xgb_v1` 같은 키로 joblib 모델 lazy 로드 + 캐싱."""
    if model_key in _MODEL_CACHE:
        return _MODEL_CACHE[model_key]
    path = _MODELS_DIR / f"{model_key}.joblib"
    if not path.exists():
        raise FileNotFoundError(
            f"모델 파일 없음: {path}. `python -m app.scripts.train_loan_model` 먼저 실행"
        )
    model = joblib.load(path)
    _MODEL_CACHE[model_key] = model
    log.info("loan_model_loaded", model_key=model_key, path=str(path))
    return model


# ---------------------------------------------------------------------------
# 피처 추출
# ---------------------------------------------------------------------------

async def extract_features(application_id: int) -> dict:
    """LOAN_APPLICATION 한 건의 피처 6개 + 메타 추출."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT la."LOAN_APP_ID", la."CUSTOMER_NO", la."DESIRED_AMOUNT", '
            '       la."EXPECTED_LIMIT", '
            '       COALESCE(ip."ANNUAL_INCOME", 0) AS annual_income, '
            '       COALESCE(c."CUST_GRADE_CD", \'GENERAL\') AS grade_cd '
            'FROM public."LOAN_APPLICATION" la '
            'JOIN public."CUSTOMER" c        ON c."CUSTOMER_NO" = la."CUSTOMER_NO" '
            'LEFT JOIN public."INDIVIDUAL_PARTY" ip ON ip."PARTY_ID" = c."PARTY_ID" '
            'WHERE la."LOAN_APP_ID" = $1',
            application_id,
        )
        if row is None:
            raise ValueError(f"LOAN_APPLICATION {application_id} 없음")

        customer_no = row["CUSTOMER_NO"]

        # 예금 잔액 합계 (양수만 — 마통 음수 제외).
        deposit_balance = await conn.fetchval(
            'SELECT COALESCE(SUM("BALANCE"), 0) FROM public."ACCOUNT" '
            'WHERE "CUSTOMER_NO" = $1 AND "BALANCE" > 0 AND "DELETE_YN" = \'N\'',
            customer_no,
        )

        # 연체 일수 합계 + 비율 (해당 고객의 모든 대출 합산).
        repay_stats = await conn.fetchrow(
            'SELECT COALESCE(SUM(COALESCE(lrh."OVERDUE_DAYS", 0)), 0) AS overdue_days, '
            '       COUNT(*) FILTER (WHERE lrh."REPAY_STATUS_CD" = \'OVERDUE\') AS overdue_cnt, '
            '       COUNT(*) AS total_cnt '
            'FROM public."LOAN_REPAY_HISTORY" lrh '
            'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrh."LOAN_CONTRACT_NO" '
            'WHERE lc."CUSTOMER_NO" = $1',
            customer_no,
        )
        # 추가로 OVERDUE 스케줄도 카운트 (연체 발생했지만 아직 히스토리에 없는 케이스).
        overdue_schedule = await conn.fetchval(
            'SELECT COUNT(*) FROM public."LOAN_REPAY_SCHEDULE" lrs '
            'JOIN public."LOAN_CONTRACT" lc ON lc."LOAN_CONTRACT_NO" = lrs."LOAN_CONTRACT_NO" '
            'WHERE lc."CUSTOMER_NO" = $1 AND lrs."SCHEDULE_STATUS_CD" = \'OVERDUE\'',
            customer_no,
        ) or 0

    annual_income = int(row["annual_income"] or 0)
    desired_amount = int(row["DESIRED_AMOUNT"] or 0)
    overdue_days_24m = int(repay_stats["overdue_days"] or 0) + (overdue_schedule * 30)
    total_cnt = int(repay_stats["total_cnt"] or 0)
    overdue_cnt = int(repay_stats["overdue_cnt"] or 0) + overdue_schedule
    overdue_ratio = round(overdue_cnt / total_cnt, 3) if total_cnt > 0 else 0.0

    # 신용점수 추정 (CREDIT_INFO_REPORT 실연동 전 임시 룰).
    base = {"VIP": 800, "GENERAL": 680, "MINOR": 400}.get(
        row["grade_cd"], 680
    )
    credit_score = max(
        300,
        min(
            950,
            base
            - overdue_days_24m * 1
            + (annual_income // 10_000_000) * 5
            - (overdue_cnt * 10),
        ),
    )

    # 권장 한도 = credit_score × 10만 / request_ratio = 신청 / 권장
    recommended_limit = max(credit_score * 100_000, 1)
    request_ratio = round(min(desired_amount / recommended_limit, 5.0), 3)

    features = {
        "credit_score": int(credit_score),
        "overdue_days_24m": int(overdue_days_24m),
        "overdue_ratio": float(overdue_ratio),
        "deposit_balance": int(deposit_balance),
        "annual_income": int(annual_income),
        "request_ratio": float(request_ratio),
    }
    return {
        "application_id": application_id,
        "customer_no": int(customer_no),
        "features": features,
        "meta": {
            "grade_cd": row["grade_cd"],
            "desired_amount": desired_amount,
            "recommended_limit": int(recommended_limit),
        },
    }


# ---------------------------------------------------------------------------
# 추론 + 영구화
# ---------------------------------------------------------------------------

def _decide(score: float) -> str:
    if score >= THRESH_HIGH:
        return "AUTO_APPROVE"
    if score <= THRESH_LOW:
        return "AUTO_REJECT"
    return "HUMAN_REVIEW"


async def predict_and_persist(
    application_id: int,
    model_key: str = DEFAULT_MODEL,
) -> dict:
    """피처 추출 → 추론 → AI_LOAN_DECISION INSERT → 결과 dict 반환.

    멱등성: 같은 application 에 미검토(HUMAN_REVIEWED_AT IS NULL) HUMAN_REVIEW row 가
    이미 있으면 새 추론을 돌리지 않고 그 row 를 재사용한다. 시드의 회색지대 데이터가
    신청 상세 진입 시점에 새 추론으로 자동 분류되어 사람 검토 카드가 사라지는
    시연 의도 미스매치 방지.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            'SELECT d."DECISION_ID", d."MODEL_VERSION", d."FEATURES_JSON", d."SCORE", '
            '       d."DECISION_CD", d."THRESHOLD_HIGH", d."THRESHOLD_LOW", '
            '       la."CUSTOMER_NO" '
            'FROM public."AI_LOAN_DECISION" d '
            'JOIN public."LOAN_APPLICATION" la ON la."LOAN_APP_ID" = d."APPLICATION_ID" '
            'WHERE d."APPLICATION_ID" = $1 '
            '  AND d."DECISION_CD" = \'HUMAN_REVIEW\' '
            '  AND d."HUMAN_REVIEWED_AT" IS NULL '
            '  AND d."DELETE_YN" = \'N\' '
            'ORDER BY d."CREATED_AT" DESC LIMIT 1',
            application_id,
        )
        if existing:
            features = existing["FEATURES_JSON"]
            if isinstance(features, str):
                features = json.loads(features)
            log.info(
                "loan_decision_reused",
                decision_id=int(existing["DECISION_ID"]),
                application_id=application_id,
                score=float(existing["SCORE"]),
            )
            return {
                "decision_id": int(existing["DECISION_ID"]),
                "application_id": application_id,
                "customer_no": int(existing["CUSTOMER_NO"]),
                "model_version": existing["MODEL_VERSION"],
                "score": float(existing["SCORE"]),
                "decision_cd": existing["DECISION_CD"],
                "threshold_high": float(existing["THRESHOLD_HIGH"]),
                "threshold_low": float(existing["THRESHOLD_LOW"]),
                "features": features,
                "meta": {"reused": True},
            }

    extracted = await extract_features(application_id)
    features = extracted["features"]

    model = _load_model(model_key)
    X = pd.DataFrame([[features[f] for f in _FEATURE_ORDER]], columns=_FEATURE_ORDER)
    score = float(model.predict_proba(X)[:, 1][0])
    decision_cd = _decide(score)

    pool = get_pool()
    async with pool.acquire() as conn:
        decision_id = await conn.fetchval(
            'INSERT INTO public."AI_LOAN_DECISION" '
            '("APPLICATION_ID","MODEL_VERSION","FEATURES_JSON","SCORE",'
            ' "DECISION_CD","THRESHOLD_HIGH","THRESHOLD_LOW") '
            "VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7) "
            'RETURNING "DECISION_ID"',
            application_id,
            model_key,
            json.dumps(features, ensure_ascii=False),
            round(score, 4),
            decision_cd,
            THRESH_HIGH,
            THRESH_LOW,
        )

    log.info(
        "loan_decision_recorded",
        decision_id=int(decision_id),
        application_id=application_id,
        model=model_key,
        score=round(score, 4),
        decision=decision_cd,
    )

    return {
        "decision_id": int(decision_id),
        "application_id": application_id,
        "customer_no": extracted["customer_no"],
        "model_version": model_key,
        "score": round(score, 4),
        "decision_cd": decision_cd,
        "threshold_high": THRESH_HIGH,
        "threshold_low": THRESH_LOW,
        "features": features,
        "meta": extracted["meta"],
    }


# ---------------------------------------------------------------------------
# 관리자 큐 / 사람 검토
# ---------------------------------------------------------------------------

def _to_decision_dict(r) -> dict:
    """admin loan decision row → snake_case dict (다른 admin 라우트와 응답 키 일관성).

    review-queue / decisions 두 쿼리가 SELECT 컬럼 집합이 달라 일부 키가 없을 수 있음 → dict 변환 후 .get().
    """
    d = dict(r)
    apply_pid = d.get("APPLY_PRODUCT_ID")
    score = d.get("SCORE")
    return {
        "decision_id": int(d["DECISION_ID"]),
        "application_id": int(d["APPLICATION_ID"]),
        "model_version": d.get("MODEL_VERSION"),
        "score": float(score) if score is not None else None,
        "decision_cd": d.get("DECISION_CD"),
        "human_decision_cd": d.get("HUMAN_DECISION_CD"),
        "human_reviewed_by": d.get("HUMAN_REVIEWED_BY"),
        "created_at": d.get("CREATED_AT"),
        "customer_no": int(d["CUSTOMER_NO"]),
        "desired_amount": int(d.get("DESIRED_AMOUNT") or 0),
        "apply_product_id": int(apply_pid) if apply_pid is not None else None,
        "party_name": d.get("PARTY_NAME"),
    }


async def list_review_queue(limit: int = 50) -> list[dict]:
    """HUMAN_REVIEW 미검토 대기 큐."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT d."DECISION_ID", d."APPLICATION_ID", d."MODEL_VERSION", '
            '       d."SCORE", d."CREATED_AT", '
            '       la."CUSTOMER_NO", la."DESIRED_AMOUNT", la."APPLY_PRODUCT_ID", '
            '       p."PARTY_NAME" '
            'FROM public."AI_LOAN_DECISION" d '
            'JOIN public."LOAN_APPLICATION" la ON la."LOAN_APP_ID" = d."APPLICATION_ID" '
            'JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = la."CUSTOMER_NO" '
            'JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
            'WHERE d."DECISION_CD" = \'HUMAN_REVIEW\' AND d."HUMAN_REVIEWED_AT" IS NULL '
            'ORDER BY d."CREATED_AT" DESC LIMIT $1',
            limit,
        )
    return [_to_decision_dict(r) for r in rows]


async def list_decisions(decision_cd: str | None = None, limit: int = 100) -> list[dict]:
    """전체 결정 이력 (필터 가능)."""
    pool = get_pool()
    sql = (
        'SELECT d."DECISION_ID", d."APPLICATION_ID", d."MODEL_VERSION", '
        '       d."SCORE", d."DECISION_CD", d."HUMAN_DECISION_CD", '
        '       d."HUMAN_REVIEWED_BY", d."CREATED_AT", '
        '       la."CUSTOMER_NO", la."DESIRED_AMOUNT", p."PARTY_NAME" '
        'FROM public."AI_LOAN_DECISION" d '
        'JOIN public."LOAN_APPLICATION" la ON la."LOAN_APP_ID" = d."APPLICATION_ID" '
        'JOIN public."CUSTOMER" c ON c."CUSTOMER_NO" = la."CUSTOMER_NO" '
        'JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID"'
    )
    args: list = []
    if decision_cd:
        sql += ' WHERE d."DECISION_CD" = $1'
        args.append(decision_cd)
    sql += ' ORDER BY d."CREATED_AT" DESC LIMIT $' + str(len(args) + 1)
    args.append(limit)

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
    return [_to_decision_dict(r) for r in rows]


async def human_review(
    decision_id: int,
    human_decision_cd: str,
    employee_no: str,
    memo: str | None = None,
) -> dict:
    """사람 검토 결과 등록. ADMIN_AUDIT_LOG 는 AdminAuditMiddleware 가 자동 적재."""
    if human_decision_cd not in ("APPROVE", "REJECT"):
        raise ValueError("human_decision_cd 는 APPROVE/REJECT 만 허용")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 가드: HUMAN_REVIEW 미검토 결정만 라벨링 허용. 자동 분류(AUTO_APPROVE/REJECT) 나
            # 이미 검토된 결정에 사람 라벨을 덮어쓰는 호출은 거부.
            current = await conn.fetchrow(
                'SELECT "DECISION_CD", "HUMAN_REVIEWED_AT" '
                'FROM public."AI_LOAN_DECISION" WHERE "DECISION_ID" = $1',
                decision_id,
            )
            if current is None:
                raise ValueError(f"DECISION_ID {decision_id} 없음")
            if current["DECISION_CD"] != "HUMAN_REVIEW":
                raise ValueError(
                    f"자동 분류({current['DECISION_CD']}) 결정은 사람 검토 대상이 아닙니다"
                )
            if current["HUMAN_REVIEWED_AT"] is not None:
                raise ValueError("이미 검토 완료된 결정입니다")

            row = await conn.fetchrow(
                'UPDATE public."AI_LOAN_DECISION" '
                '   SET "HUMAN_DECISION_CD" = $1, '
                '       "HUMAN_REVIEWED_BY" = $2, '
                '       "HUMAN_REVIEWED_AT" = NOW(), '
                '       "REVIEW_MEMO"       = $3, '
                '       "UPDATED_AT"        = NOW() '
                ' WHERE "DECISION_ID"       = $4 '
                'RETURNING "DECISION_ID", "APPLICATION_ID", "SCORE", "DECISION_CD"',
                human_decision_cd, employee_no, memo, decision_id,
            )
            if row is None:
                raise ValueError(f"DECISION_ID {decision_id} 없음")

    log.info(
        "loan_decision_reviewed",
        decision_id=decision_id,
        by=employee_no,
        decision=human_decision_cd,
    )
    score = row["SCORE"]
    return {
        "decision_id": int(row["DECISION_ID"]),
        "application_id": int(row["APPLICATION_ID"]),
        "score": float(score) if score is not None else None,
        "decision_cd": row["DECISION_CD"],
        "human_decision_cd": human_decision_cd,
        "human_reviewed_by": employee_no,
        "review_memo": memo,
    }