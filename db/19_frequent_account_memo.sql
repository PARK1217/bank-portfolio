-- ===================================================================
-- 19_frequent_account_memo.sql — FREQUENT_ACCOUNT.MEMO 컬럼 추가
-- ===================================================================
-- 자주 쓰는 계좌(즐겨찾기)에 alias 외 자유 메모 필드 신설.
-- alias 가 varchar(50) 으로 짧아, 거래 목적·관계 등 부가 정보 기록 공간 부족.
-- 백엔드 API/스키마 노출은 후속 풀스택 작업에서 별도 처리.
--
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/19_frequent_account_memo.sql
--
-- 멱등: ADD COLUMN IF NOT EXISTS — 이미 존재하면 NOOP.
-- ===================================================================

BEGIN;

ALTER TABLE public."FREQUENT_ACCOUNT"
    ADD COLUMN IF NOT EXISTS "MEMO" varchar(200);

COMMENT ON COLUMN public."FREQUENT_ACCOUNT"."MEMO" IS
    '즐겨찾기 계좌 자유 메모 (거래 목적·관계 등). alias 외 부가 정보용.';

COMMIT;