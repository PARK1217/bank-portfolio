"use client";

/**
 * 상품 개설 멀티스텝 sessionStorage 유틸.
 *
 * 흐름: /products/[id] → /products/[id]/terms (OP-010) → /products/[id]/open-{type} → /products/complete/[accountToken]
 *  - terms 동의 후 `agreed_terms_at` 세팅
 *  - open 폼 진입 시 세션 확인 → 미동의 시 폼 내에서 자동 재동의 POST 또는 /terms 로 리다이렉트
 *  - complete 후 자동 폐기
 */

const KEY = "bank.product.open";

export interface TermsConsentEntry {
  terms_id: number;
  version: number;
  agreed: boolean;
}

export interface ProductOpenSession {
  product_id: number;
  product_type_cd?: string;
  agreed_terms_at?: string;
  product_name?: string;
  /** 약관 화면에서 동의 완료된 항목 — 상품 개설 API 호출 시 같이 전송. */
  consents?: TermsConsentEntry[];
}

function read(): ProductOpenSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProductOpenSession) : null;
  } catch {
    return null;
  }
}

export function getProductOpenSession(): ProductOpenSession | null {
  return read();
}

export function patchProductOpenSession(p: Partial<ProductOpenSession> & { product_id: number }): ProductOpenSession {
  const cur = read();
  const next: ProductOpenSession =
    cur && cur.product_id === p.product_id ? { ...cur, ...p } : ({ ...p } as ProductOpenSession);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearProductOpenSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}