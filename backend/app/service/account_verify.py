"""계좌·예금주 검증 — 당행 DB 직접 / 타행 Kafka request-reply.

가이드 §2 결제 채널 + §2.4 Kafka 외부 결제망 시뮬레이션의 사전 단계.
이체 요청 전 사용자가 입금 계좌가 유효한지·예금주 이름이 맞는지 확인하는 절차.

흐름
- 당행 (098): public.ACCOUNT 조회 → 즉시 응답
- 타행 (그 외): Kafka 토픽 `transfer.account.verify.requested` 발행
              → 외부 은행 시뮬 컨슈머가 50~200ms 후 응답
              → `transfer.account.verify.replies` 토픽으로 리턴
              → 호출자가 correlation_id 매칭한 Future 로 await (timeout 3s)

외부 은행 시뮬 컨슈머는 같은 백엔드 프로세스에서 별도 그룹으로 등록
(데모 환경 — 실 운영은 외부 은행망/KFTC 가 회신). 검증 규칙:
- 계좌번호 마지막 디지트가 짝수 → valid + 가상 예금주 응답
- 홀수 → invalid (계좌 없음)
"""

from __future__ import annotations

import asyncio
import random
import structlog

from ..db import get_pool
from ..exceptions import BusinessError
from . import kafka as kafka_svc

log = structlog.get_logger("account_verify")

OWN_BANK_CODE = "098"
_VERIFY_TIMEOUT_SEC = 3.0

# 데모 — 외부 은행 가상 예금주 풀. 진짜 운영은 외부 결제망이 회신.
_DEMO_HOLDERS = ["김외부", "박타행", "이은행", "최예금", "정송금", "강계좌", "조이체"]


async def verify_account(to_bank_cd: str, to_account_no: str) -> dict:
    """이체 입금 계좌 검증 — 당행/타행 분기.

    반환:
        {"exists": bool, "holder_name": str|None,
         "source": "INTRA_BANK" | "KFTC",
         "bank_cd": str, "account_no": str}
    """
    if not to_account_no or len(to_account_no.replace("-", "")) < 6:
        raise BusinessError("E_VALIDATION", "계좌번호 형식이 올바르지 않습니다.")

    if to_bank_cd == OWN_BANK_CODE:
        return await _verify_intra_bank(to_account_no)
    return await _verify_inter_bank(to_bank_cd, to_account_no)


# ---------------------------------------------------------------------------
# 당행 — DB 직접 조회
# ---------------------------------------------------------------------------

async def _verify_intra_bank(to_account_no: str) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "ACCOUNT_NO", "ACCOUNT_HOLDER_NAME", "ACCOUNT_STATUS_CD" '
            'FROM public."ACCOUNT" '
            'WHERE "ACCOUNT_NO" = $1 AND "DELETE_YN" = \'N\'',
            to_account_no,
        )
    if row is None:
        return {
            "exists": False,
            "holder_name": None,
            "source": "INTRA_BANK",
            "bank_cd": OWN_BANK_CODE,
            "account_no": to_account_no,
        }
    return {
        "exists": True,
        "holder_name": row["ACCOUNT_HOLDER_NAME"],
        "source": "INTRA_BANK",
        "bank_cd": OWN_BANK_CODE,
        "account_no": to_account_no,
        "status_cd": row["ACCOUNT_STATUS_CD"],
    }


# ---------------------------------------------------------------------------
# 타행 — Kafka request-reply
# ---------------------------------------------------------------------------

async def _verify_inter_bank(to_bank_cd: str, to_account_no: str) -> dict:
    correlation_id, future = kafka_svc.register_reply()
    payload = {
        "correlation_id": correlation_id,
        "bank_cd": to_bank_cd,
        "account_no": to_account_no,
    }
    sent = await kafka_svc.send_event(
        kafka_svc.TOPIC_ACCOUNT_VERIFY_REQ, payload, key=correlation_id
    )
    if not sent:
        kafka_svc.unregister_reply(correlation_id)
        log.warning("verify_inter_bank_kafka_unavailable", bank=to_bank_cd)
        # 브로커 다운 — 검증 보류 (UX 측면에서 "확인 불가" 응답).
        return {
            "exists": False,
            "holder_name": None,
            "source": "KFTC",
            "bank_cd": to_bank_cd,
            "account_no": to_account_no,
            "error": "VERIFY_BROKER_DOWN",
        }
    try:
        reply = await asyncio.wait_for(future, timeout=_VERIFY_TIMEOUT_SEC)
    except asyncio.TimeoutError:
        kafka_svc.unregister_reply(correlation_id)
        log.warning("verify_inter_bank_timeout", correlation_id=correlation_id)
        return {
            "exists": False,
            "holder_name": None,
            "source": "KFTC",
            "bank_cd": to_bank_cd,
            "account_no": to_account_no,
            "error": "VERIFY_TIMEOUT",
        }
    return {
        "exists": bool(reply.get("exists")),
        "holder_name": reply.get("holder_name"),
        "source": "KFTC",
        "bank_cd": to_bank_cd,
        "account_no": to_account_no,
    }


# ---------------------------------------------------------------------------
# 외부 은행 시뮬 컨슈머 핸들러 — Kafka request 받아 reply 발행
# ---------------------------------------------------------------------------

async def handle_external_bank_verify(event: dict) -> None:
    """transfer.account.verify.requested 컨슈머 — 외부 은행 회신 시뮬레이션."""
    correlation_id = event.get("correlation_id")
    bank_cd = event.get("bank_cd")
    account_no = event.get("account_no", "")
    if not correlation_id:
        log.warning("verify_request_missing_correlation_id", event=event)
        return
    # 외부 결제망 회신 지연 시뮬 (50~200ms).
    await asyncio.sleep(random.uniform(0.05, 0.20))
    digits = account_no.replace("-", "")
    if not digits or not digits[-1].isdigit():
        exists, holder = False, None
    else:
        exists = int(digits[-1]) % 2 == 0
        holder = random.choice(_DEMO_HOLDERS) if exists else None
    reply = {
        "correlation_id": correlation_id,
        "bank_cd": bank_cd,
        "account_no": account_no,
        "exists": exists,
        "holder_name": holder,
    }
    await kafka_svc.send_event(
        kafka_svc.TOPIC_ACCOUNT_VERIFY_REPLY, reply, key=correlation_id
    )


# ---------------------------------------------------------------------------
# 리플라이 컨슈머 핸들러 — Future resolve
# ---------------------------------------------------------------------------

async def handle_verify_reply(event: dict) -> None:
    correlation_id = event.get("correlation_id")
    if not correlation_id:
        log.warning("verify_reply_missing_correlation_id", event=event)
        return
    kafka_svc.resolve_reply(correlation_id, event)