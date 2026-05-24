"""FDS Phase C — LLM 자연어 설명.

거래 컨텍스트 + 발동된 룰 + ML anomaly 점수를 LLM 에 보내 사용자가 한 눈에
이해할 수 있는 한국어 3-4문장 설명을 생성. REMARK 컬럼에 저장.

설계
- 기존 `service/llm.py:chat_completion` 그대로 재사용 — Groq/Mistral/HuggingFace fallback.
- Phoenix span 자동 적재 (init_tracing 이 HTTPXClientInstrumentor 로 LLM 호출 추적).
- LLM 응답이 실패하면 룰 desc 슬래시 결합으로 fallback (회귀 안전).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from .fds_rules import RULES_META
from .llm import chat_completion

log = structlog.get_logger("fds_llm_explain")


_SYSTEM_PROMPT = (
    "너는 다온뱅크의 의심거래 분석가야. 거래 정보와 자동 탐지 결과(룰·ML)를 받아서, "
    "고객이 직관적으로 이해할 수 있게 3~4문장의 한국어로 정리해. "
    "원칙: (1) 발동된 룰과 ML 점수만 근거로 쓴다. (2) 추측·과장 금지. "
    "(3) 첫 문장은 핵심 의심 사유, 마지막 문장은 본인 거래가 아니면 신고 안내. "
    "(4) 친근하지만 단정적인 어조로 작성. 길이 200자 이내."
)


def _build_user_prompt(
    *,
    customer_name: str,
    tx_time: datetime,
    amount_krw: int,
    counterpart_masked: str | None,
    is_interbank: bool,
    fired_rules: list[str],
    rule_features: dict[str, Any],
    ml_anomaly: float,
    personal_avg: float | None,
) -> str:
    rule_desc = "\n".join(f"- {r}: {RULES_META.get(r, ('?', 0))[0]}" for r in fired_rules) or "- (없음)"
    z = rule_features.get("zscore")
    avg = personal_avg or rule_features.get("avg") or 0
    body = [
        f"고객: {customer_name}",
        (
            f"평소 평균 거래액: {int(avg):,}원" if avg else "평소 거래 표본 부족"
        ),
        f"이번 거래: {amount_krw:,}원 / {tx_time.strftime('%Y-%m-%d %H:%M')}",
        f"이체 유형: {'타행' if is_interbank else '당행'}",
        f"수취인: {counterpart_masked or '미상'}",
        f"발동된 룰 ({len(fired_rules)}건):\n{rule_desc}",
        (
            f"ML 이상도: {ml_anomaly:.2f} (0=정상, 1=상위 이상)"
            + (f", z-score: {z:+.1f}σ" if isinstance(z, (int, float)) and z else "")
        ),
    ]
    return "\n".join(body)


async def explain(
    *,
    customer_name: str,
    tx_time: datetime,
    amount_krw: int,
    counterpart_masked: str | None,
    is_interbank: bool,
    fired_rules: list[str],
    rule_features: dict[str, Any],
    ml_anomaly: float,
    personal_avg: float | None = None,
) -> str:
    """LLM 자연어 설명 생성. 실패 시 룰 desc 슬래시 결합으로 fallback."""
    if not fired_rules:
        return ""

    user_prompt = _build_user_prompt(
        customer_name=customer_name,
        tx_time=tx_time,
        amount_krw=amount_krw,
        counterpart_masked=counterpart_masked,
        is_interbank=is_interbank,
        fired_rules=fired_rules,
        rule_features=rule_features,
        ml_anomaly=ml_anomaly,
        personal_avg=personal_avg,
    )

    try:
        text = await chat_completion(_SYSTEM_PROMPT, user_prompt, max_tokens=320)
    except Exception:
        log.exception("fds_llm_explain_failed")
        text = None

    if text:
        # 응답 길이 200자 한도 (REMARK varchar(1000) 안전 마진)
        return text.strip()[:900]

    # Fallback — 룰 desc 슬래시 결합 (기존 REMARK 포맷과 호환)
    return " / ".join(RULES_META.get(r, ("?", 0))[0] for r in fired_rules)
