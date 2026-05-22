-- ===================================================================
-- 15_kst_backfill.sql — 컨테이너 timezone UTC → KST 전환 이전에
-- UTC 시각으로 저장된 운영 row 의 datetime 컬럼들을 +9h 보정.
-- ===================================================================
--
-- 배경:
--   - postgres recreate (TZ=Asia/Seoul) 시점: 2026-05-22 12:53 KST (= 03:53 UTC)
--   - 그 이전까지 컨테이너가 UTC 라 datetime.now() / NOW() 가 UTC 시각으로 박힘
--   - cutoff: 2026-05-22 04:00:00 UTC (= 13:00 KST, postgres 변경 직후 안전 여유)
--   - cutoff 이전 row → +9h, cutoff 이후 row → 이미 KST 라 그대로
--
-- 시드 보호:
--   - timestamp 컬럼: 운영 row 만 박혀 있음 (확인 완료, 시드 무영향)
--   - varchar(14) DATETIME 컬럼: 시드 시각 (2024/2025년, 또는 20991231 등) 보호
--     위해 lower bound `>= '20260518000000'` 적용. 운영 시작 직전.
--
-- 적용:
--   docker exec -i bank-portfolio-postgres psql -U bank -d bank < db/15_kst_backfill.sql
-- ===================================================================

BEGIN;

DO $$
DECLARE
    r record;
    n int;
    total_ts bigint := 0;
    total_vc bigint := 0;
BEGIN
    -- 1) timestamp without time zone 컬럼: cutoff 이전 row +9h
    FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type LIKE 'timestamp%'
        ORDER BY table_name, column_name
    LOOP
        EXECUTE format(
            'UPDATE public.%1$I SET %2$I = %2$I + INTERVAL ''9 hours''
             WHERE %2$I IS NOT NULL
               AND %2$I < TIMESTAMP ''2026-05-22 04:00:00''',
            r.table_name, r.column_name
        );
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN
            RAISE NOTICE 'ts   %.% : % rows', r.table_name, r.column_name, n;
            total_ts := total_ts + n;
        END IF;
    END LOOP;

    -- 2) varchar(14) DATETIME 컬럼: 운영 기간 row 만 +9h (시드 보호)
    FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'character varying'
          AND character_maximum_length = 14
          AND (column_name LIKE '%DATETIME%'
               OR column_name LIKE '%_DT'
               OR column_name = 'LAST_ACCESS_DT')
        ORDER BY table_name, column_name
    LOOP
        EXECUTE format(
            'UPDATE public.%1$I
                SET %2$I = to_char(
                  to_timestamp(%2$I, ''YYYYMMDDHH24MISS'') + INTERVAL ''9 hours'',
                  ''YYYYMMDDHH24MISS''
                )
              WHERE %2$I ~ ''^[0-9]{14}$''
                AND %2$I >= ''20260518000000''
                AND %2$I <  ''20260522040000''',
            r.table_name, r.column_name
        );
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN
            RAISE NOTICE 'vc14 %.% : % rows', r.table_name, r.column_name, n;
            total_vc := total_vc + n;
        END IF;
    END LOOP;

    RAISE NOTICE '== TOTAL: timestamp=% rows / varchar14=% rows ==', total_ts, total_vc;
END $$;

COMMIT;