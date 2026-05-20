"""회원가입 라우터 — AU-002 / AU-003 / AU-004 / AU-008."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends

from ..schema.auth import (
    SignupAccountRequest,
    SignupAccountResponse,
    SignupTermsRequest,
    SignupTermsResponse,
    SignupVerifyRequest,
    SignupVerifyResponse,
    SimplePinSetupRequest,
    SimplePinSetupResponse,
)
from ..service.auth import CurrentCustomer, current_customer, issue_access_token
from ..service.signup import (
    count_agreed,
    create_account,
    set_simple_pin,
    verify_identity,
)

router = APIRouter(prefix="/signup", tags=["signup"])
log = structlog.get_logger("signup")


@router.post("/terms", response_model=SignupTermsResponse)
async def signup_terms(req: SignupTermsRequest) -> SignupTermsResponse:
    n = count_agreed(req.agreements)
    log.info("signup_terms", count=n)
    return SignupTermsResponse(agreed_count=n)


@router.post("/verify", response_model=SignupVerifyResponse)
async def signup_verify(req: SignupVerifyRequest) -> SignupVerifyResponse:
    verification_id, party_id = await verify_identity(
        resident_no=req.resident_no,
        phone=req.phone,
        otp_code=req.otp_code,
    )
    log.info("signup_verify", party_id=party_id)
    return SignupVerifyResponse(verification_id=verification_id, party_id=party_id)


@router.post("/account", response_model=SignupAccountResponse)
async def signup_account(req: SignupAccountRequest) -> SignupAccountResponse:
    customer_no = await create_account(
        verification_id=req.verification_id,
        password=req.password,
        password_confirm=req.password_confirm,
        email=req.email,
        address_main=req.address_main,
        address_detail=req.address_detail,
        zip_code=req.zip_code,
        phone_main=req.phone_main,
    )
    token, expires_in = issue_access_token(customer_no)
    log.info("signup_account_created", customer_no=customer_no)
    return SignupAccountResponse(
        customer_no=customer_no, access_token=token, expires_in=expires_in
    )


@router.post("/pin", response_model=SimplePinSetupResponse)
async def signup_pin(
    req: SimplePinSetupRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> SimplePinSetupResponse:
    await set_simple_pin(user.customer_no, req.pin, req.pin_confirm)
    log.info("signup_pin_set")
    return SimplePinSetupResponse(success=True)