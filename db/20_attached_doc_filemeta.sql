-- ===================================================================
-- 20_attached_doc_filemeta.sql — ATTACHED_DOC 에 원본 파일 메타 컬럼 추가
-- ===================================================================
-- 인계 노트: 사용자 multipart 업로드(`service/loan_attach.py:upload_attachment`)가
-- 디스크에는 `{hex}.png` 토큰명으로 저장하지만 원본 파일명·MIME·크기를 DB에 영구화
-- 안 함. 결과: 관리자 첨부 검토 화면이 "idcard.png" 같은 친화 이름·크기 표시 불가.
--
-- 멱등: ADD COLUMN IF NOT EXISTS.
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/20_attached_doc_filemeta.sql
-- ===================================================================

BEGIN;

ALTER TABLE public."ATTACHED_DOC"
    ADD COLUMN IF NOT EXISTS "FILE_NAME" varchar(200),
    ADD COLUMN IF NOT EXISTS "MIME_TYPE" varchar(80),
    ADD COLUMN IF NOT EXISTS "FILE_SIZE" integer;

COMMENT ON COLUMN public."ATTACHED_DOC"."FILE_NAME" IS '원본 파일명 (업로드 시점)';
COMMENT ON COLUMN public."ATTACHED_DOC"."MIME_TYPE" IS 'MIME 타입 (예: image/png, application/pdf)';
COMMENT ON COLUMN public."ATTACHED_DOC"."FILE_SIZE" IS '파일 바이트 크기';

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '20_attached_doc_filemeta.sql 적용 완료 — FILE_NAME / MIME_TYPE / FILE_SIZE 컬럼 추가';
END $$;
