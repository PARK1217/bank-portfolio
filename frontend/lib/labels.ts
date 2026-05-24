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

// LOAN_APPLICATION.APPLY_STATUS_CD — 대출 신청 진행 상태
const LOAN_APPLY_STATUS_LABEL: Record<string, string> = {
  APPLIED: "접수",
  SUBMIT: "심사 중",
  UNDER_REVIEW: "심사 중",
  APPROVED: "승인",
  REJECTED: "반려",
  EXEC: "실행",
  CANCELED: "취소",
};
export function loanApplyStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return LOAN_APPLY_STATUS_LABEL[code] ?? code;
}

// AUTO_TRANSFER_EXEC.DELAY_REASON_CD — 자동이체 지연/실패 사유 (varchar(8) 약어)
const DELAY_REASON_LABEL: Record<string, string> = {
  NO_BAL: "잔액 부족",
  NO_ACCT: "계좌 오류",
  DUP: "중복 실행",
  BOKCLS: "결제망 영업외",
  ERR: "오류",
  INTERNAL: "내부 오류",
};
export function delayReasonLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return DELAY_REASON_LABEL[code] ?? code;
}

// NOTICE.CATEGORY_CD — 공지·이벤트 카테고리
const NOTICE_CATEGORY_LABEL: Record<string, string> = {
  SYSTEM: "시스템",
  POLICY: "정책",
  SERVICE: "서비스",
  SECURITY: "보안",
  EVENT: "이벤트",
  PROMO: "프로모션",
};
export function noticeCategoryLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return NOTICE_CATEGORY_LABEL[code] ?? code;
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

// LOAN_APPLICATION / LOAN_REVIEW.STEP_CD
const LOAN_STEP_LABEL: Record<string, string> = {
  SUBMITTED: "신청 접수",
  REVIEW: "심사 진행",
  HUMAN_REVIEW: "사람 검토",
  APPROVED: "승인",
  REJECTED: "반려",
  CONTRACT: "약정 진행",
  EXEC: "실행",
  CANCEL: "취소",
};

export function loanStepLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return LOAN_STEP_LABEL[code] ?? code;
}

// COMPLAINT.COMPLAINT_TYPE_CD
const COMPLAINT_TYPE_LABEL: Record<string, string> = {
  TX_DISPUTE: "거래 이의",
  ACCOUNT: "계좌 문의",
  LOAN: "대출 문의",
  CARD: "카드",
  PRODUCT: "상품 안내",
  ETC: "기타",
};

export function complaintTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return COMPLAINT_TYPE_LABEL[code] ?? code;
}

// AUTO_TRANSFER_EXEC.EXEC_STATUS_CD
const AUTO_TRANSFER_EXEC_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "성공",
  FAILED: "실패",
  SKIPPED: "건너뜀",
  PENDING: "대기",
  RETRY: "재시도",
};

export function autoTransferExecStatusLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return AUTO_TRANSFER_EXEC_STATUS_LABEL[code] ?? code;
}

// NOTIFICATION.TYPE_CD
const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  TX: "거래",
  LOAN: "대출",
  AUTO_TRANSFER: "자동이체",
  SECURITY: "보안",
  NOTICE: "공지",
  PRODUCT: "상품",
  FDS: "이상거래",
  ETC: "기타",
};

export function notificationTypeLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return NOTIFICATION_TYPE_LABEL[code] ?? code;
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