"use client";

/**
 * 회원가입 멀티스텝 임시 상태 (sessionStorage).
 *
 * /signup/terms → /signup/verify → /signup/account → /signup/complete
 *  각 단계가 다음 단계로 넘기는 상태(verification_id, party_id, 동의시각 등)를
 *  sessionStorage 에 보관. 탭 닫으면 자동 폐기.
 *
 * 본인인증·계정정보 같은 민감 입력값은 *저장하지 않음* — POST 시 즉시 백엔드로만 전달.
 */

const KEY = "bank.signup";

export interface SignupSession {
  agreedTermsAt?: string;
  verificationId?: string;
  partyId?: number;
}

function read(): SignupSession {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getSignupSession(): SignupSession {
  return read();
}

export function patchSignupSession(patch: Partial<SignupSession>): void {
  if (typeof window === "undefined") return;
  const next = { ...read(), ...patch };
  window.sessionStorage.setItem(KEY, JSON.stringify(next));
}

export function clearSignupSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}