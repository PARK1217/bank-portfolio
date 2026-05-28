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
      // 보호 경로에서 401 받으면 즉시 `/auto-logout` 안내 페이지로 이동.
      // /login·/auto-logout 자체에서 받는 401(잘못된 비번 등)은 그대로 throw 해 화면에서 에러 표시.
      if (typeof window !== "undefined") {
        const here = window.location.pathname;
        if (!here.startsWith("/login") && !here.startsWith("/auto-logout")) {
          window.location.replace("/auto-logout?reason=expired");
          // hard redirect 가 진행되는 동안 throw 가 캐치되어 `AdminAuthProvider` 의 useEffect
          // 두 번째 분기(`/login` 가드)가 race 로 먼저 실행되는 것을 차단.
          // 페이지 unload 까지 pending 으로 두면 그 사이 어떤 후속 로직도 트리거되지 않는다.
          return new Promise<T>(() => {});
        }
      }
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
  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
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
  name?: string | null;
  overdue_count: number;
  loan_contract_count: number;
  overdue_amount_krw: number;
  overdue_principal_krw: number;
  max_overdue_days: number;
  earliest_overdue_date?: string | null;
}

export interface OverdueScheduleItem {
  installment_no: number;
  scheduled_date: string;
  principal_amount?: number | null;
  interest_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  unpaid_amount?: number | null;
  status_cd: string;
  overdue_days?: number | null;
}

export interface OverdueContract {
  loan_contract_no: string;
  product_name?: string | null;
  loan_type_cd?: string | null;
  contract_limit: number;
  current_usage: number;
  contract_rate: number;
  overdue_spread_rate?: number | null;
  loan_status_cd?: string | null;
  overdue_stage_cd?: string | null;
  contract_date?: string | null;
  maturity_date?: string | null;
  overdue_count: number;
  overdue_amount_krw: number;
  max_overdue_days: number;
  schedules?: OverdueScheduleItem[] | null;
}

export interface OverdueDetail {
  customer: {
    customer_no: number;
    name?: string | null;
    email?: string | null;
    grade_cd?: string | null;
    status_cd?: string | null;
  };
  contracts: OverdueContract[];
}

export interface ExternalHealth {
  health_id?: number | null;
  api_name: string;
  status_cd: "UP" | "DEGRADED" | "DOWN" | string;
  latency_p50_ms?: number | null;
  latency_p95_ms?: number | null;
  success_rate?: number | null;
  request_count?: number | null;
  error_count?: number | null;
  window_minutes?: number | null;
  sample_at?: string | null;
}


// ---------------------------------------------------------------------------
// 회원 관리 / 계좌 관리 (Phase D)
// ---------------------------------------------------------------------------

export interface CustomerListItem {
  customer_no: number;
  name?: string | null;
  email?: string | null;
  grade_cd?: string | null;
  status_cd?: string | null;
  birth_date?: string | null;
  join_datetime?: string | null;
  marketing_agree_yn?: string | null;
  account_count: number;
  total_balance: number;
  loan_count: number;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  count: number;
  total: number;
}

export interface CustomerContact {
  contact_type_cd: string;
  value: string;
  primary_yn?: string | null;
  verified_yn?: string | null;
}

export interface CustomerAddress {
  addr_type_cd: string;
  postal_code?: string | null;
  line1?: string | null;
  line2?: string | null;
  primary_yn?: string | null;
}

export interface CustomerAccount {
  account_no: string;
  account_type_cd: string;
  status_cd: string;
  balance: number;
  alias?: string | null;
  daily_withdraw_limit: number;
  daily_transfer_limit: number;
  primary_yn?: string | null;
  open_date?: string | null;
  limited_yn?: string | null;
  hidden_yn?: string | null;
}

export interface CustomerLoan {
  loan_contract_no: string;
  product_name?: string | null;
  loan_type_cd?: string | null;
  contract_limit: number;
  current_usage: number;
  contract_rate: number;
  overdue_spread_rate?: number | null;
  loan_status_cd?: string | null;
  overdue_stage_cd?: string | null;
  contract_date?: string | null;
  maturity_date?: string | null;
  overdue_count?: number | null;
  overdue_amount_krw?: number | null;
  max_overdue_days?: number | null;
}

export interface CustomerDelegation {
  delegation_id: number;
  target_cust_no?: number | null;
  agent_cust_no?: number | null;
  target_name?: string | null;
  agent_name?: string | null;
  role_type_cd?: string | null;
  inquiry_perm?: string | null;
  withdraw_perm?: string | null;
  transfer_perm?: string | null;
  close_perm?: string | null;
  open_product_perm?: string | null;
  loan_apply_perm?: string | null;
  limit_change_perm?: string | null;
  pwd_change_perm?: string | null;
  start_date?: string | null;
  direction: "AS_TARGET" | "AS_AGENT";
}

export interface CustomerDetail {
  customer: {
    customer_no: number;
    party_id?: number | null;
    name?: string | null;
    email?: string | null;
    grade_cd?: string | null;
    status_cd?: string | null;
    join_datetime?: string | null;
    marketing_agree_yn?: string | null;
    privacy_agree_yn?: string | null;
    party_type_cd?: string | null;
    birth_date?: string | null;
    gender?: string | null;
    current_employer?: string | null;
    annual_income?: number | null;
  };
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  accounts: CustomerAccount[];
  loans: CustomerLoan[];
  delegations: CustomerDelegation[];
}

export interface AccountListItem {
  account_no: string;
  customer_no?: number | null;
  customer_name?: string | null;
  account_type_cd: string;
  status_cd: string;
  balance: number;
  holder_name?: string | null;
  alias?: string | null;
  open_date?: string | null;
  limited_yn?: string | null;
  primary_yn?: string | null;
  daily_withdraw_limit: number;
  daily_transfer_limit: number;
  hidden_yn?: string | null;
}

export interface AccountListResponse {
  items: AccountListItem[];
  count: number;
  total: number;
}

export interface AccountTxItem {
  transaction_id: number;
  tx_datetime?: string | null;
  amount: number;
  balance_after: number;
  tx_type_cd?: string | null;
  counterpart_account_no?: string | null;
  counterpart_bank_name?: string | null;
  counterpart_holder_name?: string | null;
  memo?: string | null;
}

export interface AuditLogItem {
  audit_id: number;
  employee_no: string;
  action_cd: string;
  target_table?: string | null;
  target_id?: string | null;
  result_cd?: string | null;
  access_ip?: string | null;
  user_agent?: string | null;
  remark?: string | null;
  created_at?: string | null;
  before_json?: unknown;
  after_json?: unknown;
}

export interface AuditListResponse {
  items: AuditLogItem[];
  count: number;
  total: number;
}

export interface AuditFacet {
  value: string;
  count: number;
}

export interface AuditFacets {
  actions: AuditFacet[];
  employees: AuditFacet[];
  target_tables: AuditFacet[];
  stats: {
    total: number;
    ok: number;
    denied: number;
    error: number;
    today: number;
  };
}


// AI_LLM_CALL_LOG — observability/page.tsx
export interface LlmCallListItem {
  llm_call_id: number;
  called_at: string;
  audience_cd: string | null;
  cache_hit_yn: string | null;
  model_name: string | null;
  purpose_cd: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  status_cd: string | null;
  raw_question_head: string | null;
}

export interface LlmCallListResponse {
  items: LlmCallListItem[];
  total: number;
}

export interface LlmRetrievedChunk {
  rank: number;
  faq_id: number;
  category?: string;
  question?: string;
  audience_cd?: string;
  source_tag?: string;
  distance: number;
  snippet?: string;
}

export interface RagEvalScores {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  context_recall: number | null;
  evaluated_at: string | null;
}

export interface LlmCallDetail {
  llm_call_id: number;
  trace_id: string;
  span_id: string | null;
  called_at: string;
  audience_cd: string | null;
  cache_hit_yn: string | null;
  model_name: string | null;
  purpose_cd: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  status_cd: string | null;
  error_message: string | null;
  system_prompt: string | null;
  user_prompt: string | null;
  raw_question: string | null;
  rewritten_query: string | null;
  retrieved_context: LlmRetrievedChunk[] | null;
  response_text: string | null;
  evaluation: RagEvalScores | null;
}

export interface LlmCallStats {
  total: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  avg_miss_latency_ms: number | null;
  avg_hit_latency_ms: number | null;
  prompt_tokens_24h: number;
  completion_tokens_24h: number;
}

// AI_RAG_EVALUATION — RAG 품질 4지표 평균 (LLM-as-judge 자가 채점)
export interface RagEvalStats {
  total: number;
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  context_recall: number | null;
}


export interface AccountDetail {
  account: {
    account_no: string;
    customer_no?: number | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_grade_cd?: string | null;
    customer_status_cd?: string | null;
    account_type_cd: string;
    status_cd: string;
    balance: number;
    pending_withdraw: number;
    holder_name?: string | null;
    alias?: string | null;
    open_date?: string | null;
    close_date?: string | null;
    last_tx_datetime?: string | null;
    limited_yn?: string | null;
    primary_yn?: string | null;
    hidden_yn?: string | null;
    daily_withdraw_limit: number;
    daily_transfer_limit: number;
    pwd_error_count: number;
    cumulative_interest: number;
  };
  recent_transactions: AccountTxItem[];
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

// 백엔드 /api/admin/loans/{app_id}/attachments 응답을 화면 타입(AttachmentsResponse)
// 으로 정규화. 미스매치 항목:
//   application.loan_app_id    → application_id
//   application.desired_amount → request_amount
//   items[].doc_name           → doc_type_name
//   items[].doc_type_id (int)  → doc_type_cd (문자열 카테고리 우선, doc_category_cd 폴백)
//   items[].submission.file_path     → file_name (basename)
//   items[].submission.submit_at     → submitted_at
//   items[].submission.verifier_emp_no → verified_by
// items[].status_cd 는 submission 부재 시 fallback 으로만 사용 (submission 있으면 그쪽 verify_status_cd 우선).
export function mapAttachmentsResponse(raw: Record<string, unknown>): AttachmentsResponse {
  const appRaw = (raw.application ?? {}) as Record<string, unknown>;
  const summaryRaw = (raw.summary ?? {}) as Record<string, unknown>;
  const itemsRaw = (raw.items ?? []) as Record<string, unknown>[];
  return {
    application: {
      application_id: pick<number>(appRaw, ["application_id", "loan_app_id", "LOAN_APP_ID", "APPLICATION_ID"]) ?? 0,
      customer_no: pick<number>(appRaw, ["customer_no", "CUSTOMER_NO"]) ?? 0,
      customer_name: pick<string>(appRaw, ["customer_name", "PARTY_NAME"]) ?? null,
      product_id: pick<number>(appRaw, ["product_id", "PRODUCT_ID"]) ?? null,
      product_name: pick<string>(appRaw, ["product_name", "PRODUCT_NAME"]) ?? null,
      request_amount: pick<number>(appRaw, ["request_amount", "desired_amount", "DESIRED_AMOUNT", "REQUEST_AMOUNT"]) ?? null,
    },
    summary: {
      required_total: pick<number>(summaryRaw, ["required_total"]) ?? 0,
      required_submitted: pick<number>(summaryRaw, ["required_submitted"]) ?? 0,
      required_verified: pick<number>(summaryRaw, ["required_verified"]) ?? 0,
      required_missing: pick<number>(summaryRaw, ["required_missing"]) ?? 0,
      optional_total: pick<number>(summaryRaw, ["optional_total"]) ?? 0,
      optional_submitted: pick<number>(summaryRaw, ["optional_submitted"]) ?? 0,
      complete_yn: pick<string>(summaryRaw, ["complete_yn"]) ?? "N",
    },
    items: itemsRaw.map((it) => {
      const subRaw = (it.submission ?? null) as Record<string, unknown> | null;
      const docTypeIdNum = pick<number>(it, ["doc_type_id", "DOC_TYPE_ID"]);
      const docCategory = pick<string>(it, ["doc_category_cd", "DOC_CATEGORY_CD"]);
      const filePath = subRaw ? pick<string>(subRaw, ["file_path", "file_name"]) : undefined;
      const fileName = filePath ? filePath.split("/").pop() ?? filePath : undefined;
      return {
        requirement_id: pick<number>(it, ["requirement_id", "REQUIREMENT_ID"]) ?? 0,
        doc_type_cd: pick<string>(it, ["doc_type_cd", "DOC_TYPE_CD"]) ?? docCategory ?? (docTypeIdNum != null ? String(docTypeIdNum) : ""),
        doc_type_name: pick<string>(it, ["doc_type_name", "doc_name", "DOC_NAME"]) ?? "",
        required_yn: pick<string>(it, ["required_yn", "REQUIRED_YN"]) ?? "N",
        submission: subRaw
          ? {
              attach_id: pick<number>(subRaw, ["attach_id", "ATTACH_ID"]) ?? 0,
              file_name: fileName ?? "",
              verify_status_cd: pick<string>(subRaw, ["verify_status_cd", "VERIFY_STATUS_CD"]) ?? pick<string>(it, ["status_cd", "STATUS_CD"]) ?? "PENDING",
              submitted_at: pick<string>(subRaw, ["submitted_at", "submit_at", "SUBMIT_AT"]) ?? null,
              verified_at: pick<string>(subRaw, ["verified_at", "VERIFIED_AT"]) ?? null,
              verified_by: pick<string>(subRaw, ["verified_by", "verifier_emp_no", "VERIFIER_EMP_NO"]) ?? null,
              reject_reason: pick<string>(subRaw, ["reject_reason", "REJECT_REASON"]) ?? null,
            }
          : null,
      };
    }),
  };
}


// ---------------------------------------------------------------------------
// 대출 상환 (Phase 6 — admin_loan_repay)
// ---------------------------------------------------------------------------

export interface RepaymentListItem {
  loan_contract_no: string;
  repay_seq: number;
  schedule_ref?: number | null;
  repay_datetime?: string | null;
  repay_type_cd?: string | null;
  repay_principal: number;
  repay_normal_interest: number;
  repay_overdue_interest: number;
  repay_total: number;
  post_principal_balance: number;
  withdraw_account_no?: string | null;
  channel_cd?: string | null;
  repay_status_cd?: string | null;
  auto_transfer_id?: number | null;
  unpaid_normal_interest: number;
  unpaid_overdue_interest: number;
  overdue_days?: number | null;
  customer_no?: number | null;
  customer_name?: string | null;
  product_name?: string | null;
  loan_type_cd?: string | null;
}

export interface RepaymentListResponse {
  items: RepaymentListItem[];
  count: number;
  total: number;
}

export interface RepaymentContract {
  loan_contract_no: string;
  customer_no?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  product_name?: string | null;
  loan_type_cd?: string | null;
  repay_method_cd?: string | null;
  contract_limit: number;
  current_usage: number;
  contract_rate: number;
  overdue_spread_rate?: number | null;
  loan_status_cd?: string | null;
  overdue_stage_cd?: string | null;
  contract_date?: string | null;
  maturity_date?: string | null;
  loan_account_no?: string | null;
  main_deposit_account_no?: string | null;
}

export interface RepaymentSummary {
  paid_principal_krw: number;
  paid_normal_interest_krw: number;
  paid_overdue_interest_krw: number;
  paid_total_krw: number;
  scheduled_remaining_krw: number;
  overdue_count: number;
  max_overdue_days: number;
  installments_total: number;
  installments_done: number;
}

export interface RepaymentScheduleRow {
  installment_no: number;
  scheduled_date?: string | null;
  scheduled_principal: number;
  scheduled_interest: number;
  scheduled_total: number;
  status_cd?: string | null;
  post_principal_balance: number;
  actual_repay_id?: number | null;
  days_overdue?: number | null;
}

export interface RepaymentHistoryRow {
  repay_seq: number;
  schedule_ref?: number | null;
  repay_datetime?: string | null;
  repay_type_cd?: string | null;
  repay_principal: number;
  repay_normal_interest: number;
  repay_overdue_interest: number;
  post_principal_balance: number;
  withdraw_account_no?: string | null;
  channel_cd?: string | null;
  repay_status_cd?: string | null;
  auto_transfer_id?: number | null;
  unpaid_normal_interest: number;
  unpaid_overdue_interest: number;
  overdue_days?: number | null;
  remark?: string | null;
}

export interface LoanExecHistoryRow {
  exec_seq: number;
  exec_datetime?: string | null;
  exec_type_cd?: string | null;
  exec_amount: number;
  post_exec_balance: number;
  deposit_account_no?: string | null;
  channel_cd?: string | null;
  emp_no?: string | null;
  remark?: string | null;
  cancel_yn?: string | null;
  original_tx_ref?: number | null;
}

export interface RepaymentDetailResponse {
  contract: RepaymentContract;
  summary: RepaymentSummary;
  schedules: RepaymentScheduleRow[];
  history: RepaymentHistoryRow[];
  executions: LoanExecHistoryRow[];
}


// ---------------------------------------------------------------------------
// 상환 dashboard (메인 진입 시 현황)
// ---------------------------------------------------------------------------

export interface RepayDashboardOverdueRow {
  loan_contract_no: string;
  product_name?: string | null;
  customer_no?: number | null;
  customer_name?: string | null;
  overdue_count: number;
  max_overdue_days: number;
  total_overdue_krw: number;
}

export interface RepayDashboardUpcomingRow {
  loan_contract_no: string;
  installment_no: number;
  scheduled_date?: string | null;
  scheduled_total: number;
  customer_no?: number | null;
  customer_name?: string | null;
  product_name?: string | null;
  days_left: number;
}

export interface RepayDashboardResponse {
  in_progress_contracts: number;
  overdue_installments: number;
  due_today: number;
  due_this_month: number;
  overdue_top: RepayDashboardOverdueRow[];
  upcoming_top: RepayDashboardUpcomingRow[];
}


// ---------------------------------------------------------------------------
// 실행된 대출 계약 (admin_loan_contract)
// ---------------------------------------------------------------------------

export interface LoanContractListItem {
  loan_contract_no: string;
  customer_no?: number | null;
  customer_name?: string | null;
  product_id?: number | null;
  product_name?: string | null;
  loan_type_cd?: string | null;
  repay_method_cd?: string | null;
  contract_limit: number;
  current_usage: number;
  available_amount: number;
  contract_rate: number;
  base_rate?: number | null;
  spread_rate?: number | null;
  overdue_spread_rate?: number | null;
  rate_type_cd?: string | null;
  loan_status_cd?: string | null;
  overdue_stage_cd?: string | null;
  overdue_count: number;
  contract_date?: string | null;
  effective_date?: string | null;
  maturity_date?: string | null;
  join_branch_cd?: string | null;
  loan_account_no?: string | null;
  main_deposit_account_no?: string | null;
  loan_period_months?: number | null;
  grace_period_months?: number | null;
}

export interface LoanContractListResponse {
  items: LoanContractListItem[];
  count: number;
  total: number;
}


// ---------------------------------------------------------------------------
// 자동이체 워커 모니터링 (admin_auto_transfer)
// ---------------------------------------------------------------------------

export interface AutoTransferItem {
  auto_transfer_id: number;
  customer_no?: number | null;
  customer_name?: string | null;
  withdraw_account_no?: string | null;
  deposit_account_no?: string | null;
  deposit_bank_cd?: string | null;
  deposit_bank_name?: string | null;
  deposit_holder_name?: string | null;
  transfer_amount: number;
  cycle_type_cd?: string | null;
  monthly_exec_day?: number | null;
  valid_start_date?: string | null;
  valid_end_date?: string | null;
  auto_status_cd?: string | null;
  reg_channel_cd?: string | null;
  withdraw_memo?: string | null;
  deposit_memo?: string | null;
  created_at?: string | null;
}

export interface AutoTransferListResponse {
  items: AutoTransferItem[];
  count: number;
  total: number;
}

export interface AutoTransferExecRow {
  scheduled_date?: string | null;
  biz_day_adjusted?: string | null;
  exec_datetime?: string | null;
  exec_status_cd?: string | null;
  delay_reason_cd?: string | null;
  transfer_id?: number | null;
  transaction_id?: number | null;
}

export interface AutoTransferDetail {
  auto_transfer: AutoTransferItem & {
    customer_email?: string | null;
    max_retry_count?: number | null;
    retry_interval_hours?: number | null;
    failure_action_cd?: string | null;
    carry_next_month_yn?: string | null;
  };
  executions: AutoTransferExecRow[];
}

export interface AutoTransferExecHistoryItem extends AutoTransferExecRow {
  auto_transfer_id: number;
  customer_no?: number | null;
  customer_name?: string | null;
  withdraw_account_no?: string | null;
  deposit_account_no?: string | null;
  deposit_holder_name?: string | null;
  transfer_amount: number;
}

export interface AutoTransferExecHistoryResponse {
  items: AutoTransferExecHistoryItem[];
  count: number;
  total: number;
}

// ---------------------------------------------------------------------------
// 약관 (admin_terms)
// ---------------------------------------------------------------------------

export interface AdminTermsItem {
  terms_id: number;
  type_cd?: string | null;
  name: string;
  version?: number | null;
  agree_required_yn?: string | null;
  re_agree_yn?: string | null;
  effective_date?: string | null;
  expire_date?: string | null;
  status_cd?: string | null;
  owner_dept?: string | null;
  created_at?: string | null;
}

export interface AdminTermsHistoryRow {
  change_seq: number;
  prev_terms_id?: number | null;
  change_type_cd?: string | null;
  change_reason?: string | null;
  order_no?: string | null;
  effective_date?: string | null;
  owner?: string | null;
  created_at?: string | null;
  created_by?: string | null;
}

export interface AdminTermsSibling {
  terms_id: number;
  version?: number | null;
  effective_date?: string | null;
  status_cd?: string | null;
}

export interface AdminTermsDetail {
  terms: AdminTermsItem & { body?: string | null; updated_at?: string | null };
  history: AdminTermsHistoryRow[];
  agree_stats: { total: number; agreed: number; rate: number };
  siblings: AdminTermsSibling[];
}

export interface AdminTermsListResponse {
  items: AdminTermsItem[];
  count: number;
  total: number;
}


// ---------------------------------------------------------------------------
// 공지 / 이벤트 (admin_notice)
// ---------------------------------------------------------------------------

export interface AdminNoticeItem {
  notice_id: number;
  title: string;
  category_cd?: string | null;
  pinned_yn?: string | null;
  status_cd?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  view_count: number;
  author?: string | null;
  created_at?: string | null;
}

export interface AdminNoticeDetail extends AdminNoticeItem {
  body: string;
  updated_at?: string | null;
}

export interface AdminNoticeListResponse {
  items: AdminNoticeItem[];
  count: number;
  total: number;
}

export interface AdminEventItem {
  event_id: number;
  title: string;
  summary?: string | null;
  status_cd?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  banner_url?: string | null;
  view_count: number;
  published_at?: string | null;
  author?: string | null;
  created_at?: string | null;
}

export interface AdminEventDetail extends AdminEventItem {
  body: string;
  updated_at?: string | null;
}

export interface AdminEventListResponse {
  items: AdminEventItem[];
  count: number;
  total: number;
}


export interface AutoTransferDashboard {
  active_count: number;
  complete_count: number;
  cancel_count: number;
  due_today: number;
  month_success: number;
  month_fail: number;
  month_delay: number;
  month_success_rate: number | null;
  delay_reason_top: { reason_cd: string; count: number }[];
  upcoming: {
    auto_transfer_id: number;
    customer_no?: number | null;
    customer_name?: string | null;
    withdraw_account_no?: string | null;
    deposit_account_no?: string | null;
    deposit_bank_name?: string | null;
    deposit_holder_name?: string | null;
    transfer_amount: number;
    cycle_type_cd?: string | null;
    monthly_exec_day?: number | null;
    next_due_date?: string | null;
  }[];
}


// ---------------------------------------------------------------------------
// 회원·계좌 액션 이력 (admin_customer_action / admin_account_action)
// ---------------------------------------------------------------------------

export interface CustomerStatusHistoryRow {
  history_id: number;
  event_datetime?: string | null;
  old_status_cd?: string | null;
  new_status_cd: string;
  reason_cd?: string | null;
  remark?: string | null;
  employee_no?: string | null;
}

export interface CustomerGradeHistoryRow {
  grade_start_date?: string | null;
  grade_end_date?: string | null;
  grade_cd?: string | null;
  reason_cd?: string | null;
  remark?: string | null;
  created_by?: string | null;
}

export interface AccountStatusHistoryRow {
  history_id: number;
  event_datetime?: string | null;
  event_type_cd: string;       // STATUS_CHANGE | PWD_ERROR_RESET
  old_value?: string | null;
  new_value?: string | null;
  reason_cd?: string | null;
  remark?: string | null;
  employee_no?: string | null;
}

// ---------------------------------------------------------------------------
// 거래내역 통합 검색 (admin_transaction)
// ---------------------------------------------------------------------------

export interface AdminTransactionItem {
  transaction_id: number;
  account_no?: string | null;
  account_type_cd?: string | null;
  customer_no?: number | null;
  customer_name?: string | null;
  tx_datetime?: string | null;
  tx_type_cd?: string | null;
  tx_amount: number;
  post_tx_balance: number;
  counterpart_account_no?: string | null;
  counterpart_bank_name?: string | null;
  counterpart_holder_name?: string | null;
  own_bank_yn?: string | null;
  tx_channel_cd?: string | null;
  tx_status_cd?: string | null;
  failure_reason_cd?: string | null;
  memo?: string | null;
  cancel_yn?: string | null;
}

export interface AdminTransactionListResponse {
  items: AdminTransactionItem[];
  count: number;
  total: number;
  sum_in_krw: number;
  sum_out_krw: number;
}

export interface AdminTransactionDetail {
  transaction: AdminTransactionItem & {
    counterpart_bank_cd?: string | null;
    transfer_id?: number | null;
    exec_seq_ref?: number | null;
    repay_seq_ref?: number | null;
    original_tx_ref?: number | null;
    idempotency_key?: string | null;
    created_at?: string | null;
  };
  owner: {
    customer_no?: number | null;
    customer_name?: string | null;
    customer_email?: string | null;
    account_type_cd?: string | null;
    account_status_cd?: string | null;
  };
}


export interface AccountLimitHistoryRow {
  request_id: number;
  limit_type_cd: string;       // DAILY_WITHDRAW | DAILY_TRANSFER
  old_limit_krw: number;
  new_limit_krw: number;
  status_cd: string;
  verify_method_cd: string;    // OTP | ADMIN
  request_datetime?: string | null;
  apply_datetime?: string | null;
  applied_datetime?: string | null;
  canceled_datetime?: string | null;
  remark?: string | null;
}


// ---------------------------------------------------------------------------
// FDS (의심거래)
// ---------------------------------------------------------------------------

export interface FdsListItem {
  customer_no: number;
  detect_seq: number;
  customer_name?: string | null;
  detect_datetime?: string | null;
  total_score?: number | null;
  judgment_cd?: string | null;
  investigation_status_cd: string;
  extra_auth_success?: string | null;
  access_ip?: string | null;
  access_country?: string | null;
  response_time_ms?: number | null;
  remark?: string | null;
  transaction_id?: number | null;
  account_no?: string | null;
}

export interface FdsListResponse {
  items: FdsListItem[];
  count: number;
  total: number;
}

export interface FdsDashboardResponse {
  pending: number;
  today_detected: number;
  high_risk_pending: number;
  by_judgment: Array<{ judgment_cd: string; count: number }>;
}

export interface FdsTransactionContext {
  transaction_id: number;
  account_no?: string | null;
  tx_datetime?: string | null;
  tx_type_cd?: string | null;
  tx_amount: number;
  post_tx_balance: number;
  counterpart_account_no?: string | null;
  counterpart_bank_cd?: string | null;
  counterpart_holder_name?: string | null;
  own_bank_yn?: string | null;
  tx_status_cd?: string | null;
  tx_memo?: string | null;
}

export interface FdsDetectionFull extends FdsListItem {
  customer_email?: string | null;
  investigator_emp_no?: string | null;
  reviewer_emp_no?: string | null;
  investigation_detail?: string | null;
  investigation_conclusion?: string | null;
  linked_restriction_id?: number | null;
}

export interface FdsDetailResponse {
  detection: FdsDetectionFull;
  transaction: FdsTransactionContext | null;
}


export function mapOverdueItem(raw: Record<string, unknown>): OverdueListItem {
  return {
    customer_no: pick<number>(raw, ["customer_no", "CUSTOMER_NO"]) ?? 0,
    name: pick<string>(raw, ["name", "customer_name", "PARTY_NAME"]) ?? null,
    overdue_count: pick<number>(raw, ["overdue_count", "OVERDUE_COUNT"]) ?? 0,
    loan_contract_count: pick<number>(raw, ["loan_contract_count", "LOAN_CONTRACT_COUNT"]) ?? 0,
    overdue_amount_krw: pick<number>(raw, ["overdue_amount_krw", "OVERDUE_AMOUNT_KRW", "OVERDUE_AMOUNT"]) ?? 0,
    overdue_principal_krw: pick<number>(raw, ["overdue_principal_krw", "OVERDUE_PRINCIPAL_KRW"]) ?? 0,
    max_overdue_days: pick<number>(raw, ["max_overdue_days", "MAX_OVERDUE_DAYS"]) ?? 0,
    earliest_overdue_date: pick<string>(raw, ["earliest_overdue_date", "EARLIEST_OVERDUE_DATE"]) ?? null,
  };
}