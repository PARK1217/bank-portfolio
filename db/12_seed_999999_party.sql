-- ===================================================================
-- 12_seed_999999_party.sql — 시드 999999 (test@example.com) PARTY 보강
-- ===================================================================
-- 회귀 베이스라인 자격증명(999999/test@example.com/testpass123!)은
-- 검증 문서·테스트시나리오 §0.2 에 명시돼 있지만 PARTY_ID NULL 이라
-- 공동명의·미성년 통장 가입 영구화 코드(_persist_joint_participants /
-- _persist_minor_participants)가 가드(`PARTY_ID IS NULL → 422`)에서 막혀
-- 회귀가 안 되던 문제를 해소합니다.
--
-- 적용: docker exec -i bank-portfolio-postgres psql -U bank -d bank
--         < db/12_seed_999999_party.sql
--
-- 멱등: PARTY/INDIVIDUAL_PARTY 행은 ON CONFLICT DO NOTHING,
--       CUSTOMER PARTY_ID UPDATE 도 이미 1999 면 변화 없음.
-- ===================================================================

BEGIN;

-- 1) PARTY 1999 — 홍길동 (검증 베이스라인 페르소나)
INSERT INTO public."PARTY"
  ("PARTY_ID","PARTY_TYPE_CD","PARTY_NAME","PARTY_ID_NO","ID_NO_TYPE_CD","BIRTH_FOUND_DATE","CREATED_BY")
VALUES (1999,'PERSON','홍길동','8512129000000','RRN','19851212','SEED')
ON CONFLICT ("PARTY_ID") DO NOTHING;

-- 2) INDIVIDUAL_PARTY — 시드 자격
INSERT INTO public."INDIVIDUAL_PARTY"
  ("PARTY_ID","RESIDENT_CD","BIRTH_DATE","GENDER","CURRENT_EMPLOYER","ANNUAL_INCOME","CREATED_BY")
VALUES (1999,'KR','19851212','M','다온테크',60000000,'SEED')
ON CONFLICT ("PARTY_ID") DO NOTHING;

-- 3) CUSTOMER 999999 의 PARTY_ID 매핑 (이미 1999 이면 변화 없음)
UPDATE public."CUSTOMER"
   SET "PARTY_ID" = 1999
 WHERE "CUSTOMER_NO" = 999999
   AND ("PARTY_ID" IS NULL OR "PARTY_ID" <> 1999);

-- 4) CUSTOMER_CONTACT — 휴대폰 (비번 찾기 본인인증에 필요)
INSERT INTO public."CUSTOMER_CONTACT"
  ("CUSTOMER_NO","CONTACT_SEQ","CONTACT_TYPE_CD","CONTACT_VALUE",
   "PRIMARY_YN","VERIFIED_YN","CONTACT_REG_DATE","DELETE_YN","CREATED_BY")
VALUES (999999, 1, 'MOBILE', '01011111111', 'Y', 'Y', '20260522', 'N', 'SEED')
ON CONFLICT DO NOTHING;

COMMIT;