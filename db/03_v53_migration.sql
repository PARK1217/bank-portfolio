-- =====================================================================
-- v53 migration : NEW 13 tables + AUTO_TRANSFER/EXEC 확장 + TRANSFER settlement_*
-- 작성일       : 2026-05-20
-- 기준 스키마  : db/01_schema.sql  (v52, public 스키마, 대문자 따옴표 식별자)
-- 결정사항
--   · 식별자  : v52와 동일하게 `public` / 대문자 따옴표 (`public."NOTIFICATION"` 등)
--   · 시간 타입: `timestamp without time zone` (v52 컨벤션. TIMESTAMPTZ 미사용)
--   · 감사 컬럼: DELETE_YN / CREATED_BY / CREATED_AT / UPDATED_BY / UPDATED_AT 일관 추가
--   · 멱등성  : v52 패턴 — `varchar(64)` nullable + `CREATE UNIQUE INDEX ... WHERE ... IS NOT NULL`
--   · transfer_schedule는 별도 생성하지 않고 AUTO_TRANSFER / AUTO_TRANSFER_EXEC 확장으로 흡수
-- 적용 후 : `pg_dump -U bank -d bank --schema-only --no-owner --no-privileges > db/01_schema.sql`
-- =====================================================================

BEGIN;

-- pgvector : AI_FAQ.EMBEDDING (VECTOR(768)). 미설치 환경이면 아래 한 줄 주석 처리하고
-- AI_FAQ 의 EMBEDDING 컬럼 타입을 bytea 또는 text 로 교체.
CREATE EXTENSION IF NOT EXISTS vector;


-- =====================================================================
-- 1. AI / RAG 도메인 (9 테이블)
-- =====================================================================

-- ---- AI_LLM_CALL_LOG (다른 AI 테이블 FK 대상 → 가장 먼저) ----------------
CREATE TABLE public."AI_LLM_CALL_LOG" (
    "LLM_CALL_ID"       bigint GENERATED ALWAYS AS IDENTITY,
    "TRACE_ID"          character varying(64) NOT NULL,
    "SPAN_ID"           character varying(64),
    "CALLED_AT"         timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "MODEL_NAME"        character varying(50),
    "PURPOSE_CD"        character varying(20),
    "PROMPT_TOKENS"     integer,
    "COMPLETION_TOKENS" integer,
    "LATENCY_MS"        integer,
    "STATUS_CD"         character varying(20),
    "ERROR_MESSAGE"     text,
    "DELETE_YN"         character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"        character varying(20),
    "CREATED_AT"        timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"        character varying(20),
    "UPDATED_AT"        timestamp without time zone,
    CONSTRAINT "pk_AI_LLM_CALL_LOG" PRIMARY KEY ("LLM_CALL_ID")
);
CREATE UNIQUE INDEX uq_ai_llm_call_log_trace
    ON public."AI_LLM_CALL_LOG" USING btree ("TRACE_ID");

COMMENT ON TABLE  public."AI_LLM_CALL_LOG"                  IS 'LLM호출로그 | 도메인:AI/RAG | Phoenix 트레이스 연동';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."LLM_CALL_ID"    IS 'LLM호출ID | 호출 식별자';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."TRACE_ID"       IS 'Phoenix trace_id | UNIQUE';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."SPAN_ID"        IS 'Phoenix span_id';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."PURPOSE_CD"     IS '용도코드 | CHATBOT/ASSET/EMBEDDING';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."MODEL_NAME"     IS '모델명 | 예: llama3.1:8b-instruct-q4';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."LATENCY_MS"     IS '응답지연 | ms';
COMMENT ON COLUMN public."AI_LLM_CALL_LOG"."STATUS_CD"      IS '상태코드 | SUCCESS/TIMEOUT/ERROR';


-- ---- AI_CHATBOT_SESSION ------------------------------------------------
CREATE TABLE public."AI_CHATBOT_SESSION" (
    "SESSION_ID"           bigint GENERATED ALWAYS AS IDENTITY,
    "CUSTOMER_NO"          bigint NOT NULL,
    "STARTED_AT"           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "ENDED_AT"             timestamp without time zone,
    "STATUS_CD"            character varying(20),
    "HANDOFF_COMPLAINT_ID" bigint,
    "DELETE_YN"            character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"           character varying(20),
    "CREATED_AT"           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"           character varying(20),
    "UPDATED_AT"           timestamp without time zone,
    CONSTRAINT "pk_AI_CHATBOT_SESSION" PRIMARY KEY ("SESSION_ID")
);
ALTER TABLE ONLY public."AI_CHATBOT_SESSION"
    ADD CONSTRAINT fk_ai_chatbot_session_customer_no
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");
ALTER TABLE ONLY public."AI_CHATBOT_SESSION"
    ADD CONSTRAINT fk_ai_chatbot_session_handoff_complaint_id
        FOREIGN KEY ("HANDOFF_COMPLAINT_ID") REFERENCES public."COMPLAINT"("COMPLAINT_ID");
CREATE INDEX idx_ai_chatbot_session_customer
    ON public."AI_CHATBOT_SESSION" ("CUSTOMER_NO", "STARTED_AT" DESC);

COMMENT ON TABLE  public."AI_CHATBOT_SESSION"                        IS '챗봇대화세션 | 도메인:AI/RAG | SCR-CB-001';
COMMENT ON COLUMN public."AI_CHATBOT_SESSION"."STATUS_CD"            IS '상태코드 | ACTIVE/CLOSED/HANDOFF';
COMMENT ON COLUMN public."AI_CHATBOT_SESSION"."HANDOFF_COMPLAINT_ID" IS '상담원전환민원ID | 챗봇→상담원 전환 시';


-- ---- AI_CHATBOT_MESSAGE ------------------------------------------------
CREATE TABLE public."AI_CHATBOT_MESSAGE" (
    "MESSAGE_ID"     bigint GENERATED ALWAYS AS IDENTITY,
    "SESSION_ID"     bigint NOT NULL,
    "ROLE_CD"        character varying(10),
    "CONTENT"        text,
    "RAG_TIER_CD"    character varying(10),
    "RAG_SOURCE_IDS" jsonb,
    "LLM_CALL_ID"    bigint,
    "DELETE_YN"      character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"     character varying(20),
    "CREATED_AT"     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"     character varying(20),
    "UPDATED_AT"     timestamp without time zone,
    CONSTRAINT "pk_AI_CHATBOT_MESSAGE" PRIMARY KEY ("MESSAGE_ID")
);
ALTER TABLE ONLY public."AI_CHATBOT_MESSAGE"
    ADD CONSTRAINT fk_ai_chatbot_message_session_id
        FOREIGN KEY ("SESSION_ID") REFERENCES public."AI_CHATBOT_SESSION"("SESSION_ID");
ALTER TABLE ONLY public."AI_CHATBOT_MESSAGE"
    ADD CONSTRAINT fk_ai_chatbot_message_llm_call_id
        FOREIGN KEY ("LLM_CALL_ID") REFERENCES public."AI_LLM_CALL_LOG"("LLM_CALL_ID");
CREATE INDEX idx_ai_chatbot_message_session
    ON public."AI_CHATBOT_MESSAGE" ("SESSION_ID", "CREATED_AT");

COMMENT ON TABLE  public."AI_CHATBOT_MESSAGE"                  IS '챗봇메시지 | 도메인:AI/RAG | SCR-CB-001';
COMMENT ON COLUMN public."AI_CHATBOT_MESSAGE"."ROLE_CD"        IS '역할코드 | USER/ASSISTANT';
COMMENT ON COLUMN public."AI_CHATBOT_MESSAGE"."RAG_TIER_CD"    IS 'RAG계층 | KEYWORD/FAQ/VECTOR (응답시 사용한 단계)';
COMMENT ON COLUMN public."AI_CHATBOT_MESSAGE"."RAG_SOURCE_IDS" IS 'RAG출처ID목록 | jsonb [FAQ_ID, TERMS_ID...]';
COMMENT ON COLUMN public."AI_CHATBOT_MESSAGE"."LLM_CALL_ID"    IS 'LLM호출ID | Phoenix 추적 연계';


-- ---- AI_CHATBOT_FEEDBACK -----------------------------------------------
CREATE TABLE public."AI_CHATBOT_FEEDBACK" (
    "FEEDBACK_ID"  bigint GENERATED ALWAYS AS IDENTITY,
    "MESSAGE_ID"   bigint NOT NULL,
    "CUSTOMER_NO"  bigint NOT NULL,
    "RATING"       smallint,
    "COMMENT"      text,
    "DELETE_YN"    character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"   character varying(20),
    "CREATED_AT"   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"   character varying(20),
    "UPDATED_AT"   timestamp without time zone,
    CONSTRAINT "pk_AI_CHATBOT_FEEDBACK" PRIMARY KEY ("FEEDBACK_ID")
);
ALTER TABLE ONLY public."AI_CHATBOT_FEEDBACK"
    ADD CONSTRAINT fk_ai_chatbot_feedback_message_id
        FOREIGN KEY ("MESSAGE_ID") REFERENCES public."AI_CHATBOT_MESSAGE"("MESSAGE_ID");
ALTER TABLE ONLY public."AI_CHATBOT_FEEDBACK"
    ADD CONSTRAINT fk_ai_chatbot_feedback_customer_no
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");

COMMENT ON TABLE  public."AI_CHATBOT_FEEDBACK"           IS '챗봇피드백 | 도메인:AI/RAG | SCR-CB-007 / Phoenix 평가 데이터';
COMMENT ON COLUMN public."AI_CHATBOT_FEEDBACK"."RATING"  IS '평점 | 1=👎 / 5=👍';
COMMENT ON COLUMN public."AI_CHATBOT_FEEDBACK"."COMMENT" IS '코멘트 | 자유 텍스트';


-- ---- AI_FAQ ------------------------------------------------------------
CREATE TABLE public."AI_FAQ" (
    "FAQ_ID"     bigint GENERATED ALWAYS AS IDENTITY,
    "CATEGORY"   character varying(50),
    "QUESTION"   text,
    "ANSWER"     text,
    "EMBEDDING"  vector(768),
    "HIT_COUNT"  bigint DEFAULT 0,
    "STATUS_CD"  character varying(10),
    "DELETE_YN"  character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone,
    CONSTRAINT "pk_AI_FAQ" PRIMARY KEY ("FAQ_ID")
);
CREATE INDEX idx_ai_faq_category_status
    ON public."AI_FAQ" ("CATEGORY", "STATUS_CD");

COMMENT ON TABLE  public."AI_FAQ"              IS 'FAQ마스터 | 도메인:AI/RAG | 3-tier RAG 중간 계층';
COMMENT ON COLUMN public."AI_FAQ"."CATEGORY"   IS '카테고리 | 계좌/이체/대출/카드/...';
COMMENT ON COLUMN public."AI_FAQ"."EMBEDDING"  IS '임베딩벡터 | pgvector VECTOR(768)';
COMMENT ON COLUMN public."AI_FAQ"."HIT_COUNT"  IS '인기도 | 노출/매칭 횟수';
COMMENT ON COLUMN public."AI_FAQ"."STATUS_CD"  IS '상태코드 | ACTIVE/HIDDEN';


-- ---- AI_ASSET_SESSION --------------------------------------------------
CREATE TABLE public."AI_ASSET_SESSION" (
    "ASSET_SESSION_ID" bigint GENERATED ALWAYS AS IDENTITY,
    "CUSTOMER_NO"      bigint NOT NULL,
    "STATUS_CD"        character varying(20),
    "LLM_CALL_ID"      bigint,
    "STARTED_AT"       timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "COMPLETED_AT"     timestamp without time zone,
    "DELETE_YN"        character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"       character varying(20),
    "CREATED_AT"       timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"       character varying(20),
    "UPDATED_AT"       timestamp without time zone,
    CONSTRAINT "pk_AI_ASSET_SESSION" PRIMARY KEY ("ASSET_SESSION_ID")
);
ALTER TABLE ONLY public."AI_ASSET_SESSION"
    ADD CONSTRAINT fk_ai_asset_session_customer_no
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");
ALTER TABLE ONLY public."AI_ASSET_SESSION"
    ADD CONSTRAINT fk_ai_asset_session_llm_call_id
        FOREIGN KEY ("LLM_CALL_ID") REFERENCES public."AI_LLM_CALL_LOG"("LLM_CALL_ID");
CREATE INDEX idx_ai_asset_session_customer
    ON public."AI_ASSET_SESSION" ("CUSTOMER_NO", "STARTED_AT" DESC);

COMMENT ON TABLE  public."AI_ASSET_SESSION"             IS '자산분석세션 | 도메인:AI/RAG | SCR-AS-001~007';
COMMENT ON COLUMN public."AI_ASSET_SESSION"."STATUS_CD" IS '상태코드 | SURVEY/ANALYZING/DONE/FAILED';


-- ---- AI_ASSET_SURVEY_RESPONSE ------------------------------------------
CREATE TABLE public."AI_ASSET_SURVEY_RESPONSE" (
    "RESPONSE_ID"      bigint GENERATED ALWAYS AS IDENTITY,
    "ASSET_SESSION_ID" bigint NOT NULL,
    "QUESTION_CODE"    character varying(20),
    "ANSWER_TEXT"      text,
    "ANSWER_VALUE"     jsonb,
    "DELETE_YN"        character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"       character varying(20),
    "CREATED_AT"       timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"       character varying(20),
    "UPDATED_AT"       timestamp without time zone,
    CONSTRAINT "pk_AI_ASSET_SURVEY_RESPONSE" PRIMARY KEY ("RESPONSE_ID")
);
ALTER TABLE ONLY public."AI_ASSET_SURVEY_RESPONSE"
    ADD CONSTRAINT fk_ai_asset_survey_response_session_id
        FOREIGN KEY ("ASSET_SESSION_ID") REFERENCES public."AI_ASSET_SESSION"("ASSET_SESSION_ID");
CREATE INDEX idx_ai_asset_survey_response_session
    ON public."AI_ASSET_SURVEY_RESPONSE" ("ASSET_SESSION_ID");

COMMENT ON TABLE  public."AI_ASSET_SURVEY_RESPONSE"                  IS '자산분석설문응답 | 도메인:AI/RAG | SCR-AS-002 동적프롬프트 입력';
COMMENT ON COLUMN public."AI_ASSET_SURVEY_RESPONSE"."QUESTION_CODE"  IS '문항코드 | GOAL/RISK/AMOUNT/PERIOD/...';
COMMENT ON COLUMN public."AI_ASSET_SURVEY_RESPONSE"."ANSWER_VALUE"   IS '구조화응답 | jsonb (다중선택/숫자 등)';


-- ---- AI_ASSET_RESULT ---------------------------------------------------
CREATE TABLE public."AI_ASSET_RESULT" (
    "RESULT_ID"          bigint GENERATED ALWAYS AS IDENTITY,
    "ASSET_SESSION_ID"   bigint NOT NULL,
    "RANK"               smallint,
    "PRODUCT_ID"         smallint,
    "REASON_SUMMARY"     text,
    "REASON_DETAILS"     jsonb,
    "FAITHFULNESS_SCORE" numeric(3,2),
    "DELETE_YN"          character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"         character varying(20),
    "CREATED_AT"         timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"         character varying(20),
    "UPDATED_AT"         timestamp without time zone,
    CONSTRAINT "pk_AI_ASSET_RESULT" PRIMARY KEY ("RESULT_ID")
);
ALTER TABLE ONLY public."AI_ASSET_RESULT"
    ADD CONSTRAINT fk_ai_asset_result_session_id
        FOREIGN KEY ("ASSET_SESSION_ID") REFERENCES public."AI_ASSET_SESSION"("ASSET_SESSION_ID");
ALTER TABLE ONLY public."AI_ASSET_RESULT"
    ADD CONSTRAINT fk_ai_asset_result_product_id
        FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");
CREATE INDEX idx_ai_asset_result_session_rank
    ON public."AI_ASSET_RESULT" ("ASSET_SESSION_ID", "RANK");

COMMENT ON TABLE  public."AI_ASSET_RESULT"                      IS '자산분석결과 | 도메인:AI/RAG | SCR-AS-004 추천+평가';
COMMENT ON COLUMN public."AI_ASSET_RESULT"."RANK"               IS '추천순위 | 1~3';
COMMENT ON COLUMN public."AI_ASSET_RESULT"."PRODUCT_ID"         IS '상품ID | PRODUCT (smallint)';
COMMENT ON COLUMN public."AI_ASSET_RESULT"."REASON_SUMMARY"     IS 'LLM추천이유요약';
COMMENT ON COLUMN public."AI_ASSET_RESULT"."FAITHFULNESS_SCORE" IS 'Faithfulness 점수 | 0.00~1.00';


-- ---- AI_RAG_EVALUATION -------------------------------------------------
CREATE TABLE public."AI_RAG_EVALUATION" (
    "EVAL_ID"           bigint GENERATED ALWAYS AS IDENTITY,
    "LLM_CALL_ID"       bigint NOT NULL,
    "QUESTION"          text,
    "RETRIEVED_DOCS"    jsonb,
    "ANSWER"            text,
    "FAITHFULNESS"      numeric(3,2),
    "ANSWER_RELEVANCY"  numeric(3,2),
    "CONTEXT_PRECISION" numeric(3,2),
    "CONTEXT_RECALL"    numeric(3,2),
    "EVALUATED_AT"      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "DELETE_YN"         character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"        character varying(20),
    "CREATED_AT"        timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"        character varying(20),
    "UPDATED_AT"        timestamp without time zone,
    CONSTRAINT "pk_AI_RAG_EVALUATION" PRIMARY KEY ("EVAL_ID")
);
ALTER TABLE ONLY public."AI_RAG_EVALUATION"
    ADD CONSTRAINT fk_ai_rag_evaluation_llm_call_id
        FOREIGN KEY ("LLM_CALL_ID") REFERENCES public."AI_LLM_CALL_LOG"("LLM_CALL_ID");

COMMENT ON TABLE  public."AI_RAG_EVALUATION"                     IS 'RAG평가 | 도메인:AI/RAG | Phoenix Evals 4지표 배치';
COMMENT ON COLUMN public."AI_RAG_EVALUATION"."FAITHFULNESS"      IS '충실도 | 답변이 출처에 충실한가';
COMMENT ON COLUMN public."AI_RAG_EVALUATION"."ANSWER_RELEVANCY"  IS '답변적합도 | 질문과 답변의 적합도';
COMMENT ON COLUMN public."AI_RAG_EVALUATION"."CONTEXT_PRECISION" IS '문맥정밀도 | 가져온 출처 중 관련된 비율';
COMMENT ON COLUMN public."AI_RAG_EVALUATION"."CONTEXT_RECALL"    IS '문맥재현율 | 필요한 출처를 다 가져왔는가';


-- =====================================================================
-- 2. 확장 도메인 (4 테이블)
-- =====================================================================

-- ---- NOTIFICATION ------------------------------------------------------
CREATE TABLE public."NOTIFICATION" (
    "NOTIFICATION_ID" bigint GENERATED ALWAYS AS IDENTITY,
    "CUSTOMER_NO"     bigint NOT NULL,
    "TYPE_CD"         character varying(30),
    "TITLE"           character varying(100),
    "BODY"            text,
    "LINK_URL"        text,
    "REFERENCE_ID"    bigint,
    "REFERENCE_TYPE"  character varying(30),
    "IS_READ"         boolean DEFAULT false,
    "READ_AT"         timestamp without time zone,
    "DELETE_YN"       character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"      character varying(20),
    "CREATED_AT"      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"      character varying(20),
    "UPDATED_AT"      timestamp without time zone,
    CONSTRAINT "pk_NOTIFICATION" PRIMARY KEY ("NOTIFICATION_ID")
);
ALTER TABLE ONLY public."NOTIFICATION"
    ADD CONSTRAINT fk_notification_customer_no
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");
-- 미읽음 우선 조회: (CUSTOMER_NO, IS_READ, CREATED_AT DESC)
CREATE INDEX idx_notification_customer_unread
    ON public."NOTIFICATION" ("CUSTOMER_NO", "IS_READ", "CREATED_AT" DESC);

COMMENT ON TABLE  public."NOTIFICATION"                  IS '알림 | 도메인:확장 | SCR-HM-004';
COMMENT ON COLUMN public."NOTIFICATION"."TYPE_CD"        IS '유형코드 | TRANSFER/AUTO_TRANSFER/LOAN_DUE/FDS/MARKETING/...';
COMMENT ON COLUMN public."NOTIFICATION"."REFERENCE_ID"   IS '연계자원ID | 거래/대출/FDS탐지 등';
COMMENT ON COLUMN public."NOTIFICATION"."REFERENCE_TYPE" IS '연계자원유형 | TRANSACTION/LOAN/FDS_ALERT/...';


-- ---- MY_DATA_LINK ------------------------------------------------------
CREATE TABLE public."MY_DATA_LINK" (
    "LINK_ID"                 bigint GENERATED ALWAYS AS IDENTITY,
    "CUSTOMER_NO"             bigint NOT NULL,
    "PROVIDER_CODE"           character varying(20),
    "PROVIDER_NAME"           character varying(100),
    "ACCESS_TOKEN_ENCRYPTED"  text,
    "REFRESH_TOKEN_ENCRYPTED" text,
    "TOKEN_EXPIRES_AT"        timestamp without time zone,
    "CONSENT_AT"              timestamp without time zone,
    "CONSENT_EXPIRES_AT"      timestamp without time zone,
    "STATUS_CD"               character varying(20),
    "LAST_SYNCED_AT"          timestamp without time zone,
    "DELETE_YN"               character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"              character varying(20),
    "CREATED_AT"              timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"              character varying(20),
    "UPDATED_AT"              timestamp without time zone,
    CONSTRAINT "pk_MY_DATA_LINK" PRIMARY KEY ("LINK_ID")
);
ALTER TABLE ONLY public."MY_DATA_LINK"
    ADD CONSTRAINT fk_my_data_link_customer_no
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");
CREATE INDEX idx_my_data_link_customer
    ON public."MY_DATA_LINK" ("CUSTOMER_NO", "STATUS_CD");

COMMENT ON TABLE  public."MY_DATA_LINK"                          IS '마이데이터사업자연동 | 도메인:확장 | SCR-HM-002';
COMMENT ON COLUMN public."MY_DATA_LINK"."PROVIDER_CODE"          IS '사업자코드 | KAKAO/TOSS/NICE/...';
COMMENT ON COLUMN public."MY_DATA_LINK"."ACCESS_TOKEN_ENCRYPTED" IS '암호화액세스토큰 | ⚠️ AES-256 암호화 후 저장';
COMMENT ON COLUMN public."MY_DATA_LINK"."CONSENT_EXPIRES_AT"     IS '동의만료시각 | 1년 (마이데이터 표준)';
COMMENT ON COLUMN public."MY_DATA_LINK"."STATUS_CD"              IS '상태코드 | ACTIVE/EXPIRED/REVOKED';


-- ---- MY_DATA_TRANSACTION -----------------------------------------------
CREATE TABLE public."MY_DATA_TRANSACTION" (
    "MD_TX_ID"            bigint GENERATED ALWAYS AS IDENTITY,
    "LINK_ID"             bigint NOT NULL,
    "EXTERNAL_ACCOUNT_NO" character varying(50),
    "INSTITUTION_CODE"    character varying(10),
    "TX_TYPE_CD"          character varying(20),
    "AMOUNT"              numeric(18,2),
    "BALANCE_AFTER"       numeric(18,2),
    "MEMO"                character varying(200),
    "TX_AT"               timestamp without time zone,
    "SYNCED_AT"           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "DELETE_YN"           character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"          character varying(20),
    "CREATED_AT"          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"          character varying(20),
    "UPDATED_AT"          timestamp without time zone,
    CONSTRAINT "pk_MY_DATA_TRANSACTION" PRIMARY KEY ("MD_TX_ID")
);
ALTER TABLE ONLY public."MY_DATA_TRANSACTION"
    ADD CONSTRAINT fk_my_data_transaction_link_id
        FOREIGN KEY ("LINK_ID") REFERENCES public."MY_DATA_LINK"("LINK_ID");
CREATE INDEX idx_my_data_transaction_recent
    ON public."MY_DATA_TRANSACTION" ("LINK_ID", "TX_AT" DESC);

COMMENT ON TABLE  public."MY_DATA_TRANSACTION"                      IS '마이데이터통합거래 | 도메인:확장 | SCR-HM-003';
COMMENT ON COLUMN public."MY_DATA_TRANSACTION"."EXTERNAL_ACCOUNT_NO" IS '타사계좌번호 | 마스킹 저장';
COMMENT ON COLUMN public."MY_DATA_TRANSACTION"."TX_TYPE_CD"          IS '거래유형 | DEPOSIT/WITHDRAW';


-- ---- FREQUENT_ACCOUNT --------------------------------------------------
CREATE TABLE public."FREQUENT_ACCOUNT" (
    "FREQUENT_ACCOUNT_ID" bigint GENERATED ALWAYS AS IDENTITY,
    "CUSTOMER_NO"         bigint NOT NULL,
    "ALIAS"               character varying(50),
    "BANK_CD"             character varying(10),
    "ACCOUNT_NO"          character varying(50),
    "ACCOUNT_HOLDER_NAME" character varying(50),
    "DISPLAY_ORDER"       smallint,
    "USE_COUNT"           integer DEFAULT 0,
    "LAST_USED_AT"        timestamp without time zone,
    "DELETE_YN"           character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY"          character varying(20),
    "CREATED_AT"          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY"          character varying(20),
    "UPDATED_AT"          timestamp without time zone,
    CONSTRAINT "pk_FREQUENT_ACCOUNT" PRIMARY KEY ("FREQUENT_ACCOUNT_ID")
);
ALTER TABLE ONLY public."FREQUENT_ACCOUNT"
    ADD CONSTRAINT fk_frequent_account_customer_no
        FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");
CREATE UNIQUE INDEX uq_frequent_account_customer_bank_account
    ON public."FREQUENT_ACCOUNT" ("CUSTOMER_NO", "BANK_CD", "ACCOUNT_NO");
CREATE INDEX idx_frequent_account_customer_order
    ON public."FREQUENT_ACCOUNT" ("CUSTOMER_NO", "DISPLAY_ORDER");

COMMENT ON TABLE  public."FREQUENT_ACCOUNT"               IS '자주쓰는계좌 | 도메인:확장 | SCR-TR-004';
COMMENT ON COLUMN public."FREQUENT_ACCOUNT"."ALIAS"       IS '별칭 | 예: "엄마"';
COMMENT ON COLUMN public."FREQUENT_ACCOUNT"."USE_COUNT"   IS '사용횟수 | 정렬용';


-- =====================================================================
-- 3. AUTO_TRANSFER / AUTO_TRANSFER_EXEC 확장
--    (transfer_schedule 신규 미생성 — 기존 테이블로 흡수)
-- =====================================================================

-- 적금자동납입 / 대출자동상환 / 공과금 / 사용자이체 통합 (linked_to + linked_id)
-- + MONTHLY_EXEC_DAY 로 표현 못 하는 격주/매주N요일 룰을 jsonb 로 수용
ALTER TABLE public."AUTO_TRANSFER"
    ADD COLUMN "LINKED_TO"     character varying(30),
    ADD COLUMN "LINKED_ID"     bigint,
    ADD COLUMN "SCHEDULE_RULE" jsonb;

COMMENT ON COLUMN public."AUTO_TRANSFER"."LINKED_TO"     IS '연계자원유형 | INSTALLMENT/LOAN/UTILITY/USER';
COMMENT ON COLUMN public."AUTO_TRANSFER"."LINKED_ID"     IS '연계자원ID | 적금/대출 등';
COMMENT ON COLUMN public."AUTO_TRANSFER"."SCHEDULE_RULE" IS '스케줄룰 jsonb | 격주/매주N요일 등 MONTHLY_EXEC_DAY 외 룰';

-- 배치 재실행 멱등성 — v52 패턴 (varchar(64) nullable + 부분 UNIQUE)
ALTER TABLE public."AUTO_TRANSFER_EXEC"
    ADD COLUMN "IDEMPOTENCY_KEY" character varying(64);

CREATE UNIQUE INDEX uq_auto_transfer_exec_idem
    ON public."AUTO_TRANSFER_EXEC" USING btree ("IDEMPOTENCY_KEY")
    WHERE ("IDEMPOTENCY_KEY" IS NOT NULL);

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."IDEMPOTENCY_KEY"
    IS '멱등성키 | UNIQUE (권장 키 = {AUTO_TRANSFER_ID}+{SCHEDULED_DATE})';


-- =====================================================================
-- 4. TRANSFER 결제망 분기 컬럼 (개발_가이드라인 §2.2)
--    ※ IDEMPOTENCY_KEY 는 v52에 이미 존재 → 추가 안 함
-- =====================================================================

ALTER TABLE public."TRANSFER"
    ADD COLUMN "SETTLEMENT_TYPE"         character varying(20) DEFAULT 'INTRA_BANK',
    ADD COLUMN "SETTLEMENT_STATUS"       character varying(20) DEFAULT 'REQUESTED',
    ADD COLUMN "SETTLEMENT_REQUESTED_AT" timestamp without time zone,
    ADD COLUMN "SETTLEMENT_COMPLETED_AT" timestamp without time zone,
    ADD COLUMN "SETTLEMENT_REFERENCE_NO" character varying(50),
    ADD COLUMN "SETTLEMENT_ERROR_CODE"   character varying(30);

-- 결제망 정산 대기/처리중 폴링 가속 (부분 인덱스)
CREATE INDEX idx_transfer_settlement_pending
    ON public."TRANSFER" ("SETTLEMENT_STATUS", "SETTLEMENT_REQUESTED_AT")
    WHERE "SETTLEMENT_STATUS" IN ('REQUESTED', 'PENDING');

COMMENT ON COLUMN public."TRANSFER"."SETTLEMENT_TYPE"         IS '결제유형 | INTRA_BANK(당행)/KFTC_SMALL(소액)/BOK_LARGE(거액)';
COMMENT ON COLUMN public."TRANSFER"."SETTLEMENT_STATUS"       IS '정산상태 | REQUESTED/PENDING/SETTLED/FAILED/REVERSED';
COMMENT ON COLUMN public."TRANSFER"."SETTLEMENT_REQUESTED_AT" IS '정산요청시각';
COMMENT ON COLUMN public."TRANSFER"."SETTLEMENT_COMPLETED_AT" IS '정산완료시각';
COMMENT ON COLUMN public."TRANSFER"."SETTLEMENT_REFERENCE_NO" IS '외부결제망추적번호';
COMMENT ON COLUMN public."TRANSFER"."SETTLEMENT_ERROR_CODE"   IS '정산오류코드';


COMMIT;

-- =====================================================================
-- 적용 후 검증 권장
--   1) docker exec bank-portfolio-postgres psql -U bank -d bank -c "\dt"
--      → 신규 13개 (AI_*, NOTIFICATION, MY_DATA_*, FREQUENT_ACCOUNT) 확인
--   2) docker exec bank-portfolio-postgres psql -U bank -d bank \
--        -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
--      → 83 + 13 = 96
--   3) docker exec bank-portfolio-postgres \
--        pg_dump -U bank -d bank --schema-only --no-owner --no-privileges \
--        > db/01_schema.sql   (v52 → v53 갱신)
-- =====================================================================