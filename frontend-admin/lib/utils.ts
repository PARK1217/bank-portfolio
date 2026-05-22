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