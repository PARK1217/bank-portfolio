-- =====================================================================
-- 06_notice_event.sql — 공지사항(NOTICE) + 이벤트(EVENT) 게시판
-- =====================================================================
-- 비로그인 공개 게시판. 운영자(추후 어드민)가 작성/관리.
-- 멱등 적용 — IF NOT EXISTS / ON CONFLICT.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."NOTICE" (
    "NOTICE_ID"      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "TITLE"          character varying(200) NOT NULL,
    "BODY"           text                   NOT NULL,
    "CATEGORY_CD"    character varying(8),
    "PINNED_YN"      character(1)           DEFAULT 'N',
    "VIEW_COUNT"     integer                DEFAULT 0,
    "PUBLISHED_AT"   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "EXPIRES_AT"     timestamp without time zone,
    "STATUS_CD"      character varying(8)   DEFAULT 'PUBLISH',
    "AUTHOR"         character varying(40),
    "DELETE_YN"      character(1)           DEFAULT 'N',
    "CREATED_AT"     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_AT"     timestamp without time zone
);

COMMENT ON TABLE public."NOTICE" IS '공지사항';
COMMENT ON COLUMN public."NOTICE"."CATEGORY_CD" IS 'SERVICE/SECURITY/SYSTEM/POLICY 등';
COMMENT ON COLUMN public."NOTICE"."PINNED_YN" IS '상단 고정';
COMMENT ON COLUMN public."NOTICE"."STATUS_CD" IS 'PUBLISH/DRAFT/ARCHIVE';

CREATE INDEX IF NOT EXISTS idx_notice_published
    ON public."NOTICE" ("PUBLISHED_AT" DESC, "NOTICE_ID" DESC)
    WHERE "DELETE_YN" = 'N' AND "STATUS_CD" = 'PUBLISH';


CREATE TABLE IF NOT EXISTS public."EVENT" (
    "EVENT_ID"       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "TITLE"          character varying(200) NOT NULL,
    "SUMMARY"        character varying(500),
    "BODY"           text                   NOT NULL,
    "BANNER_URL"     character varying(500),
    "PERIOD_START"   date,
    "PERIOD_END"     date,
    "STATUS_CD"      character varying(8)   DEFAULT 'PUBLISH',
    "VIEW_COUNT"     integer                DEFAULT 0,
    "PUBLISHED_AT"   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "AUTHOR"         character varying(40),
    "DELETE_YN"      character(1)           DEFAULT 'N',
    "CREATED_AT"     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UPDATED_AT"     timestamp without time zone
);

COMMENT ON TABLE public."EVENT" IS '이벤트 / 프로모션';
COMMENT ON COLUMN public."EVENT"."STATUS_CD" IS 'PUBLISH/ENDED/DRAFT';

CREATE INDEX IF NOT EXISTS idx_event_published
    ON public."EVENT" ("PUBLISHED_AT" DESC, "EVENT_ID" DESC)
    WHERE "DELETE_YN" = 'N';


-- =====================================================================
-- 시드 — 데모용 (5건씩)
-- =====================================================================

INSERT INTO public."NOTICE"
    ("TITLE", "BODY", "CATEGORY_CD", "PINNED_YN", "AUTHOR")
SELECT * FROM (VALUES
    ('[중요] 2026년 1월 1일 시스템 점검 안내',
     '안녕하세요, 다온뱅크입니다.\n\n시스템 안정화 작업을 위해 아래와 같이 점검을 진행합니다.\n\n• 일시: 2026-01-01 00:00 ~ 04:00\n• 대상: 모바일/인터넷뱅킹 전 서비스\n\n점검 시간 동안에는 거래가 일시 중단됩니다. 이용에 참고해주시기 바랍니다.',
     'SYSTEM', 'Y', '시스템팀'),
    ('보이스피싱 주의 — 본행 직원은 OTP 번호를 묻지 않습니다',
     '최근 본행을 사칭하여 OTP 번호 또는 비밀번호를 묻는 보이스피싱이 다수 발생하고 있습니다.\n\n• 본행은 어떠한 경우에도 OTP, 비밀번호를 전화로 묻지 않습니다.\n• 의심 전화는 즉시 끊고 콜센터(1588-1588)로 신고해주세요.',
     'SECURITY', 'Y', '금융보안팀'),
    ('타행 이체 수수료 면제 이벤트 종료 안내',
     '2025년 12월 31일을 끝으로 타행 이체 수수료 전액 면제 이벤트가 종료됩니다. 2026년 1월부터는 기본 수수료(500원/건)가 적용됩니다. 단, 우대 조건 충족 고객은 자동 면제됩니다.',
     'SERVICE', 'N', '리테일사업팀'),
    ('개인정보 처리방침 개정 안내 (2026-02-01 시행)',
     '개인정보보호법 개정에 따라 본행 개인정보 처리방침이 2026-02-01부로 개정됩니다. 주요 변경사항은 [약관 > 개인정보 처리방침]에서 확인하실 수 있습니다.',
     'POLICY', 'N', '준법감시팀'),
    ('인터넷뱅킹 신규 화면 안내 — 더 빠르고 깔끔하게',
     '인터넷뱅킹 화면이 새롭게 단장했습니다. 메인 대시보드에서 잔액·최근 거래·자동이체를 한 눈에 확인하세요.',
     'SERVICE', 'N', '디지털채널팀')
) AS v(t, b, c, p, a)
WHERE NOT EXISTS (SELECT 1 FROM public."NOTICE" WHERE "TITLE" = v.t);


INSERT INTO public."EVENT"
    ("TITLE", "SUMMARY", "BODY", "PERIOD_START", "PERIOD_END", "AUTHOR")
SELECT * FROM (VALUES
    ('신규 가입 환영 이벤트 — 우대 금리 +0.5%',
     '신규 가입 후 30일 이내 정기예금 1건 가입 시 우대 금리 +0.5% 자동 적용',
     '다온뱅크에 처음 오신 분들을 환영합니다!\n\n신규 가입 후 30일 이내에 ‘행복드림 정기예금’ 등 정기예금 상품을 가입하시면 우대 금리 +0.5%가 자동 적용됩니다.\n\n• 대상: 신규 가입 고객\n• 기간: 2026-01-01 ~ 2026-03-31\n• 적용: 가입 시 자동 (별도 신청 불필요)',
     '2026-01-01'::date, '2026-03-31'::date, '마케팅팀'),
    ('급여이체 새 친구 혜택 — 매월 스타벅스 아메리카노 1잔',
     '급여이체 신규 등록 + 카드 결제 30만원 이상 시 매월 아메리카노 쿠폰',
     '주거래 통장으로 옮기시면 매월 작은 선물을 드립니다.\n\n• 조건: 급여이체 신규 + 본행 체크/신용카드 월 30만원 이상\n• 혜택: 스타벅스 아메리카노 모바일 쿠폰 (매월 5일 발송)\n• 기간: 2026-02-01 ~ 2026-06-30',
     '2026-02-01'::date, '2026-06-30'::date, '리테일사업팀'),
    ('적금 자동이체 추천 이벤트 — 친구 추천 시 5,000 포인트',
     '청년도약 적금 친구 추천 시 양쪽에 5,000 포인트',
     '청년도약 적금을 친구에게 추천하고 양쪽 모두 5,000 포인트를 받으세요.\n\n• 대상: 청년도약 적금 가입자\n• 보상: 추천인/피추천인 모두 5,000 포인트\n• 기간: 2026-01-15 ~ 2026-04-15',
     '2026-01-15'::date, '2026-04-15'::date, '디지털채널팀'),
    ('대출 금리 인하 이벤트 — 0.3%p OFF',
     '신용대출 신규 신청 시 0.3%p 인하 (한도 소진 시 종료)',
     '직장인 우대 신용대출, 사잇돌 중금리 신용대출 신규 신청 고객 대상 0.3%p 금리 인하 이벤트.\n\n• 대상: 본행 신용대출 신규 신청 (대환 포함)\n• 기간: 2026-02-01 ~ 2026-04-30\n• 한도: 선착순 1,000명',
     '2026-02-01'::date, '2026-04-30'::date, '여신영업팀'),
    ('챗봇 베타 오픈 — 24/7 상담 시작',
     'AI 챗봇으로 약관·FAQ를 24시간 검색하세요',
     '본행의 AI 챗봇이 정식 오픈했습니다. 약관·FAQ·은행 업무 안내를 24시간 자연어로 검색할 수 있습니다.\n\n• 위치: 상단 메뉴 [챗봇]\n• 베타 기간 동안 피드백 주신 고객께 추첨 통해 10만 포인트 증정',
     '2026-03-01'::date, '2026-05-31'::date, '디지털채널팀')
) AS v(t, s, b, ps, pe, a)
WHERE NOT EXISTS (SELECT 1 FROM public."EVENT" WHERE "TITLE" = v.t);