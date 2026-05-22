/**
 * 관리자 API 클라이언트 — backend FastAPI 의 /api/admin/* 을 호출.
 *
 * 인증
 *   - JWT(role=ADMIN) 는 localStorage('admin.jwt') 에 보관
 *   - 모든 호출에 Authorization 헤더 자동 부착 (`token: null` 명시 시 미부착)
 *   - 401 응답 시 토큰을 비우고 위로 throw — 화면 측에서 /login 으로 리다이렉트
 *
 * 에러 응답
 *   backend ErrorResponse `{ code, message, request_id }` 또는
 *   FastAPI validation `{ detail: [...] }` 둘 다 ApiError 로 정규화.
 */

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:8001";
const TOKEN_KEY = "admin.jwt";


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


export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}


interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}


async function request<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = opts;
  const tokenToUse = token === null ? null : (token ?? getAdminToken());

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokenToUse) headers["Authorization"] = `Bearer ${tokenToUse}`;

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      setAdminToken(null);
    }
    let code = "E_UNKNOWN";
    let message = `${res.status} ${res.statusText}`;
    let requestId: string | null = null;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.code === "string") code = obj.code;
      if (typeof obj.message === "string") message = obj.message;
      if (typeof obj.request_id === "string") requestId = obj.request_id;
      if (Array.isArray(obj.detail) && obj.detail.length > 0) {
        const first = obj.detail[0] as Record<string, unknown>;
        if (typeof first.msg === "string") message = first.msg;
        code = "E_VALIDATION";
      }
    }
    throw new ApiError(code, message, requestId, res.status);
  }

  return parsed as T;
}


export const api = {
  get: <T = unknown>(path: string, opts?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
};


// ---------------------------------------------------------------------------
// 도메인 타입 (백엔드 응답과 1:1)
// ---------------------------------------------------------------------------

export interface AdminLoginResponse {
  access_token: string;
  expires_in: number;
  employee_no: string;
  name: string;
  auth_level_cd: string;
  session_id: number;
}

export interface AdminMe {
  employee_no: string;
  name: string;
  auth_level_cd: string;
  session_id: number;
}

export interface ReviewQueueItem {
  decision_id: number;
  application_id: number;
  customer_no: number;
  customer_name?: string | null;
  product_id?: number | null;
  product_name?: string | null;
  request_amount?: number | null;
  score: number;
  threshold_high: number;
  threshold_low: number;
  decision_cd: string;
  created_at?: string | null;
}

export interface DecisionItem extends ReviewQueueItem {
  human_decision_cd?: string | null;
  human_review_by?: string | null;
  human_review_at?: string | null;
  human_review_memo?: string | null;
}

export interface PredictResponse {
  decision_id: number;
  application_id: number;
  customer_no: number;
  model_version: string;
  score: number;
  decision_cd: string;
  threshold_high: number;
  threshold_low: number;
  features: Record<string, number | string | null>;
  meta: Record<string, unknown>;
}

export interface AttachmentSummary {
  required_total: number;
  required_submitted: number;
  required_verified: number;
  required_missing: number;
  optional_total: number;
  optional_submitted: number;
  complete_yn: string;
}

export interface AttachmentItem {
  requirement_id: number;
  doc_type_cd: string;
  doc_type_name: string;
  required_yn: string;
  submission?: {
    attach_id: number;
    file_name: string;
    verify_status_cd: string;
    submitted_at?: string | null;
    verified_at?: string | null;
    verified_by?: string | null;
    reject_reason?: string | null;
  } | null;
}

export interface AttachmentsResponse {
  application: {
    application_id: number;
    customer_no: number;
    customer_name?: string | null;
    product_id?: number | null;
    product_name?: string | null;
    request_amount?: number | null;
  };
  summary: AttachmentSummary;
  items: AttachmentItem[];
}

export interface OverdueListItem {
  customer_no: number;
  customer_name?: string | null;
  grade_cd?: string | null;
  total_overdue_amount: number;
  overdue_days_max: number;
  loan_contracts_count: number;
  last_repay_date?: string | null;
}

export interface OverdueDetail {
  customer: { customer_no: number; name?: string | null; grade_cd?: string | null };
  contracts: Array<{
    loan_contract_no: string;
    product_name?: string | null;
    principal: number;
    outstanding: number;
    overdue_days: number;
    overdue_amount: number;
    apply_rate: number;
    contract_status_cd: string;
  }>;
  schedules: Array<{
    seq: number;
    due_date: string;
    amount: number;
    status_cd: string;
  }>;
}

export interface ExternalHealth {
  api_name: string;
  status_cd: "UP" | "DEGRADED" | "DOWN" | string;
  last_response_ms?: number | null;
  uptime_24h?: number | null;
  last_checked_at?: string | null;
}


// ---------------------------------------------------------------------------
// 어댑터 — 백엔드가 일부 엔드포인트에서 asyncpg Record 컬럼을 대문자로 그대로
// 반환(`DECISION_ID`/`SCORE`/`PARTY_NAME` 등). 프론트 타입(snake_case 소문자)
// 으로 안전하게 매핑하기 위한 도우미.
// ---------------------------------------------------------------------------

function pick<T>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

export function mapDecisionItem(raw: Record<string, unknown>): DecisionItem {
  return {
    decision_id: pick<number>(raw, ["decision_id", "DECISION_ID"]) ?? 0,
    application_id: pick<number>(raw, ["application_id", "APPLICATION_ID"]) ?? 0,
    customer_no: pick<number>(raw, ["customer_no", "CUSTOMER_NO"]) ?? 0,
    customer_name: pick<string>(raw, ["customer_name", "PARTY_NAME"]) ?? null,
    product_id: pick<number>(raw, ["product_id", "PRODUCT_ID"]) ?? null,
    product_name: pick<string>(raw, ["product_name", "PRODUCT_NAME"]) ?? null,
    request_amount: pick<number>(raw, ["request_amount", "REQUEST_AMOUNT", "DESIRED_AMOUNT"]) ?? null,
    score: pick<number>(raw, ["score", "SCORE"]) ?? 0,
    threshold_high: pick<number>(raw, ["threshold_high", "THRESHOLD_HIGH"]) ?? 0.85,
    threshold_low: pick<number>(raw, ["threshold_low", "THRESHOLD_LOW"]) ?? 0.3,
    decision_cd: pick<string>(raw, ["decision_cd", "DECISION_CD"]) ?? "",
    human_decision_cd: pick<string>(raw, ["human_decision_cd", "HUMAN_DECISION_CD"]) ?? null,
    human_review_by: pick<string>(raw, ["human_review_by", "HUMAN_REVIEWED_BY"]) ?? null,
    human_review_at: pick<string>(raw, ["human_review_at", "HUMAN_REVIEWED_AT"]) ?? null,
    human_review_memo: pick<string>(raw, ["human_review_memo", "HUMAN_REVIEW_MEMO"]) ?? null,
    created_at: pick<string>(raw, ["created_at", "CREATED_AT"]) ?? null,
  };
}

export function mapReviewQueueItem(raw: Record<string, unknown>): ReviewQueueItem {
  // ReviewQueueItem 은 DecisionItem 의 부분집합이라 같은 매퍼를 재활용.
  return mapDecisionItem(raw);
}

export function mapOverdueItem(raw: Record<string, unknown>): OverdueListItem {
  return {
    customer_no: pick<number>(raw, ["customer_no", "CUSTOMER_NO"]) ?? 0,
    customer_name: pick<string>(raw, ["customer_name", "PARTY_NAME"]) ?? null,
    grade_cd: pick<string>(raw, ["grade_cd", "CUST_GRADE_CD", "GRADE_CD"]) ?? null,
    total_overdue_amount: pick<number>(raw, ["total_overdue_amount", "TOTAL_OVERDUE_AMOUNT", "OVERDUE_AMOUNT"]) ?? 0,
    overdue_days_max: pick<number>(raw, ["overdue_days_max", "OVERDUE_DAYS_MAX", "OVERDUE_DAYS"]) ?? 0,
    loan_contracts_count: pick<number>(raw, ["loan_contracts_count", "LOAN_CONTRACTS_COUNT", "CONTRACTS_COUNT"]) ?? 0,
    last_repay_date: pick<string>(raw, ["last_repay_date", "LAST_REPAY_DATE"]) ?? null,
  };
}