"""대출 자동 승인 학습용 데이터셋 — UCI German Credit + 합성.

가이드 §9.2.6 ML 대출 자동 승인 PoC. **피처 6개로 재설계** (가구 형태 제거,
직장규모는 연봉으로 대체) — 모두 본 서비스에서 수집 가능한 항목.

출력 스키마 (피처 6개 + 라벨 1개):
    credit_score        : int    300~950  — CREDIT_INFO_REPORT
    overdue_days_24m    : int    24개월 누적 연체일수 — LOAN_REPAY_HISTORY + 신용조회
    overdue_ratio       : float  [0, 1] (연체 회차 / 총 상환 회차) — 자체 계산
    deposit_balance     : int    예금 잔액 합계 — ACCOUNT.BALANCE
    annual_income       : int    연봉 (KRW) — INDIVIDUAL_PARTY.ANNUAL_INCOME
    request_ratio       : float  신청금액 / 권장한도 (0.1~5.0)
    label               : int    1=승인 / 0=반려
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# UCI German Credit — 1,000 행
# ---------------------------------------------------------------------------

def load_uci_german_credit() -> pd.DataFrame:
    """UCI Statlog (German Credit Data) → 본 프로젝트 피처 6개 형식 매핑."""
    from ucimlrepo import fetch_ucirepo

    raw = fetch_ucirepo(id=144)
    X = raw.data.features.copy()
    y = raw.data.targets.copy()

    # 참고: https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data
    cols = X.columns.tolist()
    def col(i):
        return cols[i - 1] if i - 1 < len(cols) else cols[0]

    df = pd.DataFrame()

    # 신용점수 — 신용이력 + 저축 + 계좌상태 가중합.
    history_score = X[col(3)].map(
        {"A30": 50, "A31": 70, "A32": 60, "A33": 30, "A34": 20}
    ).fillna(50)
    savings_score = X[col(6)].map(
        {"A61": 30, "A62": 45, "A63": 60, "A64": 80, "A65": 70}
    ).fillna(40)
    account_score = X[col(1)].map(
        {"A11": 30, "A12": 50, "A13": 70, "A14": 60}
    ).fillna(40)
    df["credit_score"] = (
        (history_score * 4 + savings_score * 3 + account_score * 3 + 400)
        .round().clip(300, 950).astype(int)
    )

    # 연체일수 — 신용이력에서 추정.
    overdue_map = {"A30": 0, "A31": 0, "A32": 5, "A33": 45, "A34": 90}
    df["overdue_days_24m"] = X[col(3)].map(overdue_map).fillna(0).astype(int)
    df["overdue_ratio"] = (df["overdue_days_24m"] / 720).clip(0, 1).round(3)

    # 예금 잔액 — 저축계좌 등급의 중앙값 환산 (1 DM ≈ 700 KRW).
    savings_amt = X[col(6)].map({
        "A61": 50_000,
        "A62": 300_000,
        "A63": 700_000,
        "A64": 1_500_000,
        "A65": 3_000_000,
    }).fillna(100_000).astype(int)
    df["deposit_balance"] = savings_amt

    # 연봉 — UCI 의 현 직장 근속 + 직업 등급으로 추정 (한국 평균 환산).
    employment_income = X[col(7)].map({
        "A71": 0,             # 무직
        "A72": 24_000_000,    # < 1년 (신입)
        "A73": 36_000_000,    # 1~4년
        "A74": 55_000_000,    # 4~7년
        "A75": 80_000_000,    # 7년+
    }).fillna(30_000_000)
    job_multiplier = X[col(17)].map({
        "A171": 0.6,   # 비숙련 비거주
        "A172": 0.8,   # 비숙련 거주
        "A173": 1.0,   # 숙련
        "A174": 1.5,   # 고숙련·간부
    }).fillna(1.0)
    df["annual_income"] = (employment_income * job_multiplier).round().astype(int)

    # 신청금액 비율 — 신용액(DM→KRW) / 권장한도(신용점수×10만 추정).
    credit_amt = pd.to_numeric(X[col(5)], errors="coerce").fillna(2000) * 700
    recommended = df["credit_score"] * 100_000
    df["request_ratio"] = (credit_amt / recommended).clip(0.1, 5.0).round(3)

    # 라벨 — UCI: 1=good(승인), 2=bad(반려) → 1/0 정규화.
    target_col = y.columns[0]
    df["label"] = (y[target_col].astype(int) == 1).astype(int)

    df["_source"] = "UCI"
    return df


# ---------------------------------------------------------------------------
# 합성 데이터 — N 행
# ---------------------------------------------------------------------------

def generate_synthetic(n: int = 9000, seed: int = 42) -> pd.DataFrame:
    """한국 페르소나 분포 기반 합성 데이터 — 6개 피처 + 룰 기반 라벨."""
    rng = np.random.default_rng(seed)

    credit_score = rng.normal(680, 80, n).clip(300, 950).astype(int)
    overdue_days_24m = rng.gamma(2.0, 5.0, n).clip(0, 720).astype(int)
    overdue_ratio = (overdue_days_24m / 720).round(3)
    deposit_balance = rng.lognormal(14.5, 1.2, n).astype(int)        # 평균 ~2M
    annual_income = rng.lognormal(17.5, 0.5, n).astype(int)          # 평균 ~40~50M
    request_ratio = rng.gamma(2.0, 0.4, n).clip(0.1, 5.0).round(3)

    # 라벨 룰 — 6개 피처로 logit 산출.
    score_part = (credit_score - 500) / 450.0 * 100.0
    overdue_part = -overdue_days_24m * 0.4
    asset_part = np.log1p(deposit_balance) / 20.0 * 25.0
    income_part = np.log1p(annual_income) / 20.0 * 35.0              # 연봉 영향 큼
    request_penalty = -np.maximum(request_ratio - 1.0, 0) * 15.0

    logit = (
        score_part + overdue_part + asset_part + income_part + request_penalty - 80.0
    ) / 10.0
    prob_approve = 1.0 / (1.0 + np.exp(-logit))
    prob_approve = np.clip(prob_approve + rng.normal(0, 0.05, n), 0.0, 1.0)
    label = (prob_approve > 0.5).astype(int)

    df = pd.DataFrame({
        "credit_score": credit_score,
        "overdue_days_24m": overdue_days_24m,
        "overdue_ratio": overdue_ratio,
        "deposit_balance": deposit_balance,
        "annual_income": annual_income,
        "request_ratio": request_ratio,
        "label": label,
        "_source": "SYNTHETIC",
    })
    return df


# ---------------------------------------------------------------------------
# 페르소나 9명 — sanity check 검증 셋 (가입 시드 ANNUAL_INCOME 그대로)
# ---------------------------------------------------------------------------

def persona_sanity_set() -> pd.DataFrame:
    """본 프로젝트 5+4 페르소나 — INDIVIDUAL_PARTY.ANNUAL_INCOME 시드값 그대로."""
    rows = [
        # P-001 박철수 — 다온테크 72M, VIP
        {"name": "박철수", "credit_score": 820, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 18_000_000,
         "annual_income": 72_000_000, "request_ratio": 0.5,
         "expected_label": 1},
        # P-002 김영희 — 프리랜서 32M
        {"name": "김영희", "credit_score": 720, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 2_000_000,
         "annual_income": 32_000_000, "request_ratio": 0.6,
         "expected_label": 1},
        # P-003 최지영 — 10세 미성년 (신청 자체 부적격, 부득이 데이터에 넣음)
        {"name": "최지영", "credit_score": 400, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 1_000_000,
         "annual_income": 0, "request_ratio": 1.2,
         "expected_label": 0},
        # P-004 김연체 — 자영업 28M, 30일+ 연체
        {"name": "김연체", "credit_score": 480, "overdue_days_24m": 120,
         "overdue_ratio": 0.166, "deposit_balance": 10_000,
         "annual_income": 28_000_000, "request_ratio": 1.5,
         "expected_label": 0},
        # P-005 김미선 — 두리테크 대표 96M, VIP
        {"name": "김미선", "credit_score": 780, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 50_000_000,
         "annual_income": 96_000_000, "request_ratio": 0.6,
         "expected_label": 1},
        # P-006 한도현 — 직장인 50M
        {"name": "한도현", "credit_score": 740, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 8_000_000,
         "annual_income": 50_000_000, "request_ratio": 0.7,
         "expected_label": 1},
        # P-007 John Smith — 외국인 45M
        {"name": "JohnSmith", "credit_score": 680, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 5_000_000,
         "annual_income": 45_000_000, "request_ratio": 0.9,
         "expected_label": 1},
        # P-008 송은행 — 직장인 50M, 모든 우대 충족
        {"name": "송은행", "credit_score": 800, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 12_000_000,
         "annual_income": 50_000_000, "request_ratio": 0.4,
         "expected_label": 1},
        # P-009 두리테크 — 법인 매출 가정 80M
        {"name": "두리테크", "credit_score": 720, "overdue_days_24m": 0,
         "overdue_ratio": 0.0, "deposit_balance": 80_000_000,
         "annual_income": 80_000_000, "request_ratio": 0.8,
         "expected_label": 1},
    ]
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 통합
# ---------------------------------------------------------------------------

def build_training_set(n_synthetic: int = 9000) -> pd.DataFrame:
    """UCI 1k + 합성 N → 통합 학습셋."""
    uci = load_uci_german_credit()
    syn = generate_synthetic(n=n_synthetic)
    combined = pd.concat([uci, syn], axis=0, ignore_index=True)
    return combined


if __name__ == "__main__":
    df = build_training_set(n_synthetic=9000)
    print(f"통합 행 수: {len(df)}")
    print(f"UCI / 합성: {(df['_source'] == 'UCI').sum()} / {(df['_source'] == 'SYNTHETIC').sum()}")
    print(f"라벨 분포 (승인:1 / 반려:0): {df['label'].value_counts().to_dict()}")
    print()
    print("=== 컬럼 통계 ===")
    print(df.describe(include="all").T[["count", "mean", "min", "max"]])