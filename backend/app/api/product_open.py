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
from ..service import account_product_map
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


class OpenDepositRequest(BaseModel):
    amount_krw: int = Field(..., gt=0, le=10_000_000_000)
    period_months: int = Field(..., ge=1, le=120)
    interest_payment_cd: str = Field(..., description="MATURITY / MONTHLY 등")
    withdraw_account_token: str = Field(..., description="만기 시 입금받을 자유입출금 계좌 토큰")
    password: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class OpenForeignRequest(BaseModel):
    currency: str = Field(..., min_length=3, max_length=3)
    foreign_amount: float | None = None
    krw_amount: int | None = None
    password: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class JointOwner(BaseModel):
    customer_no: int
    role_cd: str = "JOINT_OWNER"
    delegation_power_codes: list[str] = Field(default_factory=list)


class OpenJointRequest(BaseModel):
    alias: str | None = Field(None, max_length=50)
    initial_deposit_krw: int = Field(0, ge=0, le=10_000_000_000)
    co_owners: list[JointOwner] = Field(default_factory=list)
    attachment_ids: list[int] = Field(default_factory=list)


class OpenMinorRequest(BaseModel):
    child_party_id: int
    guardian_customer_no: int
    delegation_power_codes: list[str] = Field(default_factory=list)
    attachment_ids: list[int] = Field(default_factory=list)


class OpenAccountResponse(BaseModel):
    account_token: str


class ProductCompleteResponse(BaseModel):
    account_token: str
    account_no: str
    product_name: str


# ---------------------------------------------------------------------------
# 보조
# ---------------------------------------------------------------------------

# account_no → product_id 매핑 — `service/account_product_map.py` 공유 모듈.
# INSTALL 라우터(`service/account_open.py`)도 같은 모듈에 set 하여 complete 응답 product_name 정합.

_TYPE_LABEL = {
    "SAVING": "자유입출금 통장",
    "DEPOSIT": "정기예금 통장",
    "INSTALLMENT": "적금 통장",
    "FOREIGN": "외화 통장",
    "LOAN": "대출",
    "JOINT": "공동명의 통장",
    "MINOR": "어린이 통장",
}


async def _insert_account_row(
    conn,
    *,
    customer_no: int,
    account_no: str,
    account_type_cd: str,
    holder_name: str,
    withdraw_pwd_hash: str | None,
    balance_krw: int,
    alias: str | None,
    daily_w: int,
    daily_t: int,
) -> None:
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
        customer_no,
        account_type_cd,
        today,
        balance_krw,
        holder_name,
        withdraw_pwd_hash,
        daily_w,
        daily_t,
        alias,
    )


async def _generate_account_no(conn) -> str:
    """공유 helper `service/account_no_gen.generate_account_no` 위임."""
    from ..service.account_no_gen import generate_account_no

    try:
        return await generate_account_no(conn)
    except RuntimeError as e:
        raise BusinessError(E_VALIDATION, str(e))


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

async def _fetch_and_validate_product(conn, product_id: int, expected_type: str | tuple[str, ...]) -> dict:
    product = await conn.fetchrow(
        'SELECT "PRODUCT_ID", "PRODUCT_NAME", "PRODUCT_TYPE_CD" '
        'FROM public."PRODUCT" WHERE "PRODUCT_ID" = $1 AND "DELETE_YN" = \'N\'',
        product_id,
    )
    if not product:
        raise NotFoundError(E_NOT_FOUND, "상품을 찾을 수 없습니다.")
    expected_tuple = (expected_type,) if isinstance(expected_type, str) else tuple(expected_type)
    if product["PRODUCT_TYPE_CD"] not in expected_tuple:
        labels = " / ".join(_TYPE_LABEL.get(t, t) for t in expected_tuple)
        raise BusinessError(E_VALIDATION, f"{labels} 상품이 아닙니다.")
    return product


async def _open_common(
    conn,
    *,
    product,
    customer_no: int,
    account_type_cd: str,
    balance_krw: int,
    password_plain: str | None,
    alias: str | None,
) -> str:
    """타입 공통 ACCOUNT INSERT — 신규 account_no 생성·홀더 조회·한도 정책."""
    daily_w, daily_t = _default_limits(customer_no)
    account_no = await _generate_account_no(conn)
    holder = await _holder_name(conn, customer_no)
    await _insert_account_row(
        conn,
        customer_no=customer_no,
        account_no=account_no,
        account_type_cd=account_type_cd,
        holder_name=holder,
        withdraw_pwd_hash=hash_password(password_plain) if password_plain else None,
        balance_krw=balance_krw,
        alias=alias,
        daily_w=daily_w,
        daily_t=daily_t,
    )
    account_product_map.set_product(account_no, int(product["PRODUCT_ID"]))
    return account_no


@router.post("/{product_id}/open-saving", response_model=OpenAccountResponse)
async def open_saving(
    product_id: int,
    req: OpenSavingRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        product = await _fetch_and_validate_product(conn, product_id, "SAVING")
        async with conn.transaction():
            account_no = await _open_common(
                conn,
                product=product,
                customer_no=user.customer_no,
                account_type_cd="SAVING",
                balance_krw=req.initial_deposit_krw,
                password_plain=req.withdraw_password,
                alias=req.alias,
            )

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
# 정기예금 개설 (DEPOSIT) — 만기일·이자지급 주기 메타는 로깅만
# ---------------------------------------------------------------------------

@router.post("/{product_id}/open-deposit", response_model=OpenAccountResponse)
async def open_deposit(
    product_id: int,
    req: OpenDepositRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        product = await _fetch_and_validate_product(conn, product_id, "DEPOSIT")
        async with conn.transaction():
            account_no = await _open_common(
                conn,
                product=product,
                customer_no=user.customer_no,
                account_type_cd="DEPOSIT",
                balance_krw=req.amount_krw,
                password_plain=req.password,
                alias=None,
            )

    account_token = await tokens.issue("ACCOUNT", account_no, user.customer_no)
    log.info(
        "product_open_deposit",
        product_id=product_id,
        customer_no=user.customer_no,
        account_no=account_no,
        amount=req.amount_krw,
        period_months=req.period_months,
        interest_payment_cd=req.interest_payment_cd,
    )
    return OpenAccountResponse(account_token=account_token)


# ---------------------------------------------------------------------------
# 외화 개설 (FOREIGN)
# ---------------------------------------------------------------------------

@router.post("/{product_id}/open-foreign", response_model=OpenAccountResponse)
async def open_foreign(
    product_id: int,
    req: OpenForeignRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        product = await _fetch_and_validate_product(conn, product_id, "FOREIGN")
        # 외화 잔액은 별도 테이블/컬럼이 정의되지 않아 BALANCE(원화)에 0 으로 INSERT,
        # 환전·잔액 영구화는 후속 작업.
        async with conn.transaction():
            account_no = await _open_common(
                conn,
                product=product,
                customer_no=user.customer_no,
                account_type_cd="FOREIGN",
                balance_krw=0,
                password_plain=req.password,
                alias=req.currency,
            )

    account_token = await tokens.issue("ACCOUNT", account_no, user.customer_no)
    log.info(
        "product_open_foreign",
        product_id=product_id,
        customer_no=user.customer_no,
        account_no=account_no,
        currency=req.currency,
        foreign_amount=req.foreign_amount,
        krw_amount=req.krw_amount,
    )
    return OpenAccountResponse(account_token=account_token)


# ---------------------------------------------------------------------------
# 공동명의 개설 (JOINT)
# ---------------------------------------------------------------------------

# UI 위임 권한 코드 → DELEGATION 컬럼 매핑. 정의되지 않은 코드는 무시.
_JOINT_POWER_COLUMN = {
    "INQUIRY": "INQUIRY_PERM",
    "WITHDRAW": "WITHDRAW_PERM",
    "TRANSFER": "TRANSFER_PERM",
    "CLOSE": "CLOSE_PERM",
    "LIMIT_CHANGE": "LIMIT_CHANGE_PERM",
}


async def _persist_joint_participants(
    conn,
    *,
    account_no: str,
    primary_customer_no: int,
    co_owners: list[JointOwner],
) -> dict:
    """CONTRACT_PARTICIPANT 행을 본인+공동명의자 만큼, DELEGATION 행을 권한 있는 공동명의자마다 INSERT."""
    primary_party = await conn.fetchval(
        'SELECT "PARTY_ID" FROM public."CUSTOMER" WHERE "CUSTOMER_NO" = $1',
        primary_customer_no,
    )
    if primary_party is None:
        raise BusinessError(E_VALIDATION, "본인 고객 정보가 확인되지 않습니다.")

    if primary_customer_no in {o.customer_no for o in co_owners}:
        raise BusinessError(E_VALIDATION, "본인은 공동명의자 목록에 포함할 수 없어요.")

    co_party_rows = await conn.fetch(
        'SELECT "CUSTOMER_NO", "PARTY_ID" FROM public."CUSTOMER" '
        'WHERE "CUSTOMER_NO" = ANY($1::bigint[]) AND "PARTY_ID" IS NOT NULL',
        [o.customer_no for o in co_owners],
    )
    co_party_map = {int(r["CUSTOMER_NO"]): int(r["PARTY_ID"]) for r in co_party_rows}
    missing = [o.customer_no for o in co_owners if o.customer_no not in co_party_map]
    if missing:
        raise BusinessError(
            E_VALIDATION, f"공동명의자 고객번호를 찾을 수 없어요: {missing}"
        )

    today = date.today().strftime("%Y%m%d")
    total = 1 + len(co_owners)
    share = round(1.0 / total, 4)

    participant_sql = (
        'INSERT INTO public."CONTRACT_PARTICIPANT" '
        '("CONTRACT_NO","PARTY_ID","ROLE_TYPE_ID","PARTICIPANT_SEQ","SHARE_RATIO",'
        ' "PARTICIPATE_START_DATE","PARTICIPATE_STATUS_CD","JOINT_LIABILITY_YN","CREATED_BY") '
        "VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE','Y','SYSTEM')"
    )
    await conn.execute(
        participant_sql, account_no, primary_party, "OWNER", 1, share, today
    )
    for idx, owner in enumerate(co_owners, start=2):
        await conn.execute(
            participant_sql,
            account_no,
            co_party_map[owner.customer_no],
            "JOINT",
            idx,
            share,
            today,
        )

    delegations = 0
    for owner in co_owners:
        codes = [c for c in owner.delegation_power_codes if c in _JOINT_POWER_COLUMN]
        if not codes:
            continue
        codes_set = set(codes)
        perm = lambda key: "Y" if key in codes_set else "N"  # noqa: E731
        next_id = await conn.fetchval(
            'SELECT COALESCE(MAX("DELEGATION_ID"), 30000) + 1 FROM public."DELEGATION"'
        )
        await conn.execute(
            'INSERT INTO public."DELEGATION" '
            '("DELEGATION_ID","TARGET_CUST_NO","AGENT_CUST_NO","ROLE_TYPE_CD",'
            ' "INQUIRY_PERM","WITHDRAW_PERM","TRANSFER_PERM","CLOSE_PERM",'
            ' "LIMIT_CHANGE_PERM","DELEG_START_DATE","NOTARIZE_YN","CREATED_BY") '
            "VALUES ($1,$2,$3,'JOINT',$4,$5,$6,$7,$8,$9,'N','SYSTEM')",
            int(next_id),
            primary_customer_no,
            owner.customer_no,
            perm("INQUIRY"),
            perm("WITHDRAW"),
            perm("TRANSFER"),
            perm("CLOSE"),
            perm("LIMIT_CHANGE"),
            today,
        )
        delegations += 1

    return {"participants": total, "delegations": delegations, "share_ratio": share}


@router.post("/{product_id}/open-joint", response_model=OpenAccountResponse)
async def open_joint(
    product_id: int,
    req: OpenJointRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    if not req.co_owners:
        raise BusinessError(E_VALIDATION, "공동명의자 1명 이상을 지정해 주세요.")
    pool = get_pool()
    async with pool.acquire() as conn:
        # 공동명의는 SAVING 상품 베이스의 변형으로 화면이 호출 — 상품 타입은 SAVING 으로 가정.
        product = await _fetch_and_validate_product(conn, product_id, "SAVING")
        async with conn.transaction():
            account_no = await _open_common(
                conn,
                product=product,
                customer_no=user.customer_no,
                account_type_cd="SAVING",
                balance_krw=req.initial_deposit_krw,
                password_plain=None,
                alias=req.alias,
            )
            persist_stats = await _persist_joint_participants(
                conn,
                account_no=account_no,
                primary_customer_no=user.customer_no,
                co_owners=req.co_owners,
            )

    account_token = await tokens.issue("ACCOUNT", account_no, user.customer_no)
    log.info(
        "product_open_joint",
        product_id=product_id,
        customer_no=user.customer_no,
        account_no=account_no,
        co_owners=[(o.customer_no, o.role_cd, o.delegation_power_codes) for o in req.co_owners],
        attachments=req.attachment_ids,
        participants=persist_stats["participants"],
        delegations=persist_stats["delegations"],
        share_ratio=persist_stats["share_ratio"],
    )
    return OpenAccountResponse(account_token=account_token)


# ---------------------------------------------------------------------------
# 어린이(미성년) 개설 (MINOR) — 친권자 위임 + 첨부서류
# ---------------------------------------------------------------------------

async def _persist_minor_participants(
    conn,
    *,
    account_no: str,
    guardian_customer_no: int,
    child_party_id: int,
    delegation_power_codes: list[str],
) -> dict:
    """CONTRACT_PARTICIPANT 2행(친권자 GUARDIAN seq=1 + 자녀 MINOR seq=2) +
    자녀에게 CUSTOMER 가 있으면 DELEGATION(친권자→자녀, ROLE_TYPE_CD='PARENT') 1행 INSERT."""
    guardian_party = await conn.fetchval(
        'SELECT "PARTY_ID" FROM public."CUSTOMER" WHERE "CUSTOMER_NO" = $1',
        guardian_customer_no,
    )
    if guardian_party is None:
        raise BusinessError(E_VALIDATION, "친권자 고객 정보가 확인되지 않습니다.")

    child_exists = await conn.fetchval(
        'SELECT 1 FROM public."PARTY" WHERE "PARTY_ID" = $1',
        child_party_id,
    )
    if not child_exists:
        raise BusinessError(E_VALIDATION, "자녀 정보(PARTY_ID)를 찾을 수 없어요.")
    if int(child_party_id) == int(guardian_party):
        raise BusinessError(E_VALIDATION, "친권자와 자녀가 동일할 수 없어요.")

    # ROLE_TYPE_MASTER 마스터 행 idempotent 보강 (시드 없을 환경 대비).
    await conn.execute(
        'INSERT INTO public."ROLE_TYPE_MASTER" '
        '("ROLE_TYPE_ID","ROLE_TYPE_NAME","CREATED_BY") '
        "VALUES ('GUARDIAN','친권자','SYSTEM'),('MINOR','미성년본인','SYSTEM') "
        'ON CONFLICT ("ROLE_TYPE_ID") DO NOTHING'
    )

    today = date.today().strftime("%Y%m%d")
    participant_sql = (
        'INSERT INTO public."CONTRACT_PARTICIPANT" '
        '("CONTRACT_NO","PARTY_ID","ROLE_TYPE_ID","PARTICIPANT_SEQ","SHARE_RATIO",'
        ' "PARTICIPATE_START_DATE","PARTICIPATE_STATUS_CD","JOINT_LIABILITY_YN","CREATED_BY") '
        "VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE','N','SYSTEM')"
    )
    await conn.execute(
        participant_sql, account_no, guardian_party, "GUARDIAN", 1, 1.0, today
    )
    await conn.execute(
        participant_sql, account_no, child_party_id, "MINOR", 2, 0.0, today
    )

    child_customer_no = await conn.fetchval(
        'SELECT "CUSTOMER_NO" FROM public."CUSTOMER" WHERE "PARTY_ID" = $1',
        child_party_id,
    )
    delegation_inserted = False
    if child_customer_no is not None:
        codes = [c for c in delegation_power_codes if c in _JOINT_POWER_COLUMN]
        codes_set = set(codes)
        perm = lambda key: "Y" if key in codes_set else "N"  # noqa: E731
        next_id = await conn.fetchval(
            'SELECT COALESCE(MAX("DELEGATION_ID"), 30000) + 1 FROM public."DELEGATION"'
        )
        await conn.execute(
            'INSERT INTO public."DELEGATION" '
            '("DELEGATION_ID","TARGET_CUST_NO","AGENT_CUST_NO","ROLE_TYPE_CD",'
            ' "INQUIRY_PERM","WITHDRAW_PERM","TRANSFER_PERM","CLOSE_PERM",'
            ' "LIMIT_CHANGE_PERM","DELEG_START_DATE","NOTARIZE_YN","CREATED_BY") '
            "VALUES ($1,$2,$3,'PARENT',$4,$5,$6,$7,$8,$9,'N','SYSTEM')",
            int(next_id),
            int(child_customer_no),
            guardian_customer_no,
            perm("INQUIRY"),
            perm("WITHDRAW"),
            perm("TRANSFER"),
            perm("CLOSE"),
            perm("LIMIT_CHANGE"),
            today,
        )
        delegation_inserted = True

    return {
        "participants": 2,
        "delegation_inserted": delegation_inserted,
        "child_customer_no": int(child_customer_no) if child_customer_no else None,
    }


@router.post("/{product_id}/open-minor", response_model=OpenAccountResponse)
async def open_minor(
    product_id: int,
    req: OpenMinorRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> OpenAccountResponse:
    if req.guardian_customer_no != user.customer_no:
        raise BusinessError(E_VALIDATION, "친권자 정보가 본인과 일치하지 않습니다.")
    pool = get_pool()
    async with pool.acquire() as conn:
        # 미성년 통장 — SAVING(어린이 자유입출금) 또는 INSTALL(어린이 적금) 둘 다 허용.
        # 테스트시나리오.md §10.6 의 304(INSTALL) 진입을 위해 INSTALL 확장 (2026-05-22).
        product = await _fetch_and_validate_product(conn, product_id, ("SAVING", "INSTALL"))
        is_install = product["PRODUCT_TYPE_CD"] == "INSTALL"
        async with conn.transaction():
            account_no = await _open_common(
                conn,
                product=product,
                customer_no=user.customer_no,
                account_type_cd="INSTALL" if is_install else "SAVING",
                balance_krw=0,
                password_plain=None,
                alias="어린이 적금" if is_install else "어린이 통장",
            )
            persist_stats = await _persist_minor_participants(
                conn,
                account_no=account_no,
                guardian_customer_no=user.customer_no,
                child_party_id=req.child_party_id,
                delegation_power_codes=req.delegation_power_codes,
            )

    account_token = await tokens.issue("ACCOUNT", account_no, user.customer_no)
    log.info(
        "product_open_minor",
        product_id=product_id,
        customer_no=user.customer_no,
        account_no=account_no,
        child_party_id=req.child_party_id,
        child_customer_no=persist_stats["child_customer_no"],
        delegation_power_codes=req.delegation_power_codes,
        delegation_inserted=persist_stats["delegation_inserted"],
        attachments=req.attachment_ids,
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
        pid = account_product_map.get_product(account_no)
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