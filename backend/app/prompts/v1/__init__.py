"""프롬프트 v1.

ai_llm_call_log.purpose_cd 의 분류와 1:1 매핑:
- ASSET     : build_asset_analysis_prompt  (자산분석 동적 프롬프트)
- CHATBOT   : build_chatbot_answer_prompt  (3-tier RAG 응답)
- CHATBOT   : build_chatbot_fallback       (RAG 출처 부재 안내)

새 버전 도입 시 v2/ 디렉터리 추가하고 ai_llm_call_log 에 prompt_version 컬럼 기록.
"""

from .asset_analysis import build_asset_analysis_prompt
from .chatbot_answer import build_chatbot_answer_prompt, build_chatbot_fallback

VERSION = "v1"

__all__ = [
    "VERSION",
    "build_asset_analysis_prompt",
    "build_chatbot_answer_prompt",
    "build_chatbot_fallback",
]