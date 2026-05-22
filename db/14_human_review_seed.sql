-- ===================================================================
-- 14_human_review_seed.sql — 시연용 HUMAN_REVIEW 큐 시드 2건
-- ===================================================================
-- 기존 AI_LOAN_DECISION 시드는 박철수(20002) AUTO_APPROVE / 김연체(20001) AUTO_REJECT
-- 뿐이라 `/api/admin/loans/review-queue` 응답이 0건 → 관리자 화면 "검토 대기 건이 없습니다."
-- 시연 시 사람+AI 협업(가이드 §9.2.6) 어필 포인트가 비어 보이는 문제를 해소.
--
-- 시나리오:
--   LOAN_APP_ID=20003  김영희(100002, 박철수 배우자)  신용대출 401  10,000,000원
--     credit_score=720  annual_income=42,000,000  request_ratio=0.139
--     overdue 0  → 모델 SCORE=0.6800  (THRESH 0.30 < 0.68 < 0.85 → HUMAN_REVIEW)
--     맥락: 신용 양호하나 카드대출 잔액 있어 사람 검토 권장
--
--   LOAN_APP_ID=20004  김미선(100005, 마이너스통장 보유)  신용대출 401  15,000,000원
--     credit_score=680  annual_income=38,000,000  request_ratio=0.221
--     overdue 0  → 모델 SCORE=0.4500  (회색지대 하단 — 마통 한도 7천만 중 2.3천만 사용)
--     맥락: 기존 한도여신 사용 중이라 추가 신용대출 영향 검토 필요
--
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/14_human_review_seed.sql
--
-- 멱등: LOAN_APP_ID 20003/20004 + 해당 AI_LOAN_DECISION row 모두 DELETE 선행.
-- ===================================================================

BEGIN;

-- 멱등 정리 (FK 역순)
DELETE FROM public."AI_LOAN_DECISION"  WHERE "APPLICATION_ID" IN (20003, 20004);
DELETE FROM public."LOAN_APPLICATION"  WHERE "LOAN_APP_ID"    IN (20003, 20004);

-- 1) LOAN_APPLICATION 2건 (APPLIED 상태 — 심사 진행 중)
INSERT INTO public."LOAN_APPLICATION"
  ("LOAN_APP_ID","CUSTOMER_NO","APPLY_PRODUCT_ID","APPLY_TYPE_CD","LOAN_TYPE_CD",
   "DESIRED_AMOUNT","EXPECTED_LIMIT","EXPECTED_RATE",
   "APPLY_DATETIME","APPLY_STATUS_CD","APPLY_CHANNEL_CD",
   "PURPOSE_CD","CREATED_BY")
OVERRIDING SYSTEM VALUE VALUES
  (20003, 100002, 401, 'NEW', 'CREDIT',
   10000000, 10000000, 5.500,
   '20260521143000', 'APPLIED', 'MOBILE',
   'LIVING', 'SEED'),
  (20004, 100005, 401, 'NEW', 'CREDIT',
   15000000, 15000000, 6.200,
   '20260521170000', 'APPLIED', 'MOBILE',
   'LIVING', 'SEED');

-- 2) AI_LOAN_DECISION 2건 (HUMAN_REVIEW + HUMAN_REVIEWED_AT IS NULL → 검토 큐 진입)
--    THRESHOLD_HIGH/LOW 는 ML_MODEL_REGISTRY 기본값(0.85/0.30) 그대로.
INSERT INTO public."AI_LOAN_DECISION"
  ("APPLICATION_ID","MODEL_VERSION","FEATURES_JSON","SCORE","DECISION_CD",
   "THRESHOLD_HIGH","THRESHOLD_LOW")
VALUES
  (20003, 'loan_xgb_v1',
   '{"credit_score": 720, "annual_income": 42000000, "overdue_ratio": 0.0, "request_ratio": 0.139, "deposit_balance": 5400000, "overdue_days_24m": 0}'::jsonb,
   0.6800, 'HUMAN_REVIEW', 0.8500, 0.3000),
  (20004, 'loan_xgb_v1',
   '{"credit_score": 680, "annual_income": 38000000, "overdue_ratio": 0.0, "request_ratio": 0.221, "deposit_balance": 850000, "overdue_days_24m": 0}'::jsonb,
   0.4500, 'HUMAN_REVIEW', 0.8500, 0.3000);

COMMIT;