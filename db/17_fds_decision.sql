-- ===================================================================
-- 17_fds_decision.sql — AI_FDS_DECISION
-- ===================================================================
-- FDS_DETECTION (탐지 결과 row) 와 1:1 매핑. 룰/ML/LLM 점수 근거를 영구화.
--
-- 룰: RULE_SCORE 합산 + RULE_FIRED 콤마 리스트 ("R_NIGHT,R_AMOUNT_ZSCORE,...")
-- ML : IsolationForest anomaly 점수 (0~1 raw + 0~40 정규화 score)
-- LLM: AI_LLM_CALL_LOG.LLM_CALL_ID 와 링크 (Phoenix trace 추적 가능)
--
-- TOTAL_SCORE = FDS_DETECTION.TOTAL_SCORE = 0.6*RULE_SCORE + 0.4*ML_SCORE (정규화)
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/17_fds_decision.sql
-- ===================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public."AI_FDS_DECISION" (
    "DECISION_ID"      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "CUSTOMER_NO"      bigint NOT NULL,
    "FDS_DETECT_SEQ"   smallint NOT NULL,
    "TRANSACTION_ID"   bigint,
    "RULE_SCORE"       smallint NOT NULL DEFAULT 0,
    "RULE_FIRED"       varchar(500),
    "ML_SCORE"         smallint NOT NULL DEFAULT 0,
    "ML_ANOMALY"       numeric(5,4),
    "TOTAL_SCORE"      smallint NOT NULL DEFAULT 0,
    "LLM_CALL_ID"      bigint,
    "LLM_EXPLAIN"      varchar(1000),
    "DECISION_AT"      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "DELETE_YN"        char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT uq_ai_fds_decision_detect UNIQUE ("CUSTOMER_NO", "FDS_DETECT_SEQ")
);

CREATE INDEX IF NOT EXISTS idx_ai_fds_decision_customer
    ON public."AI_FDS_DECISION" ("CUSTOMER_NO", "DECISION_AT" DESC);
CREATE INDEX IF NOT EXISTS idx_ai_fds_decision_transaction
    ON public."AI_FDS_DECISION" ("TRANSACTION_ID");

COMMENT ON TABLE public."AI_FDS_DECISION" IS
    'FDS 자동 분류기 결과 — 룰/ML/LLM 점수 근거. FDS_DETECTION 과 1:1';
COMMENT ON COLUMN public."AI_FDS_DECISION"."RULE_FIRED" IS
    '발동된 룰 코드 콤마 리스트. 예: R_NIGHT,R_AMOUNT_ZSCORE,R_NEW_COUNTERPART';
COMMENT ON COLUMN public."AI_FDS_DECISION"."ML_ANOMALY" IS
    'IsolationForest anomaly 점수 raw (0=정상~1=상위 이상)';
COMMENT ON COLUMN public."AI_FDS_DECISION"."LLM_CALL_ID" IS
    'AI_LLM_CALL_LOG.LLM_CALL_ID 링크. Phoenix trace 추적용';

COMMIT;
