"""기기 관리 라우터 — SC-003 목록 / SC-004 등록 / 해제.

CUSTOMER_DEVICE 테이블 사용. (CUSTOMER_NO, DEVICE_SEQ) PK.
화면에는 short token(`device_token`) 으로 노출 — TokenService 로 (CUSTOMER_NO + DEVICE_SEQ) 매핑.

mock 정책
  - 등록은 OTP 인증 필요 (pyotp 실시간 검증, /setup/otp 활성화 가정).
  - DEVICE_FINGERPRINT(클라이언트가 navigator.userAgent 기반으로 생성) 그대로 저장.
  - device_kind/os_name/browser_name 은 fingerprint 에서 가벼운 추론.
"""

from __future__ import annotations

import re
from datetime import date

import pyotp
import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..db import get_pool
from ..errors import E_NOT_FOUND, E_VALIDATION
from ..exceptions import BusinessError, NotFoundError
from ..service.auth import CurrentCustomer, current_customer, get_token_service
from ..service.token import TokenService
from .auth import _otp_secrets  # OTP 활성 상태 공유

router = APIRouter(prefix="/security/devices", tags=["security-devices"])
log = structlog.get_logger("device")


# ---------------------------------------------------------------------------
# 스키마
# ---------------------------------------------------------------------------

class DeviceItem(BaseModel):
    device_id: int
    device_token: str
    alias: str | None
    device_kind: str
    os_name: str | None
    browser_name: str | None
    is_trusted: bool
    last_access_at: str | None
    registered_at: str


class DeviceListResponse(BaseModel):
    items: list[DeviceItem]
    total: int = Field(0, description="등록된 기기 수")


class DeviceRegisterRequest(BaseModel):
    alias: str | None = Field(None, max_length=30)
    device_fingerprint: str = Field(..., max_length=400)
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class DeviceRegisterResponse(BaseModel):
    device_token: str


class DeviceRevokeResponse(BaseModel):
    success: bool = True


# ---------------------------------------------------------------------------
# 보조 — fingerprint → kind/os/browser 추론
# ---------------------------------------------------------------------------

def _infer_kind(fp: str) -> tuple[str, str | None, str | None]:
    lo = fp.lower()
    if "iphone" in lo or "ipad" in lo:
        return ("MOBILE", "iOS", "Safari" if "safari" in lo else None)
    if "android" in lo:
        return ("MOBILE", "Android", "Chrome" if "chrome" in lo else None)
    if "macintosh" in lo or "mac os" in lo:
        return ("PC", "macOS", _infer_browser(lo))
    if "windows" in lo:
        return ("PC", "Windows", _infer_browser(lo))
    if "linux" in lo:
        return ("PC", "Linux", _infer_browser(lo))
    return ("UNKNOWN", None, None)


def _infer_browser(lo: str) -> str | None:
    if "edg/" in lo:
        return "Edge"
    if "chrome" in lo and "safari" in lo:
        return "Chrome"
    if "firefox" in lo:
        return "Firefox"
    if "safari" in lo:
        return "Safari"
    return None


def _verify_otp(customer_no: int, code: str) -> None:
    entry = _otp_secrets.get(customer_no)
    if not entry or not entry.get("active"):
        raise BusinessError(E_VALIDATION, "기기 등록에는 OTP 등록이 필요해요.")
    if not pyotp.TOTP(entry["secret"]).verify(code):
        raise BusinessError(E_VALIDATION, "OTP 코드가 올바르지 않습니다.")


# ---------------------------------------------------------------------------
# 목록 조회
# ---------------------------------------------------------------------------

@router.get("", response_model=DeviceListResponse)
async def list_devices(
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> DeviceListResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "DEVICE_SEQ", "DEVICE_NAME", "DEVICE_FINGERPRINT", '
            '"DEVICE_OS_CD", "DEVICE_REG_DATE", "LAST_USE_DATE", '
            '"TRUST_LEVEL_CD", "DEVICE_STATUS_CD" '
            'FROM public."CUSTOMER_DEVICE" '
            'WHERE "CUSTOMER_NO" = $1 AND "DELETE_YN" = \'N\' '
            'ORDER BY "DEVICE_SEQ" DESC',
            user.customer_no,
        )

    items: list[DeviceItem] = []
    for r in rows:
        fp = r["DEVICE_FINGERPRINT"] or ""
        kind, os_name, browser = _infer_kind(fp)
        seq = int(r["DEVICE_SEQ"])
        token = await tokens.issue("DEVICE", str(seq), user.customer_no)
        items.append(
            DeviceItem(
                device_id=seq,
                device_token=token,
                alias=r["DEVICE_NAME"],
                device_kind=kind,
                os_name=r["DEVICE_OS_CD"] or os_name,
                browser_name=browser,
                is_trusted=(r["TRUST_LEVEL_CD"] or "").upper() in ("TRUSTED", "HIGH", "Y"),
                last_access_at=str(r["LAST_USE_DATE"]) if r["LAST_USE_DATE"] else None,
                registered_at=str(r["DEVICE_REG_DATE"]) if r["DEVICE_REG_DATE"] else "",
            )
        )
    return DeviceListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# 등록 (현재 기기 신뢰)
# ---------------------------------------------------------------------------

@router.post("", response_model=DeviceRegisterResponse)
async def register_device(
    req: DeviceRegisterRequest,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> DeviceRegisterResponse:
    _verify_otp(user.customer_no, req.otp_code)

    kind, os_name, _ = _infer_kind(req.device_fingerprint)
    today = date.today().strftime("%Y%m%d")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            next_seq = await conn.fetchval(
                'SELECT COALESCE(MAX("DEVICE_SEQ"), 0) + 1 '
                'FROM public."CUSTOMER_DEVICE" WHERE "CUSTOMER_NO" = $1',
                user.customer_no,
            )
            await conn.execute(
                'INSERT INTO public."CUSTOMER_DEVICE" ('
                '  "CUSTOMER_NO", "DEVICE_SEQ", "DEVICE_FINGERPRINT", '
                '  "DEVICE_ID_TYPE_CD", "DEVICE_NAME", "DEVICE_OS_CD", '
                '  "DEVICE_REG_DATE", "LAST_USE_DATE", '
                '  "TRUST_LEVEL_CD", "DEVICE_STATUS_CD", "DELETE_YN", "CREATED_AT"'
                ") VALUES ($1, $2, $3, 'FP', $4, $5, $6, $6, 'TRUSTED', 'ACTIVE', 'N', NOW())",
                user.customer_no,
                int(next_seq),
                req.device_fingerprint,
                (req.alias or "")[:30] or None,
                os_name,
                today,
            )

    token = await tokens.issue("DEVICE", str(int(next_seq)), user.customer_no)
    log.info("device_registered", customer_no=user.customer_no, device_seq=int(next_seq), kind=kind)
    return DeviceRegisterResponse(device_token=token)


# ---------------------------------------------------------------------------
# 해제 (신뢰 기기 삭제)
# ---------------------------------------------------------------------------

@router.delete("/{device_token}", response_model=DeviceRevokeResponse)
async def revoke_device(
    device_token: str,
    user: CurrentCustomer = Depends(current_customer),
    tokens: TokenService = Depends(get_token_service),
) -> DeviceRevokeResponse:
    payload = await tokens.resolve(device_token, customer_no=user.customer_no, expected_type="DEVICE")
    if not payload:
        raise NotFoundError(E_NOT_FOUND, "기기를 찾을 수 없습니다.")

    try:
        device_seq = int(payload.resource_id)
    except (TypeError, ValueError):
        raise NotFoundError(E_NOT_FOUND, "기기를 찾을 수 없습니다.")

    pool = get_pool()
    async with pool.acquire() as conn:
        status = await conn.execute(
            'UPDATE public."CUSTOMER_DEVICE" '
            'SET "DELETE_YN" = \'Y\', "UPDATED_AT" = NOW() '
            'WHERE "CUSTOMER_NO" = $1 AND "DEVICE_SEQ" = $2 AND "DELETE_YN" = \'N\'',
            user.customer_no,
            device_seq,
        )
        affected = 0
        if status and status.startswith("UPDATE "):
            affected = int(status.split()[-1])

    if affected == 0:
        raise NotFoundError(E_NOT_FOUND, "기기를 찾을 수 없거나 이미 해제되어 있어요.")

    await tokens.revoke(device_token)
    log.info("device_revoked", customer_no=user.customer_no, device_seq=device_seq)
    return DeviceRevokeResponse(success=True)