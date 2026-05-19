--
-- PostgreSQL database dump
--

\restrict 7Cc60nAe4QdulauSdRIGPkdV6dktNpIDaPkCeXRCWJJNU13YMxt6mkf3UNanR10

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ACCOUNT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ACCOUNT" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "CUSTOMER_NO" bigint,
    "ACCOUNT_TYPE_CD" character varying(8),
    "OPEN_DATE" character varying(8),
    "CLOSE_DATE" character varying(8),
    "BALANCE" bigint,
    "PENDING_WITHDRAW" bigint,
    "ACCOUNT_STATUS_CD" character varying(8),
    "CUMULATIVE_INTEREST" bigint,
    "ACCOUNT_HOLDER_NAME" character varying(100),
    "WITHDRAW_PWD_HASH" character varying(64),
    "DAILY_WITHDRAW_LIMIT" bigint,
    "DAILY_TRANSFER_LIMIT" bigint,
    "LIFETIME_ACCOUNT_NO" character varying(20),
    "ACCOUNT_ALIAS" character varying(50),
    "LAST_TX_DATETIME" character varying(14),
    "PWD_ERROR_COUNT" smallint,
    "LIMITED_ACCOUNT_YN" character(1),
    "PASSBOOK_TYPE_CD" character varying(8),
    "DISPLAY_ORDER" smallint,
    "HIDDEN_YN" character(1),
    "PRIMARY_ACCOUNT_YN" character(1),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ACCOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ACCOUNT" IS '계좌 | 도메인:계좌';


--
-- Name: COLUMN "ACCOUNT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."ACCOUNT_NO" IS '계좌번호 | 110001XXXXXX';


--
-- Name: COLUMN "ACCOUNT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."CUSTOMER_NO" IS '고객번호 | 예금주';


--
-- Name: COLUMN "ACCOUNT"."ACCOUNT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."ACCOUNT_TYPE_CD" IS '계좌구분코드 | 760100=자유/760102=마통/760106=대출전용';


--
-- Name: COLUMN "ACCOUNT"."OPEN_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."OPEN_DATE" IS '개설일자 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT"."CLOSE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."CLOSE_DATE" IS '해지일자 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT"."BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."BALANCE" IS '잔액 | 원';


--
-- Name: COLUMN "ACCOUNT"."PENDING_WITHDRAW"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."PENDING_WITHDRAW" IS '출금예정금액 | 원 (예정 출금)';


--
-- Name: COLUMN "ACCOUNT"."ACCOUNT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."ACCOUNT_STATUS_CD" IS '계좌상태코드 | 300100=정상';


--
-- Name: COLUMN "ACCOUNT"."CUMULATIVE_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."CUMULATIVE_INTEREST" IS '누적이자 | 원';


--
-- Name: COLUMN "ACCOUNT"."ACCOUNT_HOLDER_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."ACCOUNT_HOLDER_NAME" IS '예금주명 | 개설 시점 이름';


--
-- Name: COLUMN "ACCOUNT"."WITHDRAW_PWD_HASH"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."WITHDRAW_PWD_HASH" IS '출금비밀번호해시 | bcrypt 해시';


--
-- Name: COLUMN "ACCOUNT"."DAILY_WITHDRAW_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."DAILY_WITHDRAW_LIMIT" IS '일일출금한도금액 | 원';


--
-- Name: COLUMN "ACCOUNT"."DAILY_TRANSFER_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."DAILY_TRANSFER_LIMIT" IS '일일이체한도금액 | 원';


--
-- Name: COLUMN "ACCOUNT"."LIFETIME_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."LIFETIME_ACCOUNT_NO" IS '평생계좌번호 | 평생계좌번호';


--
-- Name: COLUMN "ACCOUNT"."ACCOUNT_ALIAS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."ACCOUNT_ALIAS" IS '계좌별명 | 사용자 별명';


--
-- Name: COLUMN "ACCOUNT"."LAST_TX_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."LAST_TX_DATETIME" IS '마지막거래일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ACCOUNT"."PWD_ERROR_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."PWD_ERROR_COUNT" IS '비밀번호오류횟수 | 0~5';


--
-- Name: COLUMN "ACCOUNT"."LIMITED_ACCOUNT_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."LIMITED_ACCOUNT_YN" IS '한도제한계좌여부 | Y=신규 제한';


--
-- Name: COLUMN "ACCOUNT"."PASSBOOK_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."PASSBOOK_TYPE_CD" IS '통장발행방법코드 | 무통장/종이/모바일';


--
-- Name: COLUMN "ACCOUNT"."DISPLAY_ORDER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."DISPLAY_ORDER" IS '계좌표시순서 | 대시보드 순서';


--
-- Name: COLUMN "ACCOUNT"."HIDDEN_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."HIDDEN_YN" IS '계좌숨김여부 | Y=대시보드 숨김';


--
-- Name: COLUMN "ACCOUNT"."PRIMARY_ACCOUNT_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."PRIMARY_ACCOUNT_YN" IS '주거래계좌여부 | ⭐ v51 NEW: Y=주거래';


--
-- Name: COLUMN "ACCOUNT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ACCOUNT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ACCOUNT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ACCOUNT_BONUS_APPLIED; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ACCOUNT_BONUS_APPLIED" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "BONUS_CONDITION_ID" bigint NOT NULL,
    "EVAL_DATE" character varying(8) NOT NULL,
    "MET_YN" character(1),
    "APPLIED_RATE" numeric(5,3),
    "APPLY_START_DATE" character varying(8),
    "APPLY_END_DATE" character varying(8),
    "MET_VALUE" character varying(50),
    "EVAL_DETAIL" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ACCOUNT_BONUS_APPLIED"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ACCOUNT_BONUS_APPLIED" IS '계좌우대적용 | 도메인:계좌';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."ACCOUNT_NO" IS '계좌번호 | 계좌';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."BONUS_CONDITION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."BONUS_CONDITION_ID" IS '우대조건ID | 상품우대조건 매핑';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."EVAL_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."EVAL_DATE" IS '평가일자 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."MET_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."MET_YN" IS '충족여부 | Y=충족';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."APPLIED_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."APPLIED_RATE" IS '적용금리(%) | %';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."APPLY_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."APPLY_START_DATE" IS '적용시작일 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."APPLY_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."APPLY_END_DATE" IS '적용종료일 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."MET_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."MET_VALUE" IS '충족값 | 충족 실측값';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."EVAL_DETAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."EVAL_DETAIL" IS '평가내용 | 평가 내용';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_BONUS_APPLIED"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_BONUS_APPLIED"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ACCOUNT_CLOSURE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ACCOUNT_CLOSURE" (
    "CLOSE_ID" bigint NOT NULL,
    "ACCOUNT_NO" character varying(20),
    "CLOSE_TYPE_CD" character varying(8),
    "CLOSE_REQUEST_DT" character varying(14),
    "CLOSE_PROCESS_DT" character varying(14),
    "CLOSE_REASON_CD" character varying(8),
    "PRINCIPAL" bigint,
    "INTEREST_PERIOD_START" character varying(8),
    "INTEREST_PERIOD_END" character varying(8),
    "APPLIED_RATE" numeric(5,3),
    "INTEREST_TOTAL" bigint,
    "BONUS_INTEREST" bigint,
    "EARLY_CLOSE_FEE" bigint,
    "INCOME_TAX" bigint,
    "LOCAL_TAX" bigint,
    "AFTER_TAX_AMOUNT" bigint,
    "PAYOUT_ACCOUNT_NO" character varying(20),
    "PAYOUT_TX_ID" bigint,
    "CLOSE_STATUS_CD" character varying(8),
    "PROCESS_CHANNEL_CD" character varying(8),
    "ACCESS_SEQ" bigint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ACCOUNT_CLOSURE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ACCOUNT_CLOSURE" IS '해지이력 | 도메인:계좌';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CLOSE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CLOSE_ID" IS '해지ID | 해지 식별자';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."ACCOUNT_NO" IS '계좌번호 | 해지 계좌';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CLOSE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CLOSE_TYPE_CD" IS '해지구분코드 | 만기/중도/강제';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CLOSE_REQUEST_DT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CLOSE_REQUEST_DT" IS '해지신청일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CLOSE_PROCESS_DT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CLOSE_PROCESS_DT" IS '해지처리일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CLOSE_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CLOSE_REASON_CD" IS '해지사유코드 | 고객요청/만기/직권';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."PRINCIPAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."PRINCIPAL" IS '원금 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."INTEREST_PERIOD_START"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."INTEREST_PERIOD_START" IS '이자기간시작일 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."INTEREST_PERIOD_END"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."INTEREST_PERIOD_END" IS '이자기간종료일 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."APPLIED_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."APPLIED_RATE" IS '적용금리(%) | %';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."INTEREST_TOTAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."INTEREST_TOTAL" IS '이자합계 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."BONUS_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."BONUS_INTEREST" IS '우대이자 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."EARLY_CLOSE_FEE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."EARLY_CLOSE_FEE" IS '중도해지수수료 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."INCOME_TAX"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."INCOME_TAX" IS '이자소득세 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."LOCAL_TAX"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."LOCAL_TAX" IS '지방소득세 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."AFTER_TAX_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."AFTER_TAX_AMOUNT" IS '세후지급금액 | 원';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."PAYOUT_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."PAYOUT_ACCOUNT_NO" IS '지급계좌번호 | 잔액 지급 계좌';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."PAYOUT_TX_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."PAYOUT_TX_ID" IS '지급거래ID | 거래 매핑';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CLOSE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CLOSE_STATUS_CD" IS '해지처리상태코드 | 대기/완료';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."PROCESS_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."PROCESS_CHANNEL_CD" IS '처리채널코드 | 앱/창구';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."ACCESS_SEQ" IS '접속일련번호 | 접속 기록';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."REMARK" IS '해지비고';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_CLOSURE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_CLOSURE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ACCOUNT_RESTRICTION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ACCOUNT_RESTRICTION" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "RESTRICTION_SEQ" smallint NOT NULL,
    "CUSTOMER_NO" bigint,
    "RESTRICTION_REASON_CD" character varying(8),
    "START_DATETIME" character varying(14),
    "END_DATETIME" character varying(14),
    "RESTRICTION_STATUS_CD" character varying(8),
    "DAILY_WITHDRAW_LIMIT" bigint,
    "PER_WITHDRAW_LIMIT" bigint,
    "MONTHLY_LIMIT" bigint,
    "APPLICANT" character varying(50),
    "REQUEST_BASIS" character varying(200),
    "PROCESS_EMP_NO" character varying(20),
    "PROCESS_CONTENT" character varying(1000),
    "PROCESS_STATUS_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ACCOUNT_RESTRICTION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ACCOUNT_RESTRICTION" IS '계좌제한 | 도메인:계좌';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."ACCOUNT_NO" IS '계좌번호 | 계좌';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."RESTRICTION_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."RESTRICTION_SEQ" IS '제한일련번호 | 계좌 내 순번';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."CUSTOMER_NO" IS '고객번호 | 계좌 주인';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."RESTRICTION_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."RESTRICTION_REASON_CD" IS '제한사유코드 | 분실/FDS/압류';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."START_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."START_DATETIME" IS '제한시작일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."END_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."END_DATETIME" IS '제한종료일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."RESTRICTION_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."RESTRICTION_STATUS_CD" IS '제한상태코드 | 활성/해제';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."DAILY_WITHDRAW_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."DAILY_WITHDRAW_LIMIT" IS '일일출금한도 | 원';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."PER_WITHDRAW_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."PER_WITHDRAW_LIMIT" IS '1회출금한도 | 원';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."MONTHLY_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."MONTHLY_LIMIT" IS '월누적한도 | 원';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."APPLICANT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."APPLICANT" IS '신청자 | 신청자';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."REQUEST_BASIS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."REQUEST_BASIS" IS '요청근거 | 근거 텍스트';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."PROCESS_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."PROCESS_EMP_NO" IS '처리직원사번 | 처리 직원';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."PROCESS_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."PROCESS_CONTENT" IS '처리내용 | 처리 상세';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."PROCESS_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."PROCESS_STATUS_CD" IS '계좌제한처리상태코드 | 대기/완료';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_RESTRICTION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_RESTRICTION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ACCOUNT_SEIZURE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ACCOUNT_SEIZURE" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "SEIZURE_SEQ" smallint NOT NULL,
    "AGENCY_CD" character varying(8),
    "AGENCY_NAME" character varying(50),
    "EXEC_NO" character varying(50),
    "SEIZURE_AMOUNT" bigint,
    "SEIZURE_DATE" character varying(8),
    "RELEASE_DATE" character varying(8),
    "SEIZURE_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ACCOUNT_SEIZURE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ACCOUNT_SEIZURE" IS '계좌압류이력 | 도메인:대출';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."ACCOUNT_NO" IS '계좌번호 | 계좌';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."SEIZURE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."SEIZURE_SEQ" IS '압류일련번호 | 계좌 내 순번';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."AGENCY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."AGENCY_CD" IS '압류기관코드 | 국세청/법원/지자체';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."AGENCY_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."AGENCY_NAME" IS '압류기관명 | 기관 표시명';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."EXEC_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."EXEC_NO" IS '집행번호 | 집행 번호';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."SEIZURE_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."SEIZURE_AMOUNT" IS '압류금액 | 원';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."SEIZURE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."SEIZURE_DATE" IS '압류일자 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."RELEASE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."RELEASE_DATE" IS '해제일자 | yyyymmdd';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."SEIZURE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."SEIZURE_STATUS_CD" IS '압류상태코드 | 집행/해제';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."REMARK" IS '계좌압류비고';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ACCOUNT_SEIZURE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ACCOUNT_SEIZURE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ADMIN_SESSION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ADMIN_SESSION" (
    "SESSION_ID" bigint NOT NULL,
    "EMPLOYEE_NO" character varying(20),
    "LOGIN_DATETIME" character varying(14),
    "LAST_ACTIVITY_DT" character varying(14),
    "LOGOUT_DATETIME" character varying(14),
    "ACCESS_IP" character varying(45),
    "OTP_SUCCESS_CD" character varying(8),
    "ACCESS_PATH" character varying(200),
    "INQUIRY_COUNT" smallint,
    "SESSION_STATUS_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ADMIN_SESSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ADMIN_SESSION" IS '관리자세션 | 도메인:신용보안';


--
-- Name: COLUMN "ADMIN_SESSION"."SESSION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."SESSION_ID" IS '세션ID | 관리자 세션 식별자';


--
-- Name: COLUMN "ADMIN_SESSION"."EMPLOYEE_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."EMPLOYEE_NO" IS '사번 | 관리자 사번';


--
-- Name: COLUMN "ADMIN_SESSION"."LOGIN_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."LOGIN_DATETIME" IS '로그인일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ADMIN_SESSION"."LAST_ACTIVITY_DT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."LAST_ACTIVITY_DT" IS '마지막활동일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ADMIN_SESSION"."LOGOUT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."LOGOUT_DATETIME" IS '로그아웃일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ADMIN_SESSION"."ACCESS_IP"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."ACCESS_IP" IS '접속IP | IPv4/IPv6';


--
-- Name: COLUMN "ADMIN_SESSION"."OTP_SUCCESS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."OTP_SUCCESS_CD" IS 'OTP인증성공 | 성공/실패/미요구';


--
-- Name: COLUMN "ADMIN_SESSION"."ACCESS_PATH"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."ACCESS_PATH" IS '접속경로 | 관리 메뉴 경로';


--
-- Name: COLUMN "ADMIN_SESSION"."INQUIRY_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."INQUIRY_COUNT" IS '조회건수 | 세션 내 조회 수';


--
-- Name: COLUMN "ADMIN_SESSION"."SESSION_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."SESSION_STATUS_CD" IS '세션상태코드 | 활성/종료/만료';


--
-- Name: COLUMN "ADMIN_SESSION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ADMIN_SESSION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ADMIN_SESSION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ADMIN_SESSION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ADMIN_SESSION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ADMIN_SESSION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: AML_HIGH_RISK; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AML_HIGH_RISK" (
    "HIGH_RISK_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "RISK_TYPE_CD" character varying(8),
    "DESIGNATE_DATE" character varying(8),
    "RELEASE_DATE" character varying(8),
    "DESIGNATE_REASON" character varying(1000),
    "EDD_COMPLETED_YN" character(1),
    "OWNER_EMP_NO" character varying(20),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "AML_HIGH_RISK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."AML_HIGH_RISK" IS 'AML고위험고객 | 도메인:신용보안';


--
-- Name: COLUMN "AML_HIGH_RISK"."HIGH_RISK_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."HIGH_RISK_ID" IS '고위험ID | 고위험 식별자';


--
-- Name: COLUMN "AML_HIGH_RISK"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."CUSTOMER_NO" IS '고객번호 | 대상 고객';


--
-- Name: COLUMN "AML_HIGH_RISK"."RISK_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."RISK_TYPE_CD" IS '고위험구분코드 | PEP/제재/조세';


--
-- Name: COLUMN "AML_HIGH_RISK"."DESIGNATE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."DESIGNATE_DATE" IS '지정일자 | yyyymmdd';


--
-- Name: COLUMN "AML_HIGH_RISK"."RELEASE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."RELEASE_DATE" IS '해제일자 | yyyymmdd';


--
-- Name: COLUMN "AML_HIGH_RISK"."DESIGNATE_REASON"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."DESIGNATE_REASON" IS '지정사유 | 지정 사유';


--
-- Name: COLUMN "AML_HIGH_RISK"."EDD_COMPLETED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."EDD_COMPLETED_YN" IS 'EDD이행여부 | Y=강화실사 완료';


--
-- Name: COLUMN "AML_HIGH_RISK"."OWNER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."OWNER_EMP_NO" IS '담당자사번 | 담당 직원';


--
-- Name: COLUMN "AML_HIGH_RISK"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "AML_HIGH_RISK"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AML_HIGH_RISK"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "AML_HIGH_RISK"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AML_HIGH_RISK"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_HIGH_RISK"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: AML_REPORT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AML_REPORT" (
    "AML_REPORT_ID" bigint NOT NULL,
    "REPORT_TYPE_CD" character varying(8),
    "CUSTOMER_NO" bigint,
    "TRANSACTION_ID" bigint,
    "ACCOUNT_NO" character varying(20),
    "SUSPICION_TYPE_CD" character varying(8),
    "TX_AMOUNT" bigint,
    "TX_DATETIME" character varying(14),
    "REPORT_DATE" character varying(8),
    "KOFIU_SUBMIT_DATE" character varying(8),
    "KOFIU_RECEIPT_NO" character varying(50),
    "LINKED_FDS_ID" bigint,
    "REPORT_STATUS_CD" character varying(8),
    "SUSPICION_DETAIL" character varying(1000),
    "ACTION_CONTENT" character varying(1000),
    "WRITER_EMP_NO" character varying(20),
    "APPROVER_EMP_NO" character varying(20),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "AML_REPORT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."AML_REPORT" IS '자금세탁의심거래보고 | 도메인:신용보안';


--
-- Name: COLUMN "AML_REPORT"."AML_REPORT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."AML_REPORT_ID" IS '보고ID | 보고 식별자';


--
-- Name: COLUMN "AML_REPORT"."REPORT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."REPORT_TYPE_CD" IS '보고유형코드 | STR/CTR';


--
-- Name: COLUMN "AML_REPORT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."CUSTOMER_NO" IS '고객번호 | 대상 고객';


--
-- Name: COLUMN "AML_REPORT"."TRANSACTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."TRANSACTION_ID" IS '거래ID | 관련 거래';


--
-- Name: COLUMN "AML_REPORT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."ACCOUNT_NO" IS '계좌번호 | 관련 계좌';


--
-- Name: COLUMN "AML_REPORT"."SUSPICION_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."SUSPICION_TYPE_CD" IS '거래또는의심유형코드 | 구조화/현금/외환';


--
-- Name: COLUMN "AML_REPORT"."TX_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."TX_AMOUNT" IS '거래금액 | 원';


--
-- Name: COLUMN "AML_REPORT"."TX_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."TX_DATETIME" IS '거래일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "AML_REPORT"."REPORT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."REPORT_DATE" IS '보고생성일자 | yyyymmdd';


--
-- Name: COLUMN "AML_REPORT"."KOFIU_SUBMIT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."KOFIU_SUBMIT_DATE" IS 'KoFIU제출일자 | yyyymmdd';


--
-- Name: COLUMN "AML_REPORT"."KOFIU_RECEIPT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."KOFIU_RECEIPT_NO" IS 'KoFIU접수번호 | 금융정보분석원 접수번호';


--
-- Name: COLUMN "AML_REPORT"."LINKED_FDS_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."LINKED_FDS_ID" IS '연결FDS탐지ID | FDS탐지 매핑';


--
-- Name: COLUMN "AML_REPORT"."REPORT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."REPORT_STATUS_CD" IS '보고상태코드 | 작성/승인/제출';


--
-- Name: COLUMN "AML_REPORT"."SUSPICION_DETAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."SUSPICION_DETAIL" IS '의심사유상세 | 의심 사유 텍스트';


--
-- Name: COLUMN "AML_REPORT"."ACTION_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."ACTION_CONTENT" IS '조치내용 | 조치 내용';


--
-- Name: COLUMN "AML_REPORT"."WRITER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."WRITER_EMP_NO" IS '작성자사번 | 작성 직원';


--
-- Name: COLUMN "AML_REPORT"."APPROVER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."APPROVER_EMP_NO" IS '승인자사번 | 승인 직원';


--
-- Name: COLUMN "AML_REPORT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."REMARK" IS '의심거래보고비고';


--
-- Name: COLUMN "AML_REPORT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "AML_REPORT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AML_REPORT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "AML_REPORT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AML_REPORT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AML_REPORT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ATTACHED_DOC; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ATTACHED_DOC" (
    "ATTACH_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "CONTRACT_NO" character varying(20),
    "CLOSE_ID" bigint,
    "DELEGATION_ID" bigint,
    "DOC_TYPE_ID" bigint,
    "DOC_ISSUE_DATE" character varying(8),
    "DOC_EXPIRE_DATE" character varying(8),
    "SUBMIT_DATETIME" character varying(14),
    "FILE_PATH" character varying(200),
    "VERIFIER_EMP_NO" character varying(20),
    "VERIFY_STATUS_CD" character varying(8),
    "REJECT_REASON" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ATTACHED_DOC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ATTACHED_DOC" IS '첨부서류 | 도메인:상품';


--
-- Name: COLUMN "ATTACHED_DOC"."ATTACH_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."ATTACH_ID" IS '첨부ID | 첨부 식별자';


--
-- Name: COLUMN "ATTACHED_DOC"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "ATTACHED_DOC"."CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."CONTRACT_NO" IS '계약번호 | 관련 계약';


--
-- Name: COLUMN "ATTACHED_DOC"."CLOSE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."CLOSE_ID" IS '해지ID | 관련 해지';


--
-- Name: COLUMN "ATTACHED_DOC"."DELEGATION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."DELEGATION_ID" IS '역할일련번호 | 위임관계 매핑';


--
-- Name: COLUMN "ATTACHED_DOC"."DOC_TYPE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."DOC_TYPE_ID" IS '서류유형ID | 서류 유형';


--
-- Name: COLUMN "ATTACHED_DOC"."DOC_ISSUE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."DOC_ISSUE_DATE" IS '서류발급일자 | yyyymmdd';


--
-- Name: COLUMN "ATTACHED_DOC"."DOC_EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."DOC_EXPIRE_DATE" IS '서류만료일자 | yyyymmdd';


--
-- Name: COLUMN "ATTACHED_DOC"."SUBMIT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."SUBMIT_DATETIME" IS '제출일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "ATTACHED_DOC"."FILE_PATH"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."FILE_PATH" IS '파일경로 | 서버 저장 경로';


--
-- Name: COLUMN "ATTACHED_DOC"."VERIFIER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."VERIFIER_EMP_NO" IS '확인자직원사번 | 확인 직원';


--
-- Name: COLUMN "ATTACHED_DOC"."VERIFY_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."VERIFY_STATUS_CD" IS '확인상태코드 | 대기/승인/반려';


--
-- Name: COLUMN "ATTACHED_DOC"."REJECT_REASON"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."REJECT_REASON" IS '반려사유 | 반려 시 사유';


--
-- Name: COLUMN "ATTACHED_DOC"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ATTACHED_DOC"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ATTACHED_DOC"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ATTACHED_DOC"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ATTACHED_DOC"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ATTACHED_DOC"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: AUTH_METHOD_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AUTH_METHOD_MASTER" (
    "AUTH_METHOD_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "AUTH_TYPE_CD" character varying(8),
    "SERIAL_OR_CARD_NO" character varying(50),
    "ISSUER" character varying(50),
    "ISSUE_DATE" character varying(8),
    "VALID_START_DATE" character varying(8),
    "VALID_END_DATE" character varying(8),
    "ACTIVE_YN" character(1),
    "AUTH_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "AUTH_METHOD_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."AUTH_METHOD_MASTER" IS '인증수단마스터 | 도메인:신용보안';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."AUTH_METHOD_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."AUTH_METHOD_ID" IS '인증수단ID | 인증수단 식별자';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."AUTH_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."AUTH_TYPE_CD" IS '인증수단유형코드 | OTP/생체/공동인증서';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."SERIAL_OR_CARD_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."SERIAL_OR_CARD_NO" IS '시리얼또는카드번호 | 하드웨어 OTP 시리얼';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."ISSUER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."ISSUER" IS '발급기관 | 발급기관';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."ISSUE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."ISSUE_DATE" IS '인증수단발급일자 | yyyymmdd';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."VALID_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."VALID_START_DATE" IS '인증유효시작일 | yyyymmdd';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."VALID_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."VALID_END_DATE" IS '인증유효종료일 | yyyymmdd';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."ACTIVE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."ACTIVE_YN" IS '활성여부 | Y=활성';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."AUTH_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."AUTH_STATUS_CD" IS '인증수단상태코드 | 정상/만료/분실';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."REMARK" IS '인증수단비고';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AUTH_METHOD_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTH_METHOD_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: AUTO_TRANSFER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AUTO_TRANSFER" (
    "AUTO_TRANSFER_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "WITHDRAW_ACCOUNT_NO" character varying(20),
    "DEPOSIT_ACCOUNT_NO" character varying(20),
    "DEPOSIT_BANK_CD" character(3),
    "DEPOSIT_BANK_NAME" character varying(40),
    "DEPOSIT_HOLDER_NAME" character varying(20),
    "TRANSFER_AMOUNT" bigint,
    "CYCLE_TYPE_CD" character varying(8),
    "MONTHLY_EXEC_DAY" smallint,
    "VALID_START_DATE" character varying(8),
    "VALID_END_DATE" character varying(8),
    "AUTO_STATUS_CD" character varying(8),
    "REG_CHANNEL_CD" character varying(8),
    "REG_ACCESS_SEQ" bigint,
    "MAX_RETRY_COUNT" smallint,
    "RETRY_INTERVAL_HOURS" smallint,
    "FAILURE_ACTION_CD" character varying(8),
    "CARRY_NEXT_MONTH_YN" character(1),
    "WITHDRAW_MEMO" character varying(30),
    "DEPOSIT_MEMO" character varying(30),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "AUTO_TRANSFER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."AUTO_TRANSFER" IS '자동이체등록 | 도메인:거래';


--
-- Name: COLUMN "AUTO_TRANSFER"."AUTO_TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."AUTO_TRANSFER_ID" IS '자동이체ID | 자동이체 식별자';


--
-- Name: COLUMN "AUTO_TRANSFER"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."CUSTOMER_NO" IS '고객번호 | 등록 고객';


--
-- Name: COLUMN "AUTO_TRANSFER"."WITHDRAW_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."WITHDRAW_ACCOUNT_NO" IS '출금계좌 | 출금 계좌';


--
-- Name: COLUMN "AUTO_TRANSFER"."DEPOSIT_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."DEPOSIT_ACCOUNT_NO" IS '입금계좌 | 입금 계좌 (타행 가능)';


--
-- Name: COLUMN "AUTO_TRANSFER"."DEPOSIT_BANK_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."DEPOSIT_BANK_CD" IS '입금은행코드 | 입금 은행 코드';


--
-- Name: COLUMN "AUTO_TRANSFER"."DEPOSIT_BANK_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."DEPOSIT_BANK_NAME" IS '입금은행명 | 입금 은행명';


--
-- Name: COLUMN "AUTO_TRANSFER"."DEPOSIT_HOLDER_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."DEPOSIT_HOLDER_NAME" IS '입금예금주명 | 입금 예금주';


--
-- Name: COLUMN "AUTO_TRANSFER"."TRANSFER_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."TRANSFER_AMOUNT" IS '이체금액 | 원';


--
-- Name: COLUMN "AUTO_TRANSFER"."CYCLE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."CYCLE_TYPE_CD" IS '주기구분코드 | 월/주/일';


--
-- Name: COLUMN "AUTO_TRANSFER"."MONTHLY_EXEC_DAY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."MONTHLY_EXEC_DAY" IS '월별실행일 | 매월 며칠 (1~31)';


--
-- Name: COLUMN "AUTO_TRANSFER"."VALID_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."VALID_START_DATE" IS '자동이체유효시작일 | yyyymmdd';


--
-- Name: COLUMN "AUTO_TRANSFER"."VALID_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."VALID_END_DATE" IS '자동이체유효종료일 | yyyymmdd';


--
-- Name: COLUMN "AUTO_TRANSFER"."AUTO_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."AUTO_STATUS_CD" IS '자동이체상태코드 | 활성/일시정지/해지';


--
-- Name: COLUMN "AUTO_TRANSFER"."REG_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."REG_CHANNEL_CD" IS '등록채널코드 | 앱/웹/창구';


--
-- Name: COLUMN "AUTO_TRANSFER"."REG_ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."REG_ACCESS_SEQ" IS '등록시접속일련번호 | 등록 시 접속 기록';


--
-- Name: COLUMN "AUTO_TRANSFER"."MAX_RETRY_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."MAX_RETRY_COUNT" IS '재시도최대횟수 | 실패 시 재시도';


--
-- Name: COLUMN "AUTO_TRANSFER"."RETRY_INTERVAL_HOURS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."RETRY_INTERVAL_HOURS" IS '재시도간격시간 | 시간';


--
-- Name: COLUMN "AUTO_TRANSFER"."FAILURE_ACTION_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."FAILURE_ACTION_CD" IS '실패조치코드 | 재시도/스킵/알림';


--
-- Name: COLUMN "AUTO_TRANSFER"."CARRY_NEXT_MONTH_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."CARRY_NEXT_MONTH_YN" IS '잔액부족시익월합산여부 | Y=익월 합산';


--
-- Name: COLUMN "AUTO_TRANSFER"."WITHDRAW_MEMO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."WITHDRAW_MEMO" IS '출금계좌적요 | 출금 통장 표기';


--
-- Name: COLUMN "AUTO_TRANSFER"."DEPOSIT_MEMO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."DEPOSIT_MEMO" IS '입금계좌적요 | 입금 통장 표기';


--
-- Name: COLUMN "AUTO_TRANSFER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "AUTO_TRANSFER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AUTO_TRANSFER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "AUTO_TRANSFER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AUTO_TRANSFER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: AUTO_TRANSFER_EXEC; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AUTO_TRANSFER_EXEC" (
    "AUTO_TRANSFER_ID" bigint NOT NULL,
    "SCHEDULED_DATE" character varying(8) NOT NULL,
    "BIZ_DAY_ADJUSTED" character varying(8),
    "EXEC_DATETIME" character varying(14),
    "EXEC_STATUS_CD" character varying(8),
    "DELAY_REASON_CD" character varying(8),
    "TRANSFER_ID" bigint,
    "TRANSACTION_ID" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "AUTO_TRANSFER_EXEC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."AUTO_TRANSFER_EXEC" IS '자동이체실행이력 | 도메인:거래';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."AUTO_TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."AUTO_TRANSFER_ID" IS '자동이체ID | 자동이체';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."SCHEDULED_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."SCHEDULED_DATE" IS '예정일자 | yyyymmdd';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."BIZ_DAY_ADJUSTED"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."BIZ_DAY_ADJUSTED" IS '영업일조정일자 | yyyymmdd 형식 | 휴일 조정';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."EXEC_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."EXEC_DATETIME" IS '실행일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."EXEC_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."EXEC_STATUS_CD" IS '실행상태코드 | 성공/실패/지연';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."DELAY_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."DELAY_REASON_CD" IS '지연사유코드 | 잔액부족 등';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."TRANSFER_ID" IS '이체ID | 이체 매핑';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."TRANSACTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."TRANSACTION_ID" IS '거래ID | 거래 매핑';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "AUTO_TRANSFER_EXEC"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AUTO_TRANSFER_EXEC"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: BANK_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BANK_MASTER" (
    "BANK_CD" character(3) NOT NULL,
    "BANK_NAME" character varying(40),
    "BANK_NAME_EN" character varying(60),
    "BANK_TYPE_CD" character varying(8),
    "SWIFT_CODE" character varying(11),
    "OWN_BANK_YN" character(1),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "BANK_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BANK_MASTER" IS '은행마스터 | 도메인:조직';


--
-- Name: COLUMN "BANK_MASTER"."BANK_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."BANK_CD" IS '은행코드 | 은행 코드 (예: 020=우리)';


--
-- Name: COLUMN "BANK_MASTER"."BANK_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."BANK_NAME" IS '은행명 | 은행 표시명';


--
-- Name: COLUMN "BANK_MASTER"."BANK_NAME_EN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."BANK_NAME_EN" IS '영문은행명 | 영문명';


--
-- Name: COLUMN "BANK_MASTER"."BANK_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."BANK_TYPE_CD" IS '은행구분코드 | 시중/지방/특수';


--
-- Name: COLUMN "BANK_MASTER"."SWIFT_CODE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."SWIFT_CODE" IS 'SWIFT코드 | SWIFT/BIC 코드';


--
-- Name: COLUMN "BANK_MASTER"."OWN_BANK_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."OWN_BANK_YN" IS '당행여부 | Y=당행';


--
-- Name: COLUMN "BANK_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "BANK_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BANK_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "BANK_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BANK_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BANK_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: BASE_RATE_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BASE_RATE_MASTER" (
    "BASE_RATE_TYPE_CD" character varying(8) NOT NULL,
    "NOTICE_DATE" character varying(8) NOT NULL,
    "BASE_RATE" numeric(5,3),
    "APPLY_START_DATE" character varying(8),
    "SOURCE_INSTITUTION" character varying(100),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "BASE_RATE_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BASE_RATE_MASTER" IS '기준금리마스터 | 도메인:조직';


--
-- Name: COLUMN "BASE_RATE_MASTER"."BASE_RATE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."BASE_RATE_TYPE_CD" IS '기준금리종류코드 | COFIX신규/COFIX잔액/CD91';


--
-- Name: COLUMN "BASE_RATE_MASTER"."NOTICE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."NOTICE_DATE" IS '고시일자 | yyyymmdd';


--
-- Name: COLUMN "BASE_RATE_MASTER"."BASE_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."BASE_RATE" IS '기준금리 | % (예 3.500)';


--
-- Name: COLUMN "BASE_RATE_MASTER"."APPLY_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."APPLY_START_DATE" IS '적용시작일자 | yyyymmdd';


--
-- Name: COLUMN "BASE_RATE_MASTER"."SOURCE_INSTITUTION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."SOURCE_INSTITUTION" IS '출처기관 | 한국은행/은행연합회';


--
-- Name: COLUMN "BASE_RATE_MASTER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."REMARK" IS '기준금리비고';


--
-- Name: COLUMN "BASE_RATE_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "BASE_RATE_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BASE_RATE_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "BASE_RATE_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BASE_RATE_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BASE_RATE_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: BIZ_CALENDAR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BIZ_CALENDAR" (
    "BIZ_DATE" character varying(8) NOT NULL,
    "BIZ_DAY_YN" character(1),
    "DAY_OF_WEEK" character(1),
    "HOLIDAY_NAME" character varying(50),
    "HOLIDAY_TYPE_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "BIZ_CALENDAR"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BIZ_CALENDAR" IS '영업일캘린더 | 도메인:조직';


--
-- Name: COLUMN "BIZ_CALENDAR"."BIZ_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."BIZ_DATE" IS '일자 | yyyymmdd';


--
-- Name: COLUMN "BIZ_CALENDAR"."BIZ_DAY_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."BIZ_DAY_YN" IS '영업일여부 | Y=영업일';


--
-- Name: COLUMN "BIZ_CALENDAR"."DAY_OF_WEEK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."DAY_OF_WEEK" IS '요일 | 1=월~7=일';


--
-- Name: COLUMN "BIZ_CALENDAR"."HOLIDAY_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."HOLIDAY_NAME" IS '휴일명 | 설/추석 등';


--
-- Name: COLUMN "BIZ_CALENDAR"."HOLIDAY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."HOLIDAY_TYPE_CD" IS '휴일유형코드 | 공휴/대체/임시';


--
-- Name: COLUMN "BIZ_CALENDAR"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "BIZ_CALENDAR"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BIZ_CALENDAR"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "BIZ_CALENDAR"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BIZ_CALENDAR"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BIZ_CALENDAR"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: BRANCH_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BRANCH_MASTER" (
    "BRANCH_CD" character varying(10) NOT NULL,
    "BRANCH_NAME" character varying(80),
    "BRANCH_TYPE_CD" character varying(8),
    "ADDRESS" character varying(200),
    "PHONE" character varying(20),
    "OPEN_DATE" character varying(8),
    "CLOSE_DATE" character varying(8),
    "BRANCH_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "BRANCH_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BRANCH_MASTER" IS '영업점마스터 | 도메인:조직';


--
-- Name: COLUMN "BRANCH_MASTER"."BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."BRANCH_CD" IS '지점코드 | 지점 코드';


--
-- Name: COLUMN "BRANCH_MASTER"."BRANCH_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."BRANCH_NAME" IS '지점명 | 지점 표시명';


--
-- Name: COLUMN "BRANCH_MASTER"."BRANCH_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."BRANCH_TYPE_CD" IS '지점유형코드 | 본점/지점/출장소';


--
-- Name: COLUMN "BRANCH_MASTER"."ADDRESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."ADDRESS" IS '주소 | 지점 주소';


--
-- Name: COLUMN "BRANCH_MASTER"."PHONE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."PHONE" IS '전화번호 | 대표 전화';


--
-- Name: COLUMN "BRANCH_MASTER"."OPEN_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."OPEN_DATE" IS '개점일자 | yyyymmdd';


--
-- Name: COLUMN "BRANCH_MASTER"."CLOSE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."CLOSE_DATE" IS '폐점일자 | yyyymmdd';


--
-- Name: COLUMN "BRANCH_MASTER"."BRANCH_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."BRANCH_STATUS_CD" IS '영업점상태코드 | 운영/폐점';


--
-- Name: COLUMN "BRANCH_MASTER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."REMARK" IS '영업점비고';


--
-- Name: COLUMN "BRANCH_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "BRANCH_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BRANCH_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "BRANCH_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BRANCH_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BRANCH_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: BUSINESS_CATEGORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BUSINESS_CATEGORY" (
    "PARTY_ID" bigint NOT NULL,
    "BIZ_TYPE_SEQ" smallint NOT NULL,
    "BIZ_CATEGORY" character varying(50),
    "BIZ_CATEGORY_CD" character varying(20),
    "BIZ_ITEM" character varying(80),
    "BIZ_ITEM_CD" character varying(20),
    "MAIN_BIZ_YN" character(1),
    "REG_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "BUSINESS_CATEGORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BUSINESS_CATEGORY" IS '사업업태종목 | 도메인:관계자';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."PARTY_ID" IS '관계자ID | 관계자';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."BIZ_TYPE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."BIZ_TYPE_SEQ" IS '업태일련번호 | 관계자 내 일련번호';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."BIZ_CATEGORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."BIZ_CATEGORY" IS '업태 | 대분류 (도소매/제조)';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."BIZ_CATEGORY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."BIZ_CATEGORY_CD" IS '업태코드 | 국세청 업태코드';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."BIZ_ITEM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."BIZ_ITEM" IS '종목 | 세부 종목';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."BIZ_ITEM_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."BIZ_ITEM_CD" IS '종목코드 | 국세청 종목코드';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."MAIN_BIZ_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."MAIN_BIZ_YN" IS '주업종여부 | Y=대표 업종';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."REG_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."REG_DATE" IS '등록일자 | yyyymmdd';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."REMARK" IS '업태종목비고';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BUSINESS_CATEGORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_CATEGORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: BUSINESS_REPRESENTATIVE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BUSINESS_REPRESENTATIVE" (
    "BIZ_PARTY_ID" bigint NOT NULL,
    "REP_PARTY_ID" bigint NOT NULL,
    "REP_SEQ" smallint,
    "REP_TYPE_CD" character varying(8),
    "REP_START_DATE" character varying(8),
    "REP_END_DATE" character varying(8),
    "REP_STATUS_CD" character varying(8),
    "SHARE_RATIO" numeric(5,2),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "BUSINESS_REPRESENTATIVE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BUSINESS_REPRESENTATIVE" IS '사업체대표자 | 도메인:관계자';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."BIZ_PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."BIZ_PARTY_ID" IS '사업체관계자ID | 법인 관계자ID';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REP_PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REP_PARTY_ID" IS '대표자관계자ID | 대표 개인 관계자ID';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REP_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REP_SEQ" IS '대표순번 | 1=주대표, 2~=공동대표';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REP_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REP_TYPE_CD" IS '대표유형코드 | B10300=단독 / B10301=공동 / B10302=각자';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REP_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REP_START_DATE" IS '대표직책시작일자 | yyyymmdd. 등기 시작일';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REP_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REP_END_DATE" IS '대표직책종료일자 | yyyymmdd. 임기 종료/사임';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REP_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REP_STATUS_CD" IS '대표직책상태코드 | 재직/사임/해임';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."SHARE_RATIO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."SHARE_RATIO" IS '지분율 | 대표자 지분율 %';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."REMARK" IS '대표자비고';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "BUSINESS_REPRESENTATIVE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BUSINESS_REPRESENTATIVE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COLLATERAL_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COLLATERAL_MASTER" (
    "COLLATERAL_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "COLLATERAL_TYPE_CD" character varying(8),
    "COLLATERAL_DESC" character varying(200),
    "MARKET_VALUE" bigint,
    "BANK_VALUE" bigint,
    "COLLATERAL_RATIO" numeric(5,2),
    "RECOGNIZED_VALUE" bigint,
    "AVAILABLE_VALUE" bigint,
    "LTV_RATIO" numeric(5,2),
    "EVAL_DATE" character varying(8),
    "COLLATERAL_EXPIRE_DATE" character varying(8),
    "COLLATERAL_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COLLATERAL_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COLLATERAL_MASTER" IS '담보마스터 | 도메인:담보';


--
-- Name: COLUMN "COLLATERAL_MASTER"."COLLATERAL_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."COLLATERAL_ID" IS '담보ID | 담보 식별자';


--
-- Name: COLUMN "COLLATERAL_MASTER"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."CUSTOMER_NO" IS '고객번호 | 담보 제공 고객';


--
-- Name: COLUMN "COLLATERAL_MASTER"."COLLATERAL_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."COLLATERAL_TYPE_CD" IS '담보유형코드 | 부동산/예금/유가증권';


--
-- Name: COLUMN "COLLATERAL_MASTER"."COLLATERAL_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."COLLATERAL_DESC" IS '담보표시 | 주소/예금계좌 등';


--
-- Name: COLUMN "COLLATERAL_MASTER"."MARKET_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."MARKET_VALUE" IS '시장시세평가액 | 원';


--
-- Name: COLUMN "COLLATERAL_MASTER"."BANK_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."BANK_VALUE" IS '은행평가액 | 원';


--
-- Name: COLUMN "COLLATERAL_MASTER"."COLLATERAL_RATIO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."COLLATERAL_RATIO" IS '인정담보비율 | % (예 70.00)';


--
-- Name: COLUMN "COLLATERAL_MASTER"."RECOGNIZED_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."RECOGNIZED_VALUE" IS '인정담보가액 | 원';


--
-- Name: COLUMN "COLLATERAL_MASTER"."AVAILABLE_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."AVAILABLE_VALUE" IS '가용담보가액 | 원';


--
-- Name: COLUMN "COLLATERAL_MASTER"."LTV_RATIO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."LTV_RATIO" IS 'LTV비율 | % (예 75.00)';


--
-- Name: COLUMN "COLLATERAL_MASTER"."EVAL_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."EVAL_DATE" IS '평가일자 | yyyymmdd';


--
-- Name: COLUMN "COLLATERAL_MASTER"."COLLATERAL_EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."COLLATERAL_EXPIRE_DATE" IS '담보유효종료일자 | yyyymmdd';


--
-- Name: COLUMN "COLLATERAL_MASTER"."COLLATERAL_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."COLLATERAL_STATUS_CD" IS '담보상태코드 | 활성/해제/실행';


--
-- Name: COLUMN "COLLATERAL_MASTER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."REMARK" IS '담보비고';


--
-- Name: COLUMN "COLLATERAL_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COLLATERAL_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COLLATERAL_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COLLATERAL_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COLLATERAL_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COLLATERAL_MORTGAGE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COLLATERAL_MORTGAGE" (
    "COLLATERAL_ID" bigint NOT NULL,
    "PRIORITY_RANK" smallint NOT NULL,
    "CREDITOR_TYPE_CD" character varying(8),
    "CREDITOR_NAME" character varying(100),
    "MAX_CLAIM_AMOUNT" bigint,
    "REG_NO" character varying(50),
    "SET_DATE" character varying(8),
    "RELEASE_DATE" character varying(8),
    "MORTGAGE_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COLLATERAL_MORTGAGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COLLATERAL_MORTGAGE" IS '담보근저당 | 도메인:담보';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."COLLATERAL_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."COLLATERAL_ID" IS '담보ID | 담보';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."PRIORITY_RANK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."PRIORITY_RANK" IS '근저당순위 | 1순위/2순위';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."CREDITOR_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."CREDITOR_TYPE_CD" IS '채권자유형코드 | 은행/개인/법인';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."CREDITOR_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."CREDITOR_NAME" IS '채권자명 | 채권자명';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."MAX_CLAIM_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."MAX_CLAIM_AMOUNT" IS '채권최고액 | 원';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."REG_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."REG_NO" IS '등기번호 | 등기소 등기번호';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."SET_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."SET_DATE" IS '설정일자 | yyyymmdd';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."RELEASE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."RELEASE_DATE" IS '해지일자 | yyyymmdd';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."MORTGAGE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."MORTGAGE_STATUS_CD" IS '근저당상태코드 | 설정/해지';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."REMARK" IS '근저당비고';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COLLATERAL_MORTGAGE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_MORTGAGE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COLLATERAL_PRICE_HISTORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COLLATERAL_PRICE_HISTORY" (
    "COLLATERAL_ID" bigint NOT NULL,
    "PRICE_SEQ" integer NOT NULL,
    "PRICE_DATE" character varying(8),
    "PRICE_SOURCE_CD" character varying(8),
    "PRICE_AMOUNT" bigint,
    "REFERENCE_NO" character varying(50),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COLLATERAL_PRICE_HISTORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COLLATERAL_PRICE_HISTORY" IS '담보시세이력 | 도메인:담보';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."COLLATERAL_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."COLLATERAL_ID" IS '담보ID | 담보';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."PRICE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."PRICE_SEQ" IS '시세일련번호 | 담보 내 일련번호';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."PRICE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."PRICE_DATE" IS '시세조회일자 | yyyymmdd';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."PRICE_SOURCE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."PRICE_SOURCE_CD" IS '시세출처코드 | KB/한국감정원/네이버';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."PRICE_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."PRICE_AMOUNT" IS '시세금액 | 원';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."REFERENCE_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."REFERENCE_NO" IS '참조번호 | 출처 참조번호';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."REMARK" IS '담보시세비고';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COLLATERAL_PRICE_HISTORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COLLATERAL_PRICE_HISTORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COMMON_CODE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COMMON_CODE" (
    "CODE_GROUP" character varying(50) NOT NULL,
    "CODE" character varying(20) NOT NULL,
    "CODE_NAME" character varying(200),
    "CODE_DESC" text,
    "USE_YN" character(1),
    "SORT_ORDER" integer,
    "REG_DATE" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COMMON_CODE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COMMON_CODE" IS '공통코드명세 | 도메인:기타';


--
-- Name: COLUMN "COMMON_CODE"."CODE_GROUP"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."CODE_GROUP" IS '코드그룹 | 코드 그룹';


--
-- Name: COLUMN "COMMON_CODE"."CODE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."CODE" IS '코드 | 코드 값';


--
-- Name: COLUMN "COMMON_CODE"."CODE_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."CODE_NAME" IS '코드명 | 코드 표시명';


--
-- Name: COLUMN "COMMON_CODE"."CODE_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."CODE_DESC" IS '공통코드설명 | 코드 설명';


--
-- Name: COLUMN "COMMON_CODE"."USE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."USE_YN" IS '사용여부 | Y=사용 / N=미사용';


--
-- Name: COLUMN "COMMON_CODE"."SORT_ORDER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."SORT_ORDER" IS '정렬순서 | 동일 그룹 내 정렬';


--
-- Name: COLUMN "COMMON_CODE"."REG_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."REG_DATE" IS '등록일자 | yyyymmdd. 코드 등록일';


--
-- Name: COLUMN "COMMON_CODE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COMMON_CODE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COMMON_CODE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COMMON_CODE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COMMON_CODE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMMON_CODE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COMPLAINT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COMPLAINT" (
    "COMPLAINT_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "RELATED_ACCOUNT_NO" character varying(20),
    "RELATED_TX_ID" bigint,
    "COMPLAINT_TYPE_CD" character varying(8),
    "CHANNEL_CD" character varying(8),
    "RECEIPT_DATETIME" character varying(14),
    "COMPLAINT_TITLE" character varying(80),
    "COMPLAINT_CONTENT" character varying(2000),
    "FSS_FORWARDED_YN" character(1),
    "OWNER_EMP_NO" character varying(20),
    "ASSIGN_DATETIME" character varying(14),
    "COMPLAINT_STATUS_CD" character varying(8),
    "RESPONSE_CONTENT" character varying(2000),
    "RESPONSE_DATETIME" character varying(14),
    "SATISFACTION_SCORE" smallint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COMPLAINT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COMPLAINT" IS '민원접수 | 도메인:민원';


--
-- Name: COLUMN "COMPLAINT"."COMPLAINT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."COMPLAINT_ID" IS '민원ID | 민원 식별자';


--
-- Name: COLUMN "COMPLAINT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."CUSTOMER_NO" IS '고객번호 | 민원인';


--
-- Name: COLUMN "COMPLAINT"."RELATED_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."RELATED_ACCOUNT_NO" IS '관련계좌번호 | 관련 계좌';


--
-- Name: COLUMN "COMPLAINT"."RELATED_TX_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."RELATED_TX_ID" IS '관련거래ID | 관련 거래';


--
-- Name: COLUMN "COMPLAINT"."COMPLAINT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."COMPLAINT_TYPE_CD" IS '민원유형코드 | 서비스/상품/거래';


--
-- Name: COLUMN "COMPLAINT"."CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."CHANNEL_CD" IS '민원경로코드 | 앱/콜센터/지점';


--
-- Name: COLUMN "COMPLAINT"."RECEIPT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."RECEIPT_DATETIME" IS '접수일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "COMPLAINT"."COMPLAINT_TITLE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."COMPLAINT_TITLE" IS '민원제목 | 제목';


--
-- Name: COLUMN "COMPLAINT"."COMPLAINT_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."COMPLAINT_CONTENT" IS '민원내용 | 본문';


--
-- Name: COLUMN "COMPLAINT"."FSS_FORWARDED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."FSS_FORWARDED_YN" IS '금감원이첩여부 | Y=금감원 이첩';


--
-- Name: COLUMN "COMPLAINT"."OWNER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."OWNER_EMP_NO" IS '담당자사번 | 담당 직원';


--
-- Name: COLUMN "COMPLAINT"."ASSIGN_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."ASSIGN_DATETIME" IS '담당자배정일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "COMPLAINT"."COMPLAINT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."COMPLAINT_STATUS_CD" IS '민원처리상태코드 | 접수/처리중/완료';


--
-- Name: COLUMN "COMPLAINT"."RESPONSE_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."RESPONSE_CONTENT" IS '답변내용 | 답변 본문';


--
-- Name: COLUMN "COMPLAINT"."RESPONSE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."RESPONSE_DATETIME" IS '답변일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "COMPLAINT"."SATISFACTION_SCORE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."SATISFACTION_SCORE" IS '만족도점수 | 1~5';


--
-- Name: COLUMN "COMPLAINT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COMPLAINT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COMPLAINT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COMPLAINT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COMPLAINT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COMPLAINT_PROCESS; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COMPLAINT_PROCESS" (
    "COMPLAINT_ID" bigint NOT NULL,
    "PROCESS_SEQ" smallint NOT NULL,
    "PROCESS_DATETIME" character varying(14),
    "STATUS_CD" character varying(8),
    "EMP_NO" character varying(20),
    "PROCESS_CONTENT" character varying(1000),
    "ATTACH_PATH" character varying(200),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COMPLAINT_PROCESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COMPLAINT_PROCESS" IS '민원처리이력 | 도메인:민원';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."COMPLAINT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."COMPLAINT_ID" IS '민원ID | 민원';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."PROCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."PROCESS_SEQ" IS '처리일련번호 | 민원 내 순번';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."PROCESS_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."PROCESS_DATETIME" IS '처리일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."STATUS_CD" IS '민원처리상태코드 | 처리 단계';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."EMP_NO" IS '담당자사번 | 처리 직원';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."PROCESS_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."PROCESS_CONTENT" IS '처리내용 | 처리 텍스트';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."ATTACH_PATH"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."ATTACH_PATH" IS '첨부파일경로 | 첨부 경로';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COMPLAINT_PROCESS"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COMPLAINT_PROCESS"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CONTRACT_COVENANT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CONTRACT_COVENANT" (
    "CONTRACT_NO" character varying(20) NOT NULL,
    "COVENANT_ID" bigint NOT NULL,
    "APPLY_START_DATE" character varying(8),
    "APPLY_END_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CONTRACT_COVENANT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CONTRACT_COVENANT" IS '계약특약 | 도메인:계약';


--
-- Name: COLUMN "CONTRACT_COVENANT"."CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."CONTRACT_NO" IS '계약번호 | 수신계약';


--
-- Name: COLUMN "CONTRACT_COVENANT"."COVENANT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."COVENANT_ID" IS '특약ID | 특약';


--
-- Name: COLUMN "CONTRACT_COVENANT"."APPLY_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."APPLY_START_DATE" IS '적용시작일 | yyyymmdd';


--
-- Name: COLUMN "CONTRACT_COVENANT"."APPLY_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."APPLY_END_DATE" IS '적용종료일 | yyyymmdd';


--
-- Name: COLUMN "CONTRACT_COVENANT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."REMARK" IS '계약특약비고';


--
-- Name: COLUMN "CONTRACT_COVENANT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CONTRACT_COVENANT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CONTRACT_COVENANT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CONTRACT_COVENANT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CONTRACT_COVENANT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_COVENANT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CONTRACT_PARTICIPANT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CONTRACT_PARTICIPANT" (
    "CONTRACT_NO" character varying(20) NOT NULL,
    "PARTY_ID" bigint NOT NULL,
    "ROLE_TYPE_ID" character varying(8) NOT NULL,
    "PARTICIPANT_SEQ" smallint,
    "SHARE_RATIO" numeric(5,4),
    "RELATED_PARTY_ID" bigint,
    "VERIFY_ATTACH_ID" bigint,
    "VERIFY_DATE" character varying(8),
    "PARTICIPATE_START_DATE" character varying(8),
    "PARTICIPATE_END_DATE" character varying(8),
    "PARTICIPATE_STATUS_CD" character varying(8),
    "JOINT_LIABILITY_YN" character(1),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CONTRACT_PARTICIPANT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CONTRACT_PARTICIPANT" IS '계약참여자 | 도메인:계약';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."CONTRACT_NO" IS '계약번호 | 계약 (수신/대출)';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."PARTY_ID" IS '관계자ID | 참여자';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."ROLE_TYPE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."ROLE_TYPE_ID" IS '역할유형ID | 역할';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."PARTICIPANT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."PARTICIPANT_SEQ" IS '참여순번 | 1=대표, 2~';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."SHARE_RATIO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."SHARE_RATIO" IS '지분율 | 비율 (합=1.0) | 공동명의 시 합=1.0000';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."RELATED_PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."RELATED_PARTY_ID" IS '관련관계자ID | 관련 관계자 (배우자 등)';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."VERIFY_ATTACH_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."VERIFY_ATTACH_ID" IS '검증서류첨부ID | 검증 서류';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."VERIFY_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."VERIFY_DATE" IS '검증일자 | yyyymmdd';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."PARTICIPATE_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."PARTICIPATE_START_DATE" IS '참여시작일자 | yyyymmdd';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."PARTICIPATE_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."PARTICIPATE_END_DATE" IS '참여종료일자 | yyyymmdd';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."PARTICIPATE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."PARTICIPATE_STATUS_CD" IS '참여상태코드 | 활성/종료/해제';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."JOINT_LIABILITY_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."JOINT_LIABILITY_YN" IS '연대책임여부 | Y=연대';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."REMARK" IS '계약참여자비고';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CONTRACT_PARTICIPANT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CONTRACT_PARTICIPANT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CORPORATE_PARTY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CORPORATE_PARTY" (
    "PARTY_ID" bigint NOT NULL,
    "BIZ_REG_NO" character varying(10),
    "CORP_REG_NO" character varying(13),
    "FOUND_DATE" character varying(8),
    "CORP_STATUS_CD" character varying(8),
    "TAX_TYPE_CD" character varying(8),
    "UNIT_TAX_YN" character(1),
    "ISSUE_DATE" character varying(8),
    "BIZ_DOC_ATTACH_ID" bigint,
    "CLOSE_REASON_CD" character varying(8),
    "SUSPEND_START_DATE" character varying(8),
    "SUSPEND_END_DATE" character varying(8),
    "CLOSE_DATE" character varying(8),
    "MERGE_TARGET_ID" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CORPORATE_PARTY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CORPORATE_PARTY" IS '법인관계자 | 도메인:관계자';


--
-- Name: COLUMN "CORPORATE_PARTY"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."PARTY_ID" IS '관계자ID | 관계자 1:1';


--
-- Name: COLUMN "CORPORATE_PARTY"."BIZ_REG_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."BIZ_REG_NO" IS '사업자번호 | 국세청 발급';


--
-- Name: COLUMN "CORPORATE_PARTY"."CORP_REG_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."CORP_REG_NO" IS '법인등록번호 | 법원 등기';


--
-- Name: COLUMN "CORPORATE_PARTY"."FOUND_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."FOUND_DATE" IS '설립일자 | yyyymmdd';


--
-- Name: COLUMN "CORPORATE_PARTY"."CORP_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."CORP_STATUS_CD" IS '법인상태코드 | 990100=운영 / 990102=폐업';


--
-- Name: COLUMN "CORPORATE_PARTY"."TAX_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."TAX_TYPE_CD" IS '과세유형코드 | 980100=일반 / 980101=간이 / 980102=면세';


--
-- Name: COLUMN "CORPORATE_PARTY"."UNIT_TAX_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."UNIT_TAX_YN" IS '사업자단위과세여부 | Y=본점 통합신고';


--
-- Name: COLUMN "CORPORATE_PARTY"."ISSUE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."ISSUE_DATE" IS '발급일자 | yyyymmdd';


--
-- Name: COLUMN "CORPORATE_PARTY"."BIZ_DOC_ATTACH_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."BIZ_DOC_ATTACH_ID" IS '사업자등록증첨부ID | 첨부서류 매핑';


--
-- Name: COLUMN "CORPORATE_PARTY"."CLOSE_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."CLOSE_REASON_CD" IS '폐업사유코드 | 991100=자진 / 991101=직권';


--
-- Name: COLUMN "CORPORATE_PARTY"."SUSPEND_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."SUSPEND_START_DATE" IS '휴업시작일자 | yyyymmdd';


--
-- Name: COLUMN "CORPORATE_PARTY"."SUSPEND_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."SUSPEND_END_DATE" IS '휴업종료예정일자 | yyyymmdd';


--
-- Name: COLUMN "CORPORATE_PARTY"."CLOSE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."CLOSE_DATE" IS '폐업일자 | yyyymmdd';


--
-- Name: COLUMN "CORPORATE_PARTY"."MERGE_TARGET_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."MERGE_TARGET_ID" IS '합병상대법인번호 | 합병 시 상대법인 관계자ID';


--
-- Name: COLUMN "CORPORATE_PARTY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CORPORATE_PARTY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CORPORATE_PARTY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CORPORATE_PARTY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CORPORATE_PARTY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CORPORATE_PARTY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: COVENANT_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."COVENANT_MASTER" (
    "COVENANT_ID" bigint NOT NULL,
    "COVENANT_NAME" character varying(80),
    "COVENANT_TYPE_CD" character varying(8),
    "COVENANT_BODY" text,
    "EFFECTIVE_DATE" character varying(8),
    "EXPIRE_DATE" character varying(8),
    "COVENANT_STATUS_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "COVENANT_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."COVENANT_MASTER" IS '특약마스터 | 도메인:상품';


--
-- Name: COLUMN "COVENANT_MASTER"."COVENANT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."COVENANT_ID" IS '특약ID | 특약 식별자';


--
-- Name: COLUMN "COVENANT_MASTER"."COVENANT_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."COVENANT_NAME" IS '특약명 | 특약 표시명';


--
-- Name: COLUMN "COVENANT_MASTER"."COVENANT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."COVENANT_TYPE_CD" IS '특약유형코드 | 특약 분류';


--
-- Name: COLUMN "COVENANT_MASTER"."COVENANT_BODY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."COVENANT_BODY" IS '특약본문 | 특약 전문';


--
-- Name: COLUMN "COVENANT_MASTER"."EFFECTIVE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."EFFECTIVE_DATE" IS '특약시행일자 | yyyymmdd';


--
-- Name: COLUMN "COVENANT_MASTER"."EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."EXPIRE_DATE" IS '특약폐기일자 | yyyymmdd';


--
-- Name: COLUMN "COVENANT_MASTER"."COVENANT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."COVENANT_STATUS_CD" IS '특약상태코드 | 시행/폐기';


--
-- Name: COLUMN "COVENANT_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "COVENANT_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COVENANT_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "COVENANT_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "COVENANT_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."COVENANT_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CREDIT_AGENCY_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CREDIT_AGENCY_MASTER" (
    "AGENCY_CD" character varying(8) NOT NULL,
    "AGENCY_NAME" character varying(50),
    "AGENCY_SHORT" character varying(20),
    "API_URL" character varying(200),
    "UNIT_COST" integer,
    "CONTRACT_START_DATE" character varying(8),
    "CONTRACT_END_DATE" character varying(8),
    "AGENCY_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CREDIT_AGENCY_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CREDIT_AGENCY_MASTER" IS '신용평가기관마스터 | 도메인:신용보안';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."AGENCY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."AGENCY_CD" IS '기관코드 | 기관 코드';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."AGENCY_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."AGENCY_NAME" IS '기관명 | 기관 표시명';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."AGENCY_SHORT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."AGENCY_SHORT" IS '약칭 | KCB/NICE';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."API_URL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."API_URL" IS 'API_URL | API 엔드포인트';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."UNIT_COST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."UNIT_COST" IS '단가(원) | 원/건';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."CONTRACT_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."CONTRACT_START_DATE" IS '계약시작일 | yyyymmdd';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."CONTRACT_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."CONTRACT_END_DATE" IS '계약종료일 | yyyymmdd';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."AGENCY_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."AGENCY_STATUS_CD" IS '기관운영상태코드 | 운영/중단';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."REMARK" IS '신용평가기관비고';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CREDIT_AGENCY_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_AGENCY_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CREDIT_INFO_REPORT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CREDIT_INFO_REPORT" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "REPORT_SEQ" smallint NOT NULL,
    "AGENCY_CD" character varying(8),
    "REPORT_TYPE_CD" character varying(8),
    "BASE_DATE" character varying(8),
    "REPORT_DATETIME" character varying(14),
    "REPORT_CONTENT" character varying(1000),
    "KCIS_STATUS_CD" character varying(8),
    "REFERENCE_NO" character varying(50),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CREDIT_INFO_REPORT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CREDIT_INFO_REPORT" IS '신용정보보고이력 | 도메인:대출';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."REPORT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."REPORT_SEQ" IS '보고일련번호 | 계약 내 보고 순번';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."AGENCY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."AGENCY_CD" IS '보고기관코드 | KCIS/KCB/NICE';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."REPORT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."REPORT_TYPE_CD" IS '보고유형코드 | 신규/연체/완제';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."BASE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."BASE_DATE" IS '기준일자 | yyyymmdd';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."REPORT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."REPORT_DATETIME" IS '보고일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."REPORT_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."REPORT_CONTENT" IS '보고내용 | 보고 상세';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."KCIS_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."KCIS_STATUS_CD" IS 'KCIS처리상태코드 | 대기/접수/완료';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."REFERENCE_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."REFERENCE_NO" IS '참조번호 | KCIS 참조번호';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."REMARK" IS '신용정보보고비고';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CREDIT_INFO_REPORT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INFO_REPORT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CREDIT_INQUIRY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CREDIT_INQUIRY" (
    "CUSTOMER_NO" bigint NOT NULL,
    "INQUIRY_SEQ" smallint NOT NULL,
    "AGENCY_CD" character varying(8),
    "INQUIRY_TYPE_CD" character varying(8),
    "INQUIRY_DATETIME" character varying(14),
    "INQUIRY_STATUS_CD" character varying(8),
    "CACHED_YN" character(1),
    "CACHE_SOURCE_ID" bigint,
    "INQUIRY_COST" integer,
    "RESPONSE_TIME_MS" integer,
    "REQUESTER_TYPE" character varying(20),
    "REQUESTER_ID" character varying(50),
    "LINKED_CONTRACT_NO" character varying(20),
    "CREDIT_SCORE" smallint,
    "CREDIT_GRADE" smallint,
    "OVERDUE_YN" character(1),
    "OVERDUE_DAYS" integer,
    "OVERDUE_AMOUNT" integer,
    "TOTAL_LOAN_BALANCE" bigint,
    "CREDIT_LOAN_BALANCE" bigint,
    "COLLATERAL_LOAN_BALANCE" bigint,
    "CARD_USAGE_AMOUNT" bigint,
    "MULTI_DEBT_COUNT" smallint,
    "CREDIT_HISTORY_MONTHS" smallint,
    "ESTIMATED_INCOME" integer,
    "RECENT_3M_INQUIRY_COUNT" smallint,
    "EVAL_BASE_DATE" character varying(8),
    "CACHE_EXPIRE_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CREDIT_INQUIRY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CREDIT_INQUIRY" IS '신용정보조회이력 | 도메인:신용보안';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "CREDIT_INQUIRY"."INQUIRY_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."INQUIRY_SEQ" IS '조회일련번호 | 고객 내 순번';


--
-- Name: COLUMN "CREDIT_INQUIRY"."AGENCY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."AGENCY_CD" IS '평가기관코드 | 신용평가기관';


--
-- Name: COLUMN "CREDIT_INQUIRY"."INQUIRY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."INQUIRY_TYPE_CD" IS '조회유형코드 | 간이/정밀';


--
-- Name: COLUMN "CREDIT_INQUIRY"."INQUIRY_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."INQUIRY_DATETIME" IS '조회일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "CREDIT_INQUIRY"."INQUIRY_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."INQUIRY_STATUS_CD" IS '조회상태코드 | 성공/실패';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CACHED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CACHED_YN" IS '캐시여부 | Y=캐시 활용';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CACHE_SOURCE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CACHE_SOURCE_ID" IS '캐시원본조회ID | 원본 조회 ID';


--
-- Name: COLUMN "CREDIT_INQUIRY"."INQUIRY_COST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."INQUIRY_COST" IS '조회비용 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."RESPONSE_TIME_MS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."RESPONSE_TIME_MS" IS '응답시간ms | ms';


--
-- Name: COLUMN "CREDIT_INQUIRY"."REQUESTER_TYPE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."REQUESTER_TYPE" IS '요청자유형 | 시스템/직원/고객';


--
-- Name: COLUMN "CREDIT_INQUIRY"."REQUESTER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."REQUESTER_ID" IS '요청자식별 | 요청자 식별';


--
-- Name: COLUMN "CREDIT_INQUIRY"."LINKED_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."LINKED_CONTRACT_NO" IS '연결계약번호 | 관련 계약';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CREDIT_SCORE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CREDIT_SCORE" IS '신용점수 | 신용점수';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CREDIT_GRADE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CREDIT_GRADE" IS '신용등급 | 등급';


--
-- Name: COLUMN "CREDIT_INQUIRY"."OVERDUE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."OVERDUE_YN" IS '연체여부 | Y=연체';


--
-- Name: COLUMN "CREDIT_INQUIRY"."OVERDUE_DAYS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."OVERDUE_DAYS" IS '연체일수 | 일';


--
-- Name: COLUMN "CREDIT_INQUIRY"."OVERDUE_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."OVERDUE_AMOUNT" IS '연체금액 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."TOTAL_LOAN_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."TOTAL_LOAN_BALANCE" IS '총대출잔액 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CREDIT_LOAN_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CREDIT_LOAN_BALANCE" IS '신용대출잔액 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."COLLATERAL_LOAN_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."COLLATERAL_LOAN_BALANCE" IS '담보대출잔액 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CARD_USAGE_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CARD_USAGE_AMOUNT" IS '카드사용금액 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."MULTI_DEBT_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."MULTI_DEBT_COUNT" IS '다중채무건수 | 건수';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CREDIT_HISTORY_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CREDIT_HISTORY_MONTHS" IS '신용거래기간개월 | 월';


--
-- Name: COLUMN "CREDIT_INQUIRY"."ESTIMATED_INCOME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."ESTIMATED_INCOME" IS '추정연소득 | 원';


--
-- Name: COLUMN "CREDIT_INQUIRY"."RECENT_3M_INQUIRY_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."RECENT_3M_INQUIRY_COUNT" IS '최근3개월조회횟수 | 건수';


--
-- Name: COLUMN "CREDIT_INQUIRY"."EVAL_BASE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."EVAL_BASE_DATE" IS '평가기준일 | yyyymmdd';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CACHE_EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CACHE_EXPIRE_DATE" IS '캐시만료일 | yyyymmdd';


--
-- Name: COLUMN "CREDIT_INQUIRY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."REMARK" IS '신용조회비고';


--
-- Name: COLUMN "CREDIT_INQUIRY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CREDIT_INQUIRY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CREDIT_INQUIRY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CREDIT_INQUIRY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CREDIT_INQUIRY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CUSTOMER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CUSTOMER" (
    "CUSTOMER_NO" bigint NOT NULL,
    "PARTY_ID" bigint,
    "EMAIL" character varying(50),
    "CI_VALUE" character varying(64),
    "PASSWORD" character varying(255),
    "JOIN_DATETIME" character varying(14),
    "LAST_ACCESS_DT" character varying(14),
    "FIRST_ACCT_DATE" character varying(8),
    "KYC_EXPIRE_DATE" character varying(8),
    "PRIVACY_AGREE_YN" character(1),
    "MARKETING_AGREE_YN" character(1),
    "CUST_GRADE_CD" character varying(8),
    "CUST_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "SIMPLE_PIN" character varying(255),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CUSTOMER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CUSTOMER" IS '고객 | 도메인:고객';


--
-- Name: COLUMN "CUSTOMER"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."CUSTOMER_NO" IS '고객번호 | 고객 식별자';


--
-- Name: COLUMN "CUSTOMER"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."PARTY_ID" IS '관계자ID | 관계자 1:1';


--
-- Name: COLUMN "CUSTOMER"."EMAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."EMAIL" IS '이메일 | 로그인 ID (UNIQUE)';


--
-- Name: COLUMN "CUSTOMER"."CI_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."CI_VALUE" IS 'CI값 | KCB 본인확인 CI';


--
-- Name: COLUMN "CUSTOMER"."PASSWORD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."PASSWORD" IS '비밀번호 | bcrypt 해시';


--
-- Name: COLUMN "CUSTOMER"."JOIN_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."JOIN_DATETIME" IS '가입일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "CUSTOMER"."LAST_ACCESS_DT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."LAST_ACCESS_DT" IS '마지막접속일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "CUSTOMER"."FIRST_ACCT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."FIRST_ACCT_DATE" IS '첫계좌개설일 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER"."KYC_EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."KYC_EXPIRE_DATE" IS '본인확인만료일 | yyyymmdd. 5년 갱신';


--
-- Name: COLUMN "CUSTOMER"."PRIVACY_AGREE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."PRIVACY_AGREE_YN" IS '개인정보활용동의여부 | Y=동의 (필수)';


--
-- Name: COLUMN "CUSTOMER"."MARKETING_AGREE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."MARKETING_AGREE_YN" IS '마케팅동의여부 | Y=동의 (선택)';


--
-- Name: COLUMN "CUSTOMER"."CUST_GRADE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."CUST_GRADE_CD" IS '현재등급코드 | G100=일반/G101=실버/G102=골드';


--
-- Name: COLUMN "CUSTOMER"."CUST_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."CUST_STATUS_CD" IS '회원상태코드 | 5050=정상/5051=휴면/5053=탈퇴';


--
-- Name: COLUMN "CUSTOMER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."REMARK" IS '고객비고';


--
-- Name: COLUMN "CUSTOMER"."SIMPLE_PIN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."SIMPLE_PIN" IS '간편비밀번호 | 6자리 PIN (bcrypt 해시)';


--
-- Name: COLUMN "CUSTOMER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CUSTOMER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CUSTOMER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CUSTOMER_ADDRESS; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CUSTOMER_ADDRESS" (
    "CUSTOMER_NO" bigint NOT NULL,
    "ADDR_SEQ" integer NOT NULL,
    "ADDR_TYPE_CD" character varying(8),
    "POSTAL_CODE" character(5),
    "ADDR_LINE1" character varying(200),
    "ADDR_LINE2" character varying(100),
    "PRIMARY_YN" character(1),
    "ADDR_START_DATE" character varying(8),
    "ADDR_END_DATE" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CUSTOMER_ADDRESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CUSTOMER_ADDRESS" IS '고객주소 | 도메인:고객';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."ADDR_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."ADDR_SEQ" IS '주소일련번호 | 고객 내 주소 번호';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."ADDR_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."ADDR_TYPE_CD" IS '주소유형코드 | 집/직장/기타';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."POSTAL_CODE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."POSTAL_CODE" IS '우편번호 | 5자리 우편번호';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."ADDR_LINE1"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."ADDR_LINE1" IS '주소1 | 도로명 주소';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."ADDR_LINE2"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."ADDR_LINE2" IS '주소2 | 상세 주소';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."PRIMARY_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."PRIMARY_YN" IS '대표여부 | Y=대표 주소';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."ADDR_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."ADDR_START_DATE" IS '주소사용시작일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."ADDR_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."ADDR_END_DATE" IS '주소사용종료일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_ADDRESS"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_ADDRESS"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CUSTOMER_CONTACT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CUSTOMER_CONTACT" (
    "CUSTOMER_NO" bigint NOT NULL,
    "CONTACT_SEQ" integer NOT NULL,
    "CONTACT_TYPE_CD" character varying(8),
    "CONTACT_VALUE" character varying(20),
    "PRIMARY_YN" character(1),
    "VERIFIED_YN" character(1),
    "CONTACT_REG_DATE" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CUSTOMER_CONTACT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CUSTOMER_CONTACT" IS '고객연락처 | 도메인:고객';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CONTACT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CONTACT_SEQ" IS '연락처일련번호 | 고객 내 연락처 번호';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CONTACT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CONTACT_TYPE_CD" IS '연락처유형코드 | 휴대폰/유선/이메일';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CONTACT_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CONTACT_VALUE" IS '연락처값 | 실제 연락처';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."PRIMARY_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."PRIMARY_YN" IS '대표여부 | Y=대표';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."VERIFIED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."VERIFIED_YN" IS '본인인증여부 | Y=SMS 인증 완료';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CONTACT_REG_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CONTACT_REG_DATE" IS '연락처등록일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_CONTACT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_CONTACT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CUSTOMER_DEVICE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CUSTOMER_DEVICE" (
    "CUSTOMER_NO" bigint NOT NULL,
    "DEVICE_SEQ" smallint NOT NULL,
    "DEVICE_FINGERPRINT" character varying(100),
    "DEVICE_ID_TYPE_CD" character varying(8),
    "DEVICE_NAME" character varying(50),
    "DEVICE_OS_CD" character varying(8),
    "DEVICE_MODEL" character varying(50),
    "DEVICE_REG_DATE" character varying(8),
    "LAST_USE_DATE" character varying(8),
    "TRUST_LEVEL_CD" character varying(8),
    "DEVICE_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CUSTOMER_DEVICE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CUSTOMER_DEVICE" IS '고객등록기기 | 도메인:고객';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_SEQ" IS '등록기기일련번호 | 고객 내 기기 번호';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_FINGERPRINT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_FINGERPRINT" IS '기기식별값 | 디바이스 핑거프린트';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_ID_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_ID_TYPE_CD" IS '기기식별방식코드 | IMEI/UUID/브라우저';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_NAME" IS '기기명 | 사용자 지정 별명';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_OS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_OS_CD" IS '기기OS코드 | iOS/Android/Windows';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_MODEL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_MODEL" IS '기기모델 | 단말 모델명';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_REG_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_REG_DATE" IS '기기등록일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."LAST_USE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."LAST_USE_DATE" IS '마지막사용일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."TRUST_LEVEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."TRUST_LEVEL_CD" IS '신뢰등급코드 | 신뢰/일반/의심';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DEVICE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DEVICE_STATUS_CD" IS '등록상태코드 | 활성/해제';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."REMARK" IS '등록기기비고';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_DEVICE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_DEVICE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CUSTOMER_GRADE_HISTORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CUSTOMER_GRADE_HISTORY" (
    "CUSTOMER_NO" bigint NOT NULL,
    "GRADE_START_DATE" character varying(8) NOT NULL,
    "GRADE_END_DATE" character varying(8),
    "CUST_GRADE_CD" character varying(8),
    "GRADE_REASON_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CUSTOMER_GRADE_HISTORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CUSTOMER_GRADE_HISTORY" IS '고객등급이력 | 도메인:고객';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."GRADE_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."GRADE_START_DATE" IS '등급유효시작일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."GRADE_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."GRADE_END_DATE" IS '등급유효종료일자 | yyyymmdd';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."CUST_GRADE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."CUST_GRADE_CD" IS '고객등급코드 | G100~G104';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."GRADE_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."GRADE_REASON_CD" IS '산정사유코드 | 자동/특별/수동';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."REMARK" IS '고객등급비고';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_GRADE_HISTORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_GRADE_HISTORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: CUSTOMER_TERMS_AGREE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CUSTOMER_TERMS_AGREE" (
    "CUSTOMER_NO" bigint NOT NULL,
    "TERMS_ID" bigint NOT NULL,
    "AGREE_YN" character(1),
    "AGREE_DATETIME" character varying(14),
    "AGREE_IP" character varying(50),
    "AGREE_CHANNEL_CD" character varying(8),
    "ACCESS_SEQ" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "CUSTOMER_TERMS_AGREE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."CUSTOMER_TERMS_AGREE" IS '고객약관동의 | 도메인:약관';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."TERMS_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."TERMS_ID" IS '약관ID | 약관';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."AGREE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."AGREE_YN" IS '동의여부 | Y=동의 / N=거부';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."AGREE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."AGREE_DATETIME" IS '동의일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."AGREE_IP"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."AGREE_IP" IS '동의IP | 동의 시점 IP';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."AGREE_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."AGREE_CHANNEL_CD" IS '동의경로코드 | 앱/웹/창구';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."ACCESS_SEQ" IS '접속일련번호 | 관련 접속 기록';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "CUSTOMER_TERMS_AGREE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CUSTOMER_TERMS_AGREE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: DELEGATION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DELEGATION" (
    "DELEGATION_ID" bigint NOT NULL,
    "TARGET_CUST_NO" bigint,
    "AGENT_CUST_NO" bigint,
    "ROLE_TYPE_CD" character varying(8),
    "INQUIRY_PERM" character(1),
    "WITHDRAW_PERM" character(1),
    "TRANSFER_PERM" character(1),
    "CLOSE_PERM" character(1),
    "OPEN_PRODUCT_PERM" character(1),
    "LOAN_APPLY_PERM" character(1),
    "LIMIT_CHANGE_PERM" character(1),
    "PWD_CHANGE_PERM" character(1),
    "DELEG_START_DATE" character varying(8),
    "DELEG_END_DATE" character varying(8),
    "END_REASON_CD" character varying(8),
    "DELEG_BASIS_CD" character varying(8),
    "ATTACH_ID" bigint,
    "NOTARIZE_YN" character(1),
    "NOTARIZE_DATE" character varying(8),
    "DAILY_LIMIT" bigint,
    "PER_TX_LIMIT" bigint,
    "MONTHLY_LIMIT" bigint,
    "SMS_NOTIFY_YN" character(1),
    "NOTIFY_PHONE" character varying(20),
    "REGISTRANT_CUST_NO" bigint,
    "REGISTRATION_REASON" character varying(1000),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "DELEGATION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."DELEGATION" IS '위임관계 | 도메인:고객';


--
-- Name: COLUMN "DELEGATION"."DELEGATION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."DELEGATION_ID" IS '역할일련번호 | 위임 식별자';


--
-- Name: COLUMN "DELEGATION"."TARGET_CUST_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."TARGET_CUST_NO" IS '대상고객번호 | 권한 받는 대상';


--
-- Name: COLUMN "DELEGATION"."AGENT_CUST_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."AGENT_CUST_NO" IS '주체고객번호 | 권한 행사자';


--
-- Name: COLUMN "DELEGATION"."ROLE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."ROLE_TYPE_CD" IS '역할유형코드 | 710200=법정대리/710300=공동명의';


--
-- Name: COLUMN "DELEGATION"."INQUIRY_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."INQUIRY_PERM" IS '조회권한 | Y=잔액/거래내역 조회';


--
-- Name: COLUMN "DELEGATION"."WITHDRAW_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."WITHDRAW_PERM" IS '출금권한 | Y=출금 가능';


--
-- Name: COLUMN "DELEGATION"."TRANSFER_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."TRANSFER_PERM" IS '이체권한 | Y=송금 가능';


--
-- Name: COLUMN "DELEGATION"."CLOSE_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."CLOSE_PERM" IS '해지권한 | Y=해지 가능';


--
-- Name: COLUMN "DELEGATION"."OPEN_PRODUCT_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."OPEN_PRODUCT_PERM" IS '상품가입권한 | Y=신규 가입';


--
-- Name: COLUMN "DELEGATION"."LOAN_APPLY_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."LOAN_APPLY_PERM" IS '대출신청권한 | Y=대출 신청';


--
-- Name: COLUMN "DELEGATION"."LIMIT_CHANGE_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."LIMIT_CHANGE_PERM" IS '한도변경권한 | Y=한도 조정';


--
-- Name: COLUMN "DELEGATION"."PWD_CHANGE_PERM"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."PWD_CHANGE_PERM" IS '비밀번호변경권한 | Y=비번 변경';


--
-- Name: COLUMN "DELEGATION"."DELEG_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."DELEG_START_DATE" IS '위임시작일자 | yyyymmdd';


--
-- Name: COLUMN "DELEGATION"."DELEG_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."DELEG_END_DATE" IS '위임종료일자 | yyyymmdd. 9999=무기한';


--
-- Name: COLUMN "DELEGATION"."END_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."END_REASON_CD" IS '종료사유코드 | 800100=임기만료/800103=사망';


--
-- Name: COLUMN "DELEGATION"."DELEG_BASIS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."DELEG_BASIS_CD" IS '위임근거코드 | 810100=법정/810103=공동명의';


--
-- Name: COLUMN "DELEGATION"."ATTACH_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."ATTACH_ID" IS '첨부ID | 위임증빙 (가족관계증명서)';


--
-- Name: COLUMN "DELEGATION"."NOTARIZE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."NOTARIZE_YN" IS '공증여부 | Y=공증';


--
-- Name: COLUMN "DELEGATION"."NOTARIZE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."NOTARIZE_DATE" IS '공증일자 | yyyymmdd';


--
-- Name: COLUMN "DELEGATION"."DAILY_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."DAILY_LIMIT" IS '일일거래한도 | 원. NULL=무제한';


--
-- Name: COLUMN "DELEGATION"."PER_TX_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."PER_TX_LIMIT" IS '1회거래한도 | 원';


--
-- Name: COLUMN "DELEGATION"."MONTHLY_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."MONTHLY_LIMIT" IS '월누적한도 | 원';


--
-- Name: COLUMN "DELEGATION"."SMS_NOTIFY_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."SMS_NOTIFY_YN" IS 'SMS통지대상여부 | Y=거래시 SMS 통지';


--
-- Name: COLUMN "DELEGATION"."NOTIFY_PHONE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."NOTIFY_PHONE" IS '알림연락처 | 알림 받을 번호';


--
-- Name: COLUMN "DELEGATION"."REGISTRANT_CUST_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."REGISTRANT_CUST_NO" IS '등록자고객번호 | 위임 등록 주체';


--
-- Name: COLUMN "DELEGATION"."REGISTRATION_REASON"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."REGISTRATION_REASON" IS '등록사유 | 등록 배경';


--
-- Name: COLUMN "DELEGATION"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."REMARK" IS '위임비고';


--
-- Name: COLUMN "DELEGATION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "DELEGATION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DELEGATION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "DELEGATION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DELEGATION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DELEGATION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: DEPOSIT_CONTRACT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DEPOSIT_CONTRACT" (
    "CONTRACT_NO" character varying(20) NOT NULL,
    "ACCOUNT_NO" character varying(20),
    "CUSTOMER_NO" bigint,
    "PRODUCT_ID" smallint,
    "PERIOD_ID" bigint,
    "MONTHLY_CONDITION_ID" bigint,
    "RATE_POLICY_ID" bigint,
    "CONTRACT_DATE" character varying(8),
    "EFFECTIVE_DATE" character varying(8),
    "MATURITY_DATE" character varying(8),
    "CONTRACT_STATUS_CD" character varying(8),
    "OPEN_ACCESS_SEQ" bigint,
    "BASE_RATE" numeric(5,3),
    "APPLY_RATE" numeric(5,3),
    "PERIOD_MONTHS" smallint,
    "BONUS_RATE" numeric(5,3),
    "MATURITY_RATE" numeric(5,3),
    "EARLY_CLOSE_RATE" numeric(5,3),
    "EARLY_CLOSE_FEE_RATE" numeric(5,3),
    "EXPECTED_INTEREST" integer,
    "CONTRACT_MONTHLY_AMT" integer,
    "PAID_COUNT" smallint,
    "MATURITY_HANDLE_CD" character varying(8),
    "MATURITY_PAYOUT_ACCT" character varying(20),
    "AUTO_REINVEST_COUNT" smallint,
    "OVERDRAFT_LIMIT" bigint,
    "PRODUCT_NAME_SNAPSHOT" character varying(80),
    "PRODUCT_TYPE_CD" character varying(8),
    "CUSTOMER_NAME_SNAPSHOT" character varying(20),
    "JOIN_CHANNEL_CD" character varying(8),
    "JOIN_BRANCH_CD" character varying(10),
    "INTEREST_PAY_DAY" smallint,
    "INSTALLMENT_DAY" smallint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "DEPOSIT_CONTRACT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."DEPOSIT_CONTRACT" IS '수신계약 | 도메인:계약';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CONTRACT_NO" IS '계약번호 | C-YYYYMMDDxxx';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."ACCOUNT_NO" IS '계좌번호 | ⭐ v51: 계좌 FK';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CUSTOMER_NO" IS '고객번호 | 대표 고객';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."PRODUCT_ID" IS '상품ID | 가입 상품';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."PERIOD_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."PERIOD_ID" IS '가입기간ID | 상품가입기간 참조';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."MONTHLY_CONDITION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."MONTHLY_CONDITION_ID" IS '월납입조건ID | 적금월납입조건 참조';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."RATE_POLICY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."RATE_POLICY_ID" IS '상품금리정책ID | 상품금리정책 참조';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CONTRACT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CONTRACT_DATE" IS '계약일자 | yyyymmdd';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."EFFECTIVE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."EFFECTIVE_DATE" IS '효력시작일자 | yyyymmdd';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."MATURITY_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."MATURITY_DATE" IS '만기일자 | yyyymmdd';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CONTRACT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CONTRACT_STATUS_CD" IS '계약상태코드 | 470100=활성/470101=해지';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."OPEN_ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."OPEN_ACCESS_SEQ" IS '개설시접속일련번호 | 개설 시 접속 기록';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."BASE_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."BASE_RATE" IS '기본금리(%) | % 스냅샷';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."APPLY_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."APPLY_RATE" IS '적용금리(%) | % 최종';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."PERIOD_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."PERIOD_MONTHS" IS '가입기간개월 | 12/24/36';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."BONUS_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."BONUS_RATE" IS '우대금리(%) | % 합산';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."MATURITY_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."MATURITY_RATE" IS '만기금리(%) | %';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."EARLY_CLOSE_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."EARLY_CLOSE_RATE" IS '중도해지금리(%) | %';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."EARLY_CLOSE_FEE_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."EARLY_CLOSE_FEE_RATE" IS '중도해지수수료율(%) | %';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."EXPECTED_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."EXPECTED_INTEREST" IS '만기예상이자 | 원';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CONTRACT_MONTHLY_AMT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CONTRACT_MONTHLY_AMT" IS '약정월납입금액 | 원 (적금)';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."PAID_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."PAID_COUNT" IS '누적납입회차 | 납입 완료 회차';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."MATURITY_HANDLE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."MATURITY_HANDLE_CD" IS '만기처리방식코드 | 자동지급/재예치';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."MATURITY_PAYOUT_ACCT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."MATURITY_PAYOUT_ACCT" IS '만기지급계좌 | 만기 지급 계좌';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."AUTO_REINVEST_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."AUTO_REINVEST_COUNT" IS '자동재예치횟수 | 재예치 횟수';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."OVERDRAFT_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."OVERDRAFT_LIMIT" IS '마통한도금액 | 원 단위 | 마통 한도 (마통만)';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."PRODUCT_NAME_SNAPSHOT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."PRODUCT_NAME_SNAPSHOT" IS '상품명 | 계약 시점 상품명 스냅샷';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."PRODUCT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."PRODUCT_TYPE_CD" IS '상품유형코드 | 유형 스냅샷';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CUSTOMER_NAME_SNAPSHOT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CUSTOMER_NAME_SNAPSHOT" IS '고객명 | 계약 시점 고객명';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."JOIN_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."JOIN_CHANNEL_CD" IS '가입경로코드 | 앱/웹/창구';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."JOIN_BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."JOIN_BRANCH_CD" IS '가입지점코드 | 체결 지점';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."INTEREST_PAY_DAY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."INTEREST_PAY_DAY" IS '이자지급일자 | 매월 며칠 (1~31)';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."INSTALLMENT_DAY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."INSTALLMENT_DAY" IS '적금납입일자 | 매월 며칠 (적금)';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."REMARK" IS '수신계약비고';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DEPOSIT_CONTRACT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEPOSIT_CONTRACT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: DEVICE_ACCESS_LOG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DEVICE_ACCESS_LOG" (
    "DEVICE_ID" bigint NOT NULL,
    "ACCESS_SEQ" smallint NOT NULL,
    "CUSTOMER_NO" bigint,
    "ACCESS_DATETIME" character varying(14),
    "ACCESS_CHANNEL_CD" character varying(8),
    "IP_ADDRESS" character varying(45),
    "TELECOM_CARRIER" character varying(20),
    "DEVICE_OS_CD" character varying(8),
    "DEVICE_MODEL" character varying(50),
    "APP_VERSION" character varying(20),
    "VPN_YN" character(1),
    "ROOTING_YN" character(1),
    "SEC_CHECK_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "DEVICE_ACCESS_LOG"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."DEVICE_ACCESS_LOG" IS '기기접속이력 | 도메인:고객';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."DEVICE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."DEVICE_ID" IS '등록기기ID | 고객등록기기 매핑';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."ACCESS_SEQ" IS '접속일련번호 | 기기 내 접속 순번';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."CUSTOMER_NO" IS '고객번호 | 접속 고객';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."ACCESS_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."ACCESS_DATETIME" IS '접속일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."ACCESS_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."ACCESS_CHANNEL_CD" IS '접속경로코드 | 앱/웹/ATM';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."IP_ADDRESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."IP_ADDRESS" IS 'IP주소 | IPv4/IPv6';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."TELECOM_CARRIER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."TELECOM_CARRIER" IS '통신사 | SKT/KT/LG';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."DEVICE_OS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."DEVICE_OS_CD" IS '기기OS코드 | 접속 시점 OS';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."DEVICE_MODEL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."DEVICE_MODEL" IS '기기모델 | 접속 시점 모델';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."APP_VERSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."APP_VERSION" IS '앱버전 | 앱 버전';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."VPN_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."VPN_YN" IS 'VPN여부 | Y=VPN 의심';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."ROOTING_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."ROOTING_YN" IS '루팅여부 | Y=루팅/탈옥 의심';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."SEC_CHECK_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."SEC_CHECK_CD" IS '보안검증결과코드 | 정상/경고/차단';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DEVICE_ACCESS_LOG"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DEVICE_ACCESS_LOG"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: DOC_REQUIREMENT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DOC_REQUIREMENT" (
    "REQUIREMENT_ID" bigint NOT NULL,
    "TARGET_TYPE_CD" character varying(8),
    "PRODUCT_ID" smallint,
    "TRANSACTION_TYPE" character varying(30),
    "DOC_TYPE_ID" bigint,
    "REQUIRED_YN" character(1),
    "CONDITION" character varying(100),
    "INACTIVE_YN" character(1),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "DOC_REQUIREMENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."DOC_REQUIREMENT" IS '서류요구 | 도메인:상품';


--
-- Name: COLUMN "DOC_REQUIREMENT"."REQUIREMENT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."REQUIREMENT_ID" IS '요구ID | 요구 식별자';


--
-- Name: COLUMN "DOC_REQUIREMENT"."TARGET_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."TARGET_TYPE_CD" IS '적용대상유형코드 | 개인/법인/외국인';


--
-- Name: COLUMN "DOC_REQUIREMENT"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."PRODUCT_ID" IS '상품ID | 관련 상품';


--
-- Name: COLUMN "DOC_REQUIREMENT"."TRANSACTION_TYPE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."TRANSACTION_TYPE" IS '거래상황구분 | 가입/대출/해지';


--
-- Name: COLUMN "DOC_REQUIREMENT"."DOC_TYPE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."DOC_TYPE_ID" IS '서류유형ID | 요구 서류';


--
-- Name: COLUMN "DOC_REQUIREMENT"."REQUIRED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."REQUIRED_YN" IS '제출필수여부 | Y=필수';


--
-- Name: COLUMN "DOC_REQUIREMENT"."CONDITION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."CONDITION" IS '적용조건 | 조건 텍스트';


--
-- Name: COLUMN "DOC_REQUIREMENT"."INACTIVE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."INACTIVE_YN" IS '삭제여부 | Y=삭제';


--
-- Name: COLUMN "DOC_REQUIREMENT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "DOC_REQUIREMENT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DOC_REQUIREMENT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "DOC_REQUIREMENT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DOC_REQUIREMENT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_REQUIREMENT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: DOC_TYPE_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DOC_TYPE_MASTER" (
    "DOC_TYPE_ID" bigint NOT NULL,
    "DOC_NAME" character varying(80),
    "DOC_CATEGORY_CD" character varying(8),
    "RETENTION_YEARS" smallint,
    "VALID_MONTHS" smallint,
    "DISPOSABLE_YN" character(1),
    "DOC_DESC" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "DOC_TYPE_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."DOC_TYPE_MASTER" IS '서류유형마스터 | 도메인:상품';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."DOC_TYPE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."DOC_TYPE_ID" IS '서류유형ID | 서류 유형 식별자';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."DOC_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."DOC_NAME" IS '서류명 | 재직증명서/주민등록등본';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."DOC_CATEGORY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."DOC_CATEGORY_CD" IS '서류카테고리코드 | 신분/소득/재직';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."RETENTION_YEARS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."RETENTION_YEARS" IS '보관기간년수 | 보관 년수';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."VALID_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."VALID_MONTHS" IS '유효기간개월 | 발급 후 유효 개월';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."DISPOSABLE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."DISPOSABLE_YN" IS '폐기가능여부 | Y=기간 후 폐기';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."DOC_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."DOC_DESC" IS '서류유형설명';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "DOC_TYPE_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."DOC_TYPE_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: EMPLOYEE_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EMPLOYEE_MASTER" (
    "EMPLOYEE_NO" character varying(20) NOT NULL,
    "PARTY_ID" bigint,
    "NAME" character varying(50),
    "BRANCH_CD" character varying(10),
    "POSITION_CD" character varying(8),
    "DEPT_NAME" character varying(50),
    "AUTH_LEVEL_CD" character varying(8),
    "HIRE_DATE" character varying(8),
    "RESIGN_DATE" character varying(8),
    "EMP_STATUS_CD" character varying(8),
    "LINKED_CUST_NO" bigint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "EMPLOYEE_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."EMPLOYEE_MASTER" IS '직원마스터 | 도메인:조직';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."EMPLOYEE_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."EMPLOYEE_NO" IS '사번 | 직원 사번';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."PARTY_ID" IS '관계자ID | 관계자 1:1';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."NAME" IS '성명 | 직원명';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."BRANCH_CD" IS '소속지점코드 | 소속 지점';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."POSITION_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."POSITION_CD" IS '직급코드 | 사원/대리/과장 등';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."DEPT_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."DEPT_NAME" IS '부서명 | 소속 부서';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."AUTH_LEVEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."AUTH_LEVEL_CD" IS '권한레벨코드 | L1~L5';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."HIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."HIRE_DATE" IS '입사일자 | yyyymmdd';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."RESIGN_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."RESIGN_DATE" IS '퇴사일자 | yyyymmdd';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."EMP_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."EMP_STATUS_CD" IS '직원상태코드 | 재직/휴직/퇴직';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."LINKED_CUST_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."LINKED_CUST_NO" IS '연결고객번호 | 직원이 고객일 경우';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."REMARK" IS '직원비고';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "EMPLOYEE_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: FDS_DETECTION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FDS_DETECTION" (
    "CUSTOMER_NO" bigint NOT NULL,
    "DETECT_SEQ" smallint NOT NULL,
    "TRANSACTION_ID" bigint,
    "ACCOUNT_NO" character varying(20),
    "ACCESS_SEQ" bigint,
    "DETECT_DATETIME" character varying(14),
    "TOTAL_SCORE" smallint,
    "JUDGMENT_CD" character varying(8),
    "EXTRA_AUTH_SUCCESS" character(1),
    "RESPONSE_TIME_MS" smallint,
    "ACCESS_IP" character varying(45),
    "ACCESS_COUNTRY" character varying(50),
    "REMARK" character varying(1000),
    "INVESTIGATION_STATUS_CD" character varying(8),
    "INVESTIGATOR_EMP_NO" character varying(20),
    "REVIEWER_EMP_NO" character varying(20),
    "LINKED_RESTRICTION_ID" bigint,
    "INVESTIGATION_DETAIL" character varying(1000),
    "INVESTIGATION_CONCLUSION" character varying(200),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "FDS_DETECTION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."FDS_DETECTION" IS 'FDS탐지이력 | 도메인:신용보안';


--
-- Name: COLUMN "FDS_DETECTION"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."CUSTOMER_NO" IS '고객번호 | 탐지 대상';


--
-- Name: COLUMN "FDS_DETECTION"."DETECT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."DETECT_SEQ" IS '탐지일련번호 | 고객 내 순번';


--
-- Name: COLUMN "FDS_DETECTION"."TRANSACTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."TRANSACTION_ID" IS '거래ID | 관련 거래';


--
-- Name: COLUMN "FDS_DETECTION"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."ACCOUNT_NO" IS '계좌번호 | 관련 계좌';


--
-- Name: COLUMN "FDS_DETECTION"."ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."ACCESS_SEQ" IS '접속일련번호 | 접속 기록';


--
-- Name: COLUMN "FDS_DETECTION"."DETECT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."DETECT_DATETIME" IS '탐지일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "FDS_DETECTION"."TOTAL_SCORE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."TOTAL_SCORE" IS '종합점수 | 룰 적중 합계';


--
-- Name: COLUMN "FDS_DETECTION"."JUDGMENT_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."JUDGMENT_CD" IS '판정결과코드 | 정상/경고/차단';


--
-- Name: COLUMN "FDS_DETECTION"."EXTRA_AUTH_SUCCESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."EXTRA_AUTH_SUCCESS" IS '추가인증성공 | Y/N';


--
-- Name: COLUMN "FDS_DETECTION"."RESPONSE_TIME_MS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."RESPONSE_TIME_MS" IS '응답시간ms | ms';


--
-- Name: COLUMN "FDS_DETECTION"."ACCESS_IP"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."ACCESS_IP" IS '접속IP | IPv4/IPv6';


--
-- Name: COLUMN "FDS_DETECTION"."ACCESS_COUNTRY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."ACCESS_COUNTRY" IS '접속국가 | 국가';


--
-- Name: COLUMN "FDS_DETECTION"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."REMARK" IS 'FDS탐지비고';


--
-- Name: COLUMN "FDS_DETECTION"."INVESTIGATION_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."INVESTIGATION_STATUS_CD" IS '조사상태코드 | 대기/진행/완료';


--
-- Name: COLUMN "FDS_DETECTION"."INVESTIGATOR_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."INVESTIGATOR_EMP_NO" IS '조사담당자사번 | 조사 직원';


--
-- Name: COLUMN "FDS_DETECTION"."REVIEWER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."REVIEWER_EMP_NO" IS '조사검토자사번 | 검토 직원';


--
-- Name: COLUMN "FDS_DETECTION"."LINKED_RESTRICTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."LINKED_RESTRICTION_ID" IS '연결계좌제한ID | 계좌제한 매핑';


--
-- Name: COLUMN "FDS_DETECTION"."INVESTIGATION_DETAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."INVESTIGATION_DETAIL" IS '조사상세내용 | 조사 텍스트';


--
-- Name: COLUMN "FDS_DETECTION"."INVESTIGATION_CONCLUSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."INVESTIGATION_CONCLUSION" IS '조사결론 | 결론';


--
-- Name: COLUMN "FDS_DETECTION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "FDS_DETECTION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FDS_DETECTION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "FDS_DETECTION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FDS_DETECTION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_DETECTION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: FDS_RULE_HIT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FDS_RULE_HIT" (
    "DETECT_ID" bigint NOT NULL,
    "RULE_ID" bigint NOT NULL,
    "HIT_SCORE" smallint,
    "HIT_DETAIL" character varying(200),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "FDS_RULE_HIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."FDS_RULE_HIT" IS 'FDS룰적중이력 | 도메인:신용보안';


--
-- Name: COLUMN "FDS_RULE_HIT"."DETECT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."DETECT_ID" IS '탐지ID | FDS탐지 식별자';


--
-- Name: COLUMN "FDS_RULE_HIT"."RULE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."RULE_ID" IS '룰ID | 룰';


--
-- Name: COLUMN "FDS_RULE_HIT"."HIT_SCORE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."HIT_SCORE" IS '적중점수 | 적중 점수';


--
-- Name: COLUMN "FDS_RULE_HIT"."HIT_DETAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."HIT_DETAIL" IS '적중상세 | 적중 텍스트';


--
-- Name: COLUMN "FDS_RULE_HIT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "FDS_RULE_HIT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FDS_RULE_HIT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "FDS_RULE_HIT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FDS_RULE_HIT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_HIT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: FDS_RULE_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FDS_RULE_MASTER" (
    "RULE_ID" bigint NOT NULL,
    "RULE_NAME" character varying(80),
    "RULE_TYPE_CD" character varying(8),
    "RULE_EXPRESSION" character varying(500),
    "BASE_SCORE" smallint,
    "AUTO_ACTION_CD" character varying(8),
    "EFFECTIVE_START_DATE" character varying(8),
    "EFFECTIVE_END_DATE" character varying(8),
    "RULE_STATUS_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "FDS_RULE_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."FDS_RULE_MASTER" IS 'FDS룰마스터 | 도메인:신용보안';


--
-- Name: COLUMN "FDS_RULE_MASTER"."RULE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."RULE_ID" IS '룰ID | 룰 식별자';


--
-- Name: COLUMN "FDS_RULE_MASTER"."RULE_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."RULE_NAME" IS '룰명 | 룰 표시명';


--
-- Name: COLUMN "FDS_RULE_MASTER"."RULE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."RULE_TYPE_CD" IS '룰유형코드 | 금액/빈도/지리';


--
-- Name: COLUMN "FDS_RULE_MASTER"."RULE_EXPRESSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."RULE_EXPRESSION" IS '룰표현식 | 룰 로직';


--
-- Name: COLUMN "FDS_RULE_MASTER"."BASE_SCORE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."BASE_SCORE" IS '기본점수 | 룰 적중 점수';


--
-- Name: COLUMN "FDS_RULE_MASTER"."AUTO_ACTION_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."AUTO_ACTION_CD" IS '자동조치코드 | 경고/차단/추가인증';


--
-- Name: COLUMN "FDS_RULE_MASTER"."EFFECTIVE_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."EFFECTIVE_START_DATE" IS '시행시작일 | yyyymmdd';


--
-- Name: COLUMN "FDS_RULE_MASTER"."EFFECTIVE_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."EFFECTIVE_END_DATE" IS '시행종료일 | yyyymmdd';


--
-- Name: COLUMN "FDS_RULE_MASTER"."RULE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."RULE_STATUS_CD" IS '룰상태코드 | 활성/중단';


--
-- Name: COLUMN "FDS_RULE_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "FDS_RULE_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FDS_RULE_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "FDS_RULE_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FDS_RULE_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FDS_RULE_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: FOREIGNER_CUSTOMER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FOREIGNER_CUSTOMER" (
    "PARTY_ID" bigint NOT NULL,
    "NATIONALITY_CD" character varying(8),
    "FOREIGNER_NO" character varying(13),
    "VISA_TYPE_CD" character varying(8),
    "VISA_EXPIRE_DATE" character varying(8),
    "NAME_EN" character varying(80),
    "PASSPORT_NO" character varying(20),
    "FATF_SANCTION_YN" character(1),
    "ID_ISSUE_DATE" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "FOREIGNER_CUSTOMER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."FOREIGNER_CUSTOMER" IS '외국인고객 | 도메인:관계자';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."PARTY_ID" IS '관계자ID | 개인관계자 1:1';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."NATIONALITY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."NATIONALITY_CD" IS '국적코드 | ISO 국가코드';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."FOREIGNER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."FOREIGNER_NO" IS '외국인등록번호 | 외국인등록번호';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."VISA_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."VISA_TYPE_CD" IS '체류자격코드 | 비자 종류';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."VISA_EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."VISA_EXPIRE_DATE" IS '체류만료일 | yyyymmdd';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."NAME_EN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."NAME_EN" IS '영문성명 | 여권상 영문명';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."PASSPORT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."PASSPORT_NO" IS '여권번호 | 여권번호';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."FATF_SANCTION_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."FATF_SANCTION_YN" IS 'FATF제재여부 | Y=FATF 제재 대상';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."ID_ISSUE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."ID_ISSUE_DATE" IS '신분증발급일 | yyyymmdd';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FOREIGNER_CUSTOMER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGNER_CUSTOMER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: FOREIGN_ACCOUNT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FOREIGN_ACCOUNT" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "CURRENCY_CD" character varying(8),
    "FOREIGN_BALANCE" numeric(20,2),
    "APPLY_EXCHANGE_RATE" numeric(10,4),
    "RATE_DATE" character varying(8),
    "CUMULATIVE_EXCHANGE_GAIN" numeric(20,2),
    "CUMULATIVE_EXCHANGE_LOSS" numeric(20,2),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "FOREIGN_ACCOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."FOREIGN_ACCOUNT" IS '외화계좌 | 도메인:계좌';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."ACCOUNT_NO" IS '계좌번호 | 계좌 1:1';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."CURRENCY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."CURRENCY_CD" IS '통화코드 | USD/EUR/JPY/CNY';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."FOREIGN_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."FOREIGN_BALANCE" IS '외화잔액 | 외화 단위';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."APPLY_EXCHANGE_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."APPLY_EXCHANGE_RATE" IS '적용환율 | 환율 | 환율';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."RATE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."RATE_DATE" IS '환율기준일자 | yyyymmdd';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."CUMULATIVE_EXCHANGE_GAIN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."CUMULATIVE_EXCHANGE_GAIN" IS '누적환차익 | 원';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."CUMULATIVE_EXCHANGE_LOSS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."CUMULATIVE_EXCHANGE_LOSS" IS '누적환차손 | 원';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "FOREIGN_ACCOUNT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."FOREIGN_ACCOUNT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: GRADE_PERMISSION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GRADE_PERMISSION" (
    "CUST_GRADE_CD" character varying(8) NOT NULL,
    "PERMISSION_ID" smallint NOT NULL,
    "APPLIED_FEE" integer,
    "APPLIED_LIMIT" bigint,
    "GRANT_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "GRADE_PERMISSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."GRADE_PERMISSION" IS '등급권한 | 도메인:고객';


--
-- Name: COLUMN "GRADE_PERMISSION"."CUST_GRADE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."CUST_GRADE_CD" IS '고객등급코드 | 고객 등급';


--
-- Name: COLUMN "GRADE_PERMISSION"."PERMISSION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."PERMISSION_ID" IS '권한ID | 권한';


--
-- Name: COLUMN "GRADE_PERMISSION"."APPLIED_FEE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."APPLIED_FEE" IS '적용수수료 | 원';


--
-- Name: COLUMN "GRADE_PERMISSION"."APPLIED_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."APPLIED_LIMIT" IS '적용한도 | 원';


--
-- Name: COLUMN "GRADE_PERMISSION"."GRANT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."GRANT_DATE" IS '권한부여일자 | yyyymmdd';


--
-- Name: COLUMN "GRADE_PERMISSION"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."REMARK" IS '등급권한비고';


--
-- Name: COLUMN "GRADE_PERMISSION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "GRADE_PERMISSION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "GRADE_PERMISSION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "GRADE_PERMISSION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "GRADE_PERMISSION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."GRADE_PERMISSION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: INDIVIDUAL_BUSINESS; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INDIVIDUAL_BUSINESS" (
    "CUSTOMER_NO" bigint NOT NULL,
    "BIZ_REG_NO" character varying(10),
    "TRADE_NAME" character varying(80),
    "BIZ_REG_DATE" character varying(8),
    "TAX_TYPE_CD" character varying(8),
    "UNIT_TAX_YN" character(1),
    "ISSUE_DATE" character varying(8),
    "BIZ_DOC_ATTACH_ID" bigint,
    "JOINT_BIZ_YN" character(1),
    "BIZ_STATUS_CD" character varying(8),
    "SUSPEND_START_DATE" character varying(8),
    "SUSPEND_END_DATE" character varying(8),
    "CLOSE_DATE" character varying(8),
    "CLOSE_REASON_CD" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "INDIVIDUAL_BUSINESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."INDIVIDUAL_BUSINESS" IS '개인사업자 | 도메인:고객';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."CUSTOMER_NO" IS '고객번호 | 고객 1:1';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."BIZ_REG_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."BIZ_REG_NO" IS '사업자번호 | 국세청 발급';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."TRADE_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."TRADE_NAME" IS '상호 | 사업장 상호';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."BIZ_REG_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."BIZ_REG_DATE" IS '사업자등록일 | yyyymmdd';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."TAX_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."TAX_TYPE_CD" IS '과세유형코드 | 980100=일반/980101=간이';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."UNIT_TAX_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."UNIT_TAX_YN" IS '사업자단위과세여부 | Y/N';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."ISSUE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."ISSUE_DATE" IS '발급일자 | yyyymmdd';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."BIZ_DOC_ATTACH_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."BIZ_DOC_ATTACH_ID" IS '사업자등록증첨부ID | 첨부서류 매핑';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."JOINT_BIZ_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."JOINT_BIZ_YN" IS '공동사업자여부 | Y=공동 (사업체대표자에 N행)';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."BIZ_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."BIZ_STATUS_CD" IS '사업자상태코드 | 운영/휴업/폐업';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."SUSPEND_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."SUSPEND_START_DATE" IS '휴업시작일자 | yyyymmdd';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."SUSPEND_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."SUSPEND_END_DATE" IS '휴업종료예정일자 | yyyymmdd';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."CLOSE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."CLOSE_DATE" IS '폐업일자 | yyyymmdd';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."CLOSE_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."CLOSE_REASON_CD" IS '폐업사유코드 | 폐업 사유';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INDIVIDUAL_BUSINESS"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_BUSINESS"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: INDIVIDUAL_PARTY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INDIVIDUAL_PARTY" (
    "PARTY_ID" bigint NOT NULL,
    "RESIDENT_CD" character varying(8),
    "RRN_ENC" character varying(13),
    "BIRTH_DATE" character varying(8),
    "GENDER" character(1),
    "JOB_TYPE_ID" character varying(8),
    "CURRENT_EMPLOYER" character varying(200),
    "EMPLOYER_BIZ_NO" character varying(13),
    "ANNUAL_INCOME" bigint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "INDIVIDUAL_PARTY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."INDIVIDUAL_PARTY" IS '개인관계자 | 도메인:관계자';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."PARTY_ID" IS '관계자ID | 관계자 1:1';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."RESIDENT_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."RESIDENT_CD" IS '거주자구분코드 | B00400=내국인 / B00401=거주외국인';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."RRN_ENC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."RRN_ENC" IS '주민번호(암호화) | 암호화 저장';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."BIRTH_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."BIRTH_DATE" IS '생년월일 | yyyymmdd';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."GENDER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."GENDER" IS '성별 | M=남 / F=여';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."JOB_TYPE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."JOB_TYPE_ID" IS '직업유형ID | RT001~RT008';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."CURRENT_EMPLOYER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."CURRENT_EMPLOYER" IS '현재직장명 | 재직 회사';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."EMPLOYER_BIZ_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."EMPLOYER_BIZ_NO" IS '직장사업자번호 | 사업자번호';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."ANNUAL_INCOME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."ANNUAL_INCOME" IS '연소득 | 원 단위. DSR 기준';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."REMARK" IS '개인관계자비고';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INDIVIDUAL_PARTY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INDIVIDUAL_PARTY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: INSTALLMENT_AGREEMENT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INSTALLMENT_AGREEMENT" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "INSTALLMENT_NO" smallint NOT NULL,
    "CONTRACT_DATE" character varying(8),
    "BIZ_DAY_ADJUSTED" character varying(8),
    "CONTRACT_AMOUNT" integer,
    "INSTALLMENT_STATUS_CD" character varying(8),
    "LINKED_AUTO_TRANSFER_ID" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "INSTALLMENT_AGREEMENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."INSTALLMENT_AGREEMENT" IS '적금납입약정 | 도메인:계좌';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."ACCOUNT_NO" IS '계좌번호 | 적금 계좌';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."INSTALLMENT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."INSTALLMENT_NO" IS '회차 | 1~N회차';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."CONTRACT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."CONTRACT_DATE" IS '약정일자 | yyyymmdd';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."BIZ_DAY_ADJUSTED"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."BIZ_DAY_ADJUSTED" IS '영업일조정일자 | yyyymmdd 형식 | 약정일이 휴일이면 조정';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."CONTRACT_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."CONTRACT_AMOUNT" IS '약정금액 | 원';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."INSTALLMENT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."INSTALLMENT_STATUS_CD" IS '납입상태코드 | 예정/완료/연체';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."LINKED_AUTO_TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."LINKED_AUTO_TRANSFER_ID" IS '연결자동이체ID | 자동이체 매핑';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INSTALLMENT_AGREEMENT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_AGREEMENT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: INSTALLMENT_CONDITION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INSTALLMENT_CONDITION" (
    "PRODUCT_ID" smallint NOT NULL,
    "CONDITION_SEQ" smallint NOT NULL,
    "MIN_MONTHLY_AMT" integer,
    "MAX_MONTHLY_AMT" integer,
    "AMOUNT_CHANGE_YN" character(1),
    "PREPAY_DEFER_YN" character(1),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "INSTALLMENT_CONDITION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."INSTALLMENT_CONDITION" IS '적금월납입조건 | 도메인:상품';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."CONDITION_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."CONDITION_SEQ" IS '월납입조건일련번호 | 상품 내 일련번호';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."MIN_MONTHLY_AMT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."MIN_MONTHLY_AMT" IS '월최소납입금액 | 원';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."MAX_MONTHLY_AMT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."MAX_MONTHLY_AMT" IS '월최대납입금액 | 원';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."AMOUNT_CHANGE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."AMOUNT_CHANGE_YN" IS '금액변경허용 | Y=가능';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."PREPAY_DEFER_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."PREPAY_DEFER_YN" IS '선납이연허용 | Y=가능';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."REMARK" IS '적금월납입조건비고';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INSTALLMENT_CONDITION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_CONDITION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: INSTALLMENT_PAYMENT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INSTALLMENT_PAYMENT" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "PAYMENT_SEQ" smallint NOT NULL,
    "INSTALLMENT_NO" smallint,
    "ACTUAL_PAY_DATETIME" character varying(14),
    "ACTUAL_PAY_AMOUNT" integer,
    "TRANSACTION_ID" bigint,
    "PAY_CHANNEL_CD" character varying(8),
    "PAY_TYPE_CD" character varying(8),
    "PAYER_CUST_NO" bigint,
    "CONTRACT_DIFF" integer,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "INSTALLMENT_PAYMENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."INSTALLMENT_PAYMENT" IS '적금납입내역 | 도메인:계좌';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."ACCOUNT_NO" IS '계좌번호 | 적금 계좌';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."PAYMENT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."PAYMENT_SEQ" IS '납입일련번호 | 계좌 내 순번';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."INSTALLMENT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."INSTALLMENT_NO" IS '회차 | 몇 회차에 해당';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."ACTUAL_PAY_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."ACTUAL_PAY_DATETIME" IS '실제납입일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."ACTUAL_PAY_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."ACTUAL_PAY_AMOUNT" IS '실제납입금액 | 원';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."TRANSACTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."TRANSACTION_ID" IS '거래ID | 거래 매핑';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."PAY_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."PAY_CHANNEL_CD" IS '납입경로코드 | 자동이체/수동';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."PAY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."PAY_TYPE_CD" IS '납입유형코드 | 정상/선납/이연';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."PAYER_CUST_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."PAYER_CUST_NO" IS '납입자고객번호 | 납입한 고객 (위임 시 다를 수 있음)';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."CONTRACT_DIFF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."CONTRACT_DIFF" IS '약정대비차액 | 원. 음수=부족';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INSTALLMENT_PAYMENT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INSTALLMENT_PAYMENT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: INTEREST_SETTLEMENT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INTEREST_SETTLEMENT" (
    "ACCOUNT_NO" character varying(20) NOT NULL,
    "SETTLEMENT_SEQ" smallint NOT NULL,
    "PERIOD_START" character varying(8),
    "PERIOD_END" character varying(8),
    "APPLY_BALANCE" bigint,
    "APPLY_RATE" numeric(5,3),
    "DAILY_INTEREST" integer,
    "PERIOD_INTEREST_TOTAL" bigint,
    "SETTLEMENT_STATUS_CD" character varying(8),
    "SETTLEMENT_DATE" character varying(8),
    "SETTLEMENT_TX_ID" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "INTEREST_SETTLEMENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."INTEREST_SETTLEMENT" IS '이자정산이력 | 도메인:계좌';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."ACCOUNT_NO" IS '계좌번호 | 계좌';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."SETTLEMENT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."SETTLEMENT_SEQ" IS '정산일련번호 | 계좌 내 순번';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."PERIOD_START"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."PERIOD_START" IS '구간시작일 | yyyymmdd';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."PERIOD_END"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."PERIOD_END" IS '구간종료일 | yyyymmdd';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."APPLY_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."APPLY_BALANCE" IS '적용잔액 | 원';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."APPLY_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."APPLY_RATE" IS '적용금리(%) | %';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."DAILY_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."DAILY_INTEREST" IS '일이자 | 원';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."PERIOD_INTEREST_TOTAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."PERIOD_INTEREST_TOTAL" IS '구간이자합계 | 원';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."SETTLEMENT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."SETTLEMENT_STATUS_CD" IS '정산상태코드 | 정산/미정산';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."SETTLEMENT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."SETTLEMENT_DATE" IS '정산일자 | yyyymmdd';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."SETTLEMENT_TX_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."SETTLEMENT_TX_ID" IS '정산거래ID | 거래 매핑';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "INTEREST_SETTLEMENT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."INTEREST_SETTLEMENT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_APPLICATION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_APPLICATION" (
    "LOAN_APP_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "APPLY_PRODUCT_ID" smallint,
    "APPLY_TYPE_CD" character varying(8),
    "LOAN_TYPE_CD" character varying(8),
    "DESIRED_AMOUNT" bigint,
    "EXPECTED_LIMIT" bigint,
    "COLLATERAL_VALUE" bigint,
    "FINAL_COLLATERAL_VALUE" bigint,
    "EXPECTED_RATE" numeric(5,3),
    "APPLY_DATETIME" character varying(14),
    "APPLY_STATUS_CD" character varying(8),
    "APPLY_CHANNEL_CD" character varying(8),
    "REJECT_REASON_CD" character varying(8),
    "REJECT_DETAIL" character varying(500),
    "COLLATERAL_ADDRESS" character varying(200),
    "DESIRED_EXEC_DATE" character varying(8),
    "PURPOSE_CD" character varying(8),
    "PURPOSE_DETAIL" character varying(200),
    "GUARANTOR_YN" character(1),
    "COLLATERAL_YN" character(1),
    "APPLY_EMP_NO" character varying(20),
    "APPLY_BRANCH_CD" character varying(10),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_APPLICATION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_APPLICATION" IS '대출신청 | 도메인:대출';


--
-- Name: COLUMN "LOAN_APPLICATION"."LOAN_APP_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."LOAN_APP_ID" IS '대출신청ID | 신청 식별자';


--
-- Name: COLUMN "LOAN_APPLICATION"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."CUSTOMER_NO" IS '고객번호 | 신청 고객';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_PRODUCT_ID" IS '신청상품ID | 신청 상품';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_TYPE_CD" IS '신청구분코드 | 440100=가신청/440101=정식';


--
-- Name: COLUMN "LOAN_APPLICATION"."LOAN_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."LOAN_TYPE_CD" IS '대출유형코드 | 신용/주담대/마통';


--
-- Name: COLUMN "LOAN_APPLICATION"."DESIRED_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."DESIRED_AMOUNT" IS '희망대출금액 | 원';


--
-- Name: COLUMN "LOAN_APPLICATION"."EXPECTED_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."EXPECTED_LIMIT" IS '예상대출한도 | 원';


--
-- Name: COLUMN "LOAN_APPLICATION"."COLLATERAL_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."COLLATERAL_VALUE" IS '산출담보가액 | 원';


--
-- Name: COLUMN "LOAN_APPLICATION"."FINAL_COLLATERAL_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."FINAL_COLLATERAL_VALUE" IS '최종담보인정금액 | 원';


--
-- Name: COLUMN "LOAN_APPLICATION"."EXPECTED_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."EXPECTED_RATE" IS '적용예상금리 | %';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_DATETIME" IS '신청일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_STATUS_CD" IS '신청상태코드 | 450100=접수/450102=승인';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_CHANNEL_CD" IS '신청채널코드 | 앱/웹/창구';


--
-- Name: COLUMN "LOAN_APPLICATION"."REJECT_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."REJECT_REASON_CD" IS '거절사유코드 | 460100=신용미달';


--
-- Name: COLUMN "LOAN_APPLICATION"."REJECT_DETAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."REJECT_DETAIL" IS '거절상세 | 심사역 코멘트';


--
-- Name: COLUMN "LOAN_APPLICATION"."COLLATERAL_ADDRESS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."COLLATERAL_ADDRESS" IS '담보주소 | 주담대 시';


--
-- Name: COLUMN "LOAN_APPLICATION"."DESIRED_EXEC_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."DESIRED_EXEC_DATE" IS '희망실행일자 | yyyymmdd';


--
-- Name: COLUMN "LOAN_APPLICATION"."PURPOSE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."PURPOSE_CD" IS '자금용도코드 | 770100=주택구입';


--
-- Name: COLUMN "LOAN_APPLICATION"."PURPOSE_DETAIL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."PURPOSE_DETAIL" IS '자금용도상세 | 자유 텍스트';


--
-- Name: COLUMN "LOAN_APPLICATION"."GUARANTOR_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."GUARANTOR_YN" IS '보증인여부 | Y=보증인 있음';


--
-- Name: COLUMN "LOAN_APPLICATION"."COLLATERAL_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."COLLATERAL_YN" IS '담보여부 | Y=담보 있음';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_EMP_NO" IS '신청담당자사번 | 창구 담당자';


--
-- Name: COLUMN "LOAN_APPLICATION"."APPLY_BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."APPLY_BRANCH_CD" IS '신청지점코드 | 창구 지점';


--
-- Name: COLUMN "LOAN_APPLICATION"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."REMARK" IS '대출신청비고';


--
-- Name: COLUMN "LOAN_APPLICATION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_APPLICATION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_APPLICATION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_APPLICATION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_APPLICATION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_APPLICATION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_CHANGE_HISTORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_CHANGE_HISTORY" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "CHANGE_SEQ" smallint NOT NULL,
    "CHANGE_TYPE_CD" character varying(8),
    "REQUEST_DATETIME" character varying(14),
    "APPLY_DATE" character varying(8),
    "OLD_RATE" numeric(5,3),
    "NEW_RATE" numeric(5,3),
    "OLD_LIMIT" bigint,
    "NEW_LIMIT" bigint,
    "OLD_MATURITY_DATE" character varying(8),
    "NEW_MATURITY_DATE" character varying(8),
    "CHANGE_STATUS_CD" character varying(8),
    "CHANGE_REASON" character varying(1000),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_CHANGE_HISTORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_CHANGE_HISTORY" IS '대출조건변경이력 | 도메인:대출';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."CHANGE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."CHANGE_SEQ" IS '변경일련번호 | 계약 내 변경 순번';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."CHANGE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."CHANGE_TYPE_CD" IS '변경유형코드 | 금리/한도/만기';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."REQUEST_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."REQUEST_DATETIME" IS '변경요청일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."APPLY_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."APPLY_DATE" IS '변경적용일자 | yyyymmdd';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."OLD_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."OLD_RATE" IS '변경전금리 | %';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."NEW_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."NEW_RATE" IS '변경후금리 | %';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."OLD_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."OLD_LIMIT" IS '변경전한도 | 원';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."NEW_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."NEW_LIMIT" IS '변경후한도 | 원';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."OLD_MATURITY_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."OLD_MATURITY_DATE" IS '변경전만기일 | yyyymmdd';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."NEW_MATURITY_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."NEW_MATURITY_DATE" IS '변경후만기일 | yyyymmdd';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."CHANGE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."CHANGE_STATUS_CD" IS '변경상태코드 | 신청/승인/완료';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."CHANGE_REASON"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."CHANGE_REASON" IS '변경사유 | 변경 사유';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."REMARK" IS '대출조건변경비고';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_CHANGE_HISTORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CHANGE_HISTORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_CONTRACT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_CONTRACT" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "CUSTOMER_NO" bigint,
    "LOAN_PRODUCT_ID" smallint,
    "LOAN_TYPE_CD" character varying(8),
    "REPAY_METHOD_CD" character varying(8),
    "CONTRACT_LIMIT" bigint,
    "CURRENT_USAGE" bigint,
    "CONTRACT_RATE" numeric(5,3),
    "BASE_RATE" numeric(5,3),
    "SPREAD_RATE" numeric(5,3),
    "BONUS_RATE" numeric(5,3),
    "OVERDUE_SPREAD_RATE" numeric(5,3),
    "CONTRACT_DATE" character varying(8),
    "EFFECTIVE_DATE" character varying(8),
    "MATURITY_DATE" character varying(8),
    "LOAN_STATUS_CD" character varying(8),
    "OVERDUE_STAGE_CD" character varying(8),
    "LOAN_ACCOUNT_NO" character varying(20),
    "MAIN_DEPOSIT_ACCOUNT_NO" character varying(20),
    "COLLATERAL_ID" bigint,
    "CREDIT_INQUIRY_ID" character varying(20),
    "LOAN_PURPOSE_CD" character varying(8),
    "JOIN_BRANCH_CD" character varying(10),
    "PRODUCT_NAME_SNAPSHOT" character varying(100),
    "OPEN_ACCESS_SEQ" bigint,
    "REMARK" character varying(1000),
    "RATE_TYPE_CD" character varying(8),
    "FIXED_RATE_MONTHS" smallint,
    "VARIABLE_CYCLE_MONTHS" smallint,
    "BASE_RATE_TYPE_CD" character varying(8),
    "GRACE_PERIOD_MONTHS" smallint,
    "LOAN_PERIOD_MONTHS" smallint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_CONTRACT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_CONTRACT" IS '대출계약 | 도메인:대출';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_CONTRACT_NO" IS '대출계약번호 | L-YYYYMMDDxxx';


--
-- Name: COLUMN "LOAN_CONTRACT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CUSTOMER_NO" IS '고객번호 | 차주';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_PRODUCT_ID" IS '대출상품ID | 대출 상품';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_TYPE_CD" IS '대출유형코드 | 720100=신용/720102=마통';


--
-- Name: COLUMN "LOAN_CONTRACT"."REPAY_METHOD_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."REPAY_METHOD_CD" IS '상환방식코드 | 730100=원리균등';


--
-- Name: COLUMN "LOAN_CONTRACT"."CONTRACT_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CONTRACT_LIMIT" IS '약정한도금액 | 원';


--
-- Name: COLUMN "LOAN_CONTRACT"."CURRENT_USAGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CURRENT_USAGE" IS '현재사용금액 | 원';


--
-- Name: COLUMN "LOAN_CONTRACT"."CONTRACT_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CONTRACT_RATE" IS '약정금리 | % 최종';


--
-- Name: COLUMN "LOAN_CONTRACT"."BASE_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."BASE_RATE" IS '기준금리(%) | % 스냅샷';


--
-- Name: COLUMN "LOAN_CONTRACT"."SPREAD_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."SPREAD_RATE" IS '가산금리(%) | % 은행 마진';


--
-- Name: COLUMN "LOAN_CONTRACT"."BONUS_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."BONUS_RATE" IS '우대금리(%) | % 차감';


--
-- Name: COLUMN "LOAN_CONTRACT"."OVERDUE_SPREAD_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."OVERDUE_SPREAD_RATE" IS '연체가산금리 | % 연체 추가';


--
-- Name: COLUMN "LOAN_CONTRACT"."CONTRACT_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CONTRACT_DATE" IS '약정일자 | yyyymmdd';


--
-- Name: COLUMN "LOAN_CONTRACT"."EFFECTIVE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."EFFECTIVE_DATE" IS '효력시작일 | yyyymmdd';


--
-- Name: COLUMN "LOAN_CONTRACT"."MATURITY_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."MATURITY_DATE" IS '만기일자 | yyyymmdd';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_STATUS_CD" IS '대출상태코드 | 750100=정상/750101=연체';


--
-- Name: COLUMN "LOAN_CONTRACT"."OVERDUE_STAGE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."OVERDUE_STAGE_CD" IS '연체단계코드 | 760100~760103';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_ACCOUNT_NO" IS '대출계좌번호 | ⭐ v51: 대출 전용 계좌';


--
-- Name: COLUMN "LOAN_CONTRACT"."MAIN_DEPOSIT_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."MAIN_DEPOSIT_ACCOUNT_NO" IS '주거래입금계좌번호 | ⭐ v51: 입금받을 자유예금';


--
-- Name: COLUMN "LOAN_CONTRACT"."COLLATERAL_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."COLLATERAL_ID" IS '담보ID | 담보 (담보대출)';


--
-- Name: COLUMN "LOAN_CONTRACT"."CREDIT_INQUIRY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CREDIT_INQUIRY_ID" IS '신용조회이력ID | 신용조회 매핑';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_PURPOSE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_PURPOSE_CD" IS '대출용도코드 | 770100=주택/770103=생활';


--
-- Name: COLUMN "LOAN_CONTRACT"."JOIN_BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."JOIN_BRANCH_CD" IS '가입지점코드 | 취급 지점';


--
-- Name: COLUMN "LOAN_CONTRACT"."PRODUCT_NAME_SNAPSHOT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."PRODUCT_NAME_SNAPSHOT" IS '상품명 | 계약 시점 상품명';


--
-- Name: COLUMN "LOAN_CONTRACT"."OPEN_ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."OPEN_ACCESS_SEQ" IS '개설시접속일련번호 | 개설 시 접속';


--
-- Name: COLUMN "LOAN_CONTRACT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."REMARK" IS '대출계약비고';


--
-- Name: COLUMN "LOAN_CONTRACT"."RATE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."RATE_TYPE_CD" IS '금리유형코드 | 740100=고정/740101=변동/740102=혼합';


--
-- Name: COLUMN "LOAN_CONTRACT"."FIXED_RATE_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."FIXED_RATE_MONTHS" IS '고정금리적용기간개월 | 혼합형 시 고정 적용';


--
-- Name: COLUMN "LOAN_CONTRACT"."VARIABLE_CYCLE_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."VARIABLE_CYCLE_MONTHS" IS '변동주기개월수 | 변동/혼합 주기';


--
-- Name: COLUMN "LOAN_CONTRACT"."BASE_RATE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."BASE_RATE_TYPE_CD" IS '기준금리종류코드 | 741100=COFIX신규';


--
-- Name: COLUMN "LOAN_CONTRACT"."GRACE_PERIOD_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."GRACE_PERIOD_MONTHS" IS '거치기간개월수 | 원금 상환 유예';


--
-- Name: COLUMN "LOAN_CONTRACT"."LOAN_PERIOD_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."LOAN_PERIOD_MONTHS" IS '대출기간개월수 | 총 기간 (거치+상환)';


--
-- Name: COLUMN "LOAN_CONTRACT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_CONTRACT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_CONTRACT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_CONTRACT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_CONTRACT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_CONTRACT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_COST; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_COST" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "COST_SEQ" smallint NOT NULL,
    "COST_TYPE_CD" character varying(8),
    "COST_DATE" character varying(8),
    "COST_AMOUNT" bigint,
    "BORROWER_BURDEN" bigint,
    "BANK_BURDEN" bigint,
    "SETTLEMENT_STATUS_CD" character varying(8),
    "LINKED_TX_ID" bigint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_COST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_COST" IS '대출부대비용 | 도메인:대출';


--
-- Name: COLUMN "LOAN_COST"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "LOAN_COST"."COST_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."COST_SEQ" IS '부대비용일련번호 | 계약 내 일련번호';


--
-- Name: COLUMN "LOAN_COST"."COST_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."COST_TYPE_CD" IS '비용유형코드 | 인지세/감정평가/등록세';


--
-- Name: COLUMN "LOAN_COST"."COST_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."COST_DATE" IS '비용발생일자 | yyyymmdd';


--
-- Name: COLUMN "LOAN_COST"."COST_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."COST_AMOUNT" IS '비용금액 | 원';


--
-- Name: COLUMN "LOAN_COST"."BORROWER_BURDEN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."BORROWER_BURDEN" IS '차주부담금액 | 원';


--
-- Name: COLUMN "LOAN_COST"."BANK_BURDEN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."BANK_BURDEN" IS '은행부담금액 | 원';


--
-- Name: COLUMN "LOAN_COST"."SETTLEMENT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."SETTLEMENT_STATUS_CD" IS '정산상태코드 | 미정산/정산';


--
-- Name: COLUMN "LOAN_COST"."LINKED_TX_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."LINKED_TX_ID" IS '연결거래ID | 거래 매핑';


--
-- Name: COLUMN "LOAN_COST"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."REMARK" IS '대출부대비용비고';


--
-- Name: COLUMN "LOAN_COST"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_COST"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_COST"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_COST"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_COST"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_COST"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_EXEC_HISTORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_EXEC_HISTORY" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "EXEC_SEQ" smallint NOT NULL,
    "EXEC_DATETIME" character varying(14),
    "EXEC_TYPE_CD" character varying(8),
    "EXEC_AMOUNT" bigint,
    "POST_EXEC_BALANCE" bigint,
    "DEPOSIT_ACCOUNT_NO" character varying(20),
    "CHANNEL_CD" character varying(8),
    "EMP_NO" character varying(20),
    "REMARK" character varying(1000),
    "IDEMPOTENCY_KEY" character varying(64),
    "CANCEL_YN" character(1),
    "ORIGINAL_TX_REF" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_EXEC_HISTORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_EXEC_HISTORY" IS '대출실행이력 | 도메인:대출';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."EXEC_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."EXEC_SEQ" IS '실행일련번호 | 계약 내 실행 순번';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."EXEC_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."EXEC_DATETIME" IS '실행일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."EXEC_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."EXEC_TYPE_CD" IS '실행구분코드 | 실행/취소';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."EXEC_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."EXEC_AMOUNT" IS '실행금액 | 원';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."POST_EXEC_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."POST_EXEC_BALANCE" IS '실행후사용잔액 | 원';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."DEPOSIT_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."DEPOSIT_ACCOUNT_NO" IS '입금계좌번호 | 대출금 입금 계좌';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."CHANNEL_CD" IS '채널코드 | 앱/창구';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."EMP_NO" IS '직원사번 | 실행 담당';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."REMARK" IS '대출실행비고';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."IDEMPOTENCY_KEY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."IDEMPOTENCY_KEY" IS '멱등성키 | UNIQUE';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."CANCEL_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."CANCEL_YN" IS '취소여부 | Y=역분개';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."ORIGINAL_TX_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."ORIGINAL_TX_REF" IS '원거래ID참조 | 취소건의 원본';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_EXEC_HISTORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_EXEC_HISTORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_INTEREST_SETTLEMENT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_INTEREST_SETTLEMENT" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "SETTLEMENT_SEQ" smallint NOT NULL,
    "PERIOD_START" character varying(8),
    "PERIOD_END" character varying(8),
    "SETTLEMENT_BASIS_CD" character varying(8),
    "DAY_CALC_METHOD_CD" character varying(8),
    "AVG_BALANCE" bigint,
    "APPLY_RATE" numeric(5,3),
    "SETTLEMENT_DAYS" smallint,
    "YEAR_DAYS" smallint,
    "INTEREST_AMOUNT" bigint,
    "SETTLEMENT_DATETIME" character varying(14),
    "SETTLEMENT_TYPE_CD" character varying(8),
    "OVERDUE_PRINCIPAL" bigint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_INTEREST_SETTLEMENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_INTEREST_SETTLEMENT" IS '대출이자정산 | 도메인:대출';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_SEQ" IS '정산일련번호 | 계약 내 정산 순번';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."PERIOD_START"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."PERIOD_START" IS '정산기간시작 | yyyymmdd';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."PERIOD_END"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."PERIOD_END" IS '정산기간종료 | yyyymmdd';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_BASIS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_BASIS_CD" IS '정산기준코드 | 일할/월할';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."DAY_CALC_METHOD_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."DAY_CALC_METHOD_CD" IS '일수계산방식코드 | 365/360/실제';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."AVG_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."AVG_BALANCE" IS '기준잔액평균 | 원';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."APPLY_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."APPLY_RATE" IS '적용금리(%) | %';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_DAYS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_DAYS" IS '정산일수 | 일';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."YEAR_DAYS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."YEAR_DAYS" IS '연일수 | 365 or 360';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."INTEREST_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."INTEREST_AMOUNT" IS '정산이자 | 원';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_DATETIME" IS '정산일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."SETTLEMENT_TYPE_CD" IS '정산구분코드 | 정상/연체/만기';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."OVERDUE_PRINCIPAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."OVERDUE_PRINCIPAL" IS '미납원금기준 | 원 (연체 정산)';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."REMARK" IS '대출이자정산비고';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_INTEREST_SETTLEMENT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_INTEREST_SETTLEMENT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_REPAY_HISTORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_REPAY_HISTORY" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "REPAY_SEQ" smallint NOT NULL,
    "SCHEDULE_REF" smallint,
    "REPAY_DATETIME" character varying(14),
    "REPAY_TYPE_CD" character varying(8),
    "REPAY_PRINCIPAL" bigint,
    "REPAY_NORMAL_INTEREST" bigint,
    "REPAY_OVERDUE_INTEREST" bigint,
    "POST_PRINCIPAL_BALANCE" bigint,
    "WITHDRAW_ACCOUNT_NO" character varying(20),
    "CHANNEL_CD" character varying(8),
    "REPAY_STATUS_CD" character varying(8),
    "AUTO_TRANSFER_ID" bigint,
    "UNPAID_NORMAL_INTEREST" bigint,
    "UNPAID_OVERDUE_INTEREST" bigint,
    "OVERDUE_DAYS" smallint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_REPAY_HISTORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_REPAY_HISTORY" IS '대출상환이력 | 도메인:대출';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_SEQ" IS '상환일련번호 | 계약 내 상환 순번';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."SCHEDULE_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."SCHEDULE_REF" IS '스케줄회차참조 | 스케줄 회차 매핑';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_DATETIME" IS '상환일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_TYPE_CD" IS '상환구분코드 | 정상/중도/연체';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_PRINCIPAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_PRINCIPAL" IS '상환원금 | 원';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_NORMAL_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_NORMAL_INTEREST" IS '상환정상이자 | 원';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_OVERDUE_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_OVERDUE_INTEREST" IS '상환연체이자 | 원';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."POST_PRINCIPAL_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."POST_PRINCIPAL_BALANCE" IS '상환후원금잔액 | 원';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."WITHDRAW_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."WITHDRAW_ACCOUNT_NO" IS '출금계좌번호 | 출금 계좌';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."CHANNEL_CD" IS '채널코드 | 앱/창구/자동이체';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REPAY_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REPAY_STATUS_CD" IS '상환상태코드 | 완료/취소';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."AUTO_TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."AUTO_TRANSFER_ID" IS '자동이체ID | 자동이체 매핑';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."UNPAID_NORMAL_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."UNPAID_NORMAL_INTEREST" IS '미충당정상이자 | 원';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."UNPAID_OVERDUE_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."UNPAID_OVERDUE_INTEREST" IS '미충당연체이자 | 원';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."OVERDUE_DAYS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."OVERDUE_DAYS" IS '연체일수 | 일';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."REMARK" IS '대출상환비고';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_REPAY_HISTORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_HISTORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_REPAY_SCHEDULE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_REPAY_SCHEDULE" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "INSTALLMENT_NO" smallint NOT NULL,
    "ACTUAL_REPAY_ID" bigint,
    "SCHEDULED_DATE" character varying(8),
    "SCHEDULED_PRINCIPAL" bigint,
    "SCHEDULED_INTEREST" bigint,
    "SCHEDULED_TOTAL" bigint,
    "SCHEDULE_STATUS_CD" character varying(8),
    "POST_PRINCIPAL_BALANCE" bigint,
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_REPAY_SCHEDULE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_REPAY_SCHEDULE" IS '대출상환스케줄 | 도메인:대출';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."INSTALLMENT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."INSTALLMENT_NO" IS '회차 | 1~N회차';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."ACTUAL_REPAY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."ACTUAL_REPAY_ID" IS '실제상환ID | 대출상환이력 매핑';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."SCHEDULED_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."SCHEDULED_DATE" IS '예정일자 | yyyymmdd';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."SCHEDULED_PRINCIPAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."SCHEDULED_PRINCIPAL" IS '예정원금 | 원';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."SCHEDULED_INTEREST"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."SCHEDULED_INTEREST" IS '예정이자 | 원';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."SCHEDULED_TOTAL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."SCHEDULED_TOTAL" IS '예정합계 | 원';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."SCHEDULE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."SCHEDULE_STATUS_CD" IS '스케줄상태코드 | 예정/완료/연체';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."POST_PRINCIPAL_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."POST_PRINCIPAL_BALANCE" IS '회차후원금잔액 | 원';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."REMARK" IS '대출상환스케줄비고';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_REPAY_SCHEDULE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REPAY_SCHEDULE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOAN_REVIEW; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOAN_REVIEW" (
    "REVIEW_ID" bigint NOT NULL,
    "APPLY_NO" character varying(20),
    "REVIEW_ROUND" smallint,
    "CUSTOMER_NO" bigint,
    "APPLY_PRODUCT_ID" smallint,
    "LOAN_TYPE_CD" character varying(8),
    "APPLY_AMOUNT" bigint,
    "APPLY_DATETIME" character varying(14),
    "APPLY_CHANNEL_CD" character varying(8),
    "DOC_COMPLETE_DATETIME" character varying(14),
    "CREDIT_INQUIRY_COMPLETE_DT" character varying(14),
    "REVIEW_START_DATETIME" character varying(14),
    "REVIEW_COMPLETE_DATETIME" character varying(14),
    "CREDIT_SCORE" smallint,
    "ESTIMATED_INCOME" bigint,
    "EXISTING_DEBT" bigint,
    "DSR_RATIO" numeric(5,2),
    "DTI_RATIO" numeric(5,2),
    "CREDIT_LIMIT" bigint,
    "DSR_LIMIT" bigint,
    "DTI_LIMIT" bigint,
    "COLLATERAL_LIMIT" bigint,
    "FINAL_APPROVED_LIMIT" bigint,
    "APPROVED_RATE" numeric(5,3),
    "REVIEW_RESULT_CD" character varying(8),
    "REVIEW_DATETIME" character varying(14),
    "REVIEWER_EMP_NO" character varying(20),
    "LOAN_CONTRACT_NO" character varying(20),
    "REVIEW_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOAN_REVIEW"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOAN_REVIEW" IS '대출신청심사 | 도메인:대출';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_ID" IS 'ID | 심사 식별자';


--
-- Name: COLUMN "LOAN_REVIEW"."APPLY_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."APPLY_NO" IS '신청번호 | 신청 매핑';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_ROUND"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_ROUND" IS '회차 | 1차/2차 심사';


--
-- Name: COLUMN "LOAN_REVIEW"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."CUSTOMER_NO" IS '고객번호 | 심사 대상 고객';


--
-- Name: COLUMN "LOAN_REVIEW"."APPLY_PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."APPLY_PRODUCT_ID" IS '신청상품ID | 신청 상품';


--
-- Name: COLUMN "LOAN_REVIEW"."LOAN_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."LOAN_TYPE_CD" IS '대출유형코드 | 대출 유형';


--
-- Name: COLUMN "LOAN_REVIEW"."APPLY_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."APPLY_AMOUNT" IS '신청금액 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."APPLY_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."APPLY_DATETIME" IS '신청일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REVIEW"."APPLY_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."APPLY_CHANNEL_CD" IS '신청채널코드 | 앱/웹/창구';


--
-- Name: COLUMN "LOAN_REVIEW"."DOC_COMPLETE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."DOC_COMPLETE_DATETIME" IS '서류제출완료일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REVIEW"."CREDIT_INQUIRY_COMPLETE_DT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."CREDIT_INQUIRY_COMPLETE_DT" IS '신용조회완료일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_START_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_START_DATETIME" IS '심사착수일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_COMPLETE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_COMPLETE_DATETIME" IS '심사완료일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REVIEW"."CREDIT_SCORE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."CREDIT_SCORE" IS '신용점수 | 신용점수';


--
-- Name: COLUMN "LOAN_REVIEW"."ESTIMATED_INCOME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."ESTIMATED_INCOME" IS '추정연소득 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."EXISTING_DEBT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."EXISTING_DEBT" IS '기존부채총액 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."DSR_RATIO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."DSR_RATIO" IS 'DSR비율 | % (예 35.50)';


--
-- Name: COLUMN "LOAN_REVIEW"."DTI_RATIO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."DTI_RATIO" IS 'DTI비율 | % (예 40.00)';


--
-- Name: COLUMN "LOAN_REVIEW"."CREDIT_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."CREDIT_LIMIT" IS '신용한도 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."DSR_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."DSR_LIMIT" IS 'DSR한도 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."DTI_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."DTI_LIMIT" IS 'DTI한도 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."COLLATERAL_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."COLLATERAL_LIMIT" IS '담보한도 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."FINAL_APPROVED_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."FINAL_APPROVED_LIMIT" IS '최종승인한도 | 원';


--
-- Name: COLUMN "LOAN_REVIEW"."APPROVED_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."APPROVED_RATE" IS '승인금리 | %';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_RESULT_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_RESULT_CD" IS '심사결과코드 | 승인/거절/보류';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_DATETIME" IS '심사일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEWER_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEWER_EMP_NO" IS '심사자사번 | 심사 담당자';


--
-- Name: COLUMN "LOAN_REVIEW"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."LOAN_CONTRACT_NO" IS '대출계약번호 | 승인 후 계약';


--
-- Name: COLUMN "LOAN_REVIEW"."REVIEW_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REVIEW_STATUS_CD" IS '신청심사상태코드 | 대기/진행/완료';


--
-- Name: COLUMN "LOAN_REVIEW"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."REMARK" IS '대출심사비고';


--
-- Name: COLUMN "LOAN_REVIEW"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOAN_REVIEW"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_REVIEW"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOAN_REVIEW"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOAN_REVIEW"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOAN_REVIEW"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: LOST_REPORT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LOST_REPORT" (
    "CUSTOMER_NO" bigint NOT NULL,
    "REPORT_SEQ" smallint NOT NULL,
    "ACCOUNT_NO" character varying(20),
    "REPORT_TYPE_CD" character varying(8),
    "REPORT_DATETIME" character varying(14),
    "REPORT_CHANNEL_CD" character varying(20),
    "REPORT_CONTENT" character varying(1000),
    "REISSUE_REQUEST_DT" character varying(14),
    "LINKED_RESTRICTION_ID" bigint,
    "REISSUE_CARD_NO" character varying(20),
    "PROCESS_STATUS_CD" character varying(8),
    "PROCESS_EMP_NO" character varying(20),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "LOST_REPORT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."LOST_REPORT" IS '분실신고 | 도메인:계좌';


--
-- Name: COLUMN "LOST_REPORT"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "LOST_REPORT"."REPORT_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REPORT_SEQ" IS '신고일련번호 | 고객 내 순번';


--
-- Name: COLUMN "LOST_REPORT"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."ACCOUNT_NO" IS '계좌번호 | 대상 계좌';


--
-- Name: COLUMN "LOST_REPORT"."REPORT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REPORT_TYPE_CD" IS '신고유형코드 | 통장/카드/도장';


--
-- Name: COLUMN "LOST_REPORT"."REPORT_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REPORT_DATETIME" IS '신고일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOST_REPORT"."REPORT_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REPORT_CHANNEL_CD" IS '신고채널코드 | 앱/콜센터/지점';


--
-- Name: COLUMN "LOST_REPORT"."REPORT_CONTENT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REPORT_CONTENT" IS '신고내용 | 신고 상세';


--
-- Name: COLUMN "LOST_REPORT"."REISSUE_REQUEST_DT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REISSUE_REQUEST_DT" IS '재발급요청일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "LOST_REPORT"."LINKED_RESTRICTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."LINKED_RESTRICTION_ID" IS '연결계좌제한ID | 계좌제한 매핑';


--
-- Name: COLUMN "LOST_REPORT"."REISSUE_CARD_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REISSUE_CARD_NO" IS '재발급카드번호 | 신규 카드 번호';


--
-- Name: COLUMN "LOST_REPORT"."PROCESS_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."PROCESS_STATUS_CD" IS '분실처리상태코드 | 대기/완료';


--
-- Name: COLUMN "LOST_REPORT"."PROCESS_EMP_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."PROCESS_EMP_NO" IS '처리직원사번 | 처리 직원';


--
-- Name: COLUMN "LOST_REPORT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."REMARK" IS '분실신고비고';


--
-- Name: COLUMN "LOST_REPORT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "LOST_REPORT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOST_REPORT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "LOST_REPORT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "LOST_REPORT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LOST_REPORT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: MARKETING_AGREE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MARKETING_AGREE" (
    "CUSTOMER_NO" bigint NOT NULL,
    "CHANNEL_CD" character varying(8) NOT NULL,
    "AGREE_YN" character(1),
    "AGREE_DATETIME" character varying(14),
    "AGREE_CHANNEL_CD" character varying(8),
    "WITHDRAW_DATETIME" character varying(14),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "MARKETING_AGREE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."MARKETING_AGREE" IS '마케팅수신동의 | 도메인:약관';


--
-- Name: COLUMN "MARKETING_AGREE"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."CUSTOMER_NO" IS '고객번호 | 고객';


--
-- Name: COLUMN "MARKETING_AGREE"."CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."CHANNEL_CD" IS '수신수단코드 | SMS/이메일/푸시/우편';


--
-- Name: COLUMN "MARKETING_AGREE"."AGREE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."AGREE_YN" IS '동의여부 | Y=동의';


--
-- Name: COLUMN "MARKETING_AGREE"."AGREE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."AGREE_DATETIME" IS '동의일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "MARKETING_AGREE"."AGREE_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."AGREE_CHANNEL_CD" IS '동의경로코드 | 경로';


--
-- Name: COLUMN "MARKETING_AGREE"."WITHDRAW_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."WITHDRAW_DATETIME" IS '철회일시 | yyyymmddhhmmss 형식 | 철회 시점';


--
-- Name: COLUMN "MARKETING_AGREE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."REMARK" IS '마케팅수신비고';


--
-- Name: COLUMN "MARKETING_AGREE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "MARKETING_AGREE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "MARKETING_AGREE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "MARKETING_AGREE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "MARKETING_AGREE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."MARKETING_AGREE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: OVERDRAFT_DAILY_USAGE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OVERDRAFT_DAILY_USAGE" (
    "LOAN_CONTRACT_NO" character varying(20) NOT NULL,
    "BASE_DATE" character varying(8) NOT NULL,
    "DAY_START_BALANCE" bigint,
    "DAY_MAX_USAGE" bigint,
    "DAY_END_BALANCE" bigint,
    "AGGREGATE_DATETIME" character varying(14),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "OVERDRAFT_DAILY_USAGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."OVERDRAFT_DAILY_USAGE" IS '마통일별사용 | 도메인:대출';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."LOAN_CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."LOAN_CONTRACT_NO" IS '대출계약번호 | 대출계약 (마통)';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."BASE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."BASE_DATE" IS '기준일자 | yyyymmdd';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."DAY_START_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."DAY_START_BALANCE" IS '일시작잔액 | 원';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."DAY_MAX_USAGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."DAY_MAX_USAGE" IS '일최고사용금액 | 원';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."DAY_END_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."DAY_END_BALANCE" IS '일종료잔액 | 원';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."AGGREGATE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."AGGREGATE_DATETIME" IS '집계일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."REMARK" IS '마통일별비고';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "OVERDRAFT_DAILY_USAGE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."OVERDRAFT_DAILY_USAGE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PARTY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PARTY" (
    "PARTY_ID" bigint NOT NULL,
    "PARTY_TYPE_CD" character varying(8),
    "PARTY_NAME" character varying(100),
    "PARTY_ID_NO" character varying(50),
    "ID_NO_TYPE_CD" character varying(8),
    "BIRTH_FOUND_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PARTY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PARTY" IS '관계자 | 도메인:관계자';


--
-- Name: COLUMN "PARTY"."PARTY_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."PARTY_ID" IS '관계자ID | 관계자 식별자';


--
-- Name: COLUMN "PARTY"."PARTY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."PARTY_TYPE_CD" IS '관계자유형코드 | B00100=개인 / B00101=법인 / B00106=외부기관';


--
-- Name: COLUMN "PARTY"."PARTY_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."PARTY_NAME" IS '관계자명칭 | 개인=실명 / 법인=법인명';


--
-- Name: COLUMN "PARTY"."PARTY_ID_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."PARTY_ID_NO" IS '관계자식별번호 | 주민번호(암호화) / 사업자번호';


--
-- Name: COLUMN "PARTY"."ID_NO_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."ID_NO_TYPE_CD" IS '식별번호유형코드 | B00200=주민 / B00201=외국인 / B00202=사업자';


--
-- Name: COLUMN "PARTY"."BIRTH_FOUND_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."BIRTH_FOUND_DATE" IS '설립또는탄생일자 | yyyymmdd';


--
-- Name: COLUMN "PARTY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."REMARK" IS '관계자비고';


--
-- Name: COLUMN "PARTY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PARTY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PARTY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PARTY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PARTY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PARTY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PERMISSION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PERMISSION" (
    "PERMISSION_ID" smallint NOT NULL,
    "PERMISSION_NAME" character varying(40),
    "PERMISSION_DESC" character varying(1000),
    "BASE_FEE" integer,
    "BASE_LIMIT" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PERMISSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PERMISSION" IS '권한 | 도메인:고객';


--
-- Name: COLUMN "PERMISSION"."PERMISSION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."PERMISSION_ID" IS '권한ID | 권한 식별자';


--
-- Name: COLUMN "PERMISSION"."PERMISSION_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."PERMISSION_NAME" IS '권한명 | 권한 표시명';


--
-- Name: COLUMN "PERMISSION"."PERMISSION_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."PERMISSION_DESC" IS '권한설명 | 권한 설명';


--
-- Name: COLUMN "PERMISSION"."BASE_FEE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."BASE_FEE" IS '기본수수료 | 원';


--
-- Name: COLUMN "PERMISSION"."BASE_LIMIT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."BASE_LIMIT" IS '기본한도 | 원';


--
-- Name: COLUMN "PERMISSION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PERMISSION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PERMISSION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PERMISSION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PERMISSION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PERMISSION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT" (
    "PRODUCT_ID" smallint NOT NULL,
    "PRODUCT_NAME" character varying(80),
    "PRODUCT_TYPE_CD" character varying(8),
    "SPECIAL_YN" character(1),
    "PREPAY_DEFER_YN" character(1),
    "EARLY_CLOSE_YN" character(1),
    "EXTEND_YN" character(1),
    "MIN_AGE" smallint,
    "MAX_AGE" smallint,
    "MATURITY_POLICY_CD" character varying(8),
    "TARGET_CUSTOMER_CD" character varying(8),
    "MIN_AMOUNT" bigint,
    "MAX_AMOUNT" bigint,
    "MIN_MONTHLY_AMT" integer,
    "MAX_MONTHLY_AMT" integer,
    "INTEREST_CYCLE_CD" character varying(8),
    "LAUNCH_DATE" character varying(8),
    "SALE_START_DATE" character varying(8),
    "SALE_END_DATE" character varying(8),
    "PRODUCT_STATUS_CD" character varying(8),
    "PRODUCT_DESC" text,
    "PRODUCT_FEATURES" character varying(500),
    "OWNER_DEPT" character varying(50),
    "REMARK" character varying(1000),
    "SUBSCRIBER_COUNT" integer,
    "TOTAL_BALANCE" bigint,
    "PENALTY_RATE" numeric(4,3),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT" IS '상품 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PRODUCT_ID" IS '상품ID | 상품 식별자';


--
-- Name: COLUMN "PRODUCT"."PRODUCT_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PRODUCT_NAME" IS '상품명 | 상품 표시명';


--
-- Name: COLUMN "PRODUCT"."PRODUCT_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PRODUCT_TYPE_CD" IS '상품유형코드 | 710100=예금/710101=적금/710200=대출';


--
-- Name: COLUMN "PRODUCT"."SPECIAL_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."SPECIAL_YN" IS '특판여부 | Y=특판 한정';


--
-- Name: COLUMN "PRODUCT"."PREPAY_DEFER_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PREPAY_DEFER_YN" IS '선납이연가능 | Y=선납/이연 가능 (적금)';


--
-- Name: COLUMN "PRODUCT"."EARLY_CLOSE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."EARLY_CLOSE_YN" IS '중도해지가능 | Y=중도해지 가능';


--
-- Name: COLUMN "PRODUCT"."EXTEND_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."EXTEND_YN" IS '만기연장가능 | Y=자동재예치 가능';


--
-- Name: COLUMN "PRODUCT"."MIN_AGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MIN_AGE" IS '가입대상최소연령 | 만 연령';


--
-- Name: COLUMN "PRODUCT"."MAX_AGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MAX_AGE" IS '가입대상최대연령 | 만 연령';


--
-- Name: COLUMN "PRODUCT"."MATURITY_POLICY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MATURITY_POLICY_CD" IS '만기처리정책코드 | 자동지급/자동재예치';


--
-- Name: COLUMN "PRODUCT"."TARGET_CUSTOMER_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."TARGET_CUSTOMER_CD" IS '가입대상코드 | 전체/직장인/공무원';


--
-- Name: COLUMN "PRODUCT"."MIN_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MIN_AMOUNT" IS '최소가입금액 | 원';


--
-- Name: COLUMN "PRODUCT"."MAX_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MAX_AMOUNT" IS '최대가입금액 | 원';


--
-- Name: COLUMN "PRODUCT"."MIN_MONTHLY_AMT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MIN_MONTHLY_AMT" IS '월최소납입금액 | 원 (적금)';


--
-- Name: COLUMN "PRODUCT"."MAX_MONTHLY_AMT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."MAX_MONTHLY_AMT" IS '월최대납입금액 | 원 (적금)';


--
-- Name: COLUMN "PRODUCT"."INTEREST_CYCLE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."INTEREST_CYCLE_CD" IS '이자정산주기코드 | 월/분기/만기';


--
-- Name: COLUMN "PRODUCT"."LAUNCH_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."LAUNCH_DATE" IS '상품출시일 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT"."SALE_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."SALE_START_DATE" IS '판매시작일 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT"."SALE_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."SALE_END_DATE" IS '판매종료일 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT"."PRODUCT_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PRODUCT_STATUS_CD" IS '상품상태코드 | P01=판매중/P02=종료';


--
-- Name: COLUMN "PRODUCT"."PRODUCT_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PRODUCT_DESC" IS '상품설명 | 광고용 설명';


--
-- Name: COLUMN "PRODUCT"."PRODUCT_FEATURES"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PRODUCT_FEATURES" IS '상품특징 | 주요 특징';


--
-- Name: COLUMN "PRODUCT"."OWNER_DEPT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."OWNER_DEPT" IS '담당부서 | 상품 관리 부서';


--
-- Name: COLUMN "PRODUCT"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."REMARK" IS '상품비고';


--
-- Name: COLUMN "PRODUCT"."SUBSCRIBER_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."SUBSCRIBER_COUNT" IS '가입자수캐시 | 현재 가입자 수 캐시';


--
-- Name: COLUMN "PRODUCT"."TOTAL_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."TOTAL_BALANCE" IS '총잔액캐시 | 원. 총 잔액 캐시';


--
-- Name: COLUMN "PRODUCT"."PENALTY_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."PENALTY_RATE" IS '중도해지패널티율 | % (예 0.500)';


--
-- Name: COLUMN "PRODUCT"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT_BONUS_CONDITION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT_BONUS_CONDITION" (
    "PRODUCT_ID" smallint NOT NULL,
    "BONUS_SEQ" smallint NOT NULL,
    "BONUS_TYPE_CD" character varying(8),
    "EVAL_CYCLE_CD" character varying(8),
    "BONUS_RATE" numeric(5,3),
    "MIN_COUNT" smallint,
    "MIN_AMOUNT" integer,
    "MIN_PERIOD_MONTHS" smallint,
    "STACKABLE_YN" character(1),
    "CONDITION_DESC" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT_BONUS_CONDITION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT_BONUS_CONDITION" IS '상품우대조건 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."BONUS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."BONUS_SEQ" IS '우대조건일련번호 | 상품 내 일련번호';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."BONUS_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."BONUS_TYPE_CD" IS '우대조건유형코드 | 급여/카드/자동이체';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."EVAL_CYCLE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."EVAL_CYCLE_CD" IS '평가주기코드 | 월/분기/만기';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."BONUS_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."BONUS_RATE" IS '우대금리(%) | % (예 0.300)';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."MIN_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."MIN_COUNT" IS '최소충족횟수 | 월 N회';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."MIN_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."MIN_AMOUNT" IS '최소충족금액 | 원';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."MIN_PERIOD_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."MIN_PERIOD_MONTHS" IS '최소충족기간개월 | 월';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."STACKABLE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."STACKABLE_YN" IS '중복적용여부 | Y=다른 우대와 중복';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."CONDITION_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."CONDITION_DESC" IS '조건설명 | 조건 텍스트';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_BONUS_CONDITION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_BONUS_CONDITION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT_COVENANT_MAPPING; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT_COVENANT_MAPPING" (
    "PRODUCT_ID" smallint NOT NULL,
    "COVENANT_ID" bigint NOT NULL,
    "REQUIRED_YN" character(1),
    "DEFAULT_YN" character(1),
    "MAPPING_START_DATE" character varying(8),
    "MAPPING_END_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT_COVENANT_MAPPING"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT_COVENANT_MAPPING" IS '상품특약매핑 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."COVENANT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."COVENANT_ID" IS '특약ID | 특약';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."REQUIRED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."REQUIRED_YN" IS '필수여부 | Y=필수';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."DEFAULT_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."DEFAULT_YN" IS '기본선택여부 | Y=기본 체크';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."MAPPING_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."MAPPING_START_DATE" IS '매핑시작일자 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."MAPPING_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."MAPPING_END_DATE" IS '매핑종료일자 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."REMARK" IS '상품특약매핑비고';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_COVENANT_MAPPING"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_COVENANT_MAPPING"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT_PERIOD; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT_PERIOD" (
    "PRODUCT_ID" smallint NOT NULL,
    "PERIOD_SEQ" smallint NOT NULL,
    "MIN_MONTHS" smallint,
    "MAX_MONTHS" smallint,
    "PERIOD_LABEL" character varying(100),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT_PERIOD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT_PERIOD" IS '상품가입기간 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT_PERIOD"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "PRODUCT_PERIOD"."PERIOD_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."PERIOD_SEQ" IS '가입기간일련번호 | 상품 내 일련번호';


--
-- Name: COLUMN "PRODUCT_PERIOD"."MIN_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."MIN_MONTHS" IS '가입기간최소개월 | 최소 개월수';


--
-- Name: COLUMN "PRODUCT_PERIOD"."MAX_MONTHS"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."MAX_MONTHS" IS '가입기간최대개월 | 최대 개월수';


--
-- Name: COLUMN "PRODUCT_PERIOD"."PERIOD_LABEL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."PERIOD_LABEL" IS '구간라벨 | 12개월/24개월';


--
-- Name: COLUMN "PRODUCT_PERIOD"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT_PERIOD"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_PERIOD"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT_PERIOD"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_PERIOD"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_PERIOD"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT_RATE_POLICY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT_RATE_POLICY" (
    "PRODUCT_ID" smallint NOT NULL,
    "RATE_SEQ" smallint NOT NULL,
    "POLICY_TYPE_CD" character varying(8),
    "PERIOD_ID" bigint,
    "TIMING_LABEL" character varying(20),
    "APPLY_RATE" numeric(5,3),
    "TIER_YN" character(1),
    "TIER_MIN_AMOUNT" bigint,
    "TIER_MAX_AMOUNT" bigint,
    "POST_MATURITY_START" smallint,
    "POST_MATURITY_END" smallint,
    "CONTRACT_RATE_PCT" numeric(5,3),
    "POLICY_START_DATE" character varying(8),
    "POLICY_END_DATE" character varying(8),
    "LIMIT_COUNT" integer,
    "SOLD_COUNT" integer,
    "POLICY_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT_RATE_POLICY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT_RATE_POLICY" IS '상품금리정책 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."RATE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."RATE_SEQ" IS '금리정책일련번호 | 상품 내 일련번호';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."POLICY_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."POLICY_TYPE_CD" IS '정책유형코드 | 기본/만기/중도해지';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."PERIOD_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."PERIOD_ID" IS '가입기간ID | 상품가입기간 참조';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."TIMING_LABEL"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."TIMING_LABEL" IS '시점라벨 | 계약시/만기/중도';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."APPLY_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."APPLY_RATE" IS '적용금리(%) | % (예 3.500)';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."TIER_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."TIER_YN" IS '구간별차등여부 | Y=금액 구간별 차등';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."TIER_MIN_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."TIER_MIN_AMOUNT" IS '구간최소금액 | 원';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."TIER_MAX_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."TIER_MAX_AMOUNT" IS '구간최대금액 | 원';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."POST_MATURITY_START"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."POST_MATURITY_START" IS '만기후경과개월시작 | 만기 후 N개월 시작';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."POST_MATURITY_END"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."POST_MATURITY_END" IS '만기후경과개월종료 | 만기 후 N개월 종료';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."CONTRACT_RATE_PCT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."CONTRACT_RATE_PCT" IS '약정금리비율(%) | 약정금리 대비 %';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."POLICY_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."POLICY_START_DATE" IS '정책시작일자 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."POLICY_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."POLICY_END_DATE" IS '정책종료일자 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."LIMIT_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."LIMIT_COUNT" IS '한도좌수 | 판매 한정';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."SOLD_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."SOLD_COUNT" IS '판매좌수 | 현재 판매 좌수';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."POLICY_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."POLICY_STATUS_CD" IS '정책상태코드 | 적용/중단';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."REMARK" IS '상품금리정책비고';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_RATE_POLICY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_RATE_POLICY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT_SALES_SCOPE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT_SALES_SCOPE" (
    "PRODUCT_ID" smallint NOT NULL,
    "SCOPE_SEQ" smallint NOT NULL,
    "SCOPE_TYPE_CD" character varying(8),
    "CHANNEL_CD" character varying(8),
    "BRANCH_CD" character varying(10),
    "CHANNEL_BONUS_RATE" numeric(5,3),
    "LIMITED_COUNT" integer,
    "SALE_START_DATE" character varying(8),
    "SALE_END_DATE" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT_SALES_SCOPE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT_SALES_SCOPE" IS '상품판매범위 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."SCOPE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."SCOPE_SEQ" IS '판매범위일련번호 | 상품 내 일련번호';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."SCOPE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."SCOPE_TYPE_CD" IS '판매범위유형코드 | 채널/지점/한정좌수';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."CHANNEL_CD" IS '채널코드 | 앱/웹/창구';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."BRANCH_CD" IS '지점코드 | 특정 지점';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."CHANNEL_BONUS_RATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."CHANNEL_BONUS_RATE" IS '채널별우대금리(%) | %';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."LIMITED_COUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."LIMITED_COUNT" IS '한정좌수 | 판매 한정 좌수';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."SALE_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."SALE_START_DATE" IS '판매시작일자 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."SALE_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."SALE_END_DATE" IS '판매종료일자 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."REMARK" IS '상품판매범위비고';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_SALES_SCOPE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_SALES_SCOPE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: PRODUCT_TERMS_MAPPING; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PRODUCT_TERMS_MAPPING" (
    "PRODUCT_ID" smallint NOT NULL,
    "MAPPING_SEQ" smallint NOT NULL,
    "TERMS_ID" bigint,
    "AGREE_REQUIRED_YN" character(1),
    "APPLY_START_DATE" character varying(8),
    "APPLY_END_DATE" character varying(8),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "PRODUCT_TERMS_MAPPING"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."PRODUCT_TERMS_MAPPING" IS '상품약관매핑 | 도메인:상품';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."PRODUCT_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."PRODUCT_ID" IS '상품ID | 상품';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."MAPPING_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."MAPPING_SEQ" IS '매핑일련번호 | 상품 내 일련번호';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."TERMS_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."TERMS_ID" IS '약관ID | 약관';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."AGREE_REQUIRED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."AGREE_REQUIRED_YN" IS '동의필수여부 | Y=필수';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."APPLY_START_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."APPLY_START_DATE" IS '적용시작일 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."APPLY_END_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."APPLY_END_DATE" IS '적용종료일 | yyyymmdd';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "PRODUCT_TERMS_MAPPING"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PRODUCT_TERMS_MAPPING"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ROLE_TYPE_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ROLE_TYPE_MASTER" (
    "ROLE_TYPE_ID" character varying(8) NOT NULL,
    "ROLE_TYPE_NAME" character varying(50),
    "ROLE_CATEGORY_CD" character varying(8),
    "RELATED_PARTY_YN" character(1),
    "ROLE_DESC" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "ROLE_TYPE_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ROLE_TYPE_MASTER" IS '역할유형마스터 | 도메인:관계자';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."ROLE_TYPE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."ROLE_TYPE_ID" IS '역할유형ID | RT001~RT306 등';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."ROLE_TYPE_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."ROLE_TYPE_NAME" IS '역할유형명 | 회사원/배우자/보증인 등';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."ROLE_CATEGORY_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."ROLE_CATEGORY_CD" IS '역할카테고리코드 | RC100=직업 / RC101=가족';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."RELATED_PARTY_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."RELATED_PARTY_YN" IS '관련관계자필요여부 | Y=배우자 등 짝 필요';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."ROLE_DESC"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."ROLE_DESC" IS '역할유형설명';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "ROLE_TYPE_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ROLE_TYPE_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: SIGNATURE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SIGNATURE" (
    "SIGNATURE_ID" bigint NOT NULL,
    "CUSTOMER_NO" bigint,
    "CONTRACT_NO" character varying(20),
    "CLOSE_ID" bigint,
    "AGREE_SEQ" bigint,
    "SIGN_PURPOSE_CD" character varying(8),
    "SIGN_METHOD_CD" character varying(8),
    "SIGN_TEXT" text,
    "SIGN_VALUE" bytea,
    "SIGN_CERT" bytea,
    "AUTH_REQUEST_ID" character varying(100),
    "AUTH_RESULT_TOKEN" character varying(100),
    "SIGN_IMG_PATH" character varying(500),
    "SIGN_DEVICE_ID" bigint,
    "SIGN_DATETIME" character varying(14),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "SIGNATURE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."SIGNATURE" IS '서명 | 도메인:서명';


--
-- Name: COLUMN "SIGNATURE"."SIGNATURE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGNATURE_ID" IS '서명ID | 서명 식별자';


--
-- Name: COLUMN "SIGNATURE"."CUSTOMER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."CUSTOMER_NO" IS '고객번호 | 서명자';


--
-- Name: COLUMN "SIGNATURE"."CONTRACT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."CONTRACT_NO" IS '계약번호 | 관련 계약';


--
-- Name: COLUMN "SIGNATURE"."CLOSE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."CLOSE_ID" IS '해지ID | 관련 해지 이력';


--
-- Name: COLUMN "SIGNATURE"."AGREE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."AGREE_SEQ" IS '동의일련번호 | 관련 동의';


--
-- Name: COLUMN "SIGNATURE"."SIGN_PURPOSE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_PURPOSE_CD" IS '서명용도코드 | 계약/해지/위임';


--
-- Name: COLUMN "SIGNATURE"."SIGN_METHOD_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_METHOD_CD" IS '서명방식코드 | 전자/필기/공동인증서';


--
-- Name: COLUMN "SIGNATURE"."SIGN_TEXT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_TEXT" IS '서명원문 | 서명 대상 원문';


--
-- Name: COLUMN "SIGNATURE"."SIGN_VALUE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_VALUE" IS '서명값 | 서명 데이터 (이미지/해시)';


--
-- Name: COLUMN "SIGNATURE"."SIGN_CERT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_CERT" IS '서명인증서 | 공동인증서';


--
-- Name: COLUMN "SIGNATURE"."AUTH_REQUEST_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."AUTH_REQUEST_ID" IS '인증요청ID | 인증기관 요청 ID';


--
-- Name: COLUMN "SIGNATURE"."AUTH_RESULT_TOKEN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."AUTH_RESULT_TOKEN" IS '인증결과토큰 | 인증기관 응답 토큰';


--
-- Name: COLUMN "SIGNATURE"."SIGN_IMG_PATH"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_IMG_PATH" IS '서명이미지경로 | 이미지 저장 경로';


--
-- Name: COLUMN "SIGNATURE"."SIGN_DEVICE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_DEVICE_ID" IS '서명단말기ID | 서명단말기';


--
-- Name: COLUMN "SIGNATURE"."SIGN_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."SIGN_DATETIME" IS '서명일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "SIGNATURE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."REMARK" IS '서명비고';


--
-- Name: COLUMN "SIGNATURE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "SIGNATURE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "SIGNATURE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "SIGNATURE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "SIGNATURE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGNATURE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: SIGN_DEVICE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SIGN_DEVICE" (
    "DEVICE_ID" bigint NOT NULL,
    "DEVICE_TYPE_CD" character varying(8),
    "DEVICE_NAME" character varying(50),
    "INSTALL_LOCATION" character varying(50),
    "SERIAL_NO" character varying(20),
    "REG_DATE" character varying(8),
    "DEVICE_STATUS_CD" character varying(8),
    "REMARK" character varying(1000),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "SIGN_DEVICE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."SIGN_DEVICE" IS '서명단말기 | 도메인:서명';


--
-- Name: COLUMN "SIGN_DEVICE"."DEVICE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."DEVICE_ID" IS '단말기ID | 서명 단말기 식별';


--
-- Name: COLUMN "SIGN_DEVICE"."DEVICE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."DEVICE_TYPE_CD" IS '단말기유형코드 | 태블릿/패드/펜';


--
-- Name: COLUMN "SIGN_DEVICE"."DEVICE_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."DEVICE_NAME" IS '단말기명 | 별명';


--
-- Name: COLUMN "SIGN_DEVICE"."INSTALL_LOCATION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."INSTALL_LOCATION" IS '설치위치 | 지점/창구 번호';


--
-- Name: COLUMN "SIGN_DEVICE"."SERIAL_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."SERIAL_NO" IS '시리얼번호 | 제조사 시리얼';


--
-- Name: COLUMN "SIGN_DEVICE"."REG_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."REG_DATE" IS '단말기등록일자 | yyyymmdd';


--
-- Name: COLUMN "SIGN_DEVICE"."DEVICE_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."DEVICE_STATUS_CD" IS '단말기상태코드 | 운영/수리/폐기';


--
-- Name: COLUMN "SIGN_DEVICE"."REMARK"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."REMARK" IS '서명단말기비고';


--
-- Name: COLUMN "SIGN_DEVICE"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "SIGN_DEVICE"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "SIGN_DEVICE"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "SIGN_DEVICE"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "SIGN_DEVICE"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SIGN_DEVICE"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: TERMS_CHANGE_HISTORY; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TERMS_CHANGE_HISTORY" (
    "TERMS_ID" bigint NOT NULL,
    "CHANGE_SEQ" integer NOT NULL,
    "PREV_TERMS_ID" bigint,
    "CHANGE_TYPE_CD" character varying(8),
    "CHANGE_REASON" character varying(1000),
    "ORDER_NO" character varying(30),
    "EFFECTIVE_DATE" character varying(8),
    "OWNER" character varying(50),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "TERMS_CHANGE_HISTORY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."TERMS_CHANGE_HISTORY" IS '약관변경이력 | 도메인:약관';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."TERMS_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."TERMS_ID" IS '약관ID | 약관';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."CHANGE_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."CHANGE_SEQ" IS '변경일련번호 | 약관 내 변경 순번';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."PREV_TERMS_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."PREV_TERMS_ID" IS '이전버전약관ID | 이전 버전 참조';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."CHANGE_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."CHANGE_TYPE_CD" IS '변경유형코드 | 신규/개정/폐지';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."CHANGE_REASON"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."CHANGE_REASON" IS '변경사유 | 변경 사유 상세';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."ORDER_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."ORDER_NO" IS '시정명령번호 | 금감원 시정명령 번호';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."EFFECTIVE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."EFFECTIVE_DATE" IS '변경시행일자 | yyyymmdd';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."OWNER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."OWNER" IS '담당자 | 담당자명';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TERMS_CHANGE_HISTORY"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_CHANGE_HISTORY"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: TERMS_MASTER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TERMS_MASTER" (
    "TERMS_ID" bigint NOT NULL,
    "TERMS_TYPE_CD" character varying(8),
    "TERMS_NAME" character varying(80),
    "VERSION" smallint,
    "AGREE_REQUIRED_YN" character(1),
    "RE_AGREE_YN" character(1),
    "EFFECTIVE_DATE" character varying(8),
    "EXPIRE_DATE" character varying(8),
    "TERMS_BODY" text,
    "TERMS_STATUS_CD" character varying(8),
    "OWNER_DEPT" character varying(50),
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "TERMS_MASTER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."TERMS_MASTER" IS '약관마스터 | 도메인:약관';


--
-- Name: COLUMN "TERMS_MASTER"."TERMS_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."TERMS_ID" IS '약관ID | 약관 식별자';


--
-- Name: COLUMN "TERMS_MASTER"."TERMS_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."TERMS_TYPE_CD" IS '약관유형코드 | 가입/상품/마케팅 등';


--
-- Name: COLUMN "TERMS_MASTER"."TERMS_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."TERMS_NAME" IS '약관명 | 약관 표시명';


--
-- Name: COLUMN "TERMS_MASTER"."VERSION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."VERSION" IS '버전 | 버전 번호';


--
-- Name: COLUMN "TERMS_MASTER"."AGREE_REQUIRED_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."AGREE_REQUIRED_YN" IS '동의필수여부 | Y=필수';


--
-- Name: COLUMN "TERMS_MASTER"."RE_AGREE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."RE_AGREE_YN" IS '재동의필요여부 | Y=개정 시 재동의';


--
-- Name: COLUMN "TERMS_MASTER"."EFFECTIVE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."EFFECTIVE_DATE" IS '약관시행일자 | yyyymmdd';


--
-- Name: COLUMN "TERMS_MASTER"."EXPIRE_DATE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."EXPIRE_DATE" IS '약관폐기일자 | yyyymmdd';


--
-- Name: COLUMN "TERMS_MASTER"."TERMS_BODY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."TERMS_BODY" IS '약관본문 | 약관 전문 텍스트';


--
-- Name: COLUMN "TERMS_MASTER"."TERMS_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."TERMS_STATUS_CD" IS '약관상태코드 | 시행/폐기/검토';


--
-- Name: COLUMN "TERMS_MASTER"."OWNER_DEPT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."OWNER_DEPT" IS '관리부서 | 약관 관리 부서';


--
-- Name: COLUMN "TERMS_MASTER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "TERMS_MASTER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TERMS_MASTER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "TERMS_MASTER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TERMS_MASTER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TERMS_MASTER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: TRANSACTION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TRANSACTION" (
    "TRANSACTION_ID" bigint NOT NULL,
    "ACCOUNT_NO" character varying(20),
    "TX_DATETIME" character varying(14),
    "TX_TYPE_CD" character varying(8),
    "TX_AMOUNT" bigint,
    "POST_TX_BALANCE" bigint,
    "COUNTERPART_ACCOUNT_NO" character varying(20),
    "COUNTERPART_BANK_CD" character(3),
    "COUNTERPART_BANK_NAME" character varying(40),
    "COUNTERPART_HOLDER_NAME" character varying(20),
    "OWN_BANK_YN" character(1),
    "TX_CHANNEL_CD" character varying(8),
    "TX_STATUS_CD" character varying(8),
    "FAILURE_REASON_CD" character varying(8),
    "TX_MEMO" character varying(1000),
    "TRANSFER_ID" bigint,
    "CLOSE_ID" bigint,
    "SETTLEMENT_SEQ_REF" bigint,
    "ACCESS_SEQ" bigint,
    "PROCESS_BRANCH_CD" character varying(10),
    "EXEC_SEQ_REF" bigint,
    "REPAY_SEQ_REF" bigint,
    "IDEMPOTENCY_KEY" character varying(64),
    "CANCEL_YN" character(1),
    "ORIGINAL_TX_REF" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "TRANSACTION"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."TRANSACTION" IS '거래 | 도메인:거래';


--
-- Name: COLUMN "TRANSACTION"."TRANSACTION_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TRANSACTION_ID" IS '거래ID | 거래 식별자';


--
-- Name: COLUMN "TRANSACTION"."ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."ACCOUNT_NO" IS '계좌번호 | 거래 발생 계좌';


--
-- Name: COLUMN "TRANSACTION"."TX_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TX_DATETIME" IS '거래일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "TRANSACTION"."TX_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TX_TYPE_CD" IS '거래구분코드 | 410100=입금/410101=출금';


--
-- Name: COLUMN "TRANSACTION"."TX_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TX_AMOUNT" IS '거래금액 | 원';


--
-- Name: COLUMN "TRANSACTION"."POST_TX_BALANCE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."POST_TX_BALANCE" IS '거래후잔액 | 원 (잔액 스냅샷)';


--
-- Name: COLUMN "TRANSACTION"."COUNTERPART_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."COUNTERPART_ACCOUNT_NO" IS '상대계좌번호 | 상대 계좌';


--
-- Name: COLUMN "TRANSACTION"."COUNTERPART_BANK_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."COUNTERPART_BANK_CD" IS '상대은행코드 | 상대 은행';


--
-- Name: COLUMN "TRANSACTION"."COUNTERPART_BANK_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."COUNTERPART_BANK_NAME" IS '상대은행명 | 상대 은행명';


--
-- Name: COLUMN "TRANSACTION"."COUNTERPART_HOLDER_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."COUNTERPART_HOLDER_NAME" IS '상대예금주명 | 상대 예금주';


--
-- Name: COLUMN "TRANSACTION"."OWN_BANK_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."OWN_BANK_YN" IS '당행여부 | Y=당행';


--
-- Name: COLUMN "TRANSACTION"."TX_CHANNEL_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TX_CHANNEL_CD" IS '거래채널코드 | 590100=웹/590101=앱/590102=ATM';


--
-- Name: COLUMN "TRANSACTION"."TX_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TX_STATUS_CD" IS '거래상태코드 | 790100=완료/790101=취소';


--
-- Name: COLUMN "TRANSACTION"."FAILURE_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."FAILURE_REASON_CD" IS '실패사유코드 | 실패 사유';


--
-- Name: COLUMN "TRANSACTION"."TX_MEMO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TX_MEMO" IS '거래메모 | 통장 적요';


--
-- Name: COLUMN "TRANSACTION"."TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."TRANSFER_ID" IS '이체ID | 이체 매핑';


--
-- Name: COLUMN "TRANSACTION"."CLOSE_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."CLOSE_ID" IS '해지ID | 해지 매핑';


--
-- Name: COLUMN "TRANSACTION"."SETTLEMENT_SEQ_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."SETTLEMENT_SEQ_REF" IS '정산일련번호참조 | 이자정산 매핑';


--
-- Name: COLUMN "TRANSACTION"."ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."ACCESS_SEQ" IS '접속일련번호 | 접속 기록';


--
-- Name: COLUMN "TRANSACTION"."PROCESS_BRANCH_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."PROCESS_BRANCH_CD" IS '처리지점코드 | 창구 거래 시';


--
-- Name: COLUMN "TRANSACTION"."EXEC_SEQ_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."EXEC_SEQ_REF" IS '실행일련번호참조 | 대출실행 매핑';


--
-- Name: COLUMN "TRANSACTION"."REPAY_SEQ_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."REPAY_SEQ_REF" IS '상환일련번호참조 | 대출상환 매핑';


--
-- Name: COLUMN "TRANSACTION"."IDEMPOTENCY_KEY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."IDEMPOTENCY_KEY" IS '멱등성키 | UNIQUE';


--
-- Name: COLUMN "TRANSACTION"."CANCEL_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."CANCEL_YN" IS '취소여부 | Y=역분개';


--
-- Name: COLUMN "TRANSACTION"."ORIGINAL_TX_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."ORIGINAL_TX_REF" IS '원거래ID참조 | 취소건 원본';


--
-- Name: COLUMN "TRANSACTION"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "TRANSACTION"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TRANSACTION"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "TRANSACTION"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TRANSACTION"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSACTION"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: TRANSFER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TRANSFER" (
    "TRANSFER_ID" bigint NOT NULL,
    "WITHDRAW_ACCOUNT_NO" character varying(20),
    "WITHDRAW_BANK_CD" character(3),
    "WITHDRAW_BANK_NAME" character varying(40),
    "WITHDRAW_HOLDER_NAME" character varying(20),
    "DEPOSIT_ACCOUNT_NO" character varying(20),
    "DEPOSIT_BANK_CD" character(3),
    "DEPOSIT_BANK_NAME" character varying(40),
    "DEPOSIT_HOLDER_NAME" character varying(20),
    "ENTERED_HOLDER_NAME" character varying(20),
    "HOLDER_MATCH_YN" character(1),
    "TRANSFER_AMOUNT" bigint,
    "FEE" integer,
    "REQUEST_DATETIME" character varying(14),
    "COMPLETE_DATETIME" character varying(14),
    "TRANSFER_TYPE_CD" character varying(8),
    "TRANSFER_STATUS_CD" character varying(8),
    "FAILURE_REASON_CD" character varying(8),
    "COUNTERPART_APPROVAL_NO" character varying(30),
    "RESPONSE_MESSAGE" character varying(200),
    "TRANSFER_MEMO" character varying(1000),
    "AUTO_TRANSFER_ID" bigint,
    "ACCESS_SEQ" bigint,
    "WITHDRAW_MEMO" character varying(30),
    "DEPOSIT_MEMO" character varying(30),
    "IDEMPOTENCY_KEY" character varying(64),
    "CANCEL_YN" character(1),
    "ORIGINAL_TX_REF" bigint,
    "DELETE_YN" character(1) DEFAULT 'N'::bpchar,
    "CREATED_BY" character varying(20),
    "CREATED_AT" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_BY" character varying(20),
    "UPDATED_AT" timestamp without time zone
);


--
-- Name: TABLE "TRANSFER"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."TRANSFER" IS '이체 | 도메인:거래';


--
-- Name: COLUMN "TRANSFER"."TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."TRANSFER_ID" IS '이체ID | 이체 식별자';


--
-- Name: COLUMN "TRANSFER"."WITHDRAW_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."WITHDRAW_ACCOUNT_NO" IS '출금계좌번호 | 출금 계좌';


--
-- Name: COLUMN "TRANSFER"."WITHDRAW_BANK_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."WITHDRAW_BANK_CD" IS '출금은행코드 | 출금 은행 (당행 020)';


--
-- Name: COLUMN "TRANSFER"."WITHDRAW_BANK_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."WITHDRAW_BANK_NAME" IS '출금은행명 | 출금 은행명';


--
-- Name: COLUMN "TRANSFER"."WITHDRAW_HOLDER_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."WITHDRAW_HOLDER_NAME" IS '출금예금주명 | 출금 예금주';


--
-- Name: COLUMN "TRANSFER"."DEPOSIT_ACCOUNT_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."DEPOSIT_ACCOUNT_NO" IS '입금계좌번호 | 입금 계좌 (타행 가능)';


--
-- Name: COLUMN "TRANSFER"."DEPOSIT_BANK_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."DEPOSIT_BANK_CD" IS '입금은행코드 | 입금 은행';


--
-- Name: COLUMN "TRANSFER"."DEPOSIT_BANK_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."DEPOSIT_BANK_NAME" IS '입금은행명 | 입금 은행명';


--
-- Name: COLUMN "TRANSFER"."DEPOSIT_HOLDER_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."DEPOSIT_HOLDER_NAME" IS '입금예금주명 | 입금 예금주 (실제)';


--
-- Name: COLUMN "TRANSFER"."ENTERED_HOLDER_NAME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."ENTERED_HOLDER_NAME" IS '입력예금주명 | 사용자 입력 예금주';


--
-- Name: COLUMN "TRANSFER"."HOLDER_MATCH_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."HOLDER_MATCH_YN" IS '예금주일치여부 | Y=일치';


--
-- Name: COLUMN "TRANSFER"."TRANSFER_AMOUNT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."TRANSFER_AMOUNT" IS '이체금액 | 원';


--
-- Name: COLUMN "TRANSFER"."FEE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."FEE" IS '수수료 | 원';


--
-- Name: COLUMN "TRANSFER"."REQUEST_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."REQUEST_DATETIME" IS '이체신청일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "TRANSFER"."COMPLETE_DATETIME"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."COMPLETE_DATETIME" IS '이체완료일시 | yyyymmddhhmmss';


--
-- Name: COLUMN "TRANSFER"."TRANSFER_TYPE_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."TRANSFER_TYPE_CD" IS '이체구분코드 | 480100=당행/480101=타행';


--
-- Name: COLUMN "TRANSFER"."TRANSFER_STATUS_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."TRANSFER_STATUS_CD" IS '이체처리상태코드 | 430100=완료/430101=실패';


--
-- Name: COLUMN "TRANSFER"."FAILURE_REASON_CD"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."FAILURE_REASON_CD" IS '실패사유코드 | 잔액부족/입금계좌오류';


--
-- Name: COLUMN "TRANSFER"."COUNTERPART_APPROVAL_NO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."COUNTERPART_APPROVAL_NO" IS '상대은행승인번호 | 타행 거래 시';


--
-- Name: COLUMN "TRANSFER"."RESPONSE_MESSAGE"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."RESPONSE_MESSAGE" IS '응답메시지 | 상대은행 응답';


--
-- Name: COLUMN "TRANSFER"."TRANSFER_MEMO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."TRANSFER_MEMO" IS '이체메모 | 사용자 메모';


--
-- Name: COLUMN "TRANSFER"."AUTO_TRANSFER_ID"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."AUTO_TRANSFER_ID" IS '자동이체ID | 자동이체 경유 시';


--
-- Name: COLUMN "TRANSFER"."ACCESS_SEQ"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."ACCESS_SEQ" IS '접속일련번호 | 접속 기록 매핑';


--
-- Name: COLUMN "TRANSFER"."WITHDRAW_MEMO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."WITHDRAW_MEMO" IS '출금계좌적요 | 내 통장 표기';


--
-- Name: COLUMN "TRANSFER"."DEPOSIT_MEMO"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."DEPOSIT_MEMO" IS '입금계좌적요 | 받는사람 통장 표기';


--
-- Name: COLUMN "TRANSFER"."IDEMPOTENCY_KEY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."IDEMPOTENCY_KEY" IS '멱등성키 | UNIQUE';


--
-- Name: COLUMN "TRANSFER"."CANCEL_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."CANCEL_YN" IS '취소여부 | Y=역분개';


--
-- Name: COLUMN "TRANSFER"."ORIGINAL_TX_REF"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."ORIGINAL_TX_REF" IS '원거래ID참조 | 취소건 원본';


--
-- Name: COLUMN "TRANSFER"."DELETE_YN"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."DELETE_YN" IS '삭제여부 | Y/N | Y=논리삭제 (DEFAULT N)';


--
-- Name: COLUMN "TRANSFER"."CREATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."CREATED_BY" IS '생성자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TRANSFER"."CREATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."CREATED_AT" IS '생성일자 | TIMESTAMP | INSERT 시 자동';


--
-- Name: COLUMN "TRANSFER"."UPDATED_BY"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."UPDATED_BY" IS '수정자 | 사번 또는 SYSTEM';


--
-- Name: COLUMN "TRANSFER"."UPDATED_AT"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TRANSFER"."UPDATED_AT" IS '수정일자 | TIMESTAMP | UPDATE 시 갱신';


--
-- Name: ACCOUNT_CLOSURE ACCOUNT_CLOSURE_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_CLOSURE"
    ADD CONSTRAINT "ACCOUNT_CLOSURE_pkey" PRIMARY KEY ("CLOSE_ID");


--
-- Name: ACCOUNT ACCOUNT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT"
    ADD CONSTRAINT "ACCOUNT_pkey" PRIMARY KEY ("ACCOUNT_NO");


--
-- Name: ADMIN_SESSION ADMIN_SESSION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ADMIN_SESSION"
    ADD CONSTRAINT "ADMIN_SESSION_pkey" PRIMARY KEY ("SESSION_ID");


--
-- Name: AML_HIGH_RISK AML_HIGH_RISK_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AML_HIGH_RISK"
    ADD CONSTRAINT "AML_HIGH_RISK_pkey" PRIMARY KEY ("HIGH_RISK_ID");


--
-- Name: AML_REPORT AML_REPORT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AML_REPORT"
    ADD CONSTRAINT "AML_REPORT_pkey" PRIMARY KEY ("AML_REPORT_ID");


--
-- Name: ATTACHED_DOC ATTACHED_DOC_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ATTACHED_DOC"
    ADD CONSTRAINT "ATTACHED_DOC_pkey" PRIMARY KEY ("ATTACH_ID");


--
-- Name: AUTH_METHOD_MASTER AUTH_METHOD_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTH_METHOD_MASTER"
    ADD CONSTRAINT "AUTH_METHOD_MASTER_pkey" PRIMARY KEY ("AUTH_METHOD_ID");


--
-- Name: AUTO_TRANSFER AUTO_TRANSFER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTO_TRANSFER"
    ADD CONSTRAINT "AUTO_TRANSFER_pkey" PRIMARY KEY ("AUTO_TRANSFER_ID");


--
-- Name: BANK_MASTER BANK_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BANK_MASTER"
    ADD CONSTRAINT "BANK_MASTER_pkey" PRIMARY KEY ("BANK_CD");


--
-- Name: BIZ_CALENDAR BIZ_CALENDAR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BIZ_CALENDAR"
    ADD CONSTRAINT "BIZ_CALENDAR_pkey" PRIMARY KEY ("BIZ_DATE");


--
-- Name: BRANCH_MASTER BRANCH_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BRANCH_MASTER"
    ADD CONSTRAINT "BRANCH_MASTER_pkey" PRIMARY KEY ("BRANCH_CD");


--
-- Name: COLLATERAL_MASTER COLLATERAL_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COLLATERAL_MASTER"
    ADD CONSTRAINT "COLLATERAL_MASTER_pkey" PRIMARY KEY ("COLLATERAL_ID");


--
-- Name: COMPLAINT COMPLAINT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMPLAINT"
    ADD CONSTRAINT "COMPLAINT_pkey" PRIMARY KEY ("COMPLAINT_ID");


--
-- Name: CORPORATE_PARTY CORPORATE_PARTY_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CORPORATE_PARTY"
    ADD CONSTRAINT "CORPORATE_PARTY_pkey" PRIMARY KEY ("PARTY_ID");


--
-- Name: COVENANT_MASTER COVENANT_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COVENANT_MASTER"
    ADD CONSTRAINT "COVENANT_MASTER_pkey" PRIMARY KEY ("COVENANT_ID");


--
-- Name: CREDIT_AGENCY_MASTER CREDIT_AGENCY_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CREDIT_AGENCY_MASTER"
    ADD CONSTRAINT "CREDIT_AGENCY_MASTER_pkey" PRIMARY KEY ("AGENCY_CD");


--
-- Name: CUSTOMER CUSTOMER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER"
    ADD CONSTRAINT "CUSTOMER_pkey" PRIMARY KEY ("CUSTOMER_NO");


--
-- Name: DELEGATION DELEGATION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DELEGATION"
    ADD CONSTRAINT "DELEGATION_pkey" PRIMARY KEY ("DELEGATION_ID");


--
-- Name: DEPOSIT_CONTRACT DEPOSIT_CONTRACT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEPOSIT_CONTRACT"
    ADD CONSTRAINT "DEPOSIT_CONTRACT_pkey" PRIMARY KEY ("CONTRACT_NO");


--
-- Name: DOC_REQUIREMENT DOC_REQUIREMENT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DOC_REQUIREMENT"
    ADD CONSTRAINT "DOC_REQUIREMENT_pkey" PRIMARY KEY ("REQUIREMENT_ID");


--
-- Name: DOC_TYPE_MASTER DOC_TYPE_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DOC_TYPE_MASTER"
    ADD CONSTRAINT "DOC_TYPE_MASTER_pkey" PRIMARY KEY ("DOC_TYPE_ID");


--
-- Name: EMPLOYEE_MASTER EMPLOYEE_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EMPLOYEE_MASTER"
    ADD CONSTRAINT "EMPLOYEE_MASTER_pkey" PRIMARY KEY ("EMPLOYEE_NO");


--
-- Name: FDS_RULE_MASTER FDS_RULE_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FDS_RULE_MASTER"
    ADD CONSTRAINT "FDS_RULE_MASTER_pkey" PRIMARY KEY ("RULE_ID");


--
-- Name: FOREIGNER_CUSTOMER FOREIGNER_CUSTOMER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FOREIGNER_CUSTOMER"
    ADD CONSTRAINT "FOREIGNER_CUSTOMER_pkey" PRIMARY KEY ("PARTY_ID");


--
-- Name: FOREIGN_ACCOUNT FOREIGN_ACCOUNT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FOREIGN_ACCOUNT"
    ADD CONSTRAINT "FOREIGN_ACCOUNT_pkey" PRIMARY KEY ("ACCOUNT_NO");


--
-- Name: INDIVIDUAL_BUSINESS INDIVIDUAL_BUSINESS_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INDIVIDUAL_BUSINESS"
    ADD CONSTRAINT "INDIVIDUAL_BUSINESS_pkey" PRIMARY KEY ("CUSTOMER_NO");


--
-- Name: INDIVIDUAL_PARTY INDIVIDUAL_PARTY_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INDIVIDUAL_PARTY"
    ADD CONSTRAINT "INDIVIDUAL_PARTY_pkey" PRIMARY KEY ("PARTY_ID");


--
-- Name: LOAN_APPLICATION LOAN_APPLICATION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_APPLICATION"
    ADD CONSTRAINT "LOAN_APPLICATION_pkey" PRIMARY KEY ("LOAN_APP_ID");


--
-- Name: LOAN_CONTRACT LOAN_CONTRACT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT "LOAN_CONTRACT_pkey" PRIMARY KEY ("LOAN_CONTRACT_NO");


--
-- Name: LOAN_REVIEW LOAN_REVIEW_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REVIEW"
    ADD CONSTRAINT "LOAN_REVIEW_pkey" PRIMARY KEY ("REVIEW_ID");


--
-- Name: PARTY PARTY_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PARTY"
    ADD CONSTRAINT "PARTY_pkey" PRIMARY KEY ("PARTY_ID");


--
-- Name: PERMISSION PERMISSION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PERMISSION"
    ADD CONSTRAINT "PERMISSION_pkey" PRIMARY KEY ("PERMISSION_ID");


--
-- Name: PRODUCT PRODUCT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT"
    ADD CONSTRAINT "PRODUCT_pkey" PRIMARY KEY ("PRODUCT_ID");


--
-- Name: ROLE_TYPE_MASTER ROLE_TYPE_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ROLE_TYPE_MASTER"
    ADD CONSTRAINT "ROLE_TYPE_MASTER_pkey" PRIMARY KEY ("ROLE_TYPE_ID");


--
-- Name: SIGNATURE SIGNATURE_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SIGNATURE"
    ADD CONSTRAINT "SIGNATURE_pkey" PRIMARY KEY ("SIGNATURE_ID");


--
-- Name: SIGN_DEVICE SIGN_DEVICE_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SIGN_DEVICE"
    ADD CONSTRAINT "SIGN_DEVICE_pkey" PRIMARY KEY ("DEVICE_ID");


--
-- Name: TERMS_MASTER TERMS_MASTER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TERMS_MASTER"
    ADD CONSTRAINT "TERMS_MASTER_pkey" PRIMARY KEY ("TERMS_ID");


--
-- Name: TRANSACTION TRANSACTION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSACTION"
    ADD CONSTRAINT "TRANSACTION_pkey" PRIMARY KEY ("TRANSACTION_ID");


--
-- Name: TRANSFER TRANSFER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSFER"
    ADD CONSTRAINT "TRANSFER_pkey" PRIMARY KEY ("TRANSFER_ID");


--
-- Name: ACCOUNT_BONUS_APPLIED pk_ACCOUNT_BONUS_APPLIED; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_BONUS_APPLIED"
    ADD CONSTRAINT "pk_ACCOUNT_BONUS_APPLIED" PRIMARY KEY ("ACCOUNT_NO", "BONUS_CONDITION_ID", "EVAL_DATE");


--
-- Name: ACCOUNT_RESTRICTION pk_ACCOUNT_RESTRICTION; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_RESTRICTION"
    ADD CONSTRAINT "pk_ACCOUNT_RESTRICTION" PRIMARY KEY ("ACCOUNT_NO", "RESTRICTION_SEQ");


--
-- Name: ACCOUNT_SEIZURE pk_ACCOUNT_SEIZURE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_SEIZURE"
    ADD CONSTRAINT "pk_ACCOUNT_SEIZURE" PRIMARY KEY ("ACCOUNT_NO", "SEIZURE_SEQ");


--
-- Name: AUTO_TRANSFER_EXEC pk_AUTO_TRANSFER_EXEC; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTO_TRANSFER_EXEC"
    ADD CONSTRAINT "pk_AUTO_TRANSFER_EXEC" PRIMARY KEY ("AUTO_TRANSFER_ID", "SCHEDULED_DATE");


--
-- Name: BASE_RATE_MASTER pk_BASE_RATE_MASTER; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BASE_RATE_MASTER"
    ADD CONSTRAINT "pk_BASE_RATE_MASTER" PRIMARY KEY ("BASE_RATE_TYPE_CD", "NOTICE_DATE");


--
-- Name: BUSINESS_CATEGORY pk_BUSINESS_CATEGORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BUSINESS_CATEGORY"
    ADD CONSTRAINT "pk_BUSINESS_CATEGORY" PRIMARY KEY ("PARTY_ID", "BIZ_TYPE_SEQ");


--
-- Name: BUSINESS_REPRESENTATIVE pk_BUSINESS_REPRESENTATIVE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BUSINESS_REPRESENTATIVE"
    ADD CONSTRAINT "pk_BUSINESS_REPRESENTATIVE" PRIMARY KEY ("BIZ_PARTY_ID", "REP_PARTY_ID");


--
-- Name: COLLATERAL_MORTGAGE pk_COLLATERAL_MORTGAGE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COLLATERAL_MORTGAGE"
    ADD CONSTRAINT "pk_COLLATERAL_MORTGAGE" PRIMARY KEY ("COLLATERAL_ID", "PRIORITY_RANK");


--
-- Name: COLLATERAL_PRICE_HISTORY pk_COLLATERAL_PRICE_HISTORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COLLATERAL_PRICE_HISTORY"
    ADD CONSTRAINT "pk_COLLATERAL_PRICE_HISTORY" PRIMARY KEY ("COLLATERAL_ID", "PRICE_SEQ");


--
-- Name: COMMON_CODE pk_COMMON_CODE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMMON_CODE"
    ADD CONSTRAINT "pk_COMMON_CODE" PRIMARY KEY ("CODE_GROUP", "CODE");


--
-- Name: COMPLAINT_PROCESS pk_COMPLAINT_PROCESS; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMPLAINT_PROCESS"
    ADD CONSTRAINT "pk_COMPLAINT_PROCESS" PRIMARY KEY ("COMPLAINT_ID", "PROCESS_SEQ");


--
-- Name: CONTRACT_COVENANT pk_CONTRACT_COVENANT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CONTRACT_COVENANT"
    ADD CONSTRAINT "pk_CONTRACT_COVENANT" PRIMARY KEY ("CONTRACT_NO", "COVENANT_ID");


--
-- Name: CONTRACT_PARTICIPANT pk_CONTRACT_PARTICIPANT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CONTRACT_PARTICIPANT"
    ADD CONSTRAINT "pk_CONTRACT_PARTICIPANT" PRIMARY KEY ("CONTRACT_NO", "PARTY_ID", "ROLE_TYPE_ID");


--
-- Name: CREDIT_INFO_REPORT pk_CREDIT_INFO_REPORT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CREDIT_INFO_REPORT"
    ADD CONSTRAINT "pk_CREDIT_INFO_REPORT" PRIMARY KEY ("LOAN_CONTRACT_NO", "REPORT_SEQ");


--
-- Name: CREDIT_INQUIRY pk_CREDIT_INQUIRY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CREDIT_INQUIRY"
    ADD CONSTRAINT "pk_CREDIT_INQUIRY" PRIMARY KEY ("CUSTOMER_NO", "INQUIRY_SEQ");


--
-- Name: CUSTOMER_ADDRESS pk_CUSTOMER_ADDRESS; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_ADDRESS"
    ADD CONSTRAINT "pk_CUSTOMER_ADDRESS" PRIMARY KEY ("CUSTOMER_NO", "ADDR_SEQ");


--
-- Name: CUSTOMER_CONTACT pk_CUSTOMER_CONTACT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_CONTACT"
    ADD CONSTRAINT "pk_CUSTOMER_CONTACT" PRIMARY KEY ("CUSTOMER_NO", "CONTACT_SEQ");


--
-- Name: CUSTOMER_DEVICE pk_CUSTOMER_DEVICE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_DEVICE"
    ADD CONSTRAINT "pk_CUSTOMER_DEVICE" PRIMARY KEY ("CUSTOMER_NO", "DEVICE_SEQ");


--
-- Name: CUSTOMER_GRADE_HISTORY pk_CUSTOMER_GRADE_HISTORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_GRADE_HISTORY"
    ADD CONSTRAINT "pk_CUSTOMER_GRADE_HISTORY" PRIMARY KEY ("CUSTOMER_NO", "GRADE_START_DATE");


--
-- Name: CUSTOMER_TERMS_AGREE pk_CUSTOMER_TERMS_AGREE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_TERMS_AGREE"
    ADD CONSTRAINT "pk_CUSTOMER_TERMS_AGREE" PRIMARY KEY ("CUSTOMER_NO", "TERMS_ID");


--
-- Name: DEVICE_ACCESS_LOG pk_DEVICE_ACCESS_LOG; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEVICE_ACCESS_LOG"
    ADD CONSTRAINT "pk_DEVICE_ACCESS_LOG" PRIMARY KEY ("DEVICE_ID", "ACCESS_SEQ");


--
-- Name: FDS_DETECTION pk_FDS_DETECTION; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FDS_DETECTION"
    ADD CONSTRAINT "pk_FDS_DETECTION" PRIMARY KEY ("CUSTOMER_NO", "DETECT_SEQ");


--
-- Name: FDS_RULE_HIT pk_FDS_RULE_HIT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FDS_RULE_HIT"
    ADD CONSTRAINT "pk_FDS_RULE_HIT" PRIMARY KEY ("DETECT_ID", "RULE_ID");


--
-- Name: GRADE_PERMISSION pk_GRADE_PERMISSION; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GRADE_PERMISSION"
    ADD CONSTRAINT "pk_GRADE_PERMISSION" PRIMARY KEY ("CUST_GRADE_CD", "PERMISSION_ID");


--
-- Name: INSTALLMENT_AGREEMENT pk_INSTALLMENT_AGREEMENT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INSTALLMENT_AGREEMENT"
    ADD CONSTRAINT "pk_INSTALLMENT_AGREEMENT" PRIMARY KEY ("ACCOUNT_NO", "INSTALLMENT_NO");


--
-- Name: INSTALLMENT_CONDITION pk_INSTALLMENT_CONDITION; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INSTALLMENT_CONDITION"
    ADD CONSTRAINT "pk_INSTALLMENT_CONDITION" PRIMARY KEY ("PRODUCT_ID", "CONDITION_SEQ");


--
-- Name: INSTALLMENT_PAYMENT pk_INSTALLMENT_PAYMENT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INSTALLMENT_PAYMENT"
    ADD CONSTRAINT "pk_INSTALLMENT_PAYMENT" PRIMARY KEY ("ACCOUNT_NO", "PAYMENT_SEQ");


--
-- Name: INTEREST_SETTLEMENT pk_INTEREST_SETTLEMENT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INTEREST_SETTLEMENT"
    ADD CONSTRAINT "pk_INTEREST_SETTLEMENT" PRIMARY KEY ("ACCOUNT_NO", "SETTLEMENT_SEQ");


--
-- Name: LOAN_CHANGE_HISTORY pk_LOAN_CHANGE_HISTORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CHANGE_HISTORY"
    ADD CONSTRAINT "pk_LOAN_CHANGE_HISTORY" PRIMARY KEY ("LOAN_CONTRACT_NO", "CHANGE_SEQ");


--
-- Name: LOAN_COST pk_LOAN_COST; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_COST"
    ADD CONSTRAINT "pk_LOAN_COST" PRIMARY KEY ("LOAN_CONTRACT_NO", "COST_SEQ");


--
-- Name: LOAN_EXEC_HISTORY pk_LOAN_EXEC_HISTORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_EXEC_HISTORY"
    ADD CONSTRAINT "pk_LOAN_EXEC_HISTORY" PRIMARY KEY ("LOAN_CONTRACT_NO", "EXEC_SEQ");


--
-- Name: LOAN_INTEREST_SETTLEMENT pk_LOAN_INTEREST_SETTLEMENT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_INTEREST_SETTLEMENT"
    ADD CONSTRAINT "pk_LOAN_INTEREST_SETTLEMENT" PRIMARY KEY ("LOAN_CONTRACT_NO", "SETTLEMENT_SEQ");


--
-- Name: LOAN_REPAY_HISTORY pk_LOAN_REPAY_HISTORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REPAY_HISTORY"
    ADD CONSTRAINT "pk_LOAN_REPAY_HISTORY" PRIMARY KEY ("LOAN_CONTRACT_NO", "REPAY_SEQ");


--
-- Name: LOAN_REPAY_SCHEDULE pk_LOAN_REPAY_SCHEDULE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REPAY_SCHEDULE"
    ADD CONSTRAINT "pk_LOAN_REPAY_SCHEDULE" PRIMARY KEY ("LOAN_CONTRACT_NO", "INSTALLMENT_NO");


--
-- Name: LOST_REPORT pk_LOST_REPORT; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOST_REPORT"
    ADD CONSTRAINT "pk_LOST_REPORT" PRIMARY KEY ("CUSTOMER_NO", "REPORT_SEQ");


--
-- Name: MARKETING_AGREE pk_MARKETING_AGREE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MARKETING_AGREE"
    ADD CONSTRAINT "pk_MARKETING_AGREE" PRIMARY KEY ("CUSTOMER_NO", "CHANNEL_CD");


--
-- Name: OVERDRAFT_DAILY_USAGE pk_OVERDRAFT_DAILY_USAGE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OVERDRAFT_DAILY_USAGE"
    ADD CONSTRAINT "pk_OVERDRAFT_DAILY_USAGE" PRIMARY KEY ("LOAN_CONTRACT_NO", "BASE_DATE");


--
-- Name: PRODUCT_BONUS_CONDITION pk_PRODUCT_BONUS_CONDITION; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_BONUS_CONDITION"
    ADD CONSTRAINT "pk_PRODUCT_BONUS_CONDITION" PRIMARY KEY ("PRODUCT_ID", "BONUS_SEQ");


--
-- Name: PRODUCT_COVENANT_MAPPING pk_PRODUCT_COVENANT_MAPPING; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_COVENANT_MAPPING"
    ADD CONSTRAINT "pk_PRODUCT_COVENANT_MAPPING" PRIMARY KEY ("PRODUCT_ID", "COVENANT_ID");


--
-- Name: PRODUCT_PERIOD pk_PRODUCT_PERIOD; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_PERIOD"
    ADD CONSTRAINT "pk_PRODUCT_PERIOD" PRIMARY KEY ("PRODUCT_ID", "PERIOD_SEQ");


--
-- Name: PRODUCT_RATE_POLICY pk_PRODUCT_RATE_POLICY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_RATE_POLICY"
    ADD CONSTRAINT "pk_PRODUCT_RATE_POLICY" PRIMARY KEY ("PRODUCT_ID", "RATE_SEQ");


--
-- Name: PRODUCT_SALES_SCOPE pk_PRODUCT_SALES_SCOPE; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_SALES_SCOPE"
    ADD CONSTRAINT "pk_PRODUCT_SALES_SCOPE" PRIMARY KEY ("PRODUCT_ID", "SCOPE_SEQ");


--
-- Name: PRODUCT_TERMS_MAPPING pk_PRODUCT_TERMS_MAPPING; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_TERMS_MAPPING"
    ADD CONSTRAINT "pk_PRODUCT_TERMS_MAPPING" PRIMARY KEY ("PRODUCT_ID", "MAPPING_SEQ");


--
-- Name: TERMS_CHANGE_HISTORY pk_TERMS_CHANGE_HISTORY; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TERMS_CHANGE_HISTORY"
    ADD CONSTRAINT "pk_TERMS_CHANGE_HISTORY" PRIMARY KEY ("TERMS_ID", "CHANGE_SEQ");


--
-- Name: uq_loan_exec_history_idem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_loan_exec_history_idem ON public."LOAN_EXEC_HISTORY" USING btree ("IDEMPOTENCY_KEY") WHERE ("IDEMPOTENCY_KEY" IS NOT NULL);


--
-- Name: uq_transaction_idem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_transaction_idem ON public."TRANSACTION" USING btree ("IDEMPOTENCY_KEY") WHERE ("IDEMPOTENCY_KEY" IS NOT NULL);


--
-- Name: uq_transfer_idem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_transfer_idem ON public."TRANSFER" USING btree ("IDEMPOTENCY_KEY") WHERE ("IDEMPOTENCY_KEY" IS NOT NULL);


--
-- Name: ACCOUNT_BONUS_APPLIED fk_account_bonus_applied_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_BONUS_APPLIED"
    ADD CONSTRAINT fk_account_bonus_applied_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: ACCOUNT_CLOSURE fk_account_closure_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_CLOSURE"
    ADD CONSTRAINT fk_account_closure_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: ACCOUNT fk_account_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT"
    ADD CONSTRAINT fk_account_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: ACCOUNT_RESTRICTION fk_account_restriction_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_RESTRICTION"
    ADD CONSTRAINT fk_account_restriction_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: ACCOUNT_SEIZURE fk_account_seizure_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ACCOUNT_SEIZURE"
    ADD CONSTRAINT fk_account_seizure_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: AML_HIGH_RISK fk_aml_high_risk_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AML_HIGH_RISK"
    ADD CONSTRAINT fk_aml_high_risk_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: AML_REPORT fk_aml_report_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AML_REPORT"
    ADD CONSTRAINT fk_aml_report_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: AML_REPORT fk_aml_report_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AML_REPORT"
    ADD CONSTRAINT fk_aml_report_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: AML_REPORT fk_aml_report_transaction_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AML_REPORT"
    ADD CONSTRAINT fk_aml_report_transaction_id FOREIGN KEY ("TRANSACTION_ID") REFERENCES public."TRANSACTION"("TRANSACTION_ID");


--
-- Name: ATTACHED_DOC fk_attached_doc_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ATTACHED_DOC"
    ADD CONSTRAINT fk_attached_doc_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: ATTACHED_DOC fk_attached_doc_doc_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ATTACHED_DOC"
    ADD CONSTRAINT fk_attached_doc_doc_type_id FOREIGN KEY ("DOC_TYPE_ID") REFERENCES public."DOC_TYPE_MASTER"("DOC_TYPE_ID");


--
-- Name: AUTH_METHOD_MASTER fk_auth_method_master_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTH_METHOD_MASTER"
    ADD CONSTRAINT fk_auth_method_master_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: AUTO_TRANSFER fk_auto_transfer_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTO_TRANSFER"
    ADD CONSTRAINT fk_auto_transfer_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: AUTO_TRANSFER_EXEC fk_auto_transfer_exec_auto_transfer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTO_TRANSFER_EXEC"
    ADD CONSTRAINT fk_auto_transfer_exec_auto_transfer_id FOREIGN KEY ("AUTO_TRANSFER_ID") REFERENCES public."AUTO_TRANSFER"("AUTO_TRANSFER_ID");


--
-- Name: AUTO_TRANSFER_EXEC fk_auto_transfer_exec_transfer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTO_TRANSFER_EXEC"
    ADD CONSTRAINT fk_auto_transfer_exec_transfer_id FOREIGN KEY ("TRANSFER_ID") REFERENCES public."TRANSFER"("TRANSFER_ID");


--
-- Name: AUTO_TRANSFER fk_auto_transfer_withdraw_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUTO_TRANSFER"
    ADD CONSTRAINT fk_auto_transfer_withdraw_account_no FOREIGN KEY ("WITHDRAW_ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: BUSINESS_CATEGORY fk_business_category_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BUSINESS_CATEGORY"
    ADD CONSTRAINT fk_business_category_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: BUSINESS_REPRESENTATIVE fk_business_representative_biz_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BUSINESS_REPRESENTATIVE"
    ADD CONSTRAINT fk_business_representative_biz_party_id FOREIGN KEY ("BIZ_PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: BUSINESS_REPRESENTATIVE fk_business_representative_rep_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BUSINESS_REPRESENTATIVE"
    ADD CONSTRAINT fk_business_representative_rep_party_id FOREIGN KEY ("REP_PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: COLLATERAL_MASTER fk_collateral_master_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COLLATERAL_MASTER"
    ADD CONSTRAINT fk_collateral_master_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: COLLATERAL_MORTGAGE fk_collateral_mortgage_collateral_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COLLATERAL_MORTGAGE"
    ADD CONSTRAINT fk_collateral_mortgage_collateral_id FOREIGN KEY ("COLLATERAL_ID") REFERENCES public."COLLATERAL_MASTER"("COLLATERAL_ID");


--
-- Name: COLLATERAL_PRICE_HISTORY fk_collateral_price_history_collateral_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COLLATERAL_PRICE_HISTORY"
    ADD CONSTRAINT fk_collateral_price_history_collateral_id FOREIGN KEY ("COLLATERAL_ID") REFERENCES public."COLLATERAL_MASTER"("COLLATERAL_ID");


--
-- Name: COMPLAINT fk_complaint_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMPLAINT"
    ADD CONSTRAINT fk_complaint_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: COMPLAINT_PROCESS fk_complaint_process_complaint_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMPLAINT_PROCESS"
    ADD CONSTRAINT fk_complaint_process_complaint_id FOREIGN KEY ("COMPLAINT_ID") REFERENCES public."COMPLAINT"("COMPLAINT_ID");


--
-- Name: COMPLAINT fk_complaint_related_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMPLAINT"
    ADD CONSTRAINT fk_complaint_related_account_no FOREIGN KEY ("RELATED_ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: COMPLAINT fk_complaint_related_tx_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."COMPLAINT"
    ADD CONSTRAINT fk_complaint_related_tx_id FOREIGN KEY ("RELATED_TX_ID") REFERENCES public."TRANSACTION"("TRANSACTION_ID");


--
-- Name: CONTRACT_COVENANT fk_contract_covenant_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CONTRACT_COVENANT"
    ADD CONSTRAINT fk_contract_covenant_contract_no FOREIGN KEY ("CONTRACT_NO") REFERENCES public."DEPOSIT_CONTRACT"("CONTRACT_NO");


--
-- Name: CONTRACT_PARTICIPANT fk_contract_participant_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CONTRACT_PARTICIPANT"
    ADD CONSTRAINT fk_contract_participant_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: CONTRACT_PARTICIPANT fk_contract_participant_role_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CONTRACT_PARTICIPANT"
    ADD CONSTRAINT fk_contract_participant_role_type_id FOREIGN KEY ("ROLE_TYPE_ID") REFERENCES public."ROLE_TYPE_MASTER"("ROLE_TYPE_ID");


--
-- Name: CONTRACT_PARTICIPANT fk_contract_participant_verify_attach_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CONTRACT_PARTICIPANT"
    ADD CONSTRAINT fk_contract_participant_verify_attach_id FOREIGN KEY ("VERIFY_ATTACH_ID") REFERENCES public."ATTACHED_DOC"("ATTACH_ID");


--
-- Name: CORPORATE_PARTY fk_corporate_party_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CORPORATE_PARTY"
    ADD CONSTRAINT fk_corporate_party_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: CREDIT_INFO_REPORT fk_credit_info_report_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CREDIT_INFO_REPORT"
    ADD CONSTRAINT fk_credit_info_report_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: CREDIT_INQUIRY fk_credit_inquiry_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CREDIT_INQUIRY"
    ADD CONSTRAINT fk_credit_inquiry_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: CUSTOMER_ADDRESS fk_customer_address_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_ADDRESS"
    ADD CONSTRAINT fk_customer_address_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: CUSTOMER_CONTACT fk_customer_contact_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_CONTACT"
    ADD CONSTRAINT fk_customer_contact_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: CUSTOMER_DEVICE fk_customer_device_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_DEVICE"
    ADD CONSTRAINT fk_customer_device_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: CUSTOMER_GRADE_HISTORY fk_customer_grade_history_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_GRADE_HISTORY"
    ADD CONSTRAINT fk_customer_grade_history_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: CUSTOMER fk_customer_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER"
    ADD CONSTRAINT fk_customer_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: CUSTOMER_TERMS_AGREE fk_customer_terms_agree_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_TERMS_AGREE"
    ADD CONSTRAINT fk_customer_terms_agree_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: CUSTOMER_TERMS_AGREE fk_customer_terms_agree_terms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CUSTOMER_TERMS_AGREE"
    ADD CONSTRAINT fk_customer_terms_agree_terms_id FOREIGN KEY ("TERMS_ID") REFERENCES public."TERMS_MASTER"("TERMS_ID");


--
-- Name: DELEGATION fk_delegation_agent_cust_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DELEGATION"
    ADD CONSTRAINT fk_delegation_agent_cust_no FOREIGN KEY ("AGENT_CUST_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: DELEGATION fk_delegation_target_cust_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DELEGATION"
    ADD CONSTRAINT fk_delegation_target_cust_no FOREIGN KEY ("TARGET_CUST_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: DEPOSIT_CONTRACT fk_deposit_contract_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEPOSIT_CONTRACT"
    ADD CONSTRAINT fk_deposit_contract_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: DEPOSIT_CONTRACT fk_deposit_contract_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEPOSIT_CONTRACT"
    ADD CONSTRAINT fk_deposit_contract_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: DEPOSIT_CONTRACT fk_deposit_contract_join_branch_cd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEPOSIT_CONTRACT"
    ADD CONSTRAINT fk_deposit_contract_join_branch_cd FOREIGN KEY ("JOIN_BRANCH_CD") REFERENCES public."BRANCH_MASTER"("BRANCH_CD");


--
-- Name: DEPOSIT_CONTRACT fk_deposit_contract_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEPOSIT_CONTRACT"
    ADD CONSTRAINT fk_deposit_contract_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: DEVICE_ACCESS_LOG fk_device_access_log_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DEVICE_ACCESS_LOG"
    ADD CONSTRAINT fk_device_access_log_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: DOC_REQUIREMENT fk_doc_requirement_doc_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DOC_REQUIREMENT"
    ADD CONSTRAINT fk_doc_requirement_doc_type_id FOREIGN KEY ("DOC_TYPE_ID") REFERENCES public."DOC_TYPE_MASTER"("DOC_TYPE_ID");


--
-- Name: DOC_REQUIREMENT fk_doc_requirement_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DOC_REQUIREMENT"
    ADD CONSTRAINT fk_doc_requirement_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: EMPLOYEE_MASTER fk_employee_master_branch_cd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EMPLOYEE_MASTER"
    ADD CONSTRAINT fk_employee_master_branch_cd FOREIGN KEY ("BRANCH_CD") REFERENCES public."BRANCH_MASTER"("BRANCH_CD");


--
-- Name: EMPLOYEE_MASTER fk_employee_master_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EMPLOYEE_MASTER"
    ADD CONSTRAINT fk_employee_master_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: FDS_DETECTION fk_fds_detection_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FDS_DETECTION"
    ADD CONSTRAINT fk_fds_detection_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: FDS_RULE_HIT fk_fds_rule_hit_rule_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FDS_RULE_HIT"
    ADD CONSTRAINT fk_fds_rule_hit_rule_id FOREIGN KEY ("RULE_ID") REFERENCES public."FDS_RULE_MASTER"("RULE_ID");


--
-- Name: FOREIGN_ACCOUNT fk_foreign_account_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FOREIGN_ACCOUNT"
    ADD CONSTRAINT fk_foreign_account_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: FOREIGNER_CUSTOMER fk_foreigner_customer_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FOREIGNER_CUSTOMER"
    ADD CONSTRAINT fk_foreigner_customer_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."INDIVIDUAL_PARTY"("PARTY_ID");


--
-- Name: GRADE_PERMISSION fk_grade_permission_permission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GRADE_PERMISSION"
    ADD CONSTRAINT fk_grade_permission_permission_id FOREIGN KEY ("PERMISSION_ID") REFERENCES public."PERMISSION"("PERMISSION_ID");


--
-- Name: INDIVIDUAL_BUSINESS fk_individual_business_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INDIVIDUAL_BUSINESS"
    ADD CONSTRAINT fk_individual_business_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: INDIVIDUAL_PARTY fk_individual_party_job_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INDIVIDUAL_PARTY"
    ADD CONSTRAINT fk_individual_party_job_type_id FOREIGN KEY ("JOB_TYPE_ID") REFERENCES public."ROLE_TYPE_MASTER"("ROLE_TYPE_ID");


--
-- Name: INDIVIDUAL_PARTY fk_individual_party_party_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INDIVIDUAL_PARTY"
    ADD CONSTRAINT fk_individual_party_party_id FOREIGN KEY ("PARTY_ID") REFERENCES public."PARTY"("PARTY_ID");


--
-- Name: INSTALLMENT_AGREEMENT fk_installment_agreement_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INSTALLMENT_AGREEMENT"
    ADD CONSTRAINT fk_installment_agreement_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: INSTALLMENT_CONDITION fk_installment_condition_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INSTALLMENT_CONDITION"
    ADD CONSTRAINT fk_installment_condition_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: INSTALLMENT_PAYMENT fk_installment_payment_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INSTALLMENT_PAYMENT"
    ADD CONSTRAINT fk_installment_payment_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: INTEREST_SETTLEMENT fk_interest_settlement_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INTEREST_SETTLEMENT"
    ADD CONSTRAINT fk_interest_settlement_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: LOAN_APPLICATION fk_loan_application_apply_branch_cd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_APPLICATION"
    ADD CONSTRAINT fk_loan_application_apply_branch_cd FOREIGN KEY ("APPLY_BRANCH_CD") REFERENCES public."BRANCH_MASTER"("BRANCH_CD");


--
-- Name: LOAN_APPLICATION fk_loan_application_apply_emp_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_APPLICATION"
    ADD CONSTRAINT fk_loan_application_apply_emp_no FOREIGN KEY ("APPLY_EMP_NO") REFERENCES public."EMPLOYEE_MASTER"("EMPLOYEE_NO");


--
-- Name: LOAN_APPLICATION fk_loan_application_apply_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_APPLICATION"
    ADD CONSTRAINT fk_loan_application_apply_product_id FOREIGN KEY ("APPLY_PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: LOAN_APPLICATION fk_loan_application_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_APPLICATION"
    ADD CONSTRAINT fk_loan_application_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: LOAN_CHANGE_HISTORY fk_loan_change_history_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CHANGE_HISTORY"
    ADD CONSTRAINT fk_loan_change_history_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOAN_CONTRACT fk_loan_contract_collateral_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT fk_loan_contract_collateral_id FOREIGN KEY ("COLLATERAL_ID") REFERENCES public."COLLATERAL_MASTER"("COLLATERAL_ID");


--
-- Name: LOAN_CONTRACT fk_loan_contract_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT fk_loan_contract_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: LOAN_CONTRACT fk_loan_contract_join_branch_cd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT fk_loan_contract_join_branch_cd FOREIGN KEY ("JOIN_BRANCH_CD") REFERENCES public."BRANCH_MASTER"("BRANCH_CD");


--
-- Name: LOAN_CONTRACT fk_loan_contract_loan_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT fk_loan_contract_loan_account_no FOREIGN KEY ("LOAN_ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: LOAN_CONTRACT fk_loan_contract_loan_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT fk_loan_contract_loan_product_id FOREIGN KEY ("LOAN_PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: LOAN_CONTRACT fk_loan_contract_main_deposit_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_CONTRACT"
    ADD CONSTRAINT fk_loan_contract_main_deposit_account_no FOREIGN KEY ("MAIN_DEPOSIT_ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: LOAN_COST fk_loan_cost_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_COST"
    ADD CONSTRAINT fk_loan_cost_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOAN_EXEC_HISTORY fk_loan_exec_history_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_EXEC_HISTORY"
    ADD CONSTRAINT fk_loan_exec_history_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOAN_INTEREST_SETTLEMENT fk_loan_interest_settlement_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_INTEREST_SETTLEMENT"
    ADD CONSTRAINT fk_loan_interest_settlement_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOAN_REPAY_HISTORY fk_loan_repay_history_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REPAY_HISTORY"
    ADD CONSTRAINT fk_loan_repay_history_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOAN_REPAY_SCHEDULE fk_loan_repay_schedule_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REPAY_SCHEDULE"
    ADD CONSTRAINT fk_loan_repay_schedule_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOAN_REVIEW fk_loan_review_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REVIEW"
    ADD CONSTRAINT fk_loan_review_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: LOAN_REVIEW fk_loan_review_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOAN_REVIEW"
    ADD CONSTRAINT fk_loan_review_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: LOST_REPORT fk_lost_report_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LOST_REPORT"
    ADD CONSTRAINT fk_lost_report_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: MARKETING_AGREE fk_marketing_agree_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MARKETING_AGREE"
    ADD CONSTRAINT fk_marketing_agree_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: OVERDRAFT_DAILY_USAGE fk_overdraft_daily_usage_loan_contract_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OVERDRAFT_DAILY_USAGE"
    ADD CONSTRAINT fk_overdraft_daily_usage_loan_contract_no FOREIGN KEY ("LOAN_CONTRACT_NO") REFERENCES public."LOAN_CONTRACT"("LOAN_CONTRACT_NO");


--
-- Name: PRODUCT_BONUS_CONDITION fk_product_bonus_condition_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_BONUS_CONDITION"
    ADD CONSTRAINT fk_product_bonus_condition_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: PRODUCT_COVENANT_MAPPING fk_product_covenant_mapping_covenant_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_COVENANT_MAPPING"
    ADD CONSTRAINT fk_product_covenant_mapping_covenant_id FOREIGN KEY ("COVENANT_ID") REFERENCES public."COVENANT_MASTER"("COVENANT_ID");


--
-- Name: PRODUCT_COVENANT_MAPPING fk_product_covenant_mapping_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_COVENANT_MAPPING"
    ADD CONSTRAINT fk_product_covenant_mapping_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: PRODUCT_PERIOD fk_product_period_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_PERIOD"
    ADD CONSTRAINT fk_product_period_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: PRODUCT_RATE_POLICY fk_product_rate_policy_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_RATE_POLICY"
    ADD CONSTRAINT fk_product_rate_policy_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: PRODUCT_SALES_SCOPE fk_product_sales_scope_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_SALES_SCOPE"
    ADD CONSTRAINT fk_product_sales_scope_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: PRODUCT_TERMS_MAPPING fk_product_terms_mapping_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PRODUCT_TERMS_MAPPING"
    ADD CONSTRAINT fk_product_terms_mapping_product_id FOREIGN KEY ("PRODUCT_ID") REFERENCES public."PRODUCT"("PRODUCT_ID");


--
-- Name: SIGNATURE fk_signature_customer_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SIGNATURE"
    ADD CONSTRAINT fk_signature_customer_no FOREIGN KEY ("CUSTOMER_NO") REFERENCES public."CUSTOMER"("CUSTOMER_NO");


--
-- Name: SIGNATURE fk_signature_sign_device_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SIGNATURE"
    ADD CONSTRAINT fk_signature_sign_device_id FOREIGN KEY ("SIGN_DEVICE_ID") REFERENCES public."SIGN_DEVICE"("DEVICE_ID");


--
-- Name: TERMS_CHANGE_HISTORY fk_terms_change_history_terms_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TERMS_CHANGE_HISTORY"
    ADD CONSTRAINT fk_terms_change_history_terms_id FOREIGN KEY ("TERMS_ID") REFERENCES public."TERMS_MASTER"("TERMS_ID");


--
-- Name: TRANSACTION fk_transaction_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSACTION"
    ADD CONSTRAINT fk_transaction_account_no FOREIGN KEY ("ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- Name: TRANSACTION fk_transaction_original_tx_ref; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSACTION"
    ADD CONSTRAINT fk_transaction_original_tx_ref FOREIGN KEY ("ORIGINAL_TX_REF") REFERENCES public."TRANSACTION"("TRANSACTION_ID");


--
-- Name: TRANSACTION fk_transaction_transfer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSACTION"
    ADD CONSTRAINT fk_transaction_transfer_id FOREIGN KEY ("TRANSFER_ID") REFERENCES public."TRANSFER"("TRANSFER_ID");


--
-- Name: TRANSFER fk_transfer_auto_transfer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSFER"
    ADD CONSTRAINT fk_transfer_auto_transfer_id FOREIGN KEY ("AUTO_TRANSFER_ID") REFERENCES public."AUTO_TRANSFER"("AUTO_TRANSFER_ID");


--
-- Name: TRANSFER fk_transfer_original_tx_ref; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSFER"
    ADD CONSTRAINT fk_transfer_original_tx_ref FOREIGN KEY ("ORIGINAL_TX_REF") REFERENCES public."TRANSFER"("TRANSFER_ID");


--
-- Name: TRANSFER fk_transfer_withdraw_account_no; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TRANSFER"
    ADD CONSTRAINT fk_transfer_withdraw_account_no FOREIGN KEY ("WITHDRAW_ACCOUNT_NO") REFERENCES public."ACCOUNT"("ACCOUNT_NO");


--
-- PostgreSQL database dump complete
--

\unrestrict 7Cc60nAe4QdulauSdRIGPkdV6dktNpIDaPkCeXRCWJJNU13YMxt6mkf3UNanR10

