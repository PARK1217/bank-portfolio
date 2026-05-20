-- 누락된 PK 시퀀스 일괄 정리
--
-- 발견 경로: 백엔드 도메인 INSERT 시 NotNullViolation 발생 → 런타임에 CREATE SEQUENCE 처리.
-- 이 파일은 그 패치를 한 곳에 모은 참고 스크립트.
-- **현재 docker-compose 가 자동 마운트하지 않음** — DB 세션이 db/03_v53_migration.sql 또는
-- db/01_schema.sql 에 통합할 때 참고용.
--
-- 모든 문장은 IF NOT EXISTS / 동등 갱신만 사용하므로 멱등 안전.

-- PARTY ─────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."PARTY_PARTY_ID_seq"
    OWNED BY public."PARTY"."PARTY_ID";
ALTER TABLE public."PARTY"
    ALTER COLUMN "PARTY_ID" SET DEFAULT nextval('public."PARTY_PARTY_ID_seq"');
SELECT setval(
    'public."PARTY_PARTY_ID_seq"',
    COALESCE((SELECT MAX("PARTY_ID") FROM public."PARTY"), 0) + 1,
    false
);

-- CUSTOMER ──────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."CUSTOMER_CUSTOMER_NO_seq"
    OWNED BY public."CUSTOMER"."CUSTOMER_NO";
ALTER TABLE public."CUSTOMER"
    ALTER COLUMN "CUSTOMER_NO" SET DEFAULT nextval('public."CUSTOMER_CUSTOMER_NO_seq"');
SELECT setval(
    'public."CUSTOMER_CUSTOMER_NO_seq"',
    COALESCE((SELECT MAX("CUSTOMER_NO") FROM public."CUSTOMER"), 0) + 1,
    false
);

-- TRANSFER ──────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."TRANSFER_TRANSFER_ID_seq"
    OWNED BY public."TRANSFER"."TRANSFER_ID";
ALTER TABLE public."TRANSFER"
    ALTER COLUMN "TRANSFER_ID" SET DEFAULT nextval('public."TRANSFER_TRANSFER_ID_seq"');
SELECT setval(
    'public."TRANSFER_TRANSFER_ID_seq"',
    COALESCE((SELECT MAX("TRANSFER_ID") FROM public."TRANSFER"), 0) + 1,
    false
);

-- TRANSACTION ───────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."TRANSACTION_TRANSACTION_ID_seq"
    OWNED BY public."TRANSACTION"."TRANSACTION_ID";
ALTER TABLE public."TRANSACTION"
    ALTER COLUMN "TRANSACTION_ID" SET DEFAULT nextval('public."TRANSACTION_TRANSACTION_ID_seq"');
SELECT setval(
    'public."TRANSACTION_TRANSACTION_ID_seq"',
    COALESCE((SELECT MAX("TRANSACTION_ID") FROM public."TRANSACTION"), 0) + 1,
    false
);

-- LOAN_APPLICATION ──────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."LOAN_APPLICATION_LOAN_APP_ID_seq"
    OWNED BY public."LOAN_APPLICATION"."LOAN_APP_ID";
ALTER TABLE public."LOAN_APPLICATION"
    ALTER COLUMN "LOAN_APP_ID" SET DEFAULT nextval('public."LOAN_APPLICATION_LOAN_APP_ID_seq"');
SELECT setval(
    'public."LOAN_APPLICATION_LOAN_APP_ID_seq"',
    COALESCE((SELECT MAX("LOAN_APP_ID") FROM public."LOAN_APPLICATION"), 0) + 1,
    false
);

-- AUTO_TRANSFER ─────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."AUTO_TRANSFER_AUTO_TRANSFER_ID_seq"
    OWNED BY public."AUTO_TRANSFER"."AUTO_TRANSFER_ID";
ALTER TABLE public."AUTO_TRANSFER"
    ALTER COLUMN "AUTO_TRANSFER_ID" SET DEFAULT nextval('public."AUTO_TRANSFER_AUTO_TRANSFER_ID_seq"');
SELECT setval(
    'public."AUTO_TRANSFER_AUTO_TRANSFER_ID_seq"',
    COALESCE((SELECT MAX("AUTO_TRANSFER_ID") FROM public."AUTO_TRANSFER"), 0) + 1,
    false
);