-- ===================================================================
-- 17_admin_action_history.sql — 관리자 회원·계좌 액션 이력 신설
-- ===================================================================
-- 어드민이 회원 상세/계좌 상세 화면에서 강제 변경하는 액션의 도메인별 이력.
-- AdminAuditMiddleware 자동 적재(ACTION_CD/before/after_json) 외에 도메인
-- 화면에서 변경 흐름을 직관적으로 보여주기 위한 정규화 이력.
--
-- 신설
--   CUSTOMER_STATUS_HISTORY  회원 상태 변경 이벤트 로그 (5050 ↔ LIMITED ↔ LOCKED ↔ DORMANT)
--   ACCOUNT_STATUS_HISTORY   계좌 상태 변경 / 비번 오류 초기화 이벤트 로그
--
-- 재활용
--   CUSTOMER_GRADE_HISTORY    이미 존재 (START/END_DATE 패턴) — 등급 변경 흐름 그대로 사용
--   ACCOUNT_LIMIT_CHANGE_REQUEST  이미 존재 — ADMIN 강제 변경은
--     VERIFY_METHOD_CD='ADMIN' (varchar(10) 제약) + STATUS_CD='APPLIED' +
--     APPLIED_DATETIME=NOW() 즉시 처리
--
-- 멱등: CREATE TABLE IF NOT EXISTS / DROP TYPE IF EXISTS 패턴.
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/17_admin_action_history.sql
-- ===================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1) CUSTOMER_STATUS_HISTORY
--   회원 상태(CUST_STATUS_CD) 변경 이벤트 로그.
--   잠금 해제/잠금/휴면 전환 사례 추적 — 그래프성 timeline 아니라 이벤트 row 누적.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."CUSTOMER_STATUS_HISTORY" (
    "HISTORY_ID"      bigint                                 GENERATED ALWAYS AS IDENTITY,
    "CUSTOMER_NO"     bigint                                 NOT NULL,
    "EVENT_DATETIME"  varchar(14)                            NOT NULL,            -- yyyymmddhhmmss
    "OLD_STATUS_CD"   varchar(8),
    "NEW_STATUS_CD"   varchar(8)                             NOT NULL,
    "REASON_CD"       varchar(20),                                                -- FRAUD_LOCK / UNLOCK / DORMANT_AUTO / etc.
    "REMARK"          varchar(1000),
    "EMPLOYEE_NO"     varchar(20)                            NOT NULL,            -- 처리 어드민
    "DELETE_YN"       char(1)                                NOT NULL DEFAULT 'N',
    "CREATED_AT"      timestamp                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_CUSTOMER_STATUS_HISTORY" PRIMARY KEY ("HISTORY_ID"),
    CONSTRAINT "fk_csh_customer_no"
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO")
);

COMMENT ON TABLE public."CUSTOMER_STATUS_HISTORY"
    IS '회원 상태 변경 이력 (어드민 액션) | 도메인:회원';
COMMENT ON COLUMN public."CUSTOMER_STATUS_HISTORY"."EVENT_DATETIME"
    IS '이벤트 일시 | yyyymmddhhmmss';
COMMENT ON COLUMN public."CUSTOMER_STATUS_HISTORY"."OLD_STATUS_CD"
    IS '변경 직전 상태 (신규 등록 시 NULL)';
COMMENT ON COLUMN public."CUSTOMER_STATUS_HISTORY"."NEW_STATUS_CD"
    IS '변경 후 상태 | 5050/LIMITED/LOCKED/DORMANT';
COMMENT ON COLUMN public."CUSTOMER_STATUS_HISTORY"."REASON_CD"
    IS '사유 코드 | FRAUD_LOCK / UNLOCK / DORMANT_AUTO / RESTORE 등';
COMMENT ON COLUMN public."CUSTOMER_STATUS_HISTORY"."EMPLOYEE_NO"
    IS '처리 사번 (어드민 액션 주체)';

CREATE INDEX IF NOT EXISTS "idx_csh_customer_dt"
    ON public."CUSTOMER_STATUS_HISTORY" ("CUSTOMER_NO", "EVENT_DATETIME" DESC)
    WHERE "DELETE_YN" = 'N';


-- ---------------------------------------------------------------
-- 2) ACCOUNT_STATUS_HISTORY
--   계좌 상태(ACCOUNT_STATUS_CD) 변경 + 비번오류 초기화 이벤트.
--   EVENT_TYPE_CD 로 discriminator:
--     STATUS_CHANGE     계좌 상태 전환 (NORMAL/5050 ↔ LIMITED ↔ DORMANT 등)
--     PWD_ERROR_RESET   PWD_ERROR_COUNT 강제 0 (연속 실패 잠금 해제)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."ACCOUNT_STATUS_HISTORY" (
    "HISTORY_ID"       bigint                                 GENERATED ALWAYS AS IDENTITY,
    "ACCOUNT_NO"       varchar(20)                            NOT NULL,
    "EVENT_DATETIME"   varchar(14)                            NOT NULL,
    "EVENT_TYPE_CD"    varchar(20)                            NOT NULL,
    "OLD_VALUE"        varchar(20),                                                 -- old status_cd 또는 old error_count 문자열
    "NEW_VALUE"        varchar(20),                                                 -- new status_cd 또는 '0'
    "REASON_CD"        varchar(20),
    "REMARK"           varchar(1000),
    "EMPLOYEE_NO"      varchar(20)                            NOT NULL,
    "DELETE_YN"        char(1)                                NOT NULL DEFAULT 'N',
    "CREATED_AT"       timestamp                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_ACCOUNT_STATUS_HISTORY" PRIMARY KEY ("HISTORY_ID"),
    CONSTRAINT "fk_ash_account_no"
        FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO")
);

COMMENT ON TABLE public."ACCOUNT_STATUS_HISTORY"
    IS '계좌 상태/잠금해제 변경 이력 (어드민 액션) | 도메인:계좌';
COMMENT ON COLUMN public."ACCOUNT_STATUS_HISTORY"."EVENT_TYPE_CD"
    IS 'STATUS_CHANGE / PWD_ERROR_RESET';
COMMENT ON COLUMN public."ACCOUNT_STATUS_HISTORY"."OLD_VALUE"
    IS 'STATUS_CHANGE: 직전 ACCOUNT_STATUS_CD / PWD_ERROR_RESET: 직전 PWD_ERROR_COUNT';
COMMENT ON COLUMN public."ACCOUNT_STATUS_HISTORY"."NEW_VALUE"
    IS 'STATUS_CHANGE: 신규 ACCOUNT_STATUS_CD / PWD_ERROR_RESET: ''0''';
COMMENT ON COLUMN public."ACCOUNT_STATUS_HISTORY"."EMPLOYEE_NO"
    IS '처리 사번';

CREATE INDEX IF NOT EXISTS "idx_ash_account_dt"
    ON public."ACCOUNT_STATUS_HISTORY" ("ACCOUNT_NO", "EVENT_DATETIME" DESC)
    WHERE "DELETE_YN" = 'N';

COMMIT;
