-- ===================================================================
-- 05_persona_seed.sql — 사용자 페르소나 시드 5명 (가이드 §3.5 / data/seed-scenarios.md)
-- ===================================================================
-- P-001 박철수 (40대 직장인·주거래)   CUSTOMER_NO=100001 / PARTY_ID=1001
-- P-002 김영희 (박철수 배우자·공동명의) CUSTOMER_NO=100002 / PARTY_ID=1002
-- P-003 최지영 (10세 미성년·박철수 딸) CUSTOMER_NO=100003 / PARTY_ID=1003
-- P-004 김연체 (자영업·30일+ 연체)     CUSTOMER_NO=100004 / PARTY_ID=1004
-- P-005 김미선 (마통+신용대출)         CUSTOMER_NO=100005 / PARTY_ID=1005
--
-- 멱등: 시작에서 본 5명 범위 데이터 DELETE 후 INSERT.
-- 인증: 모든 페르소나 PASSWORD=demo1234 / SIMPLE_PIN=123456 (bcrypt 12 rounds).
--
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/05_persona_seed.sql
-- ===================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 멱등 정리 — 본 시드가 다루는 5명 + 그들이 보유한 자원 전부 삭제 (FK 역순)
-- ---------------------------------------------------------------
DELETE FROM public."LOAN_REPAY_HISTORY"   WHERE "LOAN_CONTRACT_NO" IN ('L-2024-100004','L-2025-100005');
DELETE FROM public."LOAN_REPAY_SCHEDULE"  WHERE "LOAN_CONTRACT_NO" IN ('L-2024-100004','L-2025-100005');
DELETE FROM public."LOAN_EXEC_HISTORY"    WHERE "LOAN_CONTRACT_NO" IN ('L-2024-100004','L-2025-100005');
DELETE FROM public."LOAN_CONTRACT"        WHERE "LOAN_CONTRACT_NO" IN ('L-2024-100004','L-2025-100005');
DELETE FROM public."LOAN_APPLICATION"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."AUTO_TRANSFER"        WHERE "WITHDRAW_ACCOUNT_NO" LIKE '110-%-100001'
                                             OR "DEPOSIT_ACCOUNT_NO"  LIKE '110-%-100001';
DELETE FROM public."TRANSACTION"          WHERE "ACCOUNT_NO" LIKE '110-%-10000_';
DELETE FROM public."DEPOSIT_CONTRACT"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CONTRACT_PARTICIPANT" WHERE "PARTY_ID" IN (1001,1002,1003,1004,1005);
DELETE FROM public."DELEGATION"           WHERE "TARGET_CUST_NO" IN (100001,100002,100003,100004,100005)
                                             OR "AGENT_CUST_NO"  IN (100001,100002,100003,100004,100005);
DELETE FROM public."ACCOUNT"              WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_CONTACT"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_ADDRESS"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER"             WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."INDIVIDUAL_PARTY"     WHERE "PARTY_ID"    IN (1001,1002,1003,1004,1005);
DELETE FROM public."PARTY"                WHERE "PARTY_ID"    IN (1001,1002,1003,1004,1005);


-- ---------------------------------------------------------------
-- 1) PARTY + INDIVIDUAL_PARTY (5명)
-- ---------------------------------------------------------------
INSERT INTO public."PARTY"
  ("PARTY_ID","PARTY_TYPE_CD","PARTY_NAME","PARTY_ID_NO","ID_NO_TYPE_CD","BIRTH_FOUND_DATE","CREATED_BY")
VALUES
  (1001,'PERSON','박철수','8203151000000','RRN','19820315','SEED'),
  (1002,'PERSON','김영희','8406202000000','RRN','19840620','SEED'),
  (1003,'PERSON','최지영','1512104000000','RRN','20151210','SEED'),
  (1004,'PERSON','김연체','7204181000000','RRN','19720418','SEED'),
  (1005,'PERSON','김미선','8907222000000','RRN','19890722','SEED');

INSERT INTO public."INDIVIDUAL_PARTY"
  ("PARTY_ID","RESIDENT_CD","BIRTH_DATE","GENDER","CURRENT_EMPLOYER","ANNUAL_INCOME","CREATED_BY")
VALUES
  (1001,'KR','19820315','M','다온테크',         72000000,'SEED'),
  (1002,'KR','19840620','F','프리랜서',         32000000,'SEED'),
  (1003,'KR','20151210','F',NULL,                       0,'SEED'),
  (1004,'KR','19720418','M','연체식당(개인사업)', 28000000,'SEED'),
  (1005,'KR','19890722','F','두리테크(대표)',    96000000,'SEED');

-- ---------------------------------------------------------------
-- 2) CUSTOMER (5명)
-- ---------------------------------------------------------------
INSERT INTO public."CUSTOMER"
  ("CUSTOMER_NO","PARTY_ID","EMAIL","CI_VALUE","PASSWORD",
   "JOIN_DATETIME","PRIVACY_AGREE_YN","MARKETING_AGREE_YN",
   "CUST_GRADE_CD","CUST_STATUS_CD","SIMPLE_PIN","CREATED_BY")
OVERRIDING SYSTEM VALUE VALUES
  (100001,1001,'park@daon.example',   'CI-PARK-100001',
   '$2b$12$8xLJ0eyCSs.1rmBZ5aYfgup4lSfVi7C0tIe7/KlK7YQb7KujFriHe',
   '20250120093000','Y','Y','VIP','5050',
   '$2b$12$cHFEsuLmkdh1ZF8fyPqgduEDQgHnrOBrRd5j8/T0GthiRFgwUmN8i','SEED'),
  (100002,1002,'kim.yh@daon.example', 'CI-KIMYH-100002',
   '$2b$12$8xLJ0eyCSs.1rmBZ5aYfgup4lSfVi7C0tIe7/KlK7YQb7KujFriHe',
   '20250120093100','Y','N','GENERAL','5050',
   '$2b$12$cHFEsuLmkdh1ZF8fyPqgduEDQgHnrOBrRd5j8/T0GthiRFgwUmN8i','SEED'),
  (100003,1003,'choi.jy@daon.example','CI-CHOI-100003',
   '$2b$12$8xLJ0eyCSs.1rmBZ5aYfgup4lSfVi7C0tIe7/KlK7YQb7KujFriHe',
   '20250120093200','Y','N','MINOR','5050',
   '$2b$12$cHFEsuLmkdh1ZF8fyPqgduEDQgHnrOBrRd5j8/T0GthiRFgwUmN8i','SEED'),
  (100004,1004,'kim.over@daon.example','CI-KIMOV-100004',
   '$2b$12$8xLJ0eyCSs.1rmBZ5aYfgup4lSfVi7C0tIe7/KlK7YQb7KujFriHe',
   '20240601093300','Y','N','GENERAL','5050',
   '$2b$12$cHFEsuLmkdh1ZF8fyPqgduEDQgHnrOBrRd5j8/T0GthiRFgwUmN8i','SEED'),
  (100005,1005,'kim.ms@daon.example', 'CI-KIMMS-100005',
   '$2b$12$8xLJ0eyCSs.1rmBZ5aYfgup4lSfVi7C0tIe7/KlK7YQb7KujFriHe',
   '20240301093400','Y','Y','VIP','5050',
   '$2b$12$cHFEsuLmkdh1ZF8fyPqgduEDQgHnrOBrRd5j8/T0GthiRFgwUmN8i','SEED');

-- ---------------------------------------------------------------
-- 3) CUSTOMER_ADDRESS / CUSTOMER_CONTACT
-- ---------------------------------------------------------------
INSERT INTO public."CUSTOMER_ADDRESS"
  ("CUSTOMER_NO","ADDR_SEQ","ADDR_TYPE_CD","POSTAL_CODE","ADDR_LINE1","ADDR_LINE2","PRIMARY_YN","ADDR_START_DATE","CREATED_BY")
VALUES
  (100001,1,'HOME','06236','서울 강남구 테헤란로 100','다온빌딩 12층','Y','20250120','SEED'),
  (100002,1,'HOME','06236','서울 강남구 테헤란로 100','다온빌딩 12층','Y','20250120','SEED'),
  (100003,1,'HOME','06236','서울 강남구 테헤란로 100','다온빌딩 12층','Y','20250120','SEED'),
  (100004,1,'HOME','04524','서울 중구 을지로 50',     '연체빌딩 3층',  'Y','20240601','SEED'),
  (100005,1,'HOME','06168','서울 강남구 봉은사로 200','두리테크 7층',  'Y','20240301','SEED');

-- CONTACT_VALUE varchar(20) 라 이메일이 안 들어가니 휴대전화만.
-- 이메일은 CUSTOMER.EMAIL 에 이미 저장됨.
INSERT INTO public."CUSTOMER_CONTACT"
  ("CUSTOMER_NO","CONTACT_SEQ","CONTACT_TYPE_CD","CONTACT_VALUE","PRIMARY_YN","VERIFIED_YN","CONTACT_REG_DATE","CREATED_BY")
VALUES
  (100001,1,'MOBILE','01012340001','Y','Y','20250120','SEED'),
  (100002,1,'MOBILE','01012340002','Y','Y','20250120','SEED'),
  (100003,1,'MOBILE','01012340003','Y','Y','20250120','SEED'),
  (100004,1,'MOBILE','01012340004','Y','Y','20240601','SEED'),
  (100005,1,'MOBILE','01012340005','Y','Y','20240301','SEED');

-- ---------------------------------------------------------------
-- 4) ACCOUNT — 박철수 3개 + 김영희 공동 1개 + 최지영 적금 1개 + 김연체 1개 + 김미선 마통 1개
-- ---------------------------------------------------------------
INSERT INTO public."ACCOUNT"
  ("ACCOUNT_NO","CUSTOMER_NO","ACCOUNT_TYPE_CD","OPEN_DATE","BALANCE",
   "ACCOUNT_STATUS_CD","ACCOUNT_HOLDER_NAME","DAILY_WITHDRAW_LIMIT","DAILY_TRANSFER_LIMIT",
   "ACCOUNT_ALIAS","DISPLAY_ORDER","HIDDEN_YN","PRIMARY_ACCOUNT_YN","CREATED_BY")
VALUES
  -- 박철수 P-001
  ('110-001-100001',100001,'SAVING',     '20250120',  5000000,'5050','박철수', 30000000,100000000,'주거래 통장',  1,'N','Y','SEED'),
  ('110-002-100001',100001,'DEPOSIT',    '20250201', 10000000,'5050','박철수',  5000000, 10000000,'정기예금 24개월',2,'N','N','SEED'),
  ('110-003-100001',100001,'INSTALL',    '20250301',  3000000,'5050','박철수',  5000000, 10000000,'정기적금 24개월',3,'N','N','SEED'),
  -- 김영희 P-002 (공동명의 — CONTRACT_PARTICIPANT 로 표현)
  ('110-004-100001',100002,'SAVING',     '20250120',  2000000,'5050','박철수·김영희',10000000, 50000000,'공동명의 통장',  1,'N','Y','SEED'),
  -- 최지영 P-003 (어린이 적금)
  ('110-005-100001',100003,'INSTALL',    '20250120',  1000000,'5050','최지영',  1000000,  1000000,'어린이 적금',    1,'N','Y','SEED'),
  -- 김연체 P-004
  ('110-006-100001',100004,'SAVING',     '20240601',    10000,'LIMITED','김연체', 1000000,  5000000,'주거래(연체)',   1,'N','Y','SEED'),
  -- 김미선 P-005 (마통 — 잔액 음수, ACCOUNT_TYPE_CD varchar(8) 한도라 SAVING + 별칭으로 구분)
  ('110-007-100001',100005,'SAVING',     '20240301',-23000000,'5050','김미선',30000000,100000000,'마이너스통장',   1,'N','Y','SEED');

COMMIT;