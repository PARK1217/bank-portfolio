"""관리자 — LLM 호출 추적 라우터.

frontend-admin /observability 화면이 Phoenix iframe 외에 우리 DB 의
AI_LLM_CALL_LOG 펼침 UI 를 띄우기 위해 호출.

엔드포인트
- GET /api/admin/observability/llm-calls          필터된 목록
- GET /api/admin/observability/llm-calls/{id}     단건 상세 (system/user/retrieved/response 전문)
- GET /api/admin/observability/stats              최근 24h hit/miss/avg latency/tokens
- GET /api/admin/observability/rag-eval-stats     RAG 품질 4지표 평균 (faithfulness 등)
- GET /api/admin/observability/feedback-stats     사용자/직원 피드백 👍/👎 집계 + 👎 이슈 분포
- GET /api/admin/observability/feedback           피드백 목록 (코멘트·카테고리)
- GET /api/admin/observability/feedback/{id}       피드백 단건 + 평가 대상 답변 + 자동 점수 (사람↔자동 대조)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from ..errors import E_NOT_FOUND
from ..service.admin_auth import CurrentAdmin, require_admin
from ..service.admin_observability import (
    get_llm_call,
    list_llm_calls,
    llm_call_stats,
    rag_eval_stats,
)
from ..service.chatbot_feedback import (
    feedback_stats,
    get_feedback_detail,
    list_feedback,
)

router = APIRouter(prefix="/admin/observability", tags=["admin-observability"])


@router.get("/llm-calls")
async def list_llm_calls_route(
    admin: CurrentAdmin = Depends(require_admin),
    audience_cd: str | None = Query(None, pattern="^(USER|ADMIN)$"),
    cache_hit_yn: str | None = Query(None, pattern="^(Y|N)$"),
    purpose_cd: str | None = Query(None, max_length=20),
    q: str | None = Query(None, max_length=100, description="RAW_QUESTION 부분 일치"),
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_llm_calls(
        audience_cd=audience_cd,
        cache_hit_yn=cache_hit_yn,
        purpose_cd=purpose_cd,
        q=q,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


@router.get("/llm-calls/{llm_call_id}")
async def get_llm_call_route(
    llm_call_id: int,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    row = await get_llm_call(llm_call_id)
    if row is None:
        raise HTTPException(status_code=404, detail={"code": E_NOT_FOUND, "message": "해당 LLM 호출을 찾을 수 없습니다."})
    return row


@router.get("/stats")
async def stats_route(
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await llm_call_stats()


@router.get("/rag-eval-stats")
async def rag_eval_stats_route(
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await rag_eval_stats()


@router.get("/feedback-stats")
async def feedback_stats_route(
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    return await feedback_stats()


@router.get("/feedback")
async def list_feedback_route(
    admin: CurrentAdmin = Depends(require_admin),
    audience_cd: str | None = Query(None, pattern="^(USER|ADMIN)$"),
    rating: int | None = Query(None, ge=1, le=5),
    has_comment: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    return await list_feedback(
        audience_cd=audience_cd,
        rating=rating,
        has_comment=has_comment,
        limit=limit,
        offset=offset,
    )


@router.get("/feedback/{feedback_id}")
async def get_feedback_detail_route(
    feedback_id: int,
    admin: CurrentAdmin = Depends(require_admin),
) -> dict:
    row = await get_feedback_detail(feedback_id)
    if row is None:
        raise HTTPException(status_code=404, detail={"code": E_NOT_FOUND, "message": "해당 피드백을 찾을 수 없습니다."})
    return row
