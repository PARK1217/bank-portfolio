-- ===================================================================
-- 08_v54_admin_migration.sql — Phase 6 관리자 페이지용 신규 4 테이블
-- ===================================================================
-- 가이드 §9.3 의 관리자 페이지 (Interface Hub 확장) 운영용 메타 테이블.
--
-- 신규 4개:
--   1) AI_LOAN_DECISION    — ML 대출 자동 승인 결과 + 사람 검토 라벨 (가이드 §9.2.6) ⭐
--   2) ADMIN_AUDIT_LOG     — 관리자 행동 감사 (조회·변경·강제처분) ⭐
--   3) EXTERNAL_API_HEALTH — 외부 결제망·신용평가사 헬스 5분 스냅샷
--   4) ML_MODEL_REGISTRY   — 모델 버전 카탈로그 + 메트릭·임계값
--
-- 멱등: 모든 DDL 이 `IF NOT EXISTS`. ML_MODEL_REGISTRY 부트 시드는 ON CONFLICT 처리.
--
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/08_v54_admin_migration.sql
-- ===================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1) AI_LOAN_DECISION — 대출 자동 승인 결과 (가이드 §9.2.6 DDL 정합)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."AI_LOAN_DECISION" (
    "DECISION_ID"       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "APPLICATION_ID"    bigint NOT NULL,
    "MODEL_VERSION"     varchar(20) NOT NULL,        -- 예: 'loan_xgb_v1'
    "FEATURES_JSON"     jsonb NOT NULL,              -- 추론 당시 입력 스냅샷 (재현용)
    "SCORE"             numeric(5,4) NOT NULL,       -- 0.0000 ~ 1.0000
    "DECISION_CD"       varchar(20) NOT NULL,        -- AUTO_APPROVE / AUTO_REJECT / HUMAN_REVIEW
    "THRESHOLD_HIGH"    numeric(5,4),                -- 추론 당시 임계값 스냅
    "THRESHOLD_LOW"     numeric(5,4),
    "HUMAN_REVIEWED_BY" varchar(20),                 -- EMPLOYEE_NO, NULL=미검토
    "HUMAN_DECISION_CD" varchar(20),                 -- APPROVE / REJECT / NULL
    "HUMAN_REVIEWED_AT" timestamp without time zone,
    "REVIEW_MEMO"       varchar(1000),
    "DELETE_YN"         character(1) DEFAULT 'N',
    "CREATED_AT"        timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_AT"        timestamp without time zone,
    CONSTRAINT "fk_ai_loan_decision_application_id"
        FOREIGN KEY ("APPLICATION_ID")
        REFERENCES public."LOAN_APPLICATION" ("LOAN_APP_ID")
);

COMMENT ON TABLE  public."AI_LOAN_DECISION" IS 'AI 대출자동승인 | 도메인:AI/RAG';
COMMENT ON COLUMN public."AI_LOAN_DECISION"."DECISION_CD"
    IS '자동결정 | AUTO_APPROVE/AUTO_REJECT/HUMAN_REVIEW';
COMMENT ON COLUMN public."AI_LOAN_DECISION"."FEATURES_JSON"
    IS '추론 입력 스냅 | 재학습 라벨로 활용';

CREATE INDEX IF NOT EXISTS "idx_ai_loan_decision_application"
    ON public."AI_LOAN_DECISION" ("APPLICATION_ID");
CREATE INDEX IF NOT EXISTS "idx_ai_loan_decision_decision"
    ON public."AI_LOAN_DECISION" ("DECISION_CD", "CREATED_AT" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_loan_decision_review_queue"
    ON public."AI_LOAN_DECISION" ("DECISION_CD", "HUMAN_REVIEWED_AT")
    WHERE "DECISION_CD" = 'HUMAN_REVIEW' AND "HUMAN_REVIEWED_AT" IS NULL;


-- ---------------------------------------------------------------
-- 2) ADMIN_AUDIT_LOG — 관리자 행동 감사 (가이드 §9.2.7)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."ADMIN_AUDIT_LOG" (
    "AUDIT_ID"        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "EMPLOYEE_NO"     varchar(20) NOT NULL,
    "ACTION_CD"       varchar(30) NOT NULL,          -- VIEW_CUSTOMER / UPDATE_ACCOUNT / ...
    "TARGET_TABLE"    varchar(50),
    "TARGET_ID"       varchar(50),
    "BEFORE_JSON"     jsonb,
    "AFTER_JSON"      jsonb,
    "ACCESS_IP"       varchar(50),
    "USER_AGENT"      varchar(500),
    "RESULT_CD"       varchar(20) DEFAULT 'OK',      -- OK / DENIED / ERROR
    "REMARK"          varchar(1000),
    "CREATED_AT"      timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public."ADMIN_AUDIT_LOG" IS '관리자 행동감사 | 도메인:신용보안';

CREATE INDEX IF NOT EXISTS "idx_admin_audit_employee"
    ON public."ADMIN_AUDIT_LOG" ("EMPLOYEE_NO", "CREATED_AT" DESC);
CREATE INDEX IF NOT EXISTS "idx_admin_audit_target"
    ON public."ADMIN_AUDIT_LOG" ("TARGET_TABLE", "TARGET_ID");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_action"
    ON public."ADMIN_AUDIT_LOG" ("ACTION_CD", "CREATED_AT" DESC);


-- ---------------------------------------------------------------
-- 3) EXTERNAL_API_HEALTH — 외부 결제망·신용평가사 헬스 5분 스냅샷 (가이드 §9.2.3)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."EXTERNAL_API_HEALTH" (
    "HEALTH_ID"       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "API_NAME"        varchar(50) NOT NULL,          -- KFTC / BOK_WIRE / MY_DATA / NICE / KCB
    "STATUS_CD"       varchar(20) NOT NULL,          -- UP / DEGRADED / DOWN
    "LATENCY_P50_MS"  integer,
    "LATENCY_P95_MS"  integer,
    "SUCCESS_RATE"    numeric(5,4),                  -- 0.0000 ~ 1.0000
    "REQUEST_COUNT"   integer,
    "ERROR_COUNT"     integer,
    "WINDOW_MINUTES"  smallint DEFAULT 5,
    "SAMPLE_AT"       timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public."EXTERNAL_API_HEALTH" IS '외부망 헬스 스냅 | 도메인:관측성';

CREATE INDEX IF NOT EXISTS "idx_external_api_health_name_time"
    ON public."EXTERNAL_API_HEALTH" ("API_NAME", "SAMPLE_AT" DESC);


-- ---------------------------------------------------------------
-- 4) ML_MODEL_REGISTRY — 모델 버전 카탈로그
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."ML_MODEL_REGISTRY" (
    "MODEL_ID"        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "MODEL_NAME"      varchar(50) NOT NULL,          -- loan_logistic / loan_xgb / ...
    "MODEL_VERSION"   varchar(20) NOT NULL,          -- v1 / v2 / ...
    "ARTIFACT_PATH"   varchar(200),                  -- joblib 파일 경로
    "FEATURES_JSON"   jsonb NOT NULL,                -- 피처 순서·타입 메타
    "METRICS_JSON"    jsonb,                         -- {auc, f1, precision, recall}
    "THRESHOLD_HIGH"  numeric(5,4),
    "THRESHOLD_LOW"   numeric(5,4),
    "TRAINED_AT"      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "DEPLOYED_AT"     timestamp without time zone,
    "STATUS_CD"       varchar(20) DEFAULT 'TRAINED', -- TRAINED / DEPLOYED / RETIRED
    "REMARK"          varchar(1000),
    CONSTRAINT "uq_ml_model_registry_name_version" UNIQUE ("MODEL_NAME", "MODEL_VERSION")
);

COMMENT ON TABLE public."ML_MODEL_REGISTRY" IS 'ML 모델 카탈로그 | 도메인:AI/RAG';

CREATE INDEX IF NOT EXISTS "idx_ml_model_registry_status"
    ON public."ML_MODEL_REGISTRY" ("MODEL_NAME", "STATUS_CD", "DEPLOYED_AT" DESC);


-- ---------------------------------------------------------------
-- 5) 학습된 v1 모델 부트 시드 (train_loan_model.py 결과 영구화)
-- ---------------------------------------------------------------
INSERT INTO public."ML_MODEL_REGISTRY"
    ("MODEL_NAME", "MODEL_VERSION", "ARTIFACT_PATH", "FEATURES_JSON",
     "METRICS_JSON", "THRESHOLD_HIGH", "THRESHOLD_LOW", "STATUS_CD", "DEPLOYED_AT")
VALUES
    ('loan_logistic', 'v1',
     '/app/app/scripts/models/loan_logistic_v1.joblib',
     '["credit_score","overdue_days_24m","overdue_ratio","deposit_balance","annual_income","request_ratio"]'::jsonb,
     '{"auc":0.9375,"f1":0.9027,"precision":0.9388,"recall":0.8692}'::jsonb,
     0.85, 0.30, 'DEPLOYED', CURRENT_TIMESTAMP),
    ('loan_xgb', 'v1',
     '/app/app/scripts/models/loan_xgb_v1.joblib',
     '["credit_score","overdue_days_24m","overdue_ratio","deposit_balance","annual_income","request_ratio"]'::jsonb,
     '{"auc":0.9903,"f1":0.9491,"precision":0.9394,"recall":0.9590}'::jsonb,
     0.85, 0.30, 'DEPLOYED', CURRENT_TIMESTAMP)
ON CONFLICT ("MODEL_NAME", "MODEL_VERSION") DO NOTHING;

COMMIT;