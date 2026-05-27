/**
 * 도메인 코드 → 한글 라벨 매핑.
 *
 * 백엔드 시드에 인간 가독 코드(VIP/GENERAL/MINOR…)와 명세서 코드(G100/G101/…)가 혼재.
 * 화면에는 raw 코드 노출 금지 — 모두 한글 라벨로 변환.
 * 매칭 실패 시 raw 코드 그대로 폴백.
 */

// CUSTOMER.CUST_GRADE_CD
const GRADE_LABEL: Record<string, string> = {
  VIP: "VIP",
  GENERAL: "일반",
  MINOR: "미성년",
  SENIOR: "시니어",
  STUDENT: "학생",
  G100: "일반",
  G101: "실버",
  G102: "골드",
};

export function gradeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return GRADE_LABEL[code] ?? code;
}

export const GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: "VIP", label: "VIP" },
  { value: "GENERAL", label: "일반" },
  { value: "MINOR", label: "미성년" },
  { value: "SENIOR", label: "시니어" },
  { value: "STUDENT", label: "학생" },
];

// CUSTOMER.CUST_STATUS_CD — 5050=정상 / 5051=휴면 / 5052=잠금 / 5053=탈퇴
// 일부 코드(LIMITED/LOCKED/DORMANT)는 시드/액션폼 별도 enum.
const CUSTOMER_STATUS_LABEL: Record<string, string> = {
  "5050": "정상",
  "5051": "휴면",
  "5052": "잠금",
  "5053": "탈퇴",
  LIMITED: "거래제한",
  LOCKED: "잠금",
  DORMANT: "휴면",
  NORMAL: "정상",
};

export function customerStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return CUSTOMER_STATUS_LABEL[code] ?? code;
}

export const CUSTOMER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "5050", label: "정상" },
  { value: "LIMITED", label: "거래제한" },
  { value: "LOCKED", label: "잠금" },
  { value: "DORMANT", label: "휴면" },
];

// ACCOUNT.ACCOUNT_TYPE_CD
const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  SAVING: "입출금",
  DEPOSIT: "정기예금",
  INSTALL: "적금",
  FOREIGN: "외화",
};

export function accountTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return ACCOUNT_TYPE_LABEL[code] ?? code;
}

// ACCOUNT.ACCOUNT_STATUS_CD — 5050/NORMAL 둘 다 "정상" 처리
const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  "5050": "정상",
  NORMAL: "정상",
  LIMITED: "거래제한",
  CLOSED: "해지",
  FROZEN: "압류",
  DORMANT: "휴면",
};

export function accountStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return ACCOUNT_STATUS_LABEL[code] ?? code;
}

// LOAN_CONTRACT.LOAN_STATUS_CD
const LOAN_STATUS_LABEL: Record<string, string> = {
  NEW: "신규",
  NORMAL: "정상",
  OVERDUE: "연체",
  CLOSED: "완납",
  DEFAULT: "부실",
};

export function loanStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return LOAN_STATUS_LABEL[code] ?? code;
}

// LOAN_CONTRACT.LOAN_TYPE_CD
const LOAN_TYPE_LABEL: Record<string, string> = {
  TERM: "기한부",
  CREDIT: "신용",
  MORTGAGE: "담보",
};

export function loanTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return LOAN_TYPE_LABEL[code] ?? code;
}

export const LOAN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "TERM", label: "기한부" },
  { value: "CREDIT", label: "신용" },
  { value: "MORTGAGE", label: "담보" },
];

// LOAN_CONTRACT.REPAY_METHOD_CD
const REPAY_METHOD_LABEL: Record<string, string> = {
  EPI: "원리금균등",
  OD: "마이너스통장",
  BULLET: "만기일시",
};

export function repayMethodLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return REPAY_METHOD_LABEL[code] ?? code;
}

export const REPAY_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "EPI", label: "원리금균등" },
  { value: "OD", label: "마이너스통장" },
  { value: "BULLET", label: "만기일시" },
];

// LOAN_CONTRACT.OVERDUE_STAGE_CD
const OVERDUE_STAGE_LABEL: Record<string, string> = {
  STAGE1: "1단계",
  STAGE2: "2단계",
  STAGE3: "3단계",
};

export function overdueStageLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return OVERDUE_STAGE_LABEL[code] ?? code;
}

// LOAN_REPAY_HISTORY.REPAY_TYPE_CD
const REPAY_TYPE_LABEL: Record<string, string> = {
  SCHEDULE: "정기",
  PREPAY: "중도",
  OVERDUE: "연체",
};

export function repayTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return REPAY_TYPE_LABEL[code] ?? code;
}

export const REPAY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "SCHEDULE", label: "정기" },
  { value: "PREPAY", label: "중도" },
  { value: "OVERDUE", label: "연체" },
];

// LOAN_REPAY_HISTORY.REPAY_STATUS_CD
const REPAY_STATUS_LABEL: Record<string, string> = {
  OK: "정상",
  CANCEL: "취소",
};

export function repayStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return REPAY_STATUS_LABEL[code] ?? code;
}

export const REPAY_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "OK", label: "정상" },
  { value: "CANCEL", label: "취소" },
];

// LOAN_REPAY_SCHEDULE.SCHEDULE_STATUS_CD
const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  WAITING: "예정",
  PENDING: "처리 중",
  PAID: "완납",
  OVERDUE: "연체",
};

export function scheduleStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return SCHEDULE_STATUS_LABEL[code] ?? code;
}

// LOAN_EXEC_HISTORY.EXEC_TYPE_CD / CHANNEL_CD
const EXEC_TYPE_LABEL: Record<string, string> = {
  EXEC: "실행",
  CANCEL: "취소",
};

export function execTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return EXEC_TYPE_LABEL[code] ?? code;
}

const EXEC_CHANNEL_LABEL: Record<string, string> = {
  APP: "앱",
  WEB: "웹",
  COUNTER: "창구",
  AUTO: "자동",
};

export function execChannelLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return EXEC_CHANNEL_LABEL[code] ?? code;
}

// TRANSACTION.TX_TYPE_CD
const TX_TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "입금",
  WITHDRAW: "출금",
  TRANSFER: "이체",
  INTEREST: "이자",
  FEE: "수수료",
  CORRECTION: "정정",
  REVERSAL: "역분개",
  LOAN_EXEC: "대출 실행",
  LOAN_REPAY: "대출 상환",
};

export function txTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TX_TYPE_LABEL[code] ?? code;
}

export const TX_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "DEPOSIT", label: "입금" },
  { value: "WITHDRAW", label: "출금" },
  { value: "TRANSFER", label: "이체" },
  { value: "INTEREST", label: "이자" },
  { value: "FEE", label: "수수료" },
  { value: "CORRECTION", label: "정정" },
  { value: "REVERSAL", label: "역분개" },
  { value: "LOAN_EXEC", label: "대출 실행" },
  { value: "LOAN_REPAY", label: "대출 상환" },
];

// TRANSACTION.TX_STATUS_CD
const TX_STATUS_LABEL: Record<string, string> = {
  COMPLETE: "완료",
  SETTLED: "정산",
  PENDING: "대기",
  FAILED: "실패",
  CANCELED: "취소",
};

export function txStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TX_STATUS_LABEL[code] ?? code;
}

export const TX_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "COMPLETE", label: "완료" },
  { value: "SETTLED", label: "정산" },
  { value: "PENDING", label: "대기" },
  { value: "FAILED", label: "실패" },
  { value: "CANCELED", label: "취소" },
];

// TRANSACTION.TX_CHANNEL_CD / LOAN_REPAY_HISTORY.CHANNEL_CD
const TX_CHANNEL_LABEL: Record<string, string> = {
  APP: "앱",
  WEB: "웹",
  COUNTER: "창구",
  ATM: "ATM",
  MOBILE: "모바일",
  AUTO: "자동이체",
};

export function txChannelLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TX_CHANNEL_LABEL[code] ?? code;
}

export const TX_CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "APP", label: "앱" },
  { value: "WEB", label: "웹" },
  { value: "COUNTER", label: "창구" },
  { value: "ATM", label: "ATM" },
  { value: "MOBILE", label: "모바일" },
  { value: "AUTO", label: "자동이체" },
];

// CUSTOMER_CONTACT.CONTACT_TYPE_CD
const CONTACT_TYPE_LABEL: Record<string, string> = {
  MOBILE: "휴대폰",
  HOME: "자택",
  WORK: "직장",
  EMAIL: "이메일",
  PHONE: "전화",
};

export function contactTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return CONTACT_TYPE_LABEL[code] ?? code;
}

// CUSTOMER_ADDRESS.ADDR_TYPE_CD
const ADDR_TYPE_LABEL: Record<string, string> = {
  HOME: "자택",
  WORK: "직장",
  OTHER: "기타",
};

export function addrTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return ADDR_TYPE_LABEL[code] ?? code;
}

// AI_LOAN_DECISION.DECISION_CD / HUMAN_DECISION_CD
const DECISION_LABEL: Record<string, string> = {
  AUTO_APPROVE: "자동 승인",
  AUTO_REJECT: "자동 반려",
  HUMAN_REVIEW: "사람 검토",
  APPROVE: "승인",
  REJECT: "반려",
};

export function decisionLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return DECISION_LABEL[code] ?? code;
}

// ACCOUNT_LIMIT_CHANGE_REQUEST.STATUS_CD
const LIMIT_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  APPLIED: "적용",
  CANCELED: "취소",
  EXPIRED: "만료",
};

export function limitRequestStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return LIMIT_REQUEST_STATUS_LABEL[code] ?? code;
}

// AUTO_TRANSFER.REG_CHANNEL_CD — 자동이체 등록 채널
const REG_CHANNEL_LABEL: Record<string, string> = {
  APP: "앱",
  WEB: "웹",
  CS: "고객센터",
  COUNTER: "창구",
  AUTO: "자동",
};
export function regChannelLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return REG_CHANNEL_LABEL[code] ?? code;
}

// PRODUCT.INTEREST_CYCLE_CD — 이자 지급 주기
const INTEREST_CYCLE_LABEL: Record<string, string> = {
  MATURITY: "만기일시",
  MONTHLY: "매월",
  QUARTERLY: "분기",
  SEMI: "반기",
  YEARLY: "연 1회",
  DAILY: "매일",
};
export function interestCycleLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return INTEREST_CYCLE_LABEL[code] ?? code;
}

// PRODUCT.TARGET_CUSTOMER_CD — 대상 고객
const TARGET_CUSTOMER_LABEL: Record<string, string> = {
  ALL: "전체",
  INDIV: "개인",
  CORP: "법인",
  SENIOR: "시니어",
  MINOR: "미성년",
  FOREIGN: "외국인",
  STUDENT: "학생",
  VIP: "VIP",
};
export function targetCustomerLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TARGET_CUSTOMER_LABEL[code] ?? code;
}

// PRODUCT.MATURITY_POLICY_CD — 만기 처리 정책
const MATURITY_POLICY_LABEL: Record<string, string> = {
  AUTO_RENEW: "자동 연장",
  AUTO_CLOSE: "자동 해지",
  MANUAL: "직접 처리",
  CONVERT: "전환 입금",
};
export function maturityPolicyLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return MATURITY_POLICY_LABEL[code] ?? code;
}

// PRODUCT_BONUS.BONUS_TYPE_CD — 우대 조건 유형
const BONUS_TYPE_LABEL: Record<string, string> = {
  RATE: "금리 우대",
  FEE: "수수료 할인",
  GIFT: "사은품",
  POINT: "포인트 적립",
  CASHBACK: "캐시백",
};
export function bonusTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return BONUS_TYPE_LABEL[code] ?? code;
}

// TERMS_VERSION_HISTORY / TERMS.CHANGE_TYPE_CD — 약관 변경 유형
const TERMS_CHANGE_TYPE_LABEL: Record<string, string> = {
  CREATE: "신규 등록",
  UPDATE: "개정",
  REVISE: "개정",
  DEPRECATE: "폐기",
  RESTORE: "복원",
};
export function termsChangeTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TERMS_CHANGE_TYPE_LABEL[code] ?? code;
}

// EMPLOYEE_MASTER.AUTH_LEVEL_CD
const AUTH_LEVEL_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  AUDIT: "감사",
  CS: "상담원",
  TELLER: "창구",
};

export function authLevelLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return AUTH_LEVEL_LABEL[code] ?? code;
}

// FDS_DETECTION.JUDGMENT_CD
const FDS_JUDGMENT_LABEL: Record<string, string> = {
  NORMAL: "정상",
  WARN: "경고",
  BLOCK: "차단",
};
export function fdsJudgmentLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return FDS_JUDGMENT_LABEL[code] ?? code;
}
export const FDS_JUDGMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "NORMAL", label: "정상" },
  { value: "WARN", label: "경고" },
  { value: "BLOCK", label: "차단" },
];

// DELEGATION.ROLE_TYPE_CD / CONTRACT_PARTICIPANT.ROLE_TYPE_CD
const ROLE_TYPE_LABEL: Record<string, string> = {
  OWNER: "본인",
  JOINT: "공동명의",
  SPOUSE: "배우자",
  PARENT: "친권자",
  GUARDIAN: "친권자",
  MINOR: "미성년 자녀",
  CHILD: "자녀",
};
export function roleTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return ROLE_TYPE_LABEL[code] ?? code;
}

// ADMIN_AUDIT_LOG.TARGET_TABLE — 한글 영역명. 원본 코드는 보조로 같이 노출 권장.
const TARGET_TABLE_LABEL: Record<string, string> = {
  CUSTOMER: "회원",
  ACCOUNT: "계좌",
  TRANSACTION: "거래",
  AI_LOAN_DECISION: "AI 의사결정",
  LOAN_APPLICATION: "대출 신청",
  LOAN_CONTRACT: "대출 계약",
  ATTACHED_DOC: "첨부서류",
  ADMIN_SESSION: "관리자 세션",
  EXTERNAL_API_HEALTH: "외부 API 헬스",
  PRODUCT: "상품",
  FDS_DETECTION: "FDS 탐지",
  EMPLOYEE_MASTER: "직원",
  COMPLAINT: "민원",
};
export function targetTableLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TARGET_TABLE_LABEL[code] ?? code;
}

// CUSTOMER_STATUS_HISTORY.REASON_CD / CUSTOMER_GRADE_HISTORY.GRADE_REASON_CD / 기타 사유
const REASON_CD_LABEL: Record<string, string> = {
  UNLOCK: "잠금 해제",
  FRAUD_LOCK: "사기 의심 잠금",
  DORMANT_TRIGGER: "휴면 전환",
  DORMANT_RECOVERY: "휴면 복원",
  ADMIN_FORCE: "관리자 강제",
  USER_REQUEST: "본인 요청",
  KYC_REVERIFY: "KYC 재검증",
  COMPLIANCE: "컴플라이언스",
  PWD_FAIL: "비밀번호 실패",
  INITIAL: "초기 산정",
  UPGRADE: "등급 상향",
  DOWNGRADE: "등급 하향",
};
export function reasonCdLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return REASON_CD_LABEL[code] ?? code;
}

// TRANSACTION.FAILURE_REASON_CD
const FAILURE_REASON_LABEL: Record<string, string> = {
  INSUFFICIENT_BALANCE: "잔액 부족",
  LIMIT_EXCEEDED: "한도 초과",
  ACCOUNT_LOCKED: "계좌 잠금",
  FRAUD_BLOCK: "FDS 차단",
  TIMEOUT: "시간 초과",
  EXTERNAL_REJECT: "외부 거부",
  CANCELED: "취소됨",
  WRONG_ACCOUNT: "계좌 오류",
};
export function failureReasonLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return FAILURE_REASON_LABEL[code] ?? code;
}

// ADMIN_AUDIT_LOG.ACTION_CD — 자주 보이는 액션만 한글 매핑, 그 외는 raw 그대로.
const ACTION_LABEL: Record<string, string> = {
  AUTH_LOGIN: "로그인",
  AUTH_LOGOUT: "로그아웃",
  AUTH_ME: "본인 조회",
  LOAN_DECISIONS_LIST: "AI 의사결정 목록",
  LOAN_REVIEW_QUEUE: "대출 검토 큐",
  LOAN_PREDICT: "ML 추론",
  LOAN_HUMAN_REVIEW: "사람 검토",
  LOAN_ATTACHMENTS: "첨부서류 조회",
  OVERDUE_LIST: "연체 목록",
  OVERDUE_DETAIL: "연체 상세",
  HEALTH_EXTERNAL_LIST: "외부 헬스 목록",
  HEALTH_EXTERNAL_DETAIL: "외부 헬스 상세",
  GET_ADMIN_CUSTOMERS: "회원 목록",
  GET_ADMIN_ACCOUNTS: "계좌 목록",
  GET_AUDIT_LOGS: "감사 로그 조회",
  GET_AUDIT_FACETS: "감사 패싯",
  GET_LOANS_CONTRACTS: "대출 계약 목록",
  GET_LOANS_REPAYMENTS: "상환 목록",
  GET_REPAYMENTS_DASHBOARD: "상환 대시보드",
  CUSTOMER_STATUS_UPDATE: "회원 상태 변경",
  CUSTOMER_GRADE_UPDATE: "회원 등급 변경",
  ACCOUNT_STATUS_UPDATE: "계좌 상태 변경",
  ACCOUNT_LIMIT_UPDATE: "계좌 한도 변경",
};
export function actionCdLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return ACTION_LABEL[code] ?? code;
}

// ADMIN_AUDIT_LOG.RESULT_CD
const RESULT_LABEL: Record<string, string> = {
  OK: "성공",
  DENIED: "거부",
  ERROR: "오류",
};
export function resultCdLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return RESULT_LABEL[code] ?? code;
}

// DOC_TYPE_MASTER.DOC_CATEGORY_CD
const DOC_CATEGORY_LABEL: Record<string, string> = {
  ID: "신분증",
  EMPL: "재직",
  INCOME: "소득",
  FAMILY: "가족",
  ASSET: "자산",
  COLLATERAL: "담보",
  OTHER: "기타",
};
export function docCategoryLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return DOC_CATEGORY_LABEL[code] ?? code;
}

// TERMS_MASTER.TERMS_TYPE_CD
const TERMS_TYPE_LABEL: Record<string, string> = {
  GENERAL: "공통",
  DEPOSIT: "예적금",
  LOAN: "대출",
  TRANSFER: "이체",
  PRIVACY: "개인정보",
  MARKET: "마케팅",
  PRD_SPEC: "상품 특약",
};
export function termsTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TERMS_TYPE_LABEL[code] ?? code;
}
export const TERMS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "GENERAL", label: "공통" },
  { value: "DEPOSIT", label: "예적금" },
  { value: "LOAN", label: "대출" },
  { value: "TRANSFER", label: "이체" },
  { value: "PRIVACY", label: "개인정보" },
  { value: "MARKET", label: "마케팅" },
  { value: "PRD_SPEC", label: "상품 특약" },
];

// TERMS_MASTER.TERMS_STATUS_CD
const TERMS_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  ARCHIVED: "보관",
};
export function termsStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return TERMS_STATUS_LABEL[code] ?? code;
}
export const TERMS_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "활성" },
  { value: "INACTIVE", label: "비활성" },
  { value: "ARCHIVED", label: "보관" },
];

// NOTICE.CATEGORY_CD
const NOTICE_CATEGORY_LABEL: Record<string, string> = {
  SERVICE: "서비스",
  SECURITY: "보안",
  SYSTEM: "시스템",
  POLICY: "약관/정책",
};
export function noticeCategoryLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return NOTICE_CATEGORY_LABEL[code] ?? code;
}
export const NOTICE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "SERVICE", label: "서비스" },
  { value: "SECURITY", label: "보안" },
  { value: "SYSTEM", label: "시스템" },
  { value: "POLICY", label: "약관/정책" },
];

// NOTICE.STATUS_CD
const NOTICE_STATUS_LABEL: Record<string, string> = {
  PUBLISH: "게시",
  DRAFT: "임시저장",
  ARCHIVE: "보관",
};
export function noticeStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return NOTICE_STATUS_LABEL[code] ?? code;
}
export const NOTICE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PUBLISH", label: "게시" },
  { value: "DRAFT", label: "임시저장" },
  { value: "ARCHIVE", label: "보관" },
];

// EVENT.STATUS_CD
const EVENT_STATUS_LABEL: Record<string, string> = {
  PUBLISH: "게시",
  DRAFT: "임시저장",
  ENDED: "종료",
};
export function eventStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return EVENT_STATUS_LABEL[code] ?? code;
}
export const EVENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PUBLISH", label: "게시" },
  { value: "DRAFT", label: "임시저장" },
  { value: "ENDED", label: "종료" },
];

// AUTO_TRANSFER.AUTO_STATUS_CD
const AUTO_TRANSFER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "활성",
  COMPLETE: "완료",
  CANCEL: "해지",
  PAUSED: "정지",
};
export function autoTransferStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return AUTO_TRANSFER_STATUS_LABEL[code] ?? code;
}
export const AUTO_TRANSFER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "활성" },
  { value: "COMPLETE", label: "완료" },
  { value: "CANCEL", label: "해지" },
];

// AUTO_TRANSFER.CYCLE_TYPE_CD
const CYCLE_TYPE_LABEL: Record<string, string> = {
  ONCE: "1회성",
  MONTHLY: "매월",
  WEEKLY: "매주",
};
export function cycleTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return CYCLE_TYPE_LABEL[code] ?? code;
}
export const CYCLE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ONCE", label: "1회성" },
  { value: "MONTHLY", label: "매월" },
];

// AUTO_TRANSFER_EXEC.EXEC_STATUS_CD (워커 코드)
const AUTO_EXEC_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "성공",
  FAIL: "실패",
  DELAY: "지연",
  PENDING: "예정",
};
export function autoExecStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return AUTO_EXEC_STATUS_LABEL[code] ?? code;
}
export const AUTO_EXEC_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "SUCCESS", label: "성공" },
  { value: "FAIL", label: "실패" },
  { value: "DELAY", label: "지연" },
];

// AUTO_TRANSFER_EXEC.DELAY_REASON_CD (varchar(8) — 워커 매핑 코드)
const AUTO_DELAY_REASON_LABEL: Record<string, string> = {
  NO_BAL: "잔액 부족",
  NO_ACCT: "계좌 없음",
  DUP: "중복 실행",
  BOKCLS: "한은망 마감",
  INTERNAL: "내부 오류",
  ERR: "기타 오류",
};
export function autoDelayReasonLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return AUTO_DELAY_REASON_LABEL[code] ?? code;
}

// ACCOUNT_LIMIT_CHANGE_REQUEST.VERIFY_METHOD_CD
const VERIFY_METHOD_LABEL: Record<string, string> = {
  ADMIN: "어드민",
  OTP: "OTP",
  SIMPLE_PIN: "간편비밀번호",
  PASSWORD: "비밀번호",
  BIOMETRIC: "생체",
};
export function verifyMethodLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return VERIFY_METHOD_LABEL[code] ?? code;
}

// FDS_DETECTION.INVESTIGATION_STATUS_CD
const FDS_INVEST_LABEL: Record<string, string> = {
  PENDING: "조사 대기",
  CONFIRM: "본인 확인",
  REPORT: "신고 접수",
  CLOSE: "종결",
};
export function fdsInvestStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return FDS_INVEST_LABEL[code] ?? code;
}
export const FDS_INVEST_OPTIONS: { value: string; label: string }[] = [
  { value: "PENDING", label: "조사 대기" },
  { value: "CONFIRM", label: "본인 확인" },
  { value: "REPORT", label: "신고 접수" },
  { value: "CLOSE", label: "종결" },
];