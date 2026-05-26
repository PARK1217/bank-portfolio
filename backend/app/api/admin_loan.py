"""관리자 — 대출 자동 승인 큐 + 사람 검토 API (Phase 6 §9.2.4).

인증: `Depends(require_admin)` — JWT(role=ADMIN) + ADMIN_SESSION 활성.
(이전 PoC 의 `X-Admin-Employee-No` 헤더는 §9.2.1 게이팅 도입으로 제거됨)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..service import loan_decision
from ..service.admin_auth import CurrentAdmin, require_admin

router = APIRouter(prefix="/admin/loans", tags=["admin-loan"])


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
    admin: CurrentAdmin = Depends(require_admin),
    model_version: str = "loan_xgb_v1",
):
    """대출 신청 1건을 ML 모델로 추론 + AI_LOAN_DECISION INSERT."""
    try:
        return await loan_decision.predict_and_persist(application_id, model_version)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc))


@router.get("/review-queue")
async def get_review_queue(
    admin: CurrentAdmin = Depends(require_admin),
    limit: int = 50,
):
    """HUMAN_REVIEW 대기 큐."""
    items = await loan_decision.list_review_queue(limit=limit)
    return {"items": items, "count": len(items)}


@router.get("/decisions")
async def list_all_decisions(
    admin: CurrentAdmin = Depends(require_admin),
    decision_cd: str | None = None,
    limit: int = 100,
):
    """전체 결정 이력 (decision_cd 필터)."""
    items = await loan_decision.list_decisions(decision_cd=decision_cd, limit=limit)
    return {"items": items, "count": len(items)}


@router.post("/decisions/{decision_id}/review")
async def review_decision(
    decision_id: int,
    req: ReviewRequest,
    request: Request,
    admin: CurrentAdmin = Depends(require_admin),
):
    """사람 검토 결과 등록 (HUMAN_REVIEW → APPROVE/REJECT 확정)."""
    try:
        result = await loan_decision.human_review(
            decision_id=decision_id,
            human_decision_cd=req.human_decision_cd,
            employee_no=admin.employee_no,
            memo=req.memo,
        )
        request.state.audit_after = {
            "decision_id": decision_id,
            "new_decision_cd": req.human_decision_cd,
            "memo": (req.memo or "")[:500],
        }
        return result
    except ValueError as exc:
        raise HTTPException(404, str(exc))