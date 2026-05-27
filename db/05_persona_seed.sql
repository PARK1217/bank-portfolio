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
DELETE FROM public."AI_LOAN_DECISION"     WHERE "APPLICATION_ID" IN (
  SELECT "LOAN_APP_ID" FROM public."LOAN_APPLICATION" WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005)
);
DELETE FROM public."LOAN_APPLICATION"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
-- CUSTOMER FK 보유한 부수 테이블도 함께 정리 (회원가입 환영 알림 등 자동 생성분).
DELETE FROM public."NOTIFICATION"         WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."MY_DATA_LINK"         WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."FREQUENT_ACCOUNT"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."AI_CHATBOT_FEEDBACK"  WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."AI_CHATBOT_MESSAGE"   WHERE "SESSION_ID" IN (
  SELECT "SESSION_ID" FROM public."AI_CHATBOT_SESSION" WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005)
);
DELETE FROM public."AI_CHATBOT_SESSION"   WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."AI_ASSET_SESSION"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_TERMS_AGREE" WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."MARKETING_AGREE"      WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."AUTO_TRANSFER_EXEC"   WHERE "AUTO_TRANSFER_ID" IN (
  SELECT "AUTO_TRANSFER_ID" FROM public."AUTO_TRANSFER"
   WHERE "WITHDRAW_ACCOUNT_NO" LIKE '110-%-10000_' OR "DEPOSIT_ACCOUNT_NO" LIKE '110-%-10000_'
);
DELETE FROM public."AUTO_TRANSFER"        WHERE "WITHDRAW_ACCOUNT_NO" LIKE '110-%-10000_'
                                             OR "DEPOSIT_ACCOUNT_NO"  LIKE '110-%-10000_';
DELETE FROM public."TRANSACTION"          WHERE "ACCOUNT_NO" LIKE '110-%-10000_';
DELETE FROM public."TRANSFER"             WHERE "WITHDRAW_ACCOUNT_NO" LIKE '110-%-10000_'
                                             OR "DEPOSIT_ACCOUNT_NO"  LIKE '110-%-10000_';
DELETE FROM public."DEPOSIT_CONTRACT"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CONTRACT_PARTICIPANT" WHERE "PARTY_ID" IN (1001,1002,1003,1004,1005);
DELETE FROM public."DELEGATION"           WHERE "TARGET_CUST_NO" IN (100001,100002,100003,100004,100005)
                                             OR "AGENT_CUST_NO"  IN (100001,100002,100003,100004,100005);
DELETE FROM public."ACCOUNT_STATUS_HISTORY" WHERE "ACCOUNT_NO" IN (
  SELECT "ACCOUNT_NO" FROM public."ACCOUNT" WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005)
);
DELETE FROM public."ACCOUNT"              WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_CONTACT"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_ADDRESS"     WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."ATTACHED_DOC"         WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."FDS_DETECTION"        WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_STATUS_HISTORY" WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
DELETE FROM public."CUSTOMER_GRADE_HISTORY"  WHERE "CUSTOMER_NO" IN (100001,100002,100003,100004,100005);
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


-- ---------------------------------------------------------------
-- 5) DEPOSIT_CONTRACT — 박철수 정기예금/적금 2건, 최지영 어린이 적금 1건
-- ---------------------------------------------------------------
INSERT INTO public."DEPOSIT_CONTRACT"
  ("CONTRACT_NO","ACCOUNT_NO","CUSTOMER_NO","PRODUCT_ID",
   "CONTRACT_DATE","EFFECTIVE_DATE","MATURITY_DATE","CONTRACT_STATUS_CD",
   "BASE_RATE","APPLY_RATE","PERIOD_MONTHS","BONUS_RATE",
   "CONTRACT_MONTHLY_AMT","PAID_COUNT","CREATED_BY")
VALUES
  ('D-2025-100001A','110-002-100001',100001,201,
   '20250201','20250201','20270201','ACTIVE',
   3.550,3.850,24,0.300,
   0,0,'SEED'),
  ('D-2025-100001B','110-003-100001',100001,302,
   '20250301','20250301','20270301','ACTIVE',
   3.350,3.700,24,0.350,
   300000,3,'SEED'),
  ('D-2025-100003A','110-005-100001',100003,304,
   '20250120','20250120','20280120','ACTIVE',
   3.500,3.500,36,0.000,
   100000,4,'SEED');

-- ---------------------------------------------------------------
-- 6) AUTO_TRANSFER — 박철수 3건 (적금 납입 / 통신비 / 관리비)
-- ---------------------------------------------------------------
INSERT INTO public."AUTO_TRANSFER"
  ("AUTO_TRANSFER_ID","CUSTOMER_NO","WITHDRAW_ACCOUNT_NO",
   "DEPOSIT_ACCOUNT_NO","DEPOSIT_BANK_CD","DEPOSIT_BANK_NAME","DEPOSIT_HOLDER_NAME",
   "TRANSFER_AMOUNT","CYCLE_TYPE_CD","MONTHLY_EXEC_DAY",
   "VALID_START_DATE","VALID_END_DATE","AUTO_STATUS_CD",
   "WITHDRAW_MEMO","CARRY_NEXT_MONTH_YN","CREATED_BY")
OVERRIDING SYSTEM VALUE VALUES
  (10001,100001,'110-001-100001',
   '110-003-100001','098','다온뱅크','박철수',
   300000,'MONTHLY',10,
   '20250301','20270301','ACTIVE',
   '적금 납입','N','SEED'),
  (10002,100001,'110-001-100001',
   '110-999-000088','088','신한','SK텔레콤',
   65000,'MONTHLY',25,
   '20250101','99991231','ACTIVE',
   '통신비','Y','SEED'),
  (10003,100001,'110-001-100001',
   '110-999-000099','088','신한','관리사무소',
   250000,'MONTHLY',15,
   '20250101','99991231','ACTIVE',
   '관리비','Y','SEED');

-- ---------------------------------------------------------------
-- 7) TRANSACTION — 박철수 자유입출금 거래 패턴 6건
-- ---------------------------------------------------------------
INSERT INTO public."TRANSACTION"
  ("ACCOUNT_NO","TX_DATETIME","TX_TYPE_CD","TX_AMOUNT","POST_TX_BALANCE",
   "COUNTERPART_ACCOUNT_NO","COUNTERPART_BANK_CD","COUNTERPART_BANK_NAME","COUNTERPART_HOLDER_NAME",
   "OWN_BANK_YN","TX_CHANNEL_CD","TX_STATUS_CD","TX_MEMO","CREATED_BY")
VALUES
  ('110-001-100001','20250310093000','WITHDRAW',-300000,4700000,
   '110-003-100001','098','다온뱅크','박철수','Y','AUTO','SETTLED','적금 자동이체','SEED'),
  ('110-003-100001','20250310093000','DEPOSIT',300000,2700000,
   '110-001-100001','098','다온뱅크','박철수','Y','AUTO','SETTLED','적금 자동이체 입금','SEED'),
  ('110-001-100001','20250315093000','WITHDRAW',-250000,4450000,
   '110-999-000099','088','신한','관리사무소','N','AUTO','SETTLED','관리비','SEED'),
  ('110-001-100001','20250325090000','DEPOSIT',5000000,9450000,
   '110-988-000123','088','신한','다온테크','N','EXTERNAL','SETTLED','3월 급여','SEED'),
  ('110-001-100001','20250325093000','WITHDRAW',-65000,9385000,
   '110-999-000088','088','신한','SK텔레콤','N','AUTO','SETTLED','통신비','SEED'),
  ('110-001-100001','20250327150000','WITHDRAW',-350000,9035000,
   NULL,NULL,NULL,NULL,'Y','CARD','SETTLED','신용카드 결제','SEED');

-- ---------------------------------------------------------------
-- 8) LOAN — 김연체 P-004 신용대출 L-2024-100004 (3천만 / 60개월 / 5% / 7회차 OVERDUE)
-- ---------------------------------------------------------------
-- LOAN_APPLICATION / LOAN_CONTRACT 의 일자도 첫 회차와 어긋나지 않게 동적 산출.
-- 약정일 = 첫 회차 일자 - 약 1개월 (오늘 - 17개월의 1일), 만기일 = 60회차 일자.
INSERT INTO public."LOAN_APPLICATION"
  ("LOAN_APP_ID","CUSTOMER_NO","APPLY_PRODUCT_ID","APPLY_TYPE_CD","LOAN_TYPE_CD",
   "DESIRED_AMOUNT","EXPECTED_LIMIT","EXPECTED_RATE",
   "APPLY_DATETIME","APPLY_STATUS_CD","APPLY_CHANNEL_CD",
   "PURPOSE_CD","CREATED_BY")
OVERRIDING SYSTEM VALUE
SELECT
  20001,100004,401,'NEW','CREDIT',
  30000000,30000000,5.000,
  to_char(date_trunc('month', CURRENT_DATE - INTERVAL '17 months') + INTERVAL '5 days', 'YYYYMMDD') || '100000',
  'APPROVED','MOBILE',
  'LIVING','SEED';

INSERT INTO public."LOAN_CONTRACT"
  ("LOAN_CONTRACT_NO","CUSTOMER_NO","LOAN_PRODUCT_ID","LOAN_TYPE_CD","REPAY_METHOD_CD",
   "CONTRACT_LIMIT","CURRENT_USAGE","CONTRACT_RATE","BASE_RATE","SPREAD_RATE","OVERDUE_SPREAD_RATE",
   "CONTRACT_DATE","EFFECTIVE_DATE","MATURITY_DATE","LOAN_STATUS_CD","OVERDUE_STAGE_CD",
   "MAIN_DEPOSIT_ACCOUNT_NO","PRODUCT_NAME_SNAPSHOT")
SELECT
  'L-2024-100004',100004,401,'CREDIT','EPI',
  30000000,27500000,5.000,4.500,0.500,3.000,
  to_char(date_trunc('month', CURRENT_DATE - INTERVAL '17 months'), 'YYYYMMDD'),
  to_char(date_trunc('month', CURRENT_DATE - INTERVAL '17 months'), 'YYYYMMDD'),
  to_char(date_trunc('month', CURRENT_DATE + INTERVAL '43 months') + INTERVAL '24 days', 'YYYYMMDD'),
  'OVERDUE','STAGE1',
  '110-006-100001','직장인 우대 신용대출';

-- 자금 실행 이력 — 약정일에 30,000,000원 단건 실행 → 주거래 계좌(110-006-100001) 입금.
INSERT INTO public."LOAN_EXEC_HISTORY"
  ("LOAN_CONTRACT_NO","EXEC_SEQ","EXEC_DATETIME","EXEC_TYPE_CD",
   "EXEC_AMOUNT","POST_EXEC_BALANCE","DEPOSIT_ACCOUNT_NO","CHANNEL_CD","EMP_NO","CREATED_BY")
SELECT
  'L-2024-100004', 1,
  to_char(date_trunc('month', CURRENT_DATE - INTERVAL '17 months'), 'YYYYMMDD') || '100000',
  'EXEC',
  30000000, 30000000, '110-006-100001', 'BRANCH', 'ADMIN001', 'SEED';

-- 상환 스케줄 60회차를 "오늘 기준 -16개월부터 매월 25일" 로 동적 생성.
-- 시간이 흘러도 시드 재실행만 하면 항상 "1~6회차 PAID, 7회차부터 지난 회차는 OVERDUE,
-- 남은 회차는 PENDING" 분포가 유지됨. 원리금균등(5%/60개월) 공식으로 회차별 원금·이자 계산.
WITH RECURSIVE amort AS (
  SELECT
    1 AS installment_no,
    30000000::numeric AS opening_balance,
    566137::numeric AS pmt,
    (0.05/12)::numeric AS r
  UNION ALL
  SELECT
    a.installment_no + 1,
    a.opening_balance - (a.pmt - a.opening_balance * a.r),
    a.pmt,
    a.r
  FROM amort a
  WHERE a.installment_no < 60
), rows AS (
  SELECT
    installment_no,
    to_char(
      date_trunc('month', CURRENT_DATE - INTERVAL '16 months')
      + ((installment_no - 1) * INTERVAL '1 month')
      + INTERVAL '24 days',
      'YYYYMMDD'
    ) AS scheduled_date,
    ROUND(opening_balance * r)::int           AS sched_interest,
    ROUND(pmt - opening_balance * r)::int     AS sched_principal,
    ROUND(pmt)::int                           AS sched_total,
    ROUND(opening_balance - (pmt - opening_balance * r))::int AS post_balance
  FROM amort
)
INSERT INTO public."LOAN_REPAY_SCHEDULE"
  ("LOAN_CONTRACT_NO","INSTALLMENT_NO","SCHEDULED_DATE",
   "SCHEDULED_PRINCIPAL","SCHEDULED_INTEREST","SCHEDULED_TOTAL",
   "SCHEDULE_STATUS_CD","POST_PRINCIPAL_BALANCE","CREATED_BY")
SELECT
  'L-2024-100004', installment_no, scheduled_date,
  sched_principal, sched_interest, sched_total,
  CASE
    WHEN installment_no <= 6 THEN 'PAID'
    WHEN to_date(scheduled_date,'YYYYMMDD') < CURRENT_DATE THEN 'OVERDUE'
    ELSE 'PENDING'
  END,
  post_balance, 'SEED'
FROM rows;

-- 정상 납입된 1~6회차의 실제 상환 이력. repay_datetime 도 회차 일자 기반.
WITH RECURSIVE amort AS (
  SELECT
    1 AS installment_no,
    30000000::numeric AS opening_balance,
    566137::numeric AS pmt,
    (0.05/12)::numeric AS r
  UNION ALL
  SELECT
    a.installment_no + 1,
    a.opening_balance - (a.pmt - a.opening_balance * a.r),
    a.pmt,
    a.r
  FROM amort a
  WHERE a.installment_no < 6
)
INSERT INTO public."LOAN_REPAY_HISTORY"
  ("LOAN_CONTRACT_NO","REPAY_SEQ","SCHEDULE_REF","REPAY_DATETIME","REPAY_TYPE_CD",
   "REPAY_PRINCIPAL","REPAY_NORMAL_INTEREST","REPAY_OVERDUE_INTEREST","POST_PRINCIPAL_BALANCE",
   "WITHDRAW_ACCOUNT_NO","CHANNEL_CD","REPAY_STATUS_CD","CREATED_BY")
SELECT
  'L-2024-100004',
  installment_no AS repay_seq,
  installment_no AS schedule_ref,
  to_char(
    date_trunc('month', CURRENT_DATE - INTERVAL '16 months')
    + ((installment_no - 1) * INTERVAL '1 month')
    + INTERVAL '24 days',
    'YYYYMMDD'
  ) || '090000' AS repay_datetime,
  'SCHEDULE',
  ROUND(pmt - opening_balance * r)::int,
  ROUND(opening_balance * r)::int,
  0,
  ROUND(opening_balance - (pmt - opening_balance * r))::int,
  '110-006-100001', 'AUTO', 'OK', 'SEED'
FROM amort;

-- CURRENT_USAGE 를 누적 상환 후 잔여 원금(= 마지막 PAID 회차의 POST_PRINCIPAL_BALANCE) 으로
-- 정합. 시간 흘러 PAID 회차가 늘어도 자동 추종 — UI 의 "현재 사용" ↔ 잔여 원금 일치.
UPDATE public."LOAN_CONTRACT"
SET "CURRENT_USAGE" = (
  SELECT s."POST_PRINCIPAL_BALANCE"
  FROM public."LOAN_REPAY_SCHEDULE" s
  WHERE s."LOAN_CONTRACT_NO" = 'L-2024-100004'
    AND s."SCHEDULE_STATUS_CD" = 'PAID'
  ORDER BY s."INSTALLMENT_NO" DESC
  LIMIT 1
)
WHERE "LOAN_CONTRACT_NO" = 'L-2024-100004';

-- ---------------------------------------------------------------
-- 9) LOAN — 김미선 P-005 마이너스통장 L-2025-100005 (한도 5천만, 사용 2,300만)
-- ---------------------------------------------------------------
INSERT INTO public."LOAN_CONTRACT"
  ("LOAN_CONTRACT_NO","CUSTOMER_NO","LOAN_PRODUCT_ID","LOAN_TYPE_CD","REPAY_METHOD_CD",
   "CONTRACT_LIMIT","CURRENT_USAGE","CONTRACT_RATE","BASE_RATE","SPREAD_RATE","OVERDUE_SPREAD_RATE",
   "CONTRACT_DATE","EFFECTIVE_DATE","MATURITY_DATE","LOAN_STATUS_CD",
   "LOAN_ACCOUNT_NO","MAIN_DEPOSIT_ACCOUNT_NO","PRODUCT_NAME_SNAPSHOT")
VALUES
  ('L-2025-100005',100005,402,'CREDIT','OD',
   50000000,23000000,5.700,4.500,1.200,3.000,
   '20240301','20240301','20260301','NORMAL',
   '110-007-100001','110-007-100001','마이너스통장 한도대출');

-- ---------------------------------------------------------------
-- 9.5) 대시보드 KPI 시드 — LOAN_APPLICATION + AI_LOAN_DECISION 9건
--      자동승인 3건(오늘 2 + 어제 1) / 자동반려 2건(오늘 1 + 어제 1) /
--      사람검토 4건(점수 0.45~0.78). 일자는 모두 CURRENT_DATE 기준 상대화 →
--      시드 재실행 시 항상 "오늘"/"어제" KPI 분포가 유지된다.
--
--      대시보드(/dashboard) "검토 대기 / 오늘 자동 승인 / 오늘 자동 반려" 카드가
--      0건으로 비어 보이던 문제를 해소. ID 대역 20011~20019 (14_human_review_seed
--      의 20003/20004 와 겹치지 않게 +10 이동).
--
--      AUTO_APPROVE: SCORE ≥ 0.85 / AUTO_REJECT: ≤ 0.30 / HUMAN_REVIEW: 그 사이.
--      14_human_review_seed.sql 은 fresh-init 자동 적재 보존 — 본 시드 재실행 시
--      DELETE 블록이 그것까지 함께 정리하므로 결과 분포는 본 섹션이 권위.
-- ---------------------------------------------------------------
INSERT INTO public."LOAN_APPLICATION"
  ("LOAN_APP_ID","CUSTOMER_NO","APPLY_PRODUCT_ID","APPLY_TYPE_CD","LOAN_TYPE_CD",
   "DESIRED_AMOUNT","EXPECTED_LIMIT","EXPECTED_RATE",
   "APPLY_DATETIME","APPLY_STATUS_CD","APPLY_CHANNEL_CD",
   "PURPOSE_CD","CREATED_BY")
VALUES
  -- AUTO_APPROVE 3건
  (20011, 100001, 401, 'NEW', 'CREDIT',
   20000000, 20000000, 4.500,
   to_char(CURRENT_DATE, 'YYYYMMDD') || '093000', 'APPROVED', 'MOBILE',
   'LIVING', 'SEED'),
  (20012, 100002, 401, 'NEW', 'CREDIT',
    8000000,  8000000, 4.800,
   to_char(CURRENT_DATE, 'YYYYMMDD') || '142500', 'APPROVED', 'MOBILE',
   'LIVING', 'SEED'),
  (20013, 100005, 401, 'NEW', 'CREDIT',
   12000000, 12000000, 4.700,
   to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYYMMDD') || '110000', 'APPROVED', 'MOBILE',
   'LIVING', 'SEED'),
  -- AUTO_REJECT 2건
  (20014, 100004, 401, 'NEW', 'CREDIT',
   50000000, 50000000, 7.200,
   to_char(CURRENT_DATE, 'YYYYMMDD') || '101500', 'REJECTED', 'MOBILE',
   'LIVING', 'SEED'),
  (20015, 100001, 401, 'NEW', 'CREDIT',
  300000000,300000000, 6.500,
   to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYYMMDD') || '163000', 'REJECTED', 'MOBILE',
   'LIVING', 'SEED'),
  -- HUMAN_REVIEW 4건
  (20016, 100002, 401, 'NEW', 'CREDIT',
   25000000, 25000000, 5.300,
   to_char(CURRENT_DATE,                       'YYYYMMDD') || '113000', 'APPLIED', 'MOBILE',
   'LIVING', 'SEED'),
  (20017, 100005, 401, 'NEW', 'CREDIT',
   18000000, 18000000, 5.700,
   to_char(CURRENT_DATE,                       'YYYYMMDD') || '155500', 'APPLIED', 'MOBILE',
   'LIVING', 'SEED'),
  (20018, 100001, 401, 'NEW', 'CREDIT',
   35000000, 35000000, 5.000,
   to_char(CURRENT_DATE - INTERVAL '1 day',    'YYYYMMDD') || '094500', 'APPLIED', 'MOBILE',
   'LIVING', 'SEED'),
  (20019, 100002, 401, 'NEW', 'CREDIT',
   15000000, 15000000, 5.500,
   to_char(CURRENT_DATE - INTERVAL '2 days',   'YYYYMMDD') || '173000', 'APPLIED', 'MOBILE',
   'LIVING', 'SEED');

-- AI_LOAN_DECISION 9건. CREATED_AT 을 CURRENT_TIMESTAMP 또는 -1d/-2d 로 명시 →
-- 프론트 todayDecisions 필터(created_at startsWith today) 가 정확히 "오늘" 분만 집계.
INSERT INTO public."AI_LOAN_DECISION"
  ("APPLICATION_ID","MODEL_VERSION","FEATURES_JSON","SCORE","DECISION_CD",
   "THRESHOLD_HIGH","THRESHOLD_LOW","CREATED_AT")
VALUES
  -- AUTO_APPROVE (SCORE ≥ 0.85)
  (20011, 'loan_xgb_v1',
   '{"credit_score": 820, "annual_income": 72000000, "overdue_ratio": 0.0, "request_ratio": 0.244, "deposit_balance": 18000000, "overdue_days_24m": 0}'::jsonb,
   0.9100, 'AUTO_APPROVE', 0.8500, 0.3000, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
  (20012, 'loan_xgb_v1',
   '{"credit_score": 750, "annual_income": 32000000, "overdue_ratio": 0.0, "request_ratio": 0.107, "deposit_balance": 5400000, "overdue_days_24m": 0}'::jsonb,
   0.8800, 'AUTO_APPROVE', 0.8500, 0.3000, CURRENT_TIMESTAMP - INTERVAL '40 minutes'),
  (20013, 'loan_xgb_v1',
   '{"credit_score": 780, "annual_income": 96000000, "overdue_ratio": 0.0, "request_ratio": 0.154, "deposit_balance": 22000000, "overdue_days_24m": 0}'::jsonb,
   0.8950, 'AUTO_APPROVE', 0.8500, 0.3000,
   date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '1 day' + INTERVAL '11 hours 30 minutes'),
  -- AUTO_REJECT (SCORE ≤ 0.30)
  (20014, 'loan_xgb_v1',
   '{"credit_score": 540, "annual_income": 28000000, "overdue_ratio": 0.183, "request_ratio": 0.925, "deposit_balance": 80000, "overdue_days_24m": 305}'::jsonb,
   0.1500, 'AUTO_REJECT',  0.8500, 0.3000, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
  (20015, 'loan_xgb_v1',
   '{"credit_score": 820, "annual_income": 72000000, "overdue_ratio": 0.0, "request_ratio": 3.658, "deposit_balance": 18000000, "overdue_days_24m": 0}'::jsonb,
   0.2400, 'AUTO_REJECT',  0.8500, 0.3000,
   date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '1 day' + INTERVAL '16 hours 45 minutes'),
  -- HUMAN_REVIEW (0.30 < SCORE < 0.85, HUMAN_REVIEWED_AT IS NULL → 대기 큐)
  (20016, 'loan_xgb_v1',
   '{"credit_score": 700, "annual_income": 32000000, "overdue_ratio": 0.0, "request_ratio": 0.357, "deposit_balance": 5400000, "overdue_days_24m": 0}'::jsonb,
   0.5800, 'HUMAN_REVIEW', 0.8500, 0.3000, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
  (20017, 'loan_xgb_v1',
   '{"credit_score": 720, "annual_income": 96000000, "overdue_ratio": 0.0, "request_ratio": 0.250, "deposit_balance": 22000000, "overdue_days_24m": 0}'::jsonb,
   0.7100, 'HUMAN_REVIEW', 0.8500, 0.3000, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
  (20018, 'loan_xgb_v1',
   '{"credit_score": 760, "annual_income": 72000000, "overdue_ratio": 0.0, "request_ratio": 0.461, "deposit_balance": 18000000, "overdue_days_24m": 0}'::jsonb,
   0.6400, 'HUMAN_REVIEW', 0.8500, 0.3000,
   date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '1 day' + INTERVAL '9 hours 50 minutes'),
  (20019, 'loan_xgb_v1',
   '{"credit_score": 690, "annual_income": 32000000, "overdue_ratio": 0.0, "request_ratio": 0.214, "deposit_balance": 5400000, "overdue_days_24m": 0}'::jsonb,
   0.4500, 'HUMAN_REVIEW', 0.8500, 0.3000,
   date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '2 days' + INTERVAL '17 hours 35 minutes');

-- ---------------------------------------------------------------
-- 10) DELEGATION — 박철수→김영희 (배우자) / 박철수→최지영 (친권자 8권한)
-- ---------------------------------------------------------------
INSERT INTO public."DELEGATION"
  ("DELEGATION_ID","TARGET_CUST_NO","AGENT_CUST_NO","ROLE_TYPE_CD",
   "INQUIRY_PERM","WITHDRAW_PERM","TRANSFER_PERM","CLOSE_PERM",
   "OPEN_PRODUCT_PERM","LOAN_APPLY_PERM","LIMIT_CHANGE_PERM","PWD_CHANGE_PERM",
   "DELEG_START_DATE","NOTARIZE_YN","DAILY_LIMIT","CREATED_BY")
OVERRIDING SYSTEM VALUE VALUES
  (30001,100001,100002,'SPOUSE',
   'Y','Y','Y','N',
   'N','N','N','N',
   '20250120','Y',5000000,'SEED'),
  (30002,100003,100001,'PARENT',
   'Y','Y','Y','Y',
   'Y','Y','Y','Y',
   '20250120','N',1000000,'SEED');

-- ---------------------------------------------------------------
-- 11) CONTRACT_PARTICIPANT — 공동명의 110-004-100001 (박철수 + 김영희)
--     ROLE_TYPE_MASTER 가 비어 있으면 'JOINT' 마스터를 먼저 시드 (FK 충족용).
-- ---------------------------------------------------------------
INSERT INTO public."ROLE_TYPE_MASTER" ("ROLE_TYPE_ID","ROLE_TYPE_NAME","CREATED_BY")
VALUES ('JOINT','공동명의자','SEED'),
       ('OWNER','단독명의자','SEED')
ON CONFLICT ("ROLE_TYPE_ID") DO NOTHING;

INSERT INTO public."CONTRACT_PARTICIPANT"
  ("CONTRACT_NO","PARTY_ID","ROLE_TYPE_ID","PARTICIPANT_SEQ","SHARE_RATIO",
   "PARTICIPATE_START_DATE","PARTICIPATE_STATUS_CD","JOINT_LIABILITY_YN","CREATED_BY")
VALUES
  ('110-004-100001',1001,'JOINT',1,0.50,'20250120','ACTIVE','Y','SEED'),
  ('110-004-100001',1002,'JOINT',2,0.50,'20250120','ACTIVE','Y','SEED');

-- ---------------------------------------------------------------
-- 12) CUSTOMER_GRADE_HISTORY — 회원 상세 「등급 변경 이력」 카드용
--     모든 페르소나에 최소 1행씩 가입 시점 등급 행 적재 → 빈 카드 노출 방지.
--     박철수/김미선은 GENERAL → VIP 승급 흐름으로 2행 (직전 행 END_DATE 채우고
--     새 행 START_DATE 으로 마감 패턴, backend/app/service/admin_customer_action
--     의 change_customer_grade 와 동일 구조).
-- ---------------------------------------------------------------
INSERT INTO public."CUSTOMER_GRADE_HISTORY"
  ("CUSTOMER_NO","GRADE_START_DATE","GRADE_END_DATE","CUST_GRADE_CD",
   "GRADE_REASON_CD","REMARK","CREATED_BY")
VALUES
  -- 박철수: 가입 GENERAL → 6개월 뒤 VIP 승급 (현재)
  (100001,'20250120','20250720','GENERAL','INITIAL','가입 시 초기 산정','SEED'),
  (100001,'20250720',NULL,      'VIP',    'UPGRADE','거래 실적 우수 — 자동 승급','SEED'),
  -- 김영희: 가입 시점 GENERAL (현재)
  (100002,'20250120',NULL,      'GENERAL','INITIAL','가입 시 초기 산정','SEED'),
  -- 최지영: 가입 시점 MINOR (현재)
  (100003,'20250120',NULL,      'MINOR',  'INITIAL','미성년 자동 등급','SEED'),
  -- 김연체: 가입 시점 GENERAL (현재) — 연체 발생 후에도 등급 자체는 유지
  (100004,'20240601',NULL,      'GENERAL','INITIAL','가입 시 초기 산정','SEED'),
  -- 김미선: 가입 GENERAL → 9개월 뒤 VIP 승급 (현재)
  (100005,'20240301','20241201','GENERAL','INITIAL','가입 시 초기 산정','SEED'),
  (100005,'20241201',NULL,      'VIP',    'UPGRADE','법인대표·신용대출 우량 — 자동 승급','SEED');

-- ---------------------------------------------------------------
-- 13) CUSTOMER_STATUS_HISTORY — 회원 상세 「상태 변경 이력」 카드용
--     박철수: 보이스피싱 의심 거래로 일시 잠금(LOCKED) → 본인인증 후 해제(5050).
--     김연체: 연체 발생으로 한도 제한(LIMITED) → 일부 상환 약정 후 정상 복원(5050).
--     이력의 마지막 NEW_STATUS_CD 가 CUSTOMER.CUST_STATUS_CD 와 일치 → 도메인 정합.
--     일자는 CURRENT_DATE 기준 상대화하여 시연 시 "최근 이벤트" 자연스럽게 노출.
-- ---------------------------------------------------------------
INSERT INTO public."CUSTOMER_STATUS_HISTORY"
  ("CUSTOMER_NO","EVENT_DATETIME","OLD_STATUS_CD","NEW_STATUS_CD",
   "REASON_CD","REMARK","EMPLOYEE_NO")
VALUES
  -- 박철수 (100001): 보이스피싱 의심 → 잠금 → 본인인증 후 해제 (CURRENT_DATE 약 3개월 전)
  (100001,
   to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYYMMDD') || '141500',
   '5050','LOCKED','FRAUD_LOCK','보이스피싱 의심 거래 패턴 탐지 — FDS 자동 잠금','ADMIN001'),
  (100001,
   to_char(CURRENT_DATE - INTERVAL '3 months' + INTERVAL '1 day', 'YYYYMMDD') || '093000',
   'LOCKED','5050','UNLOCK','본인 영상 인증 완료 — 정상 복원','ADMIN001'),
  -- 김연체 (100004): 연체 발생 → 한도 제한 → 약정 합의 후 복원 (시드 약정일 + 8개월)
  (100004,
   to_char(date_trunc('month', CURRENT_DATE - INTERVAL '9 months'), 'YYYYMMDD') || '101000',
   '5050','LIMITED','COMPLIANCE','연체 60일 경과 — 이체 한도·신규 가입 제한','ADMIN001'),
  (100004,
   to_char(date_trunc('month', CURRENT_DATE - INTERVAL '7 months'), 'YYYYMMDD') || '163000',
   'LIMITED','5050','USER_REQUEST','부분 상환 약정 체결 — 정상 상태 복원','ADMIN001');

-- ---------------------------------------------------------------
-- 14) FDS_DETECTION — /fds 이상거래 조사 화면용 시드 4건
--     화면 비어 있는 문제 해소. 페르소나별 의미있는 분포:
--     - 박철수(100001) 2건: 카드결제 심야 PENDING + 통신비 정상 CONFIRM
--     - 김연체(100004) 1건: 연체 중 대량 출금 시도 PENDING (시연 임팩트)
--     - 김미선(100005) 1건: 마통 한도 임박 출금 WARN/CONFIRM
--     DETECT_DATETIME 은 CURRENT_DATE 기준 상대화. 멱등 정리는 line 62 (FDS_DETECTION) 이미 처리.
--     기존 db/09_fds_alert_seed.sql 의 내용을 본 시드에 통합 — fresh init 자동 적재 + reset 일관성.
-- ---------------------------------------------------------------
INSERT INTO public."FDS_DETECTION"
  ("CUSTOMER_NO","DETECT_SEQ","TRANSACTION_ID","ACCOUNT_NO",
   "DETECT_DATETIME","TOTAL_SCORE","JUDGMENT_CD",
   "ACCESS_IP","ACCESS_COUNTRY","REMARK",
   "INVESTIGATION_STATUS_CD","CREATED_BY")
VALUES
  -- 박철수 #1: 심야 카드 결제 PENDING (시드 5e3절 신용카드 결제 -350,000 매핑)
  (100001, 1,
   (SELECT "TRANSACTION_ID" FROM public."TRANSACTION"
      WHERE "ACCOUNT_NO" = '110-001-100001' AND "TX_DATETIME" = '20250327150000'
        AND "TX_AMOUNT" = -350000 LIMIT 1),
   '110-001-100001',
   to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYYMMDD') || '013200', 82, 'WARN',
   '203.0.113.47', 'KR',
   '심야 시간대 결제 / 평소 사용 위치와 다름 / 단기 다발 결제',
   'PENDING', 'SEED'),
  -- 박철수 #2: 통신비 자동이체 NORMAL (이미 본인 확인 완료)
  (100001, 2,
   (SELECT "TRANSACTION_ID" FROM public."TRANSACTION"
      WHERE "ACCOUNT_NO" = '110-001-100001' AND "TX_DATETIME" = '20250325093000'
        AND "TX_AMOUNT" = -65000 LIMIT 1),
   '110-001-100001',
   to_char(CURRENT_DATE - INTERVAL '9 days', 'YYYYMMDD') || '092500', 65, 'NORMAL',
   '203.0.113.10', 'KR',
   '월 통신비 자동이체 / 거래액 평소 대비 동일',
   'CONFIRM', 'SEED'),
  -- 김연체 #1: 연체 중 대량 출금 시도 PENDING — 시연 의미 큼
  (100004, 1,
   NULL,
   '110-006-100001',
   to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYYMMDD') || '224500', 88, 'WARN',
   '198.51.100.77', 'KR',
   '연체 중 잔액 한도 임박 출금 시도 / 평소 거래 패턴과 상이 / 신규 IP',
   'PENDING', 'SEED'),
  -- 김미선 #1: 마통 한도 임박 출금 CONFIRM (정상 처리됨)
  (100005, 1,
   NULL,
   '110-007-100001',
   to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYYMMDD') || '143000', 72, 'WARN',
   '203.0.113.155', 'KR',
   '마이너스통장 한도 임박 인출 / 단기 다발 거래',
   'CONFIRM', 'SEED');

UPDATE public."FDS_DETECTION"
   SET "INVESTIGATION_CONCLUSION" = '고객 본인 거래로 확인'
 WHERE "CUSTOMER_NO" = 100001 AND "DETECT_SEQ" = 2;
UPDATE public."FDS_DETECTION"
   SET "INVESTIGATION_CONCLUSION" = '잔액 임박 정당 인출 — 본인 거래'
 WHERE "CUSTOMER_NO" = 100005 AND "DETECT_SEQ" = 1;

COMMIT;