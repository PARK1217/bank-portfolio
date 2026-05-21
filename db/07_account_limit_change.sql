-- =====================================================================
-- 07_account_limit_change.sql — 계좌 이체·출금 한도 변경 신청 (7일 점검)
-- =====================================================================
-- 약관 근거:
--   data/seed-terms/1101-saving-basic.md §4(2), 05-checking.md §5(2)
--   "본인 인증 → 한도 변경 신청 → 7일 점검 → 정상 거래 확인 후 영구 적용"
--
-- 흐름:
--   1) 사용자가 한도 변경 신청 (OTP 추가 인증)
--   2) PENDING 상태로 ACCOUNT_LIMIT_CHANGE_REQUEST INSERT
--      (이 시점에 ACCOUNT 의 LIMIT 컬럼이 즉시 변경되지는 않음)
--   3) 7일 경과 시 APPLIED 로 전환 + ACCOUNT 컬럼 실제 갱신
--   4) 점검 기간 중에는 본인이 CANCELED 로 전환 가능
--
-- 멱등: IF NOT EXISTS / DO $$ ... $$ 블록.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."ACCOUNT_LIMIT_CHANGE_REQUEST" (
    "REQUEST_ID"          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "CUSTOMER_NO"         bigint                       NOT NULL,
    "ACCOUNT_NO"          character varying(20)        NOT NULL,
    "LIMIT_TYPE_CD"       character varying(20)        NOT NULL,
    "OLD_LIMIT_KRW"       bigint,
    "NEW_LIMIT_KRW"       bigint                       NOT NULL,
    "REQUEST_DATETIME"    timestamp without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "APPLY_DATETIME"      timestamp without time zone  NOT NULL,
    "APPLIED_DATETIME"    timestamp without time zone,
    "CANCELED_DATETIME"   timestamp without time zone,
    "STATUS_CD"           character varying(10)        NOT NULL DEFAULT 'PENDING',
    "VERIFY_METHOD_CD"    character varying(10)        NOT NULL DEFAULT 'OTP',
    "REMARK"              character varying(200),
    "DELETE_YN"           character(1)                 NOT NULL DEFAULT 'N',
    "CREATED_AT"          timestamp without time zone  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_AT"          timestamp without time zone
);

COMMENT ON TABLE  public."ACCOUNT_LIMIT_CHANGE_REQUEST" IS '계좌 한도 변경 신청 (7일 점검 기간)';
COMMENT ON COLUMN public."ACCOUNT_LIMIT_CHANGE_REQUEST"."LIMIT_TYPE_CD"    IS 'DAILY_WITHDRAW / DAILY_TRANSFER';
COMMENT ON COLUMN public."ACCOUNT_LIMIT_CHANGE_REQUEST"."STATUS_CD"        IS 'PENDING / APPLIED / CANCELED / REJECTED';
COMMENT ON COLUMN public."ACCOUNT_LIMIT_CHANGE_REQUEST"."VERIFY_METHOD_CD" IS 'OTP / BIOMETRIC';
COMMENT ON COLUMN public."ACCOUNT_LIMIT_CHANGE_REQUEST"."APPLY_DATETIME"   IS '7일 경과 후 자동 적용 예정 시각';

-- 활성(PENDING) 신청은 (계좌, 한도종류) 1쌍당 최대 1건만 — 중복 신청 차단
CREATE UNIQUE INDEX IF NOT EXISTS uq_alcr_pending_one
    ON public."ACCOUNT_LIMIT_CHANGE_REQUEST" ("ACCOUNT_NO", "LIMIT_TYPE_CD")
    WHERE "STATUS_CD" = 'PENDING' AND "DELETE_YN" = 'N';

-- 만료 처리 배치(또는 endpoint)가 사용할 시간 인덱스
CREATE INDEX IF NOT EXISTS idx_alcr_apply_due
    ON public."ACCOUNT_LIMIT_CHANGE_REQUEST" ("APPLY_DATETIME")
    WHERE "STATUS_CD" = 'PENDING' AND "DELETE_YN" = 'N';

CREATE INDEX IF NOT EXISTS idx_alcr_customer_status
    ON public."ACCOUNT_LIMIT_CHANGE_REQUEST" ("CUSTOMER_NO", "STATUS_CD", "REQUEST_DATETIME" DESC)
    WHERE "DELETE_YN" = 'N';