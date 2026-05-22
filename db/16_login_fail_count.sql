-- 로그인 연속 실패 카운터 + 5회 도달 시 계정 잠금 (CUST_STATUS_CD='5052')
--
-- 동작:
--  - 비밀번호 불일치 시 LOGIN_FAIL_COUNT++ 후 응답 메시지에 "(N/5)" 표기
--  - 5회 도달 시 CUST_STATUS_CD='5052' (LOCKED) 로 갱신, 로그인 거부
--  - 비밀번호 재설정 성공 시 LOGIN_FAIL_COUNT=0 + CUST_STATUS_CD='5050' 복원
--  - 정상 로그인 시 LOGIN_FAIL_COUNT=0 초기화

ALTER TABLE public."CUSTOMER"
    ADD COLUMN IF NOT EXISTS "LOGIN_FAIL_COUNT" smallint DEFAULT 0;

COMMENT ON COLUMN public."CUSTOMER"."LOGIN_FAIL_COUNT"
    IS '로그인 연속 실패 횟수 | 5 도달 시 CUST_STATUS_CD=5052 잠금, 비번 재설정 또는 정상 로그인 시 0 초기화';