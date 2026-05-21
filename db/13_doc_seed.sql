-- ===================================================================
-- 13_doc_seed.sql — 첨부서류 일치성 검증용 시드 (Phase 6 §9.2.4)
-- ===================================================================
-- 1) DOC_TYPE_MASTER 4건 (주민등록증/재직증명서/소득금액증명원/가족관계증명서)
-- 2) DOC_REQUIREMENT — 신용대출(PRODUCT_ID=401) 대출 단계 필수·선택 매핑 4건
-- 3) ATTACHED_DOC — 신청 단계는 CONTRACT_NO='LA-{LOAN_APP_ID}' 임시 표기로 매핑
--    - 20001 김연체: 주민·소득 2건만 제출 (재직증명서 MISSING)
--    - 20002 박철수: 주민·재직·소득 3건 전부 VERIFIED (선택서류 가족관계 미제출은 PASS)
--
-- 멱등: 본 시드가 박는 ID 범위 DELETE 후 INSERT.
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/13_doc_seed.sql
-- ===================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 멱등 정리
-- ---------------------------------------------------------------
DELETE FROM public."ATTACHED_DOC"
 WHERE "CONTRACT_NO" IN ('LA-20001', 'LA-20002');
DELETE FROM public."DOC_REQUIREMENT"
 WHERE "REQUIREMENT_ID" BETWEEN 9001 AND 9099;
DELETE FROM public."DOC_TYPE_MASTER"
 WHERE "DOC_TYPE_ID" BETWEEN 1001 AND 1099;

-- ---------------------------------------------------------------
-- 1) DOC_TYPE_MASTER
-- ---------------------------------------------------------------
INSERT INTO public."DOC_TYPE_MASTER"
  ("DOC_TYPE_ID","DOC_NAME","DOC_CATEGORY_CD","RETENTION_YEARS","VALID_MONTHS","DISPOSABLE_YN","DOC_DESC","CREATED_BY")
VALUES
  (1001,'주민등록증',     'ID',    10, NULL,'N','신분증 사본','SEED'),
  (1002,'재직증명서',     'EMPL',   5,    1,'Y','회사 발급 재직증명','SEED'),
  (1003,'소득금액증명원', 'INCOME', 5,    3,'Y','국세청 발급 소득증명','SEED'),
  (1004,'가족관계증명서', 'FAMILY', 5,    3,'Y','동거가족·부양가족 증빙','SEED');

-- ---------------------------------------------------------------
-- 2) DOC_REQUIREMENT — 신용대출(401) 대출 단계
-- ---------------------------------------------------------------
INSERT INTO public."DOC_REQUIREMENT"
  ("REQUIREMENT_ID","TARGET_TYPE_CD","PRODUCT_ID","TRANSACTION_TYPE",
   "DOC_TYPE_ID","REQUIRED_YN","CONDITION","INACTIVE_YN","CREATED_BY")
VALUES
  (9001,'PERSON',401,'대출',1001,'Y',NULL,                 'N','SEED'),
  (9002,'PERSON',401,'대출',1002,'Y',NULL,                 'N','SEED'),
  (9003,'PERSON',401,'대출',1003,'Y','연봉 ≥ 3,000만원',   'N','SEED'),
  (9004,'PERSON',401,'대출',1004,'N','부양가족 있는 경우', 'N','SEED');

-- ---------------------------------------------------------------
-- 3) ATTACHED_DOC — 신청 단계는 CONTRACT_NO 에 'LA-{app_id}' 표기
-- ---------------------------------------------------------------
INSERT INTO public."ATTACHED_DOC"
  ("ATTACH_ID","CUSTOMER_NO","CONTRACT_NO","DOC_TYPE_ID",
   "DOC_ISSUE_DATE","DOC_EXPIRE_DATE","SUBMIT_DATETIME","FILE_PATH",
   "VERIFIER_EMP_NO","VERIFY_STATUS_CD","CREATED_BY")
VALUES
  -- 20001 김연체: 2건만 제출 (재직증명서 누락)
  (90011,100004,'LA-20001',1001,'20231215',NULL,        '20240630090000','/files/loan/20001/id.pdf',
   'ADMIN001','VERIFIED','SEED'),
  (90012,100004,'LA-20001',1003,'20240501','20240801',  '20240630090300','/files/loan/20001/income.pdf',
   NULL,      'PENDING', 'SEED'),
  -- 20002 박철수: 3건 다 제출
  (90021,100001,'LA-20002',1001,'20240301',NULL,        '20260501100000','/files/loan/20002/id.pdf',
   'ADMIN001','VERIFIED','SEED'),
  (90022,100001,'LA-20002',1002,'20260420','20260520',  '20260501100200','/files/loan/20002/employ.pdf',
   'ADMIN001','VERIFIED','SEED'),
  (90023,100001,'LA-20002',1003,'20260415','20260715',  '20260501100400','/files/loan/20002/income.pdf',
   'ADMIN001','VERIFIED','SEED');

COMMIT;