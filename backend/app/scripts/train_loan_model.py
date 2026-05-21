"""대출 자동 승인 모델 학습 — 로지스틱 + XGBoost (가이드 §9.2.6, 6개 피처).

실행:
    docker compose exec backend python -m app.scripts.train_loan_model

산출물:
    backend/app/scripts/models/loan_logistic_v1.joblib
    backend/app/scripts/models/loan_xgb_v1.joblib
    backend/app/scripts/models/loan_meta.json
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from .loan_dataset import build_training_set, persona_sanity_set


MODELS_DIR = Path(__file__).parent / "models"
THRESH_HIGH = 0.85
THRESH_LOW = 0.30

# 6개 피처 — 모두 수치형 (본 서비스에서 수집 가능한 항목만).
FEATURES = [
    "credit_score",
    "overdue_days_24m",
    "overdue_ratio",
    "deposit_balance",
    "annual_income",
    "request_ratio",
]


def _metrics(name: str, y_true, y_pred, y_prob) -> dict:
    out = {
        "auc": float(roc_auc_score(y_true, y_prob)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }
    print(f"\n=== {name} ===")
    for k, v in out.items():
        print(f"  {k:<10s} = {v:.4f}")
    cm = confusion_matrix(y_true, y_pred)
    print(f"  confusion [tn fp / fn tp]:")
    print(f"    {cm[0][0]:>5d}  {cm[0][1]:>5d}")
    print(f"    {cm[1][0]:>5d}  {cm[1][1]:>5d}")
    return out


def _decision_distribution(y_prob: np.ndarray) -> dict:
    auto_a = int((y_prob >= THRESH_HIGH).sum())
    auto_r = int((y_prob <= THRESH_LOW).sum())
    human = int(((y_prob > THRESH_LOW) & (y_prob < THRESH_HIGH)).sum())
    total = len(y_prob)
    return {
        "auto_approve_pct": round(auto_a / total * 100, 1),
        "auto_reject_pct": round(auto_r / total * 100, 1),
        "human_review_pct": round(human / total * 100, 1),
        "total": total,
    }


def main() -> None:
    print("=" * 70)
    print("대출 자동 승인 모델 학습 — 가이드 §9.2.6 (6개 피처)")
    print("=" * 70)

    print("\n[1] 데이터 로드 + 합성")
    df = build_training_set(n_synthetic=9000)
    print(f"  총 행 수: {len(df)}")
    print(f"  소스 분포: {df['_source'].value_counts().to_dict()}")
    print(f"  라벨 분포 (1=승인 / 0=반려): {df['label'].value_counts().to_dict()}")

    X = df[FEATURES]
    y = df["label"].astype(int)

    print("\n[2] Train/Test 분할 (80/20, stratified)")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  train: {len(X_train)}, test: {len(X_test)}")

    print("\n[3] 로지스틱 회귀")
    logistic = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
    ])
    logistic.fit(X_train, y_train)
    log_prob = logistic.predict_proba(X_test)[:, 1]
    log_pred = (log_prob >= 0.5).astype(int)
    log_metrics = _metrics("LogisticRegression", y_test, log_pred, log_prob)

    print("\n[4] XGBoost")
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        eval_metric="logloss",
    )
    xgb.fit(X_train, y_train)
    xgb_prob = xgb.predict_proba(X_test)[:, 1]
    xgb_pred = (xgb_prob >= 0.5).astype(int)
    xgb_metrics = _metrics("XGBoost", y_test, xgb_pred, xgb_prob)

    print("\n[5] 임계값별 결정 분포 (관리자 시연용)")
    print(f"  자동 승인 ≥ {THRESH_HIGH} / 자동 반려 ≤ {THRESH_LOW} / 사이 = HUMAN_REVIEW")
    print(f"  로지스틱: {_decision_distribution(log_prob)}")
    print(f"  XGBoost : {_decision_distribution(xgb_prob)}")

    print("\n[6] 페르소나 9명 sanity check")
    persona = persona_sanity_set()
    p_X = persona[FEATURES]
    log_p = logistic.predict_proba(p_X)[:, 1]
    xgb_p = xgb.predict_proba(p_X)[:, 1]
    print(f"  {'name':<12s} {'expected':>8s} {'logistic':>10s} {'xgb':>8s} {'decision(xgb)':>16s}")
    for i, row in persona.iterrows():
        xp = xgb_p[i]
        if xp >= THRESH_HIGH:
            decision = "AUTO_APPROVE"
        elif xp <= THRESH_LOW:
            decision = "AUTO_REJECT"
        else:
            decision = "HUMAN_REVIEW"
        print(
            f"  {row['name']:<12s} {row['expected_label']:>8d} "
            f"{log_p[i]:>10.3f} {xp:>8.3f} {decision:>16s}"
        )

    print("\n[7] 피처 중요도 (XGBoost)")
    for feat, imp in sorted(
        zip(FEATURES, xgb.feature_importances_), key=lambda x: -x[1]
    ):
        print(f"  {feat:<22s} {imp:.4f}")

    print("\n[8] 저장")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(logistic, MODELS_DIR / "loan_logistic_v1.joblib")
    joblib.dump(xgb, MODELS_DIR / "loan_xgb_v1.joblib")
    meta = {
        "version": "v1",
        "trained_rows": len(df),
        "feature_order": FEATURES,
        "threshold_high": THRESH_HIGH,
        "threshold_low": THRESH_LOW,
        "metrics": {"logistic": log_metrics, "xgboost": xgb_metrics},
        "decision_distribution": {
            "logistic": _decision_distribution(log_prob),
            "xgboost": _decision_distribution(xgb_prob),
        },
        "feature_importances": {
            f: float(i) for f, i in zip(FEATURES, xgb.feature_importances_)
        },
    }
    (MODELS_DIR / "loan_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  저장: {MODELS_DIR}")
    print()
    print("=" * 70)
    print("학습 완료 — Phase 6 관리자 페이지에서 모델 로드 → AI_LOAN_DECISION INSERT.")
    print("=" * 70)


if __name__ == "__main__":
    main()