-- ===================================================================
-- seed-quality-fix.sql — 검증 세션 발견 시드 품질 보강 (한글 인코딩 + PIN)
-- ===================================================================
-- 실행: docker cp 후 컨테이너 안에서
--   PGCLIENTENCODING=UTF8 psql -U bank -d bank -f /tmp/seed-quality-fix.sql
--
-- 본 파일은 [DB] 세션의 02_seed.sql 정식화 전 임시 보강용입니다.
-- 컨테이너 재시작 시 자동 마운트되지 않습니다.
-- ===================================================================

SET client_encoding TO 'UTF8';

-- 1) PRODUCT 한글 이름 복구 (원본 "??? ????" 가 ascii 변환되어 저장된 상태)
UPDATE public."PRODUCT"
   SET "PRODUCT_NAME" = '시드 신용대출 상품',
       "PRODUCT_DESC" = '검증용 신용대출 시드 상품'
 WHERE "PRODUCT_ID" = 9998;

UPDATE public."PRODUCT"
   SET "PRODUCT_NAME" = '시드 자유예금 상품',
       "PRODUCT_DESC" = '검증용 입출금 시드 상품'
 WHERE "PRODUCT_ID" = 9999;

-- 2) ACCOUNT 메타데이터 채우기 (TYPE_CD/HOLDER_NAME/ALIAS 누락)
UPDATE public."ACCOUNT"
   SET "ACCOUNT_TYPE_CD"     = 'DEPOSIT',
       "ACCOUNT_HOLDER_NAME" = '홍길동',
       "ACCOUNT_ALIAS"       = '주거래 계좌'
 WHERE "ACCOUNT_NO" = '110-001-999991';

UPDATE public."ACCOUNT"
   SET "ACCOUNT_TYPE_CD"     = 'SAVING',
       "ACCOUNT_HOLDER_NAME" = '홍길동',
       "ACCOUNT_ALIAS"       = '비상금 계좌'
 WHERE "ACCOUNT_NO" = '110-001-999992';

-- 3) CUSTOMER 999999 SIMPLE_PIN = 123456 (bcrypt 12 rounds, 백엔드 hash_password 사용)
UPDATE public."CUSTOMER"
   SET "SIMPLE_PIN" = '$2b$12$zgEyZDmoyyMuWT7tQFts7eOUFe9yvH9U0MkZkdCEyB1PvEnNqA8rS'
 WHERE "CUSTOMER_NO" = 999999;

-- 4) TRANSACTION counterpart 한글 복구 (memo 는 id=3 이 이미 한글 OK 이므로 holder 만)
UPDATE public."TRANSACTION"
   SET "COUNTERPART_HOLDER_NAME" = '김검증'
 WHERE "TRANSACTION_ID" = 1;

UPDATE public."TRANSACTION"
   SET "COUNTERPART_HOLDER_NAME" = '이검증'
 WHERE "TRANSACTION_ID" = 2;

UPDATE public."TRANSACTION"
   SET "COUNTERPART_HOLDER_NAME" = '박검증'
 WHERE "TRANSACTION_ID" = 4;

-- 결과 확인
SELECT 'PRODUCT' tbl, "PRODUCT_ID"::text id, "PRODUCT_NAME" name FROM public."PRODUCT"
UNION ALL
SELECT 'ACCOUNT', "ACCOUNT_NO", concat("ACCOUNT_TYPE_CD",' / ',"ACCOUNT_HOLDER_NAME",' / ',"ACCOUNT_ALIAS") FROM public."ACCOUNT" WHERE "CUSTOMER_NO"=999999
UNION ALL
SELECT 'CUSTOMER_PIN', '999999', CASE WHEN "SIMPLE_PIN" IS NOT NULL THEN 'set' ELSE 'null' END FROM public."CUSTOMER" WHERE "CUSTOMER_NO"=999999
UNION ALL
SELECT 'TX', "TRANSACTION_ID"::text, "COUNTERPART_HOLDER_NAME" FROM public."TRANSACTION" WHERE "ACCOUNT_NO" IN ('110-001-999991','110-001-999992');