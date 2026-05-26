"""대출 라우터 — LN-001 ~ LN-009.

엔드포인트 그루핑:
  /loans/products              GET   — 상품 목록 (LN-001)
  /loans/precheck              POST  — DSR 시뮬 (LN-002)
  /loans                       POST  — 정식 신청 (LN-003)
  /loans/applications/{app_token}/status   GET   — 심사 상태 (LN-005)
  /loans/applications/{app_token}/contract POST  — 약정 (LN-006)
  /loans/contracts/{loan_token}/execute    POST  — 실행 (LN-007, 멱등)
  /loans/contracts/{loan_token}            GET   — 상세 (LN-008)
  /loans/contracts/{loan_token}/schedule   GET   — 상환 스케줄 (LN-009)
"""

from __future__ import annotations

from datetime import date, datetime

import structlog
from fastapi import APIRouter, Depends, File, Form, Header, UploadFile

from ..errors import E_VALIDATION
from ..exceptions import BusinessError
from ..logging_setup import mask_account_no
from ..schema.loan import (
    LoanApplyRequest,
    LoanApplyResponse,
    LoanContractRequest,
    LoanContractResponse,
    LoanDetailResponse,
    LoanExecHistoryItem,
    LoanExecuteRequest,
    LoanExecuteResponse,
    LoanPrecheckRequest,
    LoanPrecheckResponse,
    LoanProductItem,
    LoanProductListResponse,
    LoanScheduleItem,
    LoanScheduleResponse,
    LoanStatusResponse,
)
from ..service.account import issue_tx_token, resolve_account_token
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.loan_attach import (
    get_required_docs as fetch_user_required_docs,
    upload_attachment as upload_user_attachment,
)
from ..service.loan import (
    apply_loan,
    execute_loan,
    fetch_application_status,
    fetch_loan_detail,
    fetch_loan_products,
    fetch_precheck_profile,
    fetch_repay_schedule,
    infer_loan_subtype,
    precheck_dsr,
    resolve_app,
    resolve_loan,
    sign_contract,
)
from ..service.token import TokenService

router = APIRouter(prefix="/loans", tags=["loan"])
log = structlog.get_logger("loan")


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:8], "%Y%m%d").date()
    except ValueError:
        return None


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# LN-001
# ---------------------------------------------------------------------------

@router.get("/products", response_model=LoanProductListResponse)
async def list_loan_products() -> LoanProductListResponse:
    rows = await fetch_loan_products()
    items = [
        LoanProductItem(
            product_id=int(r["PRODUCT_ID"]),
            product_name=r["PRODUCT_NAME"] or "",
            base_rate=float(r["base_rate"] or 0.0),
            min_amount=int(r["MIN_AMOUNT"] or 0),
            max_amount=int(r["MAX_AMOUNT"] or 0),
            max_period_months=int(r["max_months"] or 0),
            target_customer_cd=r["TARGET_CUSTOMER_CD"],
            min_age=int(r["MIN_AGE"]) if r["MIN_AGE"] is not None else None,
            max_age=int(r["MAX_AGE"]) if r["MAX_AGE"] is not None else None,
            loan_subtype=infer_loan_subtype(
                r["PRODUCT_NAME"] or "", r["TARGET_CUSTOMER_CD"]
            ),
        )
        for r in rows
    ]
    return LoanProductListResponse(items=items)


# ---------------------------------------------------------------------------
# LN-002
# ---------------------------------------------------------------------------

@router.get("/precheck/profile")
async def precheck_profile(
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    """본행 데이터로 연소득 추정 + 당사 부채 합계 prefill — 화면 초기 진입 시 사용."""
    return await fetch_precheck_profile(user.customer_no)


@router.post("/precheck", response_model=LoanPrecheckResponse)
async def precheck(req: LoanPrecheckRequest) -> LoanPrecheckResponse:
    r = precheck_dsr(
        annual_income=req.annual_income_krw,
        annual_debt_total=req.annual_debt_total_krw,
        desired_amount=req.desired_amount_krw,
        period_months=req.period_months,
    )
    return LoanPrecheckResponse(
        eligible=r.eligible,
        simulated_dsr_pct=r.simulated_dsr_pct,
        max_amount_krw=r.max_amount_krw,
        applicable_rate=r.applicable_rate,
        rejection_code=r.rejection_code,
    )


# 별칭: 프론트엔드 SCR-LN-002 폼이 product_id 를 path 로 호출 (/api/loans/{product_id}/precheck).
# precheck_dsr 는 현재 product_id 를 사용하지 않으므로 위 핸들러를 그대로 위임.
@router.post("/{product_id}/precheck", response_model=LoanPrecheckResponse)
async def precheck_by_product(product_id: int, req: LoanPrecheckRequest) -> LoanPrecheckResponse:
    return await precheck(req)


# ---------------------------------------------------------------------------
# LN-003
# ---------------------------------------------------------------------------

@router.post("", response_model=LoanApplyResponse)
async def apply(
    req: LoanApplyRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> LoanApplyResponse:
    app_token, status_cd = await apply_loan(
        customer_no=user.customer_no,
        product_id=req.product_id,
        amount_krw=req.amount_krw,
        period_months=req.period_months,
        credit_inquiry_consent=req.credit_inquiry_consent,
        purpose_code=req.purpose_code,
        tokens=tokens,
    )
    log.info("loan_application_submitted", status=status_cd)
    return LoanApplyResponse(
        app_token=app_token,
        status_cd=status_cd,
        required_documents=["INCOME_PROOF", "ID_CARD"],
    )


# ---------------------------------------------------------------------------
# LN-005
# ---------------------------------------------------------------------------

@router.get("/applications/{app_token}/status", response_model=LoanStatusResponse)
async def get_application_status(
    app_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> LoanStatusResponse:
    app_id = await resolve_app(tokens, app_token, user.customer_no)
    info = await fetch_application_status(app_id, user.customer_no)
    return LoanStatusResponse(
        app_token=app_token,
        status_cd=info["APPLY_STATUS_CD"] or "UNKNOWN",
        review_steps=[],  # LOAN_REVIEW JOIN은 후속
        missing_documents=[],
        current_step_cd=info["APPLY_STATUS_CD"],
    )


# ---------------------------------------------------------------------------
# LN-004 본인 신청 첨부 서류 — 요구 목록 조회 + multipart 업로드
# ---------------------------------------------------------------------------

@router.get("/applications/{app_token}/required-docs")
async def get_user_required_docs(
    app_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> dict:
    app_id = await resolve_app(tokens, app_token, user.customer_no)
    return await fetch_user_required_docs(app_id, user.customer_no)


@router.post("/applications/{app_token}/attachments")
async def upload_user_loan_attachment(
    app_token: str,
    doc_type_id: int = Form(..., ge=1),
    file: UploadFile = File(...),
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> dict:
    app_id = await resolve_app(tokens, app_token, user.customer_no)
    # UploadFile.read() 가 메모리 적재. 10MB 한도라 OK.
    payload = await file.read()
    return await upload_user_attachment(
        app_id,
        user.customer_no,
        doc_type_id=doc_type_id,
        file_bytes=payload,
        content_type=file.content_type or "",
        original_name=file.filename or "",
    )


# ---------------------------------------------------------------------------
# LN-006 약정
# ---------------------------------------------------------------------------

@router.post("/applications/{app_token}/contract", response_model=LoanContractResponse)
async def sign_loan(
    app_token: str,
    req: LoanContractRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> LoanContractResponse:
    app_id = await resolve_app(tokens, app_token, user.customer_no)
    loan_token, contract_no, rate, monthly = await sign_contract(
        customer_no=user.customer_no, app_id=app_id, tokens=tokens
    )
    return LoanContractResponse(
        loan_token=loan_token,
        loan_contract_no_masked=mask_account_no(contract_no),
        masked_loan_account_no=mask_account_no(contract_no),  # 임시 — 별도 대출계좌 미생성
        rate_applied=rate,
        monthly_payment_krw=monthly,
    )


# ---------------------------------------------------------------------------
# LN-007 실행 — 멱등
# ---------------------------------------------------------------------------

@router.post("/contracts/{loan_token}/execute", response_model=LoanExecuteResponse)
async def execute(
    loan_token: str,
    req: LoanExecuteRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> LoanExecuteResponse:
    if not idempotency_key:
        raise BusinessError(E_VALIDATION, "Idempotency-Key 헤더가 필요합니다.")
    contract_no = await resolve_loan(tokens, loan_token, user.customer_no)
    deposit_account_no = await resolve_account_token(
        tokens, req.deposit_account_token, user.customer_no
    )
    exec_seq, principal, tx_id, executed_at, replay = await execute_loan(
        customer_no=user.customer_no,
        contract_no=contract_no,
        deposit_account_no=deposit_account_no,
        idempotency_key=idempotency_key,
    )
    tx_token = await issue_tx_token(tokens, tx_id, user.customer_no) if tx_id else ""
    return LoanExecuteResponse(
        exec_seq=exec_seq,
        tx_token=tx_token,
        executed_at=executed_at,
        principal_krw=principal,
        idempotent_replay=replay,
    )


# ---------------------------------------------------------------------------
# LN-008 상세
# ---------------------------------------------------------------------------

@router.get("/contracts/{loan_token}", response_model=LoanDetailResponse)
async def detail(
    loan_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> LoanDetailResponse:
    contract_no = await resolve_loan(tokens, loan_token, user.customer_no)
    d = await fetch_loan_detail(contract_no, user.customer_no)
    c = d["contract"]
    principal = int(c["CONTRACT_LIMIT"] or 0)
    used = int(c["CURRENT_USAGE"] or 0)
    rate = float(c["CONTRACT_RATE"] or 0.0)
    schedule_count = int(c.get("schedule_count") or 0)
    next_total = int(c.get("next_scheduled_total") or 0)
    return LoanDetailResponse(
        loan_token=loan_token,
        loan_contract_no_masked=mask_account_no(contract_no),
        product_name=c["PRODUCT_NAME"] or "",
        principal_krw=principal,
        balance_krw=used,
        rate_applied=rate,
        period_months=schedule_count or 12,
        next_payment_date=_parse_date(c.get("next_scheduled_date")),
        monthly_payment_krw=next_total,
        overdue_days=0,
        exec_histories=[
            LoanExecHistoryItem(
                exec_seq=int(e["EXEC_SEQ"]),
                exec_datetime=_parse_dt(e["EXEC_DATETIME"]) or datetime.now(),
                exec_type_cd=e["EXEC_TYPE_CD"] or "EXEC",
                exec_amount_krw=int(e["EXEC_AMOUNT"] or 0),
                post_exec_balance_krw=int(e["POST_EXEC_BALANCE"] or 0),
            )
            for e in d["executions"]
        ],
        repay_histories=[],
    )


# ---------------------------------------------------------------------------
# LN-009 스케줄
# ---------------------------------------------------------------------------

@router.get("/contracts/{loan_token}/schedule", response_model=LoanScheduleResponse)
async def schedule(
    loan_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> LoanScheduleResponse:
    contract_no = await resolve_loan(tokens, loan_token, user.customer_no)
    rows = await fetch_repay_schedule(contract_no, user.customer_no)
    items = [
        LoanScheduleItem(
            seq=int(r["INSTALLMENT_NO"]),
            due_date=_parse_date(r["SCHEDULED_DATE"]) or date.today(),
            principal_krw=int(r["SCHEDULED_PRINCIPAL"] or 0),
            interest_krw=int(r["SCHEDULED_INTEREST"] or 0),
            total_krw=int(r["SCHEDULED_TOTAL"] or 0),
            balance_after_krw=int(r["POST_PRINCIPAL_BALANCE"] or 0),
            status_cd=r["SCHEDULE_STATUS_CD"] or "WAITING",
            repaid_at=None,
        )
        for r in rows
    ]
    return LoanScheduleResponse(loan_token=loan_token, schedule=items)