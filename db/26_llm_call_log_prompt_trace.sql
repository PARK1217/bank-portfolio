-- ===================================================================
-- 26_llm_call_log_prompt_trace.sql — AI_LLM_CALL_LOG 에 프롬프트 전문·
-- retrieval context·응답·캐시·리라이트 흔적 컬럼 추가 (WORKBOARD §RAG 6번)
-- ===================================================================
-- 문제: 기존 AI_LLM_CALL_LOG 는 토큰 수·지연·상태만 적재. "이 답변이 왜
-- 그렇게 나왔는가" 사후 재현이 불가능. system/user prompt 전문, retrieval
-- 청크, 최종 응답, cache hit 여부, 리라이트된 쿼리가 어디에도 안 남음.
--
-- 해결: AI_LLM_CALL_LOG 에 다음 컬럼 추가 (전부 nullable — 과거 4건 호환).
--   - SYSTEM_PROMPT   text     : system 메시지 전문 (truncate 없음)
--   - USER_PROMPT     text     : user 메시지 전문 (질문 + retrieval context)
--   - RAW_QUESTION    text     : 사용자 원문 (리라이트 전)
--   - REWRITTEN_QUERY text     : 리라이트된 쿼리 (도입 후 채움, 없으면 NULL)
--   - RETRIEVED_CONTEXT jsonb  : pgvector top-k 청크 메타 배열
--                                [{faq_id,question,distance,source_tag,
--                                  audience_cd,rank,snippet}, ...]
--   - RESPONSE_TEXT   text     : LLM 응답 전문
--   - CACHE_HIT_YN    char(1)  : 캐시 hit 여부 (Y/N, default N)
--   - AUDIENCE_CD     varchar(10) : USER / ADMIN (RBAC 챗봇 분기 추적)
--
-- 동시에 chatbot.py 의 동기 INSERT 경로가 비워두던 LATENCY_MS 도 채울 수
-- 있도록 컬럼은 그대로(이미 존재). 적재 코드는 service/chatbot.py 에서.
--
-- 멱등: ADD COLUMN IF NOT EXISTS.
-- ===================================================================

BEGIN;

ALTER TABLE public."AI_LLM_CALL_LOG"
    ADD COLUMN IF NOT EXISTS "SYSTEM_PROMPT"     text,
    ADD COLUMN IF NOT EXISTS "USER_PROMPT"       text,
    ADD COLUMN IF NOT EXISTS "RAW_QUESTION"      text,
    ADD COLUMN IF NOT EXISTS "REWRITTEN_QUERY"   text,
    ADD COLUMN IF NOT EXISTS "RETRIEVED_CONTEXT" jsonb,
    ADD COLUMN IF NOT EXISTS "RESPONSE_TEXT"     text,
    ADD COLUMN IF NOT EXISTS "CACHE_HIT_YN"      character(1) DEFAULT 'N',
    ADD COLUMN IF NOT EXISTS "AUDIENCE_CD"       character varying(10);

COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."SYSTEM_PROMPT" IS
    'system 메시지 전문 (USER/ADMIN 분기 후 최종 문자열, truncate 없음)';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."USER_PROMPT" IS
    'user 메시지 전문 (질문 + retrieval context 합성, truncate 없음)';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."RAW_QUESTION" IS
    '사용자 원문 (리라이트 전). REWRITTEN_QUERY 와 비교용';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."REWRITTEN_QUERY" IS
    '쿼리 리라이트 결과 (도입 후 채움, 없으면 NULL)';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."RETRIEVED_CONTEXT" IS
    'pgvector top-k 청크 메타 jsonb 배열. [{faq_id,question,distance,source_tag,audience_cd,rank,snippet}, ...]';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."RESPONSE_TEXT" IS
    'LLM 응답 전문 (truncate 없음)';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."CACHE_HIT_YN" IS
    '캐시 hit 여부 | Y=캐시에서 응답, N=신규 호출 (default N)';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."AUDIENCE_CD" IS
    'RBAC 분기 | USER (고객 페이지) / ADMIN (관리자 콘솔)';

-- audience 별 캐시 hit 률 집계 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_llm_call_log_audience_cache
    ON public."AI_LLM_CALL_LOG" ("AUDIENCE_CD", "CACHE_HIT_YN", "CALLED_AT" DESC);

COMMIT;

-- 확인 SELECT
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'AI_LLM_CALL_LOG'
   AND column_name IN ('SYSTEM_PROMPT','USER_PROMPT','RAW_QUESTION','REWRITTEN_QUERY',
                        'RETRIEVED_CONTEXT','RESPONSE_TEXT','CACHE_HIT_YN','AUDIENCE_CD')
 ORDER BY column_name;

DO $$
BEGIN
    RAISE NOTICE '26_llm_call_log_prompt_trace.sql 적용 완료 — 8 컬럼 추가';
END $$;
