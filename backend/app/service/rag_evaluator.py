"""RAG 응답 품질 평가 — LLM-as-judge (가이드 §9.2.2 Phoenix Faithfulness).

응답 직후 호출 → 네 지표 0.0~1.0 점수 산출:
- faithfulness        : 답변이 retrieved 문서에 근거 있나? (환각 여부)
- answer_relevancy    : 답변이 사용자 질문에 답하고 있나?
- context_precision   : 검색된 문서가 질문과 관련 있나? (top-k 안의 문서 중 관련 문서 비율)
- context_recall      : 답변에 담겨야 할 정보가 retrieved 문서에 충분히 포함됐나? (정답 누락 여부)

평가자 LLM 은 `service/llm.chat_completion` 을 재사용 — 응답 생성과 동일한 provider (Groq Llama 3.1) 가
스스로 채점 (운영에선 더 큰 모델로 분리 권장). 메인 흐름을 막지 않도록 호출 측에서 `asyncio.create_task`
로 던지는 패턴 권장 — 실패해도 None 폴백.
"""

from __future__ import annotations

import asyncio
import json
import re

import structlog

from .llm import chat_completion

log = structlog.get_logger("rag_evaluator")


_RUBRIC_SYSTEM = (
    "당신은 RAG(검색 증강 생성) 응답을 평가하는 정확한 채점자입니다. "
    "주어진 점수만 0.0~1.0 사이 소수점 둘째 자리로 JSON 한 줄로만 답하세요. "
    "설명·주석·코드블록 금지. 예: {\"score\": 0.85}"
)


async def _score_one(
    system_rule: str,
    payload: dict,
    label: str,
) -> float | None:
    """평가 LLM 한 번 호출 → 0.0~1.0 점수."""
    user = json.dumps(payload, ensure_ascii=False)
    try:
        raw = await chat_completion(
            _RUBRIC_SYSTEM + "\n\n" + system_rule, user, max_tokens=64
        )
        if not raw:
            return None
        # JSON 한 줄 기대. 본문에 잡문이 끼면 정규식으로 score 만 추출.
        m = re.search(r'"score"\s*:\s*([0-9.]+)', raw)
        if not m:
            return None
        v = float(m.group(1))
        # 클램프 0.0~1.0
        return max(0.0, min(1.0, v))
    except Exception:
        log.exception("rag_eval_one_failed", label=label)
        return None


_FAITH_RULE = (
    "[Faithfulness] 답변이 retrieved 문서 내용에 근거가 있는지 평가합니다. "
    "문서에 없는 사실·수치·약관을 답변이 만들어냈다면 낮은 점수. "
    "문서를 그대로 인용하거나 충실히 요약했다면 높은 점수. "
    "관련 없는 답변(예: 거절·정중 회피)은 0.5 중립."
)

_ANSWER_RULE = (
    "[Answer Relevancy] 답변이 사용자 질문에 직접 답했는지 평가합니다. "
    "질문 의도와 동떨어진 답·일반론·회피는 낮은 점수. "
    "질문을 정확히 짚어 답했다면 높은 점수."
)

_CONTEXT_RULE = (
    "[Context Precision] 검색된 top-k 문서 중 사용자 질문과 직접 관련 있는 문서의 비율을 평가합니다. "
    "질문 도메인과 일치하는 문서가 하나라도 있으면 최소 0.3 이상, 절반 이상이 관련 있으면 0.6 이상, "
    "전부 관련 있으면 0.9 이상. 모든 문서가 엉뚱한 도메인일 때만 0.1 이하."
)

_RECALL_RULE = (
    "[Context Recall] 답변에 담긴 정보가 retrieved 문서 안에서 모두 근거를 찾을 수 있는지 평가합니다. "
    "답변의 모든 사실이 문서에 있으면 1.0, 답변의 일부가 문서 밖에서 왔거나 문서에 정보가 빈 채 답이 만들어졌으면 낮은 점수. "
    "단, 답변이 '약관에서 확인되지 않습니다' 같은 정직한 거절이면 0.5 중립."
)


async def evaluate_rag(
    question: str,
    retrieved_docs: list[dict],
    answer: str,
) -> dict[str, float | None]:
    """RAG 응답 4 지표 평가. 병렬 LLM 호출.

    Args:
        question: 사용자 원 질문.
        retrieved_docs: top-k 문서 메타 (title/snippet/score 위주, 너무 길면 잘림).
        answer: LLM 이 생성한 응답.

    Returns:
        {"faithfulness": 0.0~1.0 | None, "answer_relevancy": ..., "context_precision": ..., "context_recall": ...}
    """
    # 문서가 너무 많으면 평가자 prompt 가 비대해짐 → 상위 5건 + snippet 잘라서 전달.
    docs_brief = [
        {
            "title": (d.get("title") or "")[:80],
            "snippet": (d.get("snippet") or d.get("content") or "")[:300],
            "score": d.get("score"),
        }
        for d in (retrieved_docs or [])[:5]
    ]

    faith_payload = {
        "question": question,
        "retrieved_docs": docs_brief,
        "answer": answer,
    }
    answer_payload = {"question": question, "answer": answer}
    context_payload = {"question": question, "retrieved_docs": docs_brief}
    recall_payload = {
        "question": question,
        "retrieved_docs": docs_brief,
        "answer": answer,
    }

    faithfulness, answer_relevancy, context_precision, context_recall = await asyncio.gather(
        _score_one(_FAITH_RULE, faith_payload, "faithfulness"),
        _score_one(_ANSWER_RULE, answer_payload, "answer_relevancy"),
        _score_one(_CONTEXT_RULE, context_payload, "context_precision"),
        _score_one(_RECALL_RULE, recall_payload, "context_recall"),
        return_exceptions=False,
    )

    log.info(
        "rag_evaluated",
        faithfulness=faithfulness,
        answer_relevancy=answer_relevancy,
        context_precision=context_precision,
        context_recall=context_recall,
        docs_count=len(docs_brief),
    )

    return {
        "faithfulness": faithfulness,
        "answer_relevancy": answer_relevancy,
        "context_precision": context_precision,
        "context_recall": context_recall,
    }
