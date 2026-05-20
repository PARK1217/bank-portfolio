/**
 * API client — backend FastAPI 와의 fetch 래퍼.
 *
 * 인프라 정합 (인프라 세션과의 계약):
 *   1) 에러 응답 본문은 `ErrorResponse { code, message, request_id }` 형식 고정.
 *      비-2xx 응답 → 이 형태로 파싱해 `ApiError` 로 throw.
 *   2) `X-Request-ID` 응답 헤더 (CORS expose_headers 노출) 를 모듈 메모리에 저장하고,
 *      이어지는 요청에서 다시 echo 헤더로 보낸다. 서버 로그와 1:1 매칭 (있으면 보너스).
 *
 * 인증 / 멱등성:
 *   - JWT 는 localStorage('bank.jwt') 자동 부착 (`token: null` 명시 시 미부착)
 *   - `Idempotency-Key` 는 `idempotent: true` 또는 명시 `idempotencyKey` 로 부착
 *     (대상: 이체 / 대출실행 / 자동이체 / 회원가입 / 약정 — 가이드 §3.4)
 *
 * 화면 구현은 다음 세션에서. 여기는 *계약*만 구현.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const TOKEN_STORAGE_KEY = "bank.jwt";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 백엔드 공통 에러 응답 (backend/app/schema/common.py 의 ErrorResponse 와 동일 형식). */
export interface ErrorResponse {
  code: string;
  message: string;
  request_id?: string | null;
}

/** 비-2xx 응답에서 throw 되는 표준 에러. catch 측에서 `instanceof ApiError` 로 분기. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId: string | null,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Json = unknown;

export interface FetchOptions extends Omit<RequestInit, "body"> {
  /** JSON 직렬화 대상 body. string/FormData 등 raw 가 필요하면 RequestInit.body 사용. */
  body?: Json;
  /** true 면 자동으로 UUID v4 를 Idempotency-Key 헤더에 부착. */
  idempotent?: boolean;
  /** 임의 키 강제 부착 (idempotent 보다 우선). */
  idempotencyKey?: string;
  /** Bearer 토큰 명시. null 이면 미부착, undefined 면 localStorage 자동. */
  token?: string | null;
  /** 응답 타입 힌트 (런타임 검증은 호출 측에서). */
  // (제네릭은 apiFetch<T> 로 표현)
}


// ---------------------------------------------------------------------------
// Module state — last X-Request-ID (서버 로그 1:1 추적용)
// ---------------------------------------------------------------------------

let lastRequestId: string | null = null;

/** 가장 최근 응답에서 수신한 X-Request-ID. 디버그/UX(문의 시 표시)에 사용. */
export function getLastRequestId(): string | null {
  return lastRequestId;
}

/** 로그아웃 시 등 — 추적 헤더 초기화. */
export function clearLastRequestId(): void {
  lastRequestId = null;
}


// ---------------------------------------------------------------------------
// Auth-expired 콜백 등록 (Layer B — 401/E_TOKEN_EXPIRED 자동 인터셉트)
//
// AuthProvider 가 마운트 시 핸들러 등록 → 서버가 만료된 JWT 거부 시 자동 signOut + 리다이렉트.
// 콜백 패턴으로 순환 의존(api ↔ auth) 회피.
// ---------------------------------------------------------------------------

export type AuthExpiredReason = "expired" | "invalid";
export type AuthExpiredHandler = (reason: AuthExpiredReason) => void;

const authExpiredHandlers = new Set<AuthExpiredHandler>();

/** 핸들러 등록. 반환된 함수 호출로 해제. */
export function onAuthExpired(handler: AuthExpiredHandler): () => void {
  authExpiredHandlers.add(handler);
  return () => {
    authExpiredHandlers.delete(handler);
  };
}

function fireAuthExpired(reason: AuthExpiredReason): void {
  authExpiredHandlers.forEach((h) => {
    try {
      h(reason);
    } catch {
      // 핸들러 자체 오류는 무시 — 다른 핸들러 영향 X
    }
  });
}


// ---------------------------------------------------------------------------
// Token storage helpers (JWT)
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}


// ---------------------------------------------------------------------------
// UUID v4 — Idempotency-Key 발급
// ---------------------------------------------------------------------------

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 폴백 (구형 브라우저 — 거의 안 닿음)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");

  // 1) JWT
  const token = opts.token === undefined ? getStoredToken() : opts.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // 2) Body (JSON)
  let body: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }

  // 3) Idempotency-Key
  if (opts.idempotent || opts.idempotencyKey) {
    headers.set("Idempotency-Key", opts.idempotencyKey ?? uuid());
  }

  // 4) X-Request-ID echo (있으면 보너스 traceability)
  if (lastRequestId) headers.set("X-Request-ID", lastRequestId);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
    body,
  });

  // 5) X-Request-ID 회수 (다음 요청에서 echo)
  const incomingReqId = res.headers.get("X-Request-ID");
  if (incomingReqId) lastRequestId = incomingReqId;

  // 6) 에러 — 인프라 ErrorResponse 형식 그대로 throw
  if (!res.ok) {
    let payload: Partial<ErrorResponse> = {};
    try {
      payload = (await res.json()) as Partial<ErrorResponse>;
    } catch {
      // 본문 없음 / 비JSON
    }

    // Layer B — 인증 만료 / 유효하지 않은 토큰 자동 처리.
    // 401 자체는 E_LOGIN_FAIL / E_PIN_FAIL / E_OTP_FAIL 도 포함되므로,
    // 명시적 토큰 관련 코드에서만 핸들러 발화 (로그인 실패와 분리).
    if (payload.code === "E_TOKEN_EXPIRED") {
      fireAuthExpired("expired");
    } else if (payload.code === "E_TOKEN_INVALID") {
      fireAuthExpired("invalid");
    }

    throw new ApiError(
      payload.code ?? "E_INTERNAL_ERROR",
      payload.message ?? res.statusText ?? "요청 처리 중 오류가 발생했습니다.",
      payload.request_id ?? incomingReqId ?? null,
      res.status,
    );
  }

  // 7) 정상 응답
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}


// ---------------------------------------------------------------------------
// HTTP verb 헬퍼 — 명시적이고 짧음
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),

  /** POST. idempotent 가 필요한 경우 호출 측에서 명시 (`{ idempotent: true }`). */
  post: <T>(path: string, body?: Json, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),

  patch: <T>(path: string, body?: Json, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),

  put: <T>(path: string, body?: Json, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),

  delete: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};