"""자동이체·예약이체 라우터 — TR-005/006/007/008."""

from __future__ import annotations

from datetime import date, datetime

import structlog
from fastapi import APIRouter, Depends

from ..logging_setup import mask_account_no
from ..schema.common import MaskedAccount
from ..schema.transfer import (
    AutoTransferCreate,
    AutoTransferExecHistoryResponse,
    AutoTransferExecItem,
    AutoTransferItem,
    AutoTransferListResponse,
    AutoTransferResponse,
    AutoTransferStatusPatch,
    ScheduledTransferCreate,
)
from ..service.account import resolve_account_token
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.auto_transfer import (
    create_auto_transfer,
    create_scheduled,
    fetch_auto_list,
    fetch_exec_history,
    patch_status,
    resolve_auto,
)
from ..service.token import TokenService

router = APIRouter(prefix="/transfer", tags=["auto-transfer"])
log = structlog.get_logger("auto_transfer")


def _to_item(r: dict, auto_token: str) -> AutoTransferItem:
    return AutoTransferItem(
        auto_token=auto_token,
        from_account=MaskedAccount(masked=mask_account_no(r["WITHDRAW_ACCOUNT_NO"])),
        to_account=MaskedAccount(
            masked=mask_account_no(r["DEPOSIT_ACCOUNT_NO"]),
            bank_cd=r["DEPOSIT_BANK_CD"],
            bank_name=r["DEPOSIT_BANK_NAME"],
            holder_name=r["DEPOSIT_HOLDER_NAME"],
        ),
        amount_krw=int(r["TRANSFER_AMOUNT"] or 0),
        cycle_type_cd=r["CYCLE_TYPE_CD"] or "MONTHLY",
        monthly_exec_day=r["MONTHLY_EXEC_DAY"],
        auto_status_cd=r["AUTO_STATUS_CD"] or "UNKNOWN",
        valid_start_date=_parse_date_or_today(r["VALID_START_DATE"]),
        valid_end_date=_parse_date(r["VALID_END_DATE"]),
        next_execute_at=None,
        linked_to=None,
    )


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:8], "%Y%m%d").date()
    except ValueError:
        return None


def _parse_date_or_today(s: str | None) -> date:
    return _parse_date(s) or date.today()


# ---------------------------------------------------------------------------
# TR-005 등록
# ---------------------------------------------------------------------------

@router.post("/auto", response_model=AutoTransferResponse)
async def register_auto(
    req: AutoTransferCreate,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AutoTransferResponse:
    from_account_no = await resolve_account_token(
        tokens, req.from_account_token, user.customer_no
    )
    auto_token, next_dt = await create_auto_transfer(
        customer_no=user.customer_no,
        from_account_no=from_account_no,
        to_bank_cd=req.to_bank_cd,
        to_account_no=req.to_account_no,
        to_holder_name=req.to_holder_name,
        amount_krw=req.amount_krw,
        cycle_type_cd=req.cycle_type_cd,
        monthly_exec_day=req.monthly_exec_day,
        valid_start_date=req.valid_start_date,
        valid_end_date=req.valid_end_date,
        memo=req.memo,
        tokens=tokens,
    )
    log.info("auto_transfer_registered", cycle=req.cycle_type_cd)
    return AutoTransferResponse(auto_token=auto_token, next_execute_at=next_dt)


# ---------------------------------------------------------------------------
# TR-006 목록 / 상태 변경
# ---------------------------------------------------------------------------

@router.get("/auto", response_model=AutoTransferListResponse)
async def list_auto(
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AutoTransferListResponse:
    rows = await fetch_auto_list(user.customer_no)
    items = []
    for r in rows:
        token = await tokens.issue(
            "AUTO", str(r["AUTO_TRANSFER_ID"]), user.customer_no
        )
        items.append(_to_item(r, token))
    return AutoTransferListResponse(items=items)


@router.patch("/auto/{auto_token}")
async def patch_auto(
    auto_token: str,
    req: AutoTransferStatusPatch,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> dict:
    auto_id = await resolve_auto(tokens, auto_token, user.customer_no)
    new_status = await patch_status(user.customer_no, auto_id, req.action)
    log.info("auto_transfer_status_change", action=req.action, status=new_status)
    return {"auto_status_cd": new_status}


# ---------------------------------------------------------------------------
# TR-007 실행 이력
# ---------------------------------------------------------------------------

@router.get(
    "/auto/{auto_token}/history", response_model=AutoTransferExecHistoryResponse
)
async def auto_history(
    auto_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AutoTransferExecHistoryResponse:
    auto_id = await resolve_auto(tokens, auto_token, user.customer_no)
    rows = await fetch_exec_history(user.customer_no, auto_id)
    items = [
        AutoTransferExecItem(
            scheduled_date=_parse_date_or_today(r["SCHEDULED_DATE"]),
            biz_day_adjusted=_parse_date(r["BIZ_DAY_ADJUSTED"]),
            exec_status_cd=r["EXEC_STATUS_CD"] or "WAITING",
            exec_datetime=_parse_dt(r["EXEC_DATETIME"]),
            delay_reason_cd=r["DELAY_REASON_CD"],
            tx_token=None,  # TX 토큰 발급은 후속
        )
        for r in rows
    ]
    return AutoTransferExecHistoryResponse(auto_token=auto_token, items=items)


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# TR-008 1회성 예약
# ---------------------------------------------------------------------------

@router.post("/scheduled", response_model=AutoTransferResponse)
async def register_scheduled(
    req: ScheduledTransferCreate,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> AutoTransferResponse:
    from_account_no = await resolve_account_token(
        tokens, req.from_account_token, user.customer_no
    )
    token, when = await create_scheduled(
        customer_no=user.customer_no,
        from_account_no=from_account_no,
        to_bank_cd=req.to_bank_cd,
        to_account_no=req.to_account_no,
        to_holder_name=req.to_holder_name,
        amount_krw=req.amount_krw,
        scheduled_at=req.scheduled_at,
        memo=req.memo,
        tokens=tokens,
    )
    return AutoTransferResponse(auto_token=token, next_execute_at=when)