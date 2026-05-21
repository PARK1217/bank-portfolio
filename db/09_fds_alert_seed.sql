-- ===================================================================
-- 09_fds_alert_seed.sql — SCR-SC-007 의심 거래 시드 (FDS_DETECTION)
-- ===================================================================
-- 박철수(CUSTOMER_NO=100001) 기준 3건:
--   DETECT_SEQ=1  심야 카드 결제 (score 82 / PENDING) — 본인 확인·신고 가능
--   DETECT_SEQ=2  통신비 자동이체 (score 65 / CONFIRM) — 이미 본인 확인 처리
--   DETECT_SEQ=3  신규 디바이스 로그인 (score 78 / PENDING / TRANSACTION 미매핑)
--
-- 멱등: 100001 의 FDS_DETECTION 전체 DELETE 후 INSERT.
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/09_fds_alert_seed.sql
-- ===================================================================

BEGIN;

DELETE FROM public."FDS_DETECTION" WHERE "CUSTOMER_NO" = 100001;

-- 카드 결제 거래 (참고: 05_persona_seed.sql 의 신용카드 결제 -350,000)
INSERT INTO public."FDS_DETECTION"
  ("CUSTOMER_NO","DETECT_SEQ","TRANSACTION_ID","ACCOUNT_NO",
   "DETECT_DATETIME","TOTAL_SCORE","JUDGMENT_CD",
   "ACCESS_IP","ACCESS_COUNTRY","REMARK",
   "INVESTIGATION_STATUS_CD","CREATED_BY")
VALUES
  (100001, 1,
   (SELECT "TRANSACTION_ID" FROM public."TRANSACTION"
      WHERE "ACCOUNT_NO" = '110-001-100001'
        AND "TX_DATETIME" = '20250327150000'
        AND "TX_AMOUNT" = -350000
      LIMIT 1),
   '110-001-100001',
   '20260519013200', 82, 'WARN',
   '203.0.113.47', 'KR',
   '심야 시간대 결제 / 평소 사용 위치와 다름 / 단기 다발 결제',
   'PENDING', 'SEED'),
  (100001, 2,
   (SELECT "TRANSACTION_ID" FROM public."TRANSACTION"
      WHERE "ACCOUNT_NO" = '110-001-100001'
        AND "TX_DATETIME" = '20250325093000'
        AND "TX_AMOUNT" = -65000
      LIMIT 1),
   '110-001-100001',
   '20260518092500', 65, 'NORMAL',
   '203.0.113.10', 'KR',
   '월 통신비 자동이체 / 거래액 평소 대비 동일',
   'CONFIRM', 'SEED'),
  (100001, 3,
   NULL,
   '110-001-100001',
   '20260520084000', 78, 'WARN',
   '198.51.100.22', 'JP',
   '신규 디바이스 로그인 / 해외 IP / 일일 한도 임박',
   'PENDING', 'SEED');

-- INVESTIGATION_CONCLUSION 도 함께 채워둔다 (이미 처리된 행은 결론 텍스트 보유).
UPDATE public."FDS_DETECTION"
   SET "INVESTIGATION_CONCLUSION" = '고객 본인 거래로 확인'
 WHERE "CUSTOMER_NO" = 100001 AND "DETECT_SEQ" = 2;

COMMIT;