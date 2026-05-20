"use client";

/**
 * 대출 신청 멀티스텝 임시 상태 (sessionStorage).
 *
 * 흐름:
 *   /loans/{productId}/precheck  → POST /api/loans/{id}/precheck → 시뮬 결과 표시
 *   /loans/{productId}/apply     → POST /api/loans/{id}/apply    → 응답 app_token 저장
 *   /loans/{appToken}/documents  → 첨부 N건
 *   /loans/{appToken}/status     → Long-polling / SSE
 *
 *  precheck 입력값은 다음 단계 apply 에 prefill 위해 보관.
 */

const KEY = "bank.loan.draft";

export interface LoanDraft {
  product_id?: number;
  annual_income_krw?: number;
  annual_debt_total_krw?: number;
  desired_amount_krw?: number;
  period_months?: number;
  /** precheck 결과 — apply 화면에서 한도 표시용 */
  simulated_dsr_pct?: number;
  max_amount_krw?: number;
  applicable_rate?: number;
  /** apply 응답 — 다음 단계 추적용 */
  app_token?: string;
}

function read(): LoanDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LoanDraft) : null;
  } catch {
    return null;
  }
}

export function getLoanDraft(): LoanDraft | null {
  return read();
}

export function patchLoanDraft(patch: Partial<LoanDraft>): LoanDraft {
  const next = { ...(read() ?? {}), ...patch };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearLoanDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}