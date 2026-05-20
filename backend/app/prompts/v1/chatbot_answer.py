"""챗봇 3-tier RAG 응답 프롬프트 (SCR-CB-001, SCR-CB-005).

3-tier RAG 라우팅 자체는 점수 기반(룰)으로 LLM 호출 없이 결정:
- Tier 1 KEYWORD  : 사전 키워드 매칭 (e.g. "잔액" → 잔액 조회 안내) → LLM 호출 안 함
- Tier 2 FAQ      : ai_faq 벡터 검색, top1 score >= FAQ_THRESHOLD → FAQ.answer 직접 반환
- Tier 3 VECTOR   : 약관마스터 벡터 검색, score >= TERMS_THRESHOLD → 이 프롬프트로 LLM 호출
- 모두 미달        : build_chatbot_fallback (LLM 호출 안 함)

이 모듈은 Tier 3 에서만 사용. Phoenix 트레이스: ai_llm_call_log.purpose_cd='CHATBOT'.
"""

from __future__ import annotations
from typing import Sequence


CHATBOT_ANSWER_SYSTEM = """당신은 한국 은행 고객 상담 챗봇입니다.
[제공된 약관 조항] 만 근거로 사용자 질문에 답합니다.

규칙:
1. 약관 조항에 없는 사실을 만들어내지 마세요. (환각 금지)
2. 답변 끝에 인용한 조항 ID 를 모두 표시합니다.
3. 약관에 답이 없으면 "관련 약관에서 답을 찾지 못했습니다." 라고 말하고 상담원 연결을 제안합니다.
4. 답변은 한국어, 5문장 이내, 친절하지만 정확하게.
5. 출력은 정의된 JSON 스키마만 따르며 그 외 텍스트는 출력하지 않습니다."""


CHATBOT_ANSWER_USER = """[사용자 질문]
{question}

[제공된 약관 조항]
{retrieved_clauses}

응답은 반드시 다음 JSON 스키마를 따릅니다:
{{
  "answer": "<5문장 이내 답변. 본문에는 출처 표기 X. 그 정보는 sources 필드에만.>",
  "sources": [
    {{ "doc_id": "<TERMS_ID>", "clause": "<조항 식별자>", "snippet": "<인용 원문 1~2문장>" }}
  ],
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}}"""


def build_chatbot_answer_prompt(
    *,
    question: str,
    retrieved_clauses: Sequence[dict],
) -> tuple[str, str]:
    """(system, user) 프롬프트 페어 반환.

    Args:
        question: 사용자 입력 원문.
        retrieved_clauses: 벡터 검색 결과. 각 항목 = {"doc_id", "clause", "text", "score"}.
            상위 N개(보통 3~5)를 점수 내림차순으로 전달.

    LLM 응답: JSON → ai_chatbot_message.content + rag_source_ids 저장.
    confidence='LOW' 면 사용자 UI 에 "신중 표시" + Phoenix 평가 큐에 추가.
    """
    clause_block = "\n".join(
        f"- [{c['doc_id']} · {c['clause']}] (score={c.get('score', 0):.2f})\n  {c['text']}"
        for c in retrieved_clauses
    )
    return (
        CHATBOT_ANSWER_SYSTEM,
        CHATBOT_ANSWER_USER.format(
            question=question,
            retrieved_clauses=clause_block,
        ),
    )


# ----------------------------------------------------------------------
# Fallback : RAG 출처 부재 / 점수 미달 — LLM 호출 없이 정적 응답
# ----------------------------------------------------------------------

CHATBOT_FALLBACK_TEMPLATE = {
    "answer": (
        "죄송합니다. 관련 약관에서 명확한 답을 찾지 못했습니다. "
        "상담원 연결을 도와드릴까요?"
    ),
    "sources": [],
    "confidence": "LOW",
}


def build_chatbot_fallback() -> dict:
    """RAG 점수 임계 미달 시 즉시 반환할 응답 객체 (LLM 호출 없음).

    호출 측은 ai_chatbot_message INSERT 시 rag_tier='VECTOR' / content=answer 로 기록.
    UX 상 상담원 연결(SCR-CB-006) 버튼 노출.
    """
    return dict(CHATBOT_FALLBACK_TEMPLATE)