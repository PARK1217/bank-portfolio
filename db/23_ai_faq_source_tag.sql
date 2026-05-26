-- ===================================================================
-- 23_ai_faq_source_tag.sql — AI_FAQ.SOURCE_TAG 추가 (ADMIN 챗봇 SOP 우선순위)
-- ===================================================================
-- 문제: ADMIN audience 청크가 AI Hub 학술 보고서 본문(국회입법조사처 등) 위주라
-- 답변 톤이 SOP 매뉴얼이 아닌 학술 보고서로 나옴. 합성 SOP 60건이 8,235건 AI Hub 에
-- 묻혀 검색에서 밀림.
--
-- 해결: SOURCE_TAG 컬럼 추가 + 합성 SOP 청크 식별 (QUESTION 에 ' — ' 포함 패턴) →
-- 챗봇 검색에서 distance × 0.6 가중치 부여로 우선순위 격상.
--
-- 멱등: ADD COLUMN IF NOT EXISTS.
-- ===================================================================

BEGIN;

ALTER TABLE public."AI_FAQ"
    ADD COLUMN IF NOT EXISTS "SOURCE_TAG" varchar(20);

COMMENT ON COLUMN public."AI_FAQ"."SOURCE_TAG" IS
    '청크 출처 | SYNTH_SOP=합성 SOP(직원 SOP 톤) / AIHUB=AI Hub 학술 / SEED=기존 시드';

-- 합성 SOP 식별 — QUESTION 패턴: "KYC·CDD 본인확인 표준 절차 — 1. 적용 대상"
UPDATE public."AI_FAQ" SET "SOURCE_TAG" = 'SYNTH_SOP'
 WHERE "AUDIENCE_CD" = 'ADMIN' AND "QUESTION" LIKE '%—%';

UPDATE public."AI_FAQ" SET "SOURCE_TAG" = 'AIHUB'
 WHERE "AUDIENCE_CD" = 'ADMIN' AND "SOURCE_TAG" IS NULL;

UPDATE public."AI_FAQ" SET "SOURCE_TAG" = 'SEED'
 WHERE "AUDIENCE_CD" = 'USER' OR "AUDIENCE_CD" IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_faq_source_tag
    ON public."AI_FAQ" ("SOURCE_TAG", "AUDIENCE_CD");

COMMIT;

-- 확인 SELECT
SELECT "AUDIENCE_CD", "SOURCE_TAG", count(*) FROM public."AI_FAQ"
 WHERE "STATUS_CD"='ACTIVE' AND "DELETE_YN"='N'
 GROUP BY 1, 2 ORDER BY 1, 3 DESC;

DO $$
BEGIN
    RAISE NOTICE '23_ai_faq_source_tag.sql 적용 완료 — SOURCE_TAG 분기 (SYNTH_SOP/AIHUB/SEED)';
END $$;
