"""상품 개설 라우터 — OP-003 자유입출금 / OP-009 완료 / OP-010 약관 동의.

현재 단계
  - 약관 동의 (POST /products/{id}/terms) — 검증·로깅만 (CUSTOMER_TERMS_AGREE INSERT 영구화는 후속)
  - 자유입출금 개설 (POST /products/{id}/open-saving) — ACCOUNT INSERT + account_token 발급
  - 개설 완료 조회 (GET /products/complete/{account_token})

타입별(SAVING/DEPOSIT/INSTALLMENT/FOREIGN/MINOR/JOINT) 분기 가입은 후속 작업 —
이번 단계는 가장 기본 타입(자유입출금)만 풀체인 동작.

스키마 한계
  ACCOUNT 테이블에 PRODUCT_ID 매핑 컬럼이 없어 in-memory `_account_product` dict 로
  account_no → product_id 매핑을 잠시 보관. 백엔드 재시작 시 사라지면 완료 화면은
  ACCOUNT_TYPE_CD 기반 generic 라벨로 폴백.
"""

from __future__ import annotations

import secrets
from datetime import date

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.auth.passwords import hash_password
from ..service.token import TokenService

router = APIRouter(prefix="/products", tags=["product-open"])
log = structlog.get_logger("product_open")


# ---------------------------------------------------------------------------
# 스키마
# ---------------------------------------------------------------------------

class TermsConsent(BaseModel):
    terms_id: int
    version: int
    agreed: bool


class ProductTermsRequest(BaseModel):
    product_id: int
    consents: list[TermsConsent]
    covenant_codes: list[str] = Field(default_factory=list)


class ProductTermsResponse(BaseModel):
    agreed_count: int


class OpenSavingRequest(BaseModel):
    alias: str | None = Field(None, max_length=50)
    initial_deposit_krw: int = Field(0, ge=0, le=10_000_000_000)
    withdraw_password: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class OpenAccountResponse(BaseModel):
    account_token: str


class ProductCompleteResponse(BaseModel):
    account_token: str
    account_no: str
    product_name: str


# ---------------------------------------------------------------------------
# 보조
# ---------------------------------------------------------------------------

# account_no → product_id 매핑 (in-memory, 휘발성)
_account_product: dict[str, int] = {}

_TYPE_LABEL = {
    "SAVING": "자유입출금 통장",
    "DEPOSIT": "정기예금 통장",
    "INSTALLMENT": "적금 통장",
    "FOREIGN": "외화 통장",
    "LOAN": "대출",
}


async def _generate_account_no(conn) -> str:
    """`110-200-{6자리}` 신규 ACCOUNT_NO — 중복 회피 단순 retry."""
    for _ in range(10):
        suffix = f"{secrets.randbelow(900_000) + 100_000:06d}"
        candidate = f"110-200-{suffix}"
        exists = await conn.fetchval(
            'SELECT 1 FROM public."ACCOUNT" WHERE "ACCOUNT_NO" = $1',
            candidate,
        )
        if not exists:
            return candidate
    raise BusinessError(E_VALIDATION, "계좌번호 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.")


async def _holder_name(conn, customer_no: int) -> str:
    row = await conn.fetchrow(
        'SELECT p."PARTY_NAME" FROM public."CUSTOMER" c '
        'LEFT JOIN public."PARTY" p ON p."PARTY_ID" = c."PARTY_ID" '
        'WHERE c."CUSTOMER_NO" = $1',
        customer_no,
    )
    name = row and row["PARTY_NAME"]
    return name or "본인"


def _default_limits(customer_no: int) -> tuple[int, int]:
    """OTP 등록 여부에 따라 일일 한도 결정 (SCR-SC-008 정책)."""
    from .auth import _otp_secrets  # 한도 정책용
    entry = _otp_secrets.get(customer_no)
    otp_active = bool(entry and entry.get("active"))
    return (50_000_000, 50_000_000) if otp_active else (300_000, 300_000)


# ---------------------------------------------------------------------------
# 약관 동의
# ---------------------------------------------------------------------------

@router.post("/{product_id}/terms", response_model=ProductTermsResponse)
async def post_product_terms(
    product_id: int,
    req: ProductTermsRequest,
    user: CurrentCustomer = Depends(current_customer),
) -> ProductTermsResponse:
    n = sum(1 for c in req.consents if c.agreed)
    log.info(
        "product_terms_agreed",
        product_id=product_id,
        customer_no=user.customer_no,
        agreed_count=n,
        covenants=len(req.covenant_codes),
    )
    # CUSTOMER_TERMS_AGREE INSERT 영구화는 후속 작업.
    return ProductTermsResponse(agreed_count=n)


# ---------------------------------------------------------------------------
# 자유입출금 개설 (SAVING)
# ---------------------------------------------------------------------------

@router.post("/{product_id}/open-saving", response_model=OpenAccountResponse)
async def open_saving(
    product_id: int,
    req: OpenSavingRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    daily_w, daily_t = _default_limits(user.customer_no)

    pool = get_pool()
    async with pool.acquire() as conn:
        product = await conn.fetchrow(
            'SELECT "PRODUCT_ID", "PRODUCT_NAME", "PRODUCT_TYPE_CD" '
            'FROM public."PRODUCT" WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\'',
            product_id,
        )
        if not product:
            raise NotFoundError(E_NOT_FOUND, "상품을 찾을 수 없습니다.")
        if product["PRODUCT_TYPE_CD"] != "SAVING":
            raise BusinessError(E_VALIDATION, "자유입출금 상품이 아닙니다.")

        async with conn.transaction():
            account_no = await _generate_account_no(conn)
            holder = await _holder_name(conn, user.customer_no)
            today = date.today().strftime("%Y%m%d")
            await conn.execute(
                'INSERT INTO public."ACCOUNT" ('
                '  "ACCOUNT_NO", "CUSTOMER_NO", "ACCOUNT_TYPE_CD", "OPEN_DATE", '
                '  "BALANCE", "PENDING_WITHDRAW", "ACCOUNT_STATUS_CD", '
                '  "ACCOUNT_HOLDER_NAME", "WITHDRAW_PWD_HASH", '
                '  "DAILY_WITHDRAW_LIMIT", "DAILY_TRANSFER_LIMIT", '
                '  "LIFETIME_ACCOUNT_NO", "ACCOUNT_ALIAS", '
                '  "PWD_ERROR_COUNT", "LIMITED_ACCOUNT_YN", '
                '  "PRIMARY_ACCOUNT_YN", "HIDDEN_YN", "DELETE_YN", '
                '  "CREATED_AT") VALUES ('
                '  $1, $2, $3, $4, $5, 0, \'NORMAL\', '
                "  $6, $7, $8, $9, $1, $10, 0, 'N', 'N', 'N', 'N', NOW())",
                account_no,
                user.customer_no,
                product["PRODUCT_TYPE_CD"],
                today,
                req.initial_deposit_krw,
                holder,
                hash_password(req.withdraw_password),
                daily_w,
                daily_t,
                req.alias,
            )

    _account_product[account_no] = int(product["PRODUCT_ID"])
    account_token = await tokens.issue("ACCOUNT", account_no, user.customer_no)
    log.info(
        "product_open_saving",
        product_id=product_id,
        customer_no=user.customer_no,
        account_no=account_no,
        initial=req.initial_deposit_krw,
    )
    return OpenAccountResponse(account_token=account_token)


# ---------------------------------------------------------------------------
# 개설 완료 조회
# ---------------------------------------------------------------------------

@router.get("/complete/{account_token}", response_model=ProductCompleteResponse)
async def get_product_complete(
    account_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> ProductCompleteResponse:
    payload = await tokens.resolve(account_token, customer_no=user.customer_no, expected_type="ACCOUNT")
    if not payload:
        raise NotFoundError(E_NOT_FOUND, "개설 결과를 찾을 수 없습니다.")

    account_no = payload.resource_id
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "ACCOUNT_NO", "ACCOUNT_TYPE_CD" FROM public."ACCOUNT" '
            'WHERE "ACCOUNT_NO" = $1 AND "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
            account_no,
            user.customer_no,
        )
        if not row:
            raise NotFoundError(E_NOT_FOUND, "개설 결과를 찾을 수 없습니다.")

        product_name: str | None = None
        pid = _account_product.get(account_no)
        if pid is not None:
            pname = await conn.fetchval(
                'SELECT "PRODUCT_NAME" FROM public."PRODUCT" WHERE "PRODUCT_ID" = $1',
                pid,
            )
            product_name = pname

    return ProductCompleteResponse(
        account_token=account_token,
        account_no=row["ACCOUNT_NO"],
        product_name=product_name or _TYPE_LABEL.get(row["ACCOUNT_TYPE_CD"], "통장"),
    )