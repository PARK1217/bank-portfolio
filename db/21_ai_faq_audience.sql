-- ===================================================================
-- 21_ai_faq_audience.sql — AI_FAQ 에 AUDIENCE_CD 컬럼 추가 (RBAC 챗봇)
-- ===================================================================
-- 관리자 챗봇 RBAC 설계 (B 방식 — 페이지별 권한 분리) 적용:
--   USER : 사용자 페이지(3001) 챗봇 검색 대상 (TERMS/PRODUCT/ACCOUNT/...)
--   ADMIN: 관리자 콘솔(5001) 챗봇 검색 대상 (KYC/AML/COMPLAINT/...)
--   BOTH : 양쪽 모두 검색 (일반 안내·기관 정보)
--
-- USER 호출 시: AUDIENCE_CD IN ('USER','BOTH')
-- ADMIN 호출 시: AUDIENCE_CD IN ('USER','ADMIN','BOTH')  -- 직원은 사용자 정보까지 알아야 응대 가능
--
-- 멱등: ADD COLUMN IF NOT EXISTS.
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/21_ai_faq_audience.sql
-- ===================================================================

BEGIN;

ALTER TABLE public."AI_FAQ"
    ADD COLUMN IF NOT EXISTS "AUDIENCE_CD" varchar(8) DEFAULT 'USER';

COMMENT ON COLUMN public."AI_FAQ"."AUDIENCE_CD" IS '대상 권한 | USER (고객) / ADMIN (직원 SOP) / BOTH (공통)';

-- 기존 row 는 사용자 챗봇용이므로 'USER' 디폴트 (이미 default 적용됨)
UPDATE public."AI_FAQ" SET "AUDIENCE_CD" = 'USER' WHERE "AUDIENCE_CD" IS NULL;

-- 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_faq_audience_category_status
    ON public."AI_FAQ" ("AUDIENCE_CD", "CATEGORY", "STATUS_CD");

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '21_ai_faq_audience.sql 적용 완료 — AUDIENCE_CD 컬럼 + 인덱스 추가';
END $$;
