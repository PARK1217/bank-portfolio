import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const krw = new Intl.NumberFormat("ko-KR");

export function fmtKrw(n: number | null | undefined): string {
  if (n == null) return "-";
  return `${krw.format(n)}원`;
}

export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "-";
  return krw.format(n);
}

export function fmtPercent(n: number | null | undefined, digits = 2): string {
  if (n == null) return "-";
  return `${(n * 100).toFixed(digits)}%`;
}

/** "20260520093000" 14자 또는 ISO 문자열 → "26-05-20 09:30" */
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "-";
  if (s.length >= 14 && /^\d{14}/.test(s)) {
    return `${s.slice(2, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
  }
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${String(d.getFullYear()).slice(2)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return s;
  }
}


/** 거래 유형 코드 → 한국어 라벨. */
const TX_TYPE_LABELS: Record<string, string> = {
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

export function fmtTxType(cd: string | null | undefined): string {
  if (!cd) return "-";
  return TX_TYPE_LABELS[cd] ?? cd;
}


/**
 * URL 식별자 인코딩 — 계좌번호·고객번호·신청ID 등을 URL 에 평문 노출하지 않기 위한 가벼운 마스킹.
 * 진짜 보안 효과는 약하지만 (디코딩 가능) 검색·로그·공유 시 한눈에 PII 가 드러나는 걸 막는다.
 *
 * URL-safe base64 변형 — `+/=` 를 `-_` + padding 제거. atob/btoa 는 ASCII 만 처리하므로
 * 입력은 number 또는 ASCII 문자열로 한정 (account_no `110-001-100001`, customer_no `100001` 등 OK).
 */
export function encodeId(raw: string | number): string {
  if (typeof window === "undefined") {
    // SSR — Buffer 폴백
    return Buffer.from(String(raw), "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return window
    .btoa(String(raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeId(token: string): string {
  // 패딩 복원
  const padded = token + "=".repeat((4 - (token.length % 4)) % 4);
  const std = padded.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof window === "undefined") {
    return Buffer.from(std, "base64").toString("utf-8");
  }
  return window.atob(std);
}