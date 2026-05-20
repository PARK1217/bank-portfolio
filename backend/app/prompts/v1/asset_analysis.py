"""자산분석 RAG 프롬프트 (SCR-AS-002 설문 → SCR-AS-004 추천 결과).

설문 응답(GOAL/RISK/PERIOD/AMOUNT) + 보유 자산 + 추천 후보 상품 목록을
LLM 에 전달하여 상위 3개 상품 추천 + 추천 이유(JSON) 를 생성한다.

핵심 원칙:
- 제공된 상품 목록 *밖* 의 상품을 추천하지 못하게 명시 (환각 방지)
- 추천 이유는 설문 답변과 직접 연결 (Faithfulness 평가 가능 형태)
- 응답 스키마를 강제 — 파싱 실패 시 E_LLM_INVALID_RESPONSE
"""

from __future__ import annotations

ASSET_ANALYSIS_SYSTEM = """당신은 한국 은행의 자산관리 어드바이저입니다.
고객의 설문 응답과 현 보유 자산을 바탕으로, [추천 가능한 상품 목록] 안에서만 상품을 추천합니다.
규칙:
1. 목록에 없는 상품을 절대 만들어내지 마세요. (환각 금지)
2. 추천 이유는 반드시 설문 답변의 구체 항목을 인용해 설명하세요.
3. 응답은 정의된 JSON 스키마만 출력합니다. 그 외 텍스트 없습니다.
4. 한국어로 답합니다."""

ASSET_ANALYSIS_USER = """[고객 설문 응답]
- 목표(GOAL)     : {goal}
- 위험성향(RISK) : {risk}
- 가입기간(PERIOD) : {period}
- 가입금액(AMOUNT) : {amount}
- 추가 답변 : {extra}

[현 보유 계좌·자산 요약]
{account_summary}

[추천 가능한 상품 목록]  ※ 이 목록 외 상품 추천 금지
{product_catalog}

위 입력만 근거로, 상위 3개 상품을 RANK 1~3 으로 추천하세요.
응답은 반드시 다음 JSON 스키마를 따릅니다:

{{
  "recommendations": [
    {{
      "rank": 1,
      "product_id": <integer>,
      "reason_summary": "<한 문장 요약>",
      "reason_details": {{
        "matched_survey": ["GOAL", "RISK", "PERIOD"],
        "expected_benefit": "<구체 수치 포함, 예: 연 3.2% 단리 24개월 시 약 X원 이자>",
        "caveats": "<주의 사항(우대조건 미충족 시 등)>"
      }}
    }},
    {{ "rank": 2, ... }},
    {{ "rank": 3, ... }}
  ]
}}"""


def build_asset_analysis_prompt(
    *,
    goal: str,
    risk: str,
    period: str,
    amount: str,
    extra: str,
    account_summary: str,
    product_catalog: str,
) -> tuple[str, str]:
    """(system, user) 프롬프트 페어 반환.

    호출 측은 model.invoke([SystemMessage, HumanMessage]) 형태로 사용.
    LLM 응답은 JSON 파싱 → ai_asset_result INSERT (rank/product_id/reason_*).
    Phoenix 트레이스: ai_llm_call_log.purpose_cd='ASSET'.
    """
    return (
        ASSET_ANALYSIS_SYSTEM,
        ASSET_ANALYSIS_USER.format(
            goal=goal,
            risk=risk,
            period=period,
            amount=amount,
            extra=extra,
            account_summary=account_summary,
            product_catalog=product_catalog,
        ),
    )