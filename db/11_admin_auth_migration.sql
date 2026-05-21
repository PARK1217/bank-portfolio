-- ===================================================================
-- 11_admin_auth_migration.sql — Phase 6 §9.2.1 관리자 인증·세션
-- ===================================================================
-- (1) EMPLOYEE_MASTER.PASSWORD varchar(100) 컬럼 추가 (bcrypt 해시 저장)
-- (2) 관리자 직원 2건 시드 (ADMIN001 박부장 / AUDIT001 김과장, 비번 admin1234)
-- (3) ADMIN_SESSION 멱등 정리(이전 시드 잔여 있으면 제거)
--
-- 멱등: ADD COLUMN IF NOT EXISTS / DELETE+INSERT 패턴.
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/11_admin_auth_migration.sql
-- ===================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1) EMPLOYEE_MASTER.PASSWORD 컬럼 추가
-- ---------------------------------------------------------------
ALTER TABLE public."EMPLOYEE_MASTER"
    ADD COLUMN IF NOT EXISTS "PASSWORD" varchar(100);

COMMENT ON COLUMN public."EMPLOYEE_MASTER"."PASSWORD"
    IS '관리자 로그인 비밀번호 | bcrypt 해시 (CUSTOMER.PASSWORD 와 동일 정책)';

-- ---------------------------------------------------------------
-- 2) 시드 — 관리자 2명. 비밀번호 모두 'admin1234'.
--    AUTH_LEVEL_CD: ADMIN (전권) / AUDIT (감사 전용)
--    EMP_STATUS_CD: 'ACTIVE'
--    BRANCH_CD / PARTY_ID 는 NULL 허용이라 시드에서 생략.
-- ---------------------------------------------------------------
DELETE FROM public."ADMIN_SESSION"
 WHERE "EMPLOYEE_NO" IN ('ADMIN001', 'AUDIT001');

DELETE FROM public."EMPLOYEE_MASTER"
 WHERE "EMPLOYEE_NO" IN ('ADMIN001', 'AUDIT001');

INSERT INTO public."EMPLOYEE_MASTER"
  ("EMPLOYEE_NO","NAME","DEPT_NAME","POSITION_CD","AUTH_LEVEL_CD",
   "HIRE_DATE","EMP_STATUS_CD","PASSWORD","CREATED_BY")
VALUES
  ('ADMIN001','박관리','운영지원팀','MGR','ADMIN','20200302','ACTIVE',
   '$2b$12$T273GjQRktDlNL1ZGIET1.1AyjwOLO7D.FBGzlduLFnlKAbFPVCW6','SEED'),
  ('AUDIT001','김감사','감사팀','MGR','AUDIT','20210504','ACTIVE',
   '$2b$12$T273GjQRktDlNL1ZGIET1.1AyjwOLO7D.FBGzlduLFnlKAbFPVCW6','SEED');

COMMIT;