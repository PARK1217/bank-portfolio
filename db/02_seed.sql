-- ===================================================================
-- 02_seed.sql — 시드 상품 25종 (다온뱅크)
-- ===================================================================
-- data/seed-products.md (Phase A 코퍼스) 기반 SQL 변환.
-- SAVING 5 + DEPOSIT 6 + INSTALL 6 + LOAN 8 = 25.
--
-- 참고:
--   • PRODUCT_TYPE_CD 는 varchar(8) 라 'INSTALLMENT' 못 들어감 → 'INSTALL' 사용
--   • PRODUCT_RATE_POLICY 는 (PRODUCT_ID, RATE_SEQ) 복합 PK. base_rate = APPLY_RATE
--   • 기존 placeholder (9998/9999) 는 삭제하고 25개로 교체
--
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/02_seed.sql
-- ===================================================================

BEGIN;

-- 순서: (1) 신규 25개 INSERT → (2) 9998 의 FK 참조를 401 로 재할당 → (3) placeholder DELETE.
-- 이렇게 해야 401 이 PRODUCT 에 먼저 존재해서 FK 충돌 없이 UPDATE 가능.


-- ===================================================================
-- 1) SAVING (입출금) — 5종
-- ===================================================================
INSERT INTO public."PRODUCT" (
    "PRODUCT_ID","PRODUCT_NAME","PRODUCT_TYPE_CD","SPECIAL_YN","EARLY_CLOSE_YN",
    "MIN_AGE","MAX_AGE","TARGET_CUSTOMER_CD","MIN_AMOUNT","MAX_AMOUNT",
    "SALE_START_DATE","SALE_END_DATE","PRODUCT_STATUS_CD"
) VALUES
(101, '다온뱅크 자유입출금 통장',  'SAVING', 'N', 'Y', 14, 99, 'ALL',           0, 100000000000, '20260101', '20991231', 'SALE'),
(102, '급여이체 우대 통장',         'SAVING', 'N', 'Y', 19, 70, 'INDIV',         0,      500000, '20260101', '20991231', 'SALE'),
(103, '마이너스통장 한도형',         'SAVING', 'N', 'Y', 19, 65, 'INDIV',   5000000,   100000000, '20260101', '20991231', 'SALE'),
(104, '외화 자유입출금 통장',        'SAVING', 'N', 'Y', 14, 99, 'ALL',           0, 100000000000, '20260101', '20991231', 'SALE'),
(105, '법인 당좌예금',               'SAVING', 'N', 'Y',  0, 99, 'CORP',          0, 100000000000, '20260101', '20991231', 'SALE');


-- ===================================================================
-- 2) DEPOSIT (정기예금) — 6종
-- ===================================================================
INSERT INTO public."PRODUCT" (
    "PRODUCT_ID","PRODUCT_NAME","PRODUCT_TYPE_CD","SPECIAL_YN","EARLY_CLOSE_YN","EXTEND_YN",
    "MIN_AGE","MAX_AGE","TARGET_CUSTOMER_CD","MIN_AMOUNT","MAX_AMOUNT",
    "INTEREST_CYCLE_CD","SALE_START_DATE","SALE_END_DATE","PRODUCT_STATUS_CD"
) VALUES
(201, '행복드림 정기예금',          'DEPOSIT', 'N', 'Y', 'N', 19, 99, 'ALL',     1000000, 500000000, 'MATURITY', '20260101', '20991231', 'SALE'),
(202, '프리미엄 거치식 정기예금',   'DEPOSIT', 'Y', 'Y', 'N', 19, 99, 'INDIV',  10000000, 300000000, 'MATURITY', '20260301', '20260831', 'SALE'),
(203, '회전식 정기예금',            'DEPOSIT', 'N', 'Y', 'Y', 19, 99, 'ALL',     1000000, 100000000, 'MATURITY', '20260101', '20991231', 'SALE'),
(204, '단기 정기예금',              'DEPOSIT', 'N', 'Y', 'N', 19, 99, 'ALL',     1000000, 200000000, 'MATURITY', '20260101', '20991231', 'SALE'),
(205, '외화 정기예금 USD',          'DEPOSIT', 'N', 'Y', 'N', 19, 99, 'ALL',           0, 100000000000, 'MATURITY', '20260101', '20991231', 'SALE'),
(206, '시니어 우대 정기예금',       'DEPOSIT', 'N', 'Y', 'N', 60, 99, 'SENIOR',   500000, 200000000, 'MATURITY', '20260101', '20991231', 'SALE');


-- ===================================================================
-- 3) INSTALL (적금) — 6종 ※ varchar(8) 한도로 'INSTALLMENT' → 'INSTALL'
-- ===================================================================
INSERT INTO public."PRODUCT" (
    "PRODUCT_ID","PRODUCT_NAME","PRODUCT_TYPE_CD","SPECIAL_YN","EARLY_CLOSE_YN",
    "MIN_AGE","MAX_AGE","TARGET_CUSTOMER_CD",
    "MIN_MONTHLY_AMT","MAX_MONTHLY_AMT",
    "SALE_START_DATE","SALE_END_DATE","PRODUCT_STATUS_CD"
) VALUES
(301, '행복드림 정기적금',           'INSTALL', 'N', 'Y', 14, 99, 'ALL',     10000, 1000000, '20260101', '20991231', 'SALE'),
(302, '자유적립식 적금',              'INSTALL', 'N', 'Y', 14, 99, 'ALL',     10000, 1000000, '20260101', '20991231', 'SALE'),
(303, '청년도약 적금',                'INSTALL', 'Y', 'Y', 19, 34, 'YOUTH',  100000,  700000, '20260101', '20991231', 'SALE'),
(304, '어린이 꿈나무 적금',           'INSTALL', 'N', 'Y',  0, 18, 'MINOR',   10000,  500000, '20260101', '20991231', 'SALE'),
(305, '주거래 우대 적금',             'INSTALL', 'N', 'Y', 19, 99, 'INDIV',   50000, 1000000, '20260101', '20991231', 'SALE'),
(306, '디지털 챌린지 적금 (26주)',     'INSTALL', 'Y', 'Y', 14, 99, 'ALL',      1000,  100000, '20260101', '20991231', 'SALE');


-- ===================================================================
-- 4) LOAN (대출) — 8종
-- ===================================================================
INSERT INTO public."PRODUCT" (
    "PRODUCT_ID","PRODUCT_NAME","PRODUCT_TYPE_CD","SPECIAL_YN","PREPAY_DEFER_YN",
    "MIN_AGE","MAX_AGE","TARGET_CUSTOMER_CD","MIN_AMOUNT","MAX_AMOUNT",
    "SALE_START_DATE","SALE_END_DATE","PRODUCT_STATUS_CD"
) VALUES
(401, '직장인 우대 신용대출',         'LOAN', 'N', 'Y', 25, 65, 'INDIV',     1000000,  50000000, '20260101', '20991231', 'SALE'),
(402, '마이너스통장 한도대출',         'LOAN', 'N', 'Y', 19, 65, 'INDIV',     5000000, 100000000, '20260101', '20991231', 'SALE'),
(403, '주택담보대출 (변동금리)',       'LOAN', 'N', 'Y', 19, 70, 'INDIV',    30000000, 500000000, '20260101', '20991231', 'SALE'),
(404, '전세자금 대출',                 'LOAN', 'N', 'Y', 19, 65, 'INDIV',    50000000, 500000000, '20260101', '20991231', 'SALE'),
(405, '사업자 운영자금 대출',          'LOAN', 'N', 'Y', 19, 70, 'CORP',     10000000, 300000000, '20260101', '20991231', 'SALE'),
(406, '사잇돌 중금리 신용대출',        'LOAN', 'N', 'Y', 19, 65, 'INDIV',     5000000,  20000000, '20260101', '20991231', 'SALE'),
(407, '새희망홀씨',                    'LOAN', 'N', 'Y', 19, 70, 'INDIV',     1000000,  30000000, '20260101', '20991231', 'SALE'),
(408, '외국인 전용 신용대출',          'LOAN', 'N', 'Y', 19, 65, 'FOREIGN',   1000000,  10000000, '20260101', '20991231', 'SALE');


-- ===================================================================
-- 5) PRODUCT_RATE_POLICY — 각 상품의 base_rate (APPLY_RATE 1행)
-- ===================================================================
INSERT INTO public."PRODUCT_RATE_POLICY" (
    "PRODUCT_ID","RATE_SEQ","APPLY_RATE","DELETE_YN"
) VALUES
-- SAVING
(101, 1, 0.10, 'N'),
(102, 1, 1.50, 'N'),
(103, 1, 6.50, 'N'),
(104, 1, 4.50, 'N'),
(105, 1, 0.05, 'N'),
-- DEPOSIT
(201, 1, 3.55, 'N'),
(202, 1, 4.00, 'N'),
(203, 1, 3.30, 'N'),
(204, 1, 3.05, 'N'),
(205, 1, 4.55, 'N'),
(206, 1, 3.75, 'N'),
-- INSTALL
(301, 1, 3.85, 'N'),
(302, 1, 3.35, 'N'),
(303, 1, 4.50, 'N'),
(304, 1, 3.50, 'N'),
(305, 1, 3.45, 'N'),
(306, 1, 5.00, 'N'),
-- LOAN
(401, 1, 4.50, 'N'),
(402, 1, 5.70, 'N'),
(403, 1, 5.20, 'N'),
(404, 1, 4.20, 'N'),
(405, 1, 4.80, 'N'),
(406, 1, 6.50, 'N'),
(407, 1, 7.00, 'N'),
(408, 1, 7.80, 'N');


-- ===================================================================
-- 6) placeholder(9998/9999) FK 재할당 + 삭제
-- ===================================================================
--  9998 (시드 신용대출) 참조 테이블 2개: LOAN_APPLICATION, LOAN_CONTRACT
--  모두 401 (직장인 우대 신용대출 — 새 시드의 대표 신용대출) 로 재할당
UPDATE public."LOAN_APPLICATION"
   SET "APPLY_PRODUCT_ID" = 401
 WHERE "APPLY_PRODUCT_ID" = 9998;

UPDATE public."LOAN_CONTRACT"
   SET "LOAN_PRODUCT_ID" = 401
 WHERE "LOAN_PRODUCT_ID" = 9998;

--  부속 테이블의 9998/9999 행 모두 정리 (FK 위반 회피)
DELETE FROM public."PRODUCT_PERIOD"          WHERE "PRODUCT_ID" IN (9998, 9999);
DELETE FROM public."PRODUCT_BONUS_CONDITION" WHERE "PRODUCT_ID" IN (9998, 9999);
DELETE FROM public."PRODUCT_RATE_POLICY"     WHERE "PRODUCT_ID" IN (9998, 9999);
DELETE FROM public."PRODUCT"                 WHERE "PRODUCT_ID" IN (9998, 9999);

COMMIT;