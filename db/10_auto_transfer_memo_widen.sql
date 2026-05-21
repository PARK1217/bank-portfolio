-- =====================================================================
-- 10_auto_transfer_memo_widen.sql — AUTO_TRANSFER 메모 컬럼 길이 확장
-- =====================================================================
-- 배경:
--   varchar(30) 으로는 사용자가 30자 초과 메모 입력 시 등록 호출이
--   asyncpg.exceptions.StringDataRightTruncationError 로 500 에 떨어졌음.
--   100자까지 허용해 자동이체 등록 시 메모 입력 자유도 확보.
--
-- 영향:
--   - WITHDRAW_MEMO (출금측 메모) : 30 → 100
--   - DEPOSIT_MEMO  (입금측 메모) : 30 → 100
--   - 백엔드 schema.transfer.AutoTransferCreate.memo / ScheduledTransferCreate.memo
--     에 Field(max_length=100) 추가, 프론트 maxLength 도 100으로 정합.
-- =====================================================================

ALTER TABLE public."AUTO_TRANSFER"
    ALTER COLUMN "WITHDRAW_MEMO" TYPE varchar(100);

ALTER TABLE public."AUTO_TRANSFER"
    ALTER COLUMN "DEPOSIT_MEMO" TYPE varchar(100);
