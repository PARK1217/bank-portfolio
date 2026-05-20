"use client";

/**
 * 즉시이체 멀티스텝 임시 상태 (sessionStorage).
 *
 * /transfer → /transfer/confirm → POST /api/transfer → /transfer/complete/{txToken}
 *  TR-001 폼 입력 → 세션에 저장
 *  TR-002 확인 화면이 세션에서 읽음 → 비밀번호 추가 후 POST
 *  성공 시 세션 폐기
 *
 * 비밀번호/OTP 는 *저장하지 않음* (메모리에서 즉시 폼 제출).
 */

const KEY = "bank.transfer.draft";

export interface TransferDraft {
  from_account_token: string;
  from_account_label?: string;
  from_account_masked?: string;
  to_bank_cd: string;
  to_bank_name?: string;
  to_account_no: string;
  to_holder_name?: string | null;
  amount_krw: number;
  memo?: string | null;
}

function read(): TransferDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TransferDraft) : null;
  } catch {
    return null;
  }
}

export function getTransferDraft(): TransferDraft | null {
  return read();
}

export function setTransferDraft(draft: TransferDraft): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearTransferDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}