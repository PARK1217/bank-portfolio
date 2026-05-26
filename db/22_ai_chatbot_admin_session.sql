-- ===================================================================
-- 22_ai_chatbot_admin_session.sql — AI_CHATBOT_SESSION FK 완화 (admin 챗봇용)
-- ===================================================================
-- 관리자 챗봇(B 방식 RBAC)이 같은 AI_CHATBOT_SESSION 을 재사용하면서 직원 본인의
-- 채팅 history 도 영구화하려면 CUSTOMER_NO 컬럼에 EMPLOYEE 매핑값(990000~999999) 도
-- 적재 가능해야 한다. 기존 FK fk_ai_chatbot_session_customer_no 가 CUSTOMER 만 허용해
-- INSERT 시 ForeignKeyViolationError 가 발생.
--
-- 해결: FK 제약 제거. CUSTOMER_NO 컬럼은 그대로 사용하되, 의미는
--   < 990000 : 일반 사용자 (CUSTOMER 참조)
--   >= 990000 : 관리자(EMPLOYEE) pseudo_customer_no (별도 도메인)
--
-- 멱등: DROP CONSTRAINT IF EXISTS.
-- ===================================================================

BEGIN;

ALTER TABLE public."AI_CHATBOT_SESSION"
    DROP CONSTRAINT IF EXISTS fk_ai_chatbot_session_customer_no;

COMMENT ON COLUMN public."AI_CHATBOT_SESSION"."CUSTOMER_NO" IS
    '챗봇세션소유자 | <990000 : CUSTOMER / >=990000 : EMPLOYEE pseudo_id (admin 챗봇 RBAC)';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '22_ai_chatbot_admin_session.sql 적용 완료 — AI_CHATBOT_SESSION FK 완화 (admin 챗봇 RBAC 지원)';
END $$;
