"""관리자 — 대출 자동 승인 큐 + 사람 검토 API (Phase 6 §9.2.4).

인증 (PoC): 헤더 `X-Admin-Employee-No` 로 사번 받음.
실 운영은 `ADMIN_SESSION` + `EMPLOYEE_MASTER` + JWT role=ADMIN 으로 교체.
"""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..service import loan_decision

router = APIRouter(prefix="/admin/loans", tags=["admin-loan"])


def _require_admin(x_admin_employee_no: str | None) -> str:
    if not x_admin_employee_no:
        raise HTTPException(401, "관리자 사번 헤더(X-Admin-Employee-No)가 필요합니다.")
    return x_admin_employee_no


# ---------------------------------------------------------------------------
# 응답 스키마
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    application_id: int = Field(..., gt=0)
    model_version: str = Field(default="loan_xgb_v1")


class PredictResponse(BaseModel):
    decision_id: int
    application_id: int
    customer_no: int
    model_version: str
    score: float
    decision_cd: str
    threshold_high: float
    threshold_low: float
    features: dict
    meta: dict


class ReviewRequest(BaseModel):
    human_decision_cd: str = Field(..., pattern="^(APPROVE|REJECT)$")
    memo: str | None = Field(None, max_length=1000)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/{application_id}/predict", response_model=PredictResponse)
async def predict_application(
    application_id: int,
    x_admin_employee_no: str | None = Header(None, alias="X-Admin-Employee-No"),
    model_version: str = "loan_xgb_v1",
):
    """대출 신청 1건을 ML 모델로 추론 + AI_LOAN_DECISION INSERT."""
    _require_admin(x_admin_employee_no)
    try:
        return await loan_decision.predict_and_persist(application_id, model_version)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc))


@router.get("/review-queue")
async def get_review_queue(
    x_admin_employee_no: str | None = Header(None, alias="X-Admin-Employee-No"),
    limit: int = 50,
):
    """HUMAN_REVIEW 대기 큐."""
    _require_admin(x_admin_employee_no)
    items = await loan_decision.list_review_queue(limit=limit)
    return {"items": items, "count": len(items)}


@router.get("/decisions")
async def list_all_decisions(
    x_admin_employee_no: str | None = Header(None, alias="X-Admin-Employee-No"),
    decision_cd: str | None = None,
    limit: int = 100,
):
    """전체 결정 이력 (decision_cd 필터)."""
    _require_admin(x_admin_employee_no)
    items = await loan_decision.list_decisions(decision_cd=decision_cd, limit=limit)
    return {"items": items, "count": len(items)}


@router.post("/decisions/{decision_id}/review")
async def review_decision(
    decision_id: int,
    req: ReviewRequest,
    x_admin_employee_no: str | None = Header(None, alias="X-Admin-Employee-No"),
):
    """사람 검토 결과 등록 (HUMAN_REVIEW → APPROVE/REJECT 확정)."""
    employee_no = _require_admin(x_admin_employee_no)
    try:
        return await loan_decision.human_review(
            decision_id=decision_id,
            human_decision_cd=req.human_decision_cd,
            employee_no=employee_no,
            memo=req.memo,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc))