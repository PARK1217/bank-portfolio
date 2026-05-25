"""대출 백엔드 서비스 — LN-001 ~ LN-009.

설계:
- LN-001 상품 목록: PRODUCT WHERE PRODUCT_TYPE_CD='LOAN'
- LN-002 가신청(precheck): DSR 시뮬 — DB 안 건드림 (신용조회 동의 X)
- LN-003 정식 신청: LOAN_APPLICATION INSERT, app_token(APP) 발급
- LN-005 심사 상태: APPLY_STATUS_CD 단순 반환
- LN-006 약정: LOAN_CONTRACT INSERT (LOAN_CONTRACT_NO 직접 생성), loan_token(LOAN)
- LN-007 실행: LOAN_EXEC_HISTORY INSERT + ACCOUNT BALANCE += principal + TRANSACTION
            + LOAN_REPAY_SCHEDULE 생성. **멱등 키 헤더 필수**.
- LN-008 상세: LOAN_CONTRACT + EXEC_HISTORY 집계
- LN-009 스케줄: LOAN_REPAY_SCHEDULE 목록

⚠️ LOAN_CONTRACT_NO 는 `L-YYYYMMDD-NNNN` 형식으로 직접 생성.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from ..db import get_pool
from ..errors import (
    E_BALANCE_INSUFFICIENT,
    E_IDEMPOTENCY_CONFLICT,
    E_NOT_FOUND,
    E_VALIDATION,
)
from ..exceptions import BusinessError, ConflictError, NotFoundError
from .account import fetch_account
from .notification import insert_notification as _insert_notification
from .token import ResourceType, TokenService

DSR_LIMIT_PCT = 40.0
DEFAULT_BASE_RATE = 5.0


def _now_str() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _today_str() -> str:
    return datetime.now().strftime("%Y%m%d")


# ---------------------------------------------------------------------------
# LN-001 상품 목록
# ---------------------------------------------------------------------------

async def fetch_loan_products() -> list[dict]:
    pool = get_pool()
    sql = (
        'SELECT p."PRODUCT_ID", p."PRODUCT_NAME", p."MIN_AMOUNT", p."MAX_AMOUNT", '
        '  p."TARGET_CUSTOMER_CD", p."MIN_AGE", p."MAX_AGE", '
        '  (SELECT MAX("MAX_MONTHS") FROM public."PRODUCT_PERIOD" '
        '     WHERE "PRODUCT_ID" = p."PRODUCT_ID" AND "DELETE_YN" = \'N\') AS max_months, '
        '  (SELECT "APPLY_RATE" FROM public."PRODUCT_RATE_POLICY" '
        '     WHERE "PRODUCT_ID" = p."PRODUCT_ID" AND "DELETE_YN" = \'N\' '
        '     ORDER BY "RATE_SEQ" LIMIT 1) AS base_rate '
        'FROM public."PRODUCT" p '
        'WHERE p."PRODUCT_TYPE_CD" = \'LOAN\' AND p."DELETE_YN" = \'N\' '
        'ORDER BY p."PRODUCT_ID"'
    )
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql)
    return [dict(r) for r in rows]


def infer_loan_subtype(product_name: str, target_customer_cd: str | None) -> str:
    """상품명 + 대상 코드 기반 sub-type 추론 — 자격 분기에 사용.

    DB 컬럼 부재로 상품명 키워드 기반. 시드는 8종 고정이므로 안전.
    """
    name = product_name or ""
    if "주택담보" in name:
        return "MORTGAGE"
    if "전세" in name:
        return "JEONSE"
    if target_customer_cd == "CORP" or "사업자" in name or "운영자금" in name:
        return "BIZ"
    if target_customer_cd == "FOREIGN" or "외국인" in name:
        return "FOREIGN_LOAN"
    if "사잇돌" in name or "새희망홀씨" in name:
        return "SUBPRIME"
    return "GENERAL"


# ---------------------------------------------------------------------------
# LN-002 가신청 (DSR 시뮬)
# ---------------------------------------------------------------------------

@dataclass
class PrecheckResult:
    eligible: bool
    simulated_dsr_pct: float
    max_amount_krw: int
    applicable_rate: float
    rejection_code: str | None


async def fetch_precheck_profile(customer_no: int) -> dict:
    """본행 데이터로 prefill 할 연소득 추정 + 당사 부채 원리금 합계.

    - annual_income_estimate : INDIVIDUAL_PARTY.ANNUAL_INCOME (가입 시 신고)
    - internal_debt_annual_krw : 본행 LOAN_CONTRACT NORMAL/OVERDUE 의 월납입(EPI) × 12 합계
    - loan_contracts: [{loan_contract_no, product_name, monthly_payment_krw}] — 분해 표시용
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        # 1) 연소득 — INDIVIDUAL_PARTY.ANNUAL_INCOME
        income = await conn.fetchval(
            'SELECT COALESCE(ip."ANNUAL_INCOME", 0) '
            'FROM public."CUSTOMER" c '
            'LEFT JOIN public."INDIVIDUAL_PARTY" ip ON ip."PARTY_ID" = c."PARTY_ID" '
            'WHERE c."CUSTOMER_NO" = $1',
            customer_no,
        )
        # 2) 본행 보유 대출 (NORMAL/OVERDUE) — 월납입 EPI 환산
        rows = await conn.fetch(
            'SELECT "LOAN_CONTRACT_NO", "PRODUCT_NAME_SNAPSHOT", '
            '       "CURRENT_USAGE", "CONTRACT_RATE", '
            '       "CONTRACT_DATE", "MATURITY_DATE" '
            'FROM public."LOAN_CONTRACT" '
            'WHERE "CUSTOMER_NO" = $1 '
            "  AND \"LOAN_STATUS_CD\" IN ('NORMAL','OVERDUE') AND \"DELETE_YN\" = 'N'",
            customer_no,
        )

    contracts = []
    total_annual = 0
    for r in rows:
        principal = int(r["CURRENT_USAGE"] or 0)
        rate = float(r["CONTRACT_RATE"] or 0)
        # 잔여 개월수 — 계약일~만기 차로 단순 산출, 산출 불가 시 60개월 기본.
        n = 60
        try:
            d1 = datetime.strptime((r["CONTRACT_DATE"] or "")[:8], "%Y%m%d").date()
            d2 = datetime.strptime((r["MATURITY_DATE"] or "")[:8], "%Y%m%d").date()
            n = max(1, (d2.year - d1.year) * 12 + (d2.month - d1.month))
        except ValueError:
            pass
        mr = rate / 100 / 12
        if mr <= 0:
            monthly = principal / n if n > 0 else 0
        else:
            monthly = principal * mr * (1 + mr) ** n / ((1 + mr) ** n - 1)
        annual = int(monthly * 12)
        contracts.append({
            "loan_contract_no": r["LOAN_CONTRACT_NO"],
            "product_name": r["PRODUCT_NAME_SNAPSHOT"],
            "monthly_payment_krw": int(monthly),
            "annual_payment_krw": annual,
        })
        total_annual += annual

    return {
        "annual_income_estimate": int(income or 0),
        "internal_debt_annual_krw": total_annual,
        "loan_contracts": contracts,
    }


def precheck_dsr(
    annual_income: int,
    annual_debt_total: int,
    desired_amount: int,
    period_months: int,
) -> PrecheckResult:
    """DSR = (연간 부채 원리금) / 연소득 × 100. 40 초과 → 부적격."""
    if annual_income <= 0:
        return PrecheckResult(False, 100.0, 0, DEFAULT_BASE_RATE, "E_LOAN_DSR_OVER")

    rate = DEFAULT_BASE_RATE
    monthly_rate = rate / 100 / 12
    n = period_months
    # 원리금균등상환 월납입
    if monthly_rate == 0:
        monthly = desired_amount / n
    else:
        monthly = (
            desired_amount * monthly_rate * (1 + monthly_rate) ** n
            / ((1 + monthly_rate) ** n - 1)
        )
    annual_new_debt = monthly * 12
    dsr = (annual_debt_total + annual_new_debt) / annual_income * 100

    # 최대 가능 금액 — DSR 40% 한도 역산
    max_annual_new = max(0, annual_income * DSR_LIMIT_PCT / 100 - annual_debt_total)
    max_monthly = max_annual_new / 12
    if monthly_rate == 0:
        max_amount = int(max_monthly * n)
    else:
        max_amount = int(
            max_monthly
            * ((1 + monthly_rate) ** n - 1)
            / (monthly_rate * (1 + monthly_rate) ** n)
        )

    eligible = dsr <= DSR_LIMIT_PCT
    return PrecheckResult(
        eligible=eligible,
        simulated_dsr_pct=round(dsr, 2),
        max_amount_krw=max(0, max_amount),
        applicable_rate=rate,
        rejection_code=None if eligible else "E_LOAN_DSR_OVER",
    )


# ---------------------------------------------------------------------------
# LN-003 정식 신청
# ---------------------------------------------------------------------------

async def apply_loan(
    *,
    customer_no: int,
    product_id: int,
    amount_krw: int,
    period_months: int,
    credit_inquiry_consent: bool,
    purpose_code: str | None,
    tokens: TokenService,
) -> tuple[str, str]:
    """LOAN_APPLICATION INSERT → app_token 발급. 반환: (app_token, status_cd)."""
    if not credit_inquiry_consent:
        raise BusinessError(E_VALIDATION, "신용정보조회 동의가 필요합니다.")
    now = _now_str()
    pool = get_pool()
    async with pool.acquire() as conn:
        app_id = await conn.fetchval(
            'INSERT INTO public."LOAN_APPLICATION" ('
            '  "CUSTOMER_NO", "APPLY_PRODUCT_ID", "APPLY_TYPE_CD", "DESIRED_AMOUNT", '
            '  "EXPECTED_RATE", "APPLY_DATETIME", "APPLY_STATUS_CD", "APPLY_CHANNEL_CD", '
            '  "PURPOSE_CD", "GUARANTOR_YN", "COLLATERAL_YN", "DELETE_YN"'
            ") VALUES ($1, $2, 'NEW', $3, $4, $5, 'SUBMIT', 'WEB', $6, 'N', 'N', 'N') "
            'RETURNING "LOAN_APP_ID"',
            customer_no,
            product_id,
            amount_krw,
            DEFAULT_BASE_RATE,
            now,
            purpose_code,
        )
    app_token = await tokens.issue(ResourceType.APP, str(app_id), customer_no)
    return app_token, "SUBMIT"


async def resolve_app(tokens: TokenService, app_token: str, customer_no: int) -> int:
    payload = await tokens.resolve(app_token, customer_no, expected_type=ResourceType.APP)
    if payload is None:
        raise NotFoundError(E_NOT_FOUND, "대출 신청을 찾을 수 없습니다.")
    return int(payload.resource_id)


async def resolve_loan(tokens: TokenService, loan_token: str, customer_no: int) -> str:
    payload = await tokens.resolve(loan_token, customer_no, expected_type=ResourceType.LOAN)
    if payload is None:
        raise NotFoundError(E_NOT_FOUND, "대출 계약을 찾을 수 없습니다.")
    return payload.resource_id


# ---------------------------------------------------------------------------
# LN-005 심사 상태 (단순)
# ---------------------------------------------------------------------------

async def fetch_application_status(app_id: int, customer_no: int) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "LOAN_APP_ID", "APPLY_STATUS_CD", "DESIRED_AMOUNT", "EXPECTED_RATE" '
            'FROM public."LOAN_APPLICATION" '
            'WHERE "LOAN_APP_ID" = $1 AND "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
            app_id,
            customer_no,
        )
    if row is None:
        raise NotFoundError(E_NOT_FOUND, "대출 신청을 찾을 수 없습니다.")
    return dict(row)


# ---------------------------------------------------------------------------
# LN-006 약정 (LOAN_CONTRACT INSERT)
# ---------------------------------------------------------------------------

def _new_contract_no() -> str:
    """L-YYYYMMDD-NNNNNN 형식 — 시간(마이크로초)으로 충돌 회피."""
    return "L-" + datetime.now().strftime("%Y%m%d-%H%M%S%f")[:18]


def _monthly_payment(principal: int, annual_rate: float, n: int) -> int:
    if n <= 0:
        return 0
    monthly_rate = annual_rate / 100 / 12
    if monthly_rate == 0:
        return principal // n
    return int(
        principal * monthly_rate * (1 + monthly_rate) ** n
        / ((1 + monthly_rate) ** n - 1)
    )


async def sign_contract(
    *,
    customer_no: int,
    app_id: int,
    tokens: TokenService,
) -> tuple[str, str, float, int]:
    """약정 — LOAN_CONTRACT INSERT. 반환: (loan_token, contract_no, rate, monthly_payment)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        app = await conn.fetchrow(
            'SELECT "APPLY_PRODUCT_ID", "DESIRED_AMOUNT", "EXPECTED_RATE", "APPLY_STATUS_CD" '
            'FROM public."LOAN_APPLICATION" '
            'WHERE "LOAN_APP_ID" = $1 AND "CUSTOMER_NO" = $2 AND "DELETE_YN" = \'N\'',
            app_id,
            customer_no,
        )
        if app is None:
            raise NotFoundError(E_NOT_FOUND, "대출 신청을 찾을 수 없습니다.")

        amount = int(app["DESIRED_AMOUNT"] or 0)
        rate = float(app["EXPECTED_RATE"] or DEFAULT_BASE_RATE)
        # 기간은 신청 시 명시 안 됨 — 임시 12개월. 추후 LOAN_APPLICATION에 PERIOD_MONTHS 컬럼 추가 권장.
        period_months = 12

        contract_no = _new_contract_no()
        today = _today_str()
        maturity = (datetime.now() + timedelta(days=30 * period_months)).strftime("%Y%m%d")

        # varchar(8) 컬럼 제약 — 코드는 8자 이내. 도메인 코드표 확정 시 표준화.
        await conn.execute(
            'INSERT INTO public."LOAN_CONTRACT" ('
            '  "LOAN_CONTRACT_NO", "CUSTOMER_NO", "LOAN_PRODUCT_ID", "LOAN_TYPE_CD", '
            '  "REPAY_METHOD_CD", "CONTRACT_LIMIT", "CURRENT_USAGE", "CONTRACT_RATE", '
            '  "BASE_RATE", "SPREAD_RATE", "CONTRACT_DATE", "EFFECTIVE_DATE", '
            '  "MATURITY_DATE", "LOAN_STATUS_CD", "RATE_TYPE_CD", "DELETE_YN"'
            ") VALUES ($1, $2, $3, 'TERM', 'EPI', $4, 0, $5, $5, 0, "
            "          $6, $6, $7, 'WAIT', 'FIXED', 'N')",
            contract_no,
            customer_no,
            app["APPLY_PRODUCT_ID"],
            amount,
            rate,
            today,
            maturity,
        )
        await conn.execute(
            'UPDATE public."LOAN_APPLICATION" SET "APPLY_STATUS_CD" = \'CONTRACT\', '
            '"UPDATED_AT" = NOW() WHERE "LOAN_APP_ID" = $1',
            app_id,
        )

    loan_token = await tokens.issue(ResourceType.LOAN, contract_no, customer_no)
    monthly = _monthly_payment(amount, rate, period_months)

    try:
        await _insert_notification(
            customer_no,
            type_cd="LOAN",
            title="대출 약정 완료",
            body=(
                f"{amount:,}원 대출 약정이 체결되었습니다. "
                f"월 납입 예정 {monthly:,}원. 실행 화면에서 실행해주세요."
            ),
            link_url="/loans",
            reference_type="LOAN_CONTRACT",
        )
    except Exception:
        log.exception("contract_notification_failed", contract_no=contract_no)

    return loan_token, contract_no, rate, monthly


# ---------------------------------------------------------------------------
# LN-007 실행 (멱등성)
# ---------------------------------------------------------------------------

async def execute_loan(
    *,
    customer_no: int,
    contract_no: str,
    deposit_account_no: str,
    idempotency_key: str,
) -> tuple[int, int, int, datetime, bool]:
    """실행 — LOAN_EXEC_HISTORY INSERT + ACCOUNT 입금 + TRANSACTION INSERT + 스케줄 생성.
    반환: (exec_seq, principal, transaction_id_for_token, executed_at, idempotent_replay).
    """
    pool = get_pool()
    now_str = _now_str()
    now_dt = datetime.now()

    async with pool.acquire() as conn:
        # 멱등성 — 같은 키 이미 있으면 응답 재구성
        replay = await conn.fetchrow(
            'SELECT "EXEC_SEQ", "EXEC_AMOUNT", "EXEC_DATETIME" '
            'FROM public."LOAN_EXEC_HISTORY" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "IDEMPOTENCY_KEY" = $2',
            contract_no,
            idempotency_key,
        )
        if replay:
            tx_id = await _find_loan_exec_tx(contract_no, int(replay["EXEC_SEQ"]))
            replayed_dt = datetime.strptime(replay["EXEC_DATETIME"][:14], "%Y%m%d%H%M%S")
            return (
                int(replay["EXEC_SEQ"]),
                int(replay["EXEC_AMOUNT"] or 0),
                tx_id or 0,
                replayed_dt,
                True,
            )

        async with conn.transaction():
            contract = await conn.fetchrow(
                'SELECT "CONTRACT_LIMIT", "CONTRACT_RATE", "LOAN_STATUS_CD" '
                'FROM public."LOAN_CONTRACT" '
                'WHERE "LOAN_CONTRACT_NO" = $1 AND "CUSTOMER_NO" = $2 FOR UPDATE',
                contract_no,
                customer_no,
            )
            if contract is None:
                raise NotFoundError(E_NOT_FOUND, "대출 계약을 찾을 수 없습니다.")
            if contract["LOAN_STATUS_CD"] != "WAIT":
                raise BusinessError(
                    E_VALIDATION,
                    "이미 실행되었거나 실행할 수 없는 계약입니다.",
                )

            principal = int(contract["CONTRACT_LIMIT"] or 0)
            rate = float(contract["CONTRACT_RATE"] or DEFAULT_BASE_RATE)

            # 입금 계좌 본인 검증
            deposit_acct = await conn.fetchrow(
                'SELECT "CUSTOMER_NO", "BALANCE" FROM public."ACCOUNT" '
                'WHERE "ACCOUNT_NO" = $1 AND "CUSTOMER_NO" = $2 '
                '  AND "DELETE_YN" = \'N\' FOR UPDATE',
                deposit_account_no,
                customer_no,
            )
            if deposit_acct is None:
                raise NotFoundError(E_NOT_FOUND, "입금 계좌를 찾을 수 없습니다.")

            # EXEC_SEQ — 계약 내 시퀀스
            next_seq = await conn.fetchval(
                'SELECT COALESCE(MAX("EXEC_SEQ"), 0) + 1 '
                'FROM public."LOAN_EXEC_HISTORY" '
                'WHERE "LOAN_CONTRACT_NO" = $1',
                contract_no,
            )

            try:
                await conn.execute(
                    'INSERT INTO public."LOAN_EXEC_HISTORY" ('
                    '  "LOAN_CONTRACT_NO", "EXEC_SEQ", "EXEC_DATETIME", "EXEC_TYPE_CD", '
                    '  "EXEC_AMOUNT", "POST_EXEC_BALANCE", "DEPOSIT_ACCOUNT_NO", '
                    '  "CHANNEL_CD", "IDEMPOTENCY_KEY", "CANCEL_YN", "DELETE_YN"'
                    ") VALUES ($1, $2, $3, 'EXEC', $4, $4, $5, 'WEB', $6, 'N', 'N')",
                    contract_no,
                    next_seq,
                    now_str,
                    principal,
                    deposit_account_no,
                    idempotency_key,
                )
            except Exception as e:
                if "duplicate" in str(e).lower() or "IDEMPOTENCY" in str(e).upper():
                    raise ConflictError(
                        E_IDEMPOTENCY_CONFLICT,
                        "동일한 멱등성 키로 실행이 동시 처리되었습니다.",
                    ) from e
                raise

            new_balance = int(deposit_acct["BALANCE"] or 0) + principal
            tx_id = await conn.fetchval(
                'INSERT INTO public."TRANSACTION" ('
                '  "ACCOUNT_NO", "TX_DATETIME", "TX_TYPE_CD", "TX_AMOUNT", '
                '  "POST_TX_BALANCE", "OWN_BANK_YN", "TX_STATUS_CD", "TX_MEMO", "CANCEL_YN"'
                ") VALUES ($1, $2, 'DEPOSIT', $3, $4, 'Y', 'COMPLETE', $5, 'N') "
                'RETURNING "TRANSACTION_ID"',
                deposit_account_no,
                now_str,
                principal,
                new_balance,
                f"대출 실행 {contract_no}",
            )
            await conn.execute(
                'UPDATE public."ACCOUNT" SET "BALANCE" = "BALANCE" + $1, '
                '"LAST_TX_DATETIME" = $2 WHERE "ACCOUNT_NO" = $3',
                principal,
                now_str,
                deposit_account_no,
            )
            # 계약 상태 + CURRENT_USAGE 갱신
            await conn.execute(
                'UPDATE public."LOAN_CONTRACT" SET "LOAN_STATUS_CD" = \'NORMAL\', '
                '"CURRENT_USAGE" = $1, "UPDATED_AT" = NOW() '
                'WHERE "LOAN_CONTRACT_NO" = $2',
                principal,
                contract_no,
            )
            await conn.execute(
                'UPDATE public."LOAN_APPLICATION" SET "APPLY_STATUS_CD" = \'EXEC\', '
                '"UPDATED_AT" = NOW() WHERE "CUSTOMER_NO" = $1 '
                'AND "APPLY_STATUS_CD" = \'CONTRACT\'',
                customer_no,
            )

            # 상환 스케줄 생성 — 12개월 원리금균등
            period_months = 12
            await _create_repay_schedule(
                conn, contract_no, principal, rate, period_months, now_dt
            )

        try:
            await _insert_notification(
                customer_no,
                type_cd="LOAN",
                title="대출 실행 완료",
                body=f"{principal:,}원 대출 자금이 입금 계좌로 지급되었습니다.",
                link_url="/loans",
                reference_type="LOAN_EXEC",
            )
        except Exception:
            log.exception("loan_exec_notification_failed", contract_no=contract_no)

        return int(next_seq), principal, int(tx_id), now_dt, False


async def _create_repay_schedule(
    conn, contract_no: str, principal: int, rate: float, n: int, start: datetime
) -> None:
    monthly_rate = rate / 100 / 12
    monthly_total = _monthly_payment(principal, rate, n)
    balance = principal
    for i in range(1, n + 1):
        interest = int(balance * monthly_rate) if monthly_rate else 0
        principal_part = monthly_total - interest
        balance = max(0, balance - principal_part)
        due = (start + timedelta(days=30 * i)).strftime("%Y%m%d")
        await conn.execute(
            'INSERT INTO public."LOAN_REPAY_SCHEDULE" ('
            '  "LOAN_CONTRACT_NO", "INSTALLMENT_NO", "SCHEDULED_DATE", '
            '  "SCHEDULED_PRINCIPAL", "SCHEDULED_INTEREST", "SCHEDULED_TOTAL", '
            '  "SCHEDULE_STATUS_CD", "POST_PRINCIPAL_BALANCE", "DELETE_YN"'
            ") VALUES ($1, $2, $3, $4, $5, $6, 'WAITING', $7, 'N')",
            contract_no,
            i,
            due,
            principal_part,
            interest,
            monthly_total,
            balance,
        )


async def _find_loan_exec_tx(contract_no: str, exec_seq: int) -> int | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "TRANSACTION_ID" FROM public."TRANSACTION" '
            'WHERE "TX_MEMO" LIKE $1 ORDER BY "TRANSACTION_ID" DESC LIMIT 1',
            f"%{contract_no}%",
        )
    return int(row["TRANSACTION_ID"]) if row else None


# ---------------------------------------------------------------------------
# LN-008 상세 / LN-009 스케줄
# ---------------------------------------------------------------------------

async def fetch_loan_detail(contract_no: str, customer_no: int) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        contract = await conn.fetchrow(
            'SELECT lc."LOAN_CONTRACT_NO", lc."CONTRACT_LIMIT", lc."CURRENT_USAGE", '
            '  lc."CONTRACT_RATE", lc."CONTRACT_DATE", lc."MATURITY_DATE", '
            '  lc."LOAN_STATUS_CD", lc."OVERDUE_STAGE_CD", '
            '  p."PRODUCT_NAME" '
            'FROM public."LOAN_CONTRACT" lc '
            'LEFT JOIN public."PRODUCT" p ON p."PRODUCT_ID" = lc."LOAN_PRODUCT_ID" '
            'WHERE lc."LOAN_CONTRACT_NO" = $1 AND lc."CUSTOMER_NO" = $2',
            contract_no,
            customer_no,
        )
        if contract is None:
            raise NotFoundError(E_NOT_FOUND, "대출 계약을 찾을 수 없습니다.")
        execs = await conn.fetch(
            'SELECT "EXEC_SEQ", "EXEC_DATETIME", "EXEC_TYPE_CD", "EXEC_AMOUNT", '
            '"POST_EXEC_BALANCE" FROM public."LOAN_EXEC_HISTORY" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "EXEC_SEQ"',
            contract_no,
        )
    return {
        "contract": dict(contract),
        "executions": [dict(r) for r in execs],
    }


async def fetch_repay_schedule(contract_no: str, customer_no: int) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        # 본인 검증
        owns = await conn.fetchval(
            'SELECT 1 FROM public."LOAN_CONTRACT" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "CUSTOMER_NO" = $2',
            contract_no,
            customer_no,
        )
        if not owns:
            raise NotFoundError(E_NOT_FOUND, "대출 계약을 찾을 수 없습니다.")
        rows = await conn.fetch(
            'SELECT "INSTALLMENT_NO", "SCHEDULED_DATE", "SCHEDULED_PRINCIPAL", '
            '"SCHEDULED_INTEREST", "SCHEDULED_TOTAL", "SCHEDULE_STATUS_CD", '
            '"POST_PRINCIPAL_BALANCE" FROM public."LOAN_REPAY_SCHEDULE" '
            'WHERE "LOAN_CONTRACT_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "INSTALLMENT_NO"',
            contract_no,
        )
    return [dict(r) for r in rows]