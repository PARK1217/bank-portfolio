"""자산분석 RAG 스키마 — SCR-AS-001 ~ 007 (Signature).

흐름: AS-001 진입 → AS-002 설문 → AS-003 LLM 처리 폴링/SSE → AS-004 결과 + 출처 평가.
"""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


# ----------------------------------------------------------------------
# SCR-AS-001 메인
# ----------------------------------------------------------------------

class AssetMainResponse(BaseModel):
    customer_no: int
    total_balance_krw: int
    monthly_in_krw: int
    monthly_out_krw: int
    recent_session_ids: list[int] = Field(default_factory=list)


# ----------------------------------------------------------------------
# SCR-AS-002 설문 제출
# ----------------------------------------------------------------------

class SurveyAnswer(BaseModel):
    question_code: str = Field(..., description="GOAL/RISK/PERIOD/AMOUNT/...")
    answer_text: str | None = None
    answer_value: dict | None = Field(
        None, description="다중선택/숫자 등 구조화 답변"
    )


class AssetSurveyRequest(BaseModel):
    responses: list[SurveyAnswer] = Field(..., min_length=1)


class AssetSurveyResponse(BaseModel):
    session_id: int


# ----------------------------------------------------------------------
# SCR-AS-003 진행 상태 — 폴링/SSE
# ----------------------------------------------------------------------

class AssetSessionStatusResponse(BaseModel):
    session_id: int
    status_cd: str = Field(..., description="SURVEY/ANALYZING/DONE/FAILED")
    progress_pct: int | None = Field(None, ge=0, le=100)
    eta_seconds: int | None = None
    error_code: str | None = None


# ----------------------------------------------------------------------
# SCR-AS-004 결과
# ----------------------------------------------------------------------

class AssetRecommendationItem(BaseModel):
    rank: int = Field(..., ge=1, le=3)
    product_id: int
    product_name: str
    reason_summary: str
    reason_details: dict
    faithfulness_score: float | None = Field(
        None, ge=0, le=1, description="Phoenix Faithfulness 평가 (< 0.6 = 신중)"
    )


class AssetResultResponse(BaseModel):
    session_id: int
    status_cd: str
    started_at: datetime
    completed_at: datetime | None = None
    recommendations: list[AssetRecommendationItem]


# ----------------------------------------------------------------------
# SCR-AS-005 추천 상품 상세
# ----------------------------------------------------------------------

class AssetRecommendedProductResponse(BaseModel):
    product_id: int
    product_name: str
    detail_payload: dict = Field(..., description="ProductDetailResponse 직렬화")
    reason_summary: str
    reason_details: dict
    faithfulness_score: float | None = None


# ----------------------------------------------------------------------
# SCR-AS-006 시뮬레이션 (Later)
# ----------------------------------------------------------------------

class AssetSimulateRequest(BaseModel):
    product_id: int
    amount_krw: int | None = None
    monthly_amount_krw: int | None = None
    period_months: int


class AssetSimulateResponse(BaseModel):
    expected_interest_krw: int
    maturity_amount_krw: int
    breakdown: dict = Field(default_factory=dict)


# ----------------------------------------------------------------------
# SCR-AS-007 이력
# ----------------------------------------------------------------------

class AssetSessionListItem(BaseModel):
    session_id: int
    started_at: datetime
    completed_at: datetime | None = None
    status_cd: str
    top_product_name: str | None = None


class AssetSessionListResponse(BaseModel):
    items: list[AssetSessionListItem]