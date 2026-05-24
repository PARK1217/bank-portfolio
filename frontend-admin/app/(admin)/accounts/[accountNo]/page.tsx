"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, KeyRound, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  ApiError,
  type AccountDetail,
  type AccountLimitHistoryRow,
  type AccountStatusHistoryRow,
} from "@/lib/api";
import { decodeId, encodeId, fmtDateTime, fmtKrw } from "@/lib/utils";
import {
  accountStatusLabel,
  accountTypeLabel,
  customerStatusLabel,
  gradeLabel,
  limitRequestStatusLabel,
  txTypeLabel,
} from "@/lib/labels";


const ACCT_STATUSES = ["NORMAL", "5050", "LIMITED", "LOCKED", "DORMANT", "CLOSED"];
const ACCT_STATUS_LABEL: Record<string, string> = {
  NORMAL: "정상",
  "5050": "정상(5050)",
  LIMITED: "거래제한",
  LOCKED: "잠금",
  DORMANT: "휴면",
  CLOSED: "해지",
};


export default function AccountDetailPage() {
  const params = useParams<{ accountNo: string }>();
  const router = useRouter();
  // URL 의 :accountNo 는 base64 인코딩된 식별자 — 디코딩해서 raw account_no 복원.
  const accountNo = (() => {
    try {
      return params.accountNo ? decodeId(params.accountNo) : "";
    } catch {
      return params.accountNo ?? "";
    }
  })();

  const [data, setData] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<AccountStatusHistoryRow[]>([]);
  const [limitHistory, setLimitHistory] = useState<AccountLimitHistoryRow[]>([]);

  const reload = useCallback(async () => {
    if (!accountNo) return;
    try {
      const [detail, sh, lh] = await Promise.all([
        api.get<AccountDetail>(`/api/admin/accounts/${accountNo}`),
        api.get<{ items: AccountStatusHistoryRow[] }>(`/api/admin/accounts/${accountNo}/status-history`),
        api.get<{ items: AccountLimitHistoryRow[] }>(`/api/admin/accounts/${accountNo}/limit-history`),
      ]);
      setData(detail);
      setStatusHistory(sh.items);
      setLimitHistory(lh.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "계좌 상세를 불러오지 못했습니다.");
    }
  }, [accountNo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!accountNo) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        뒤로
      </button>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!data && !error ? <Spinner label="불러오는 중…" /> : null}

      {data ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight font-mono">{data.account.account_no}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {accountTypeLabel(data.account.account_type_cd)} · {data.account.holder_name ?? "-"}
                {data.account.alias ? ` · ${data.account.alias}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={data.account.status_cd === "NORMAL" || data.account.status_cd === "5050" ? "success" : "warning"}>
                {accountStatusLabel(data.account.status_cd)}
              </Badge>
              {data.account.primary_yn === "Y" ? <Badge variant="primary">주거래</Badge> : null}
              {data.account.limited_yn === "Y" ? <Badge variant="warning">제한</Badge> : null}
              {data.account.hidden_yn === "Y" ? <Badge variant="muted">숨김</Badge> : null}
            </div>
          </div>

          {/* 잔액 + 한도 카드 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">잔액</div>
                <div
                  className={`mt-1 num-tabular text-2xl font-semibold ${
                    data.account.balance < 0 ? "text-destructive" : ""
                  }`}
                >
                  {fmtKrw(data.account.balance)}
                </div>
                {data.account.pending_withdraw > 0 ? (
                  <div className="mt-1 text-[11px] text-warning">
                    출금 대기 {fmtKrw(data.account.pending_withdraw)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">일일 출금 한도</div>
                <div className="mt-1 num-tabular text-2xl font-semibold">
                  {fmtKrw(data.account.daily_withdraw_limit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">일일 이체 한도</div>
                <div className="mt-1 num-tabular text-2xl font-semibold">
                  {fmtKrw(data.account.daily_transfer_limit)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메타 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">계좌 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="유형" value={accountTypeLabel(data.account.account_type_cd)} />
                <Pair label="상태" value={accountStatusLabel(data.account.status_cd)} />
                <Pair label="개설일" value={fmtDateTime(data.account.open_date)} />
                <Pair label="해지일" value={fmtDateTime(data.account.close_date)} />
                <Pair label="마지막 거래" value={fmtDateTime(data.account.last_tx_datetime)} />
                <Pair label="비번 오류" value={`${data.account.pwd_error_count}회`} />
                <Pair label="누적 이자" value={fmtKrw(data.account.cumulative_interest)} />
                <Pair label="별명" value={data.account.alias ?? "-"} />
              </dl>
            </CardContent>
          </Card>

          {/* 보유 고객 */}
          {data.account.customer_no ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">보유 고객</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                  <Pair
                    label="고객"
                    value={
                      <Link
                        href={`/customers/${encodeId(data.account.customer_no)}`}
                        className="hover:underline"
                      >
                        {data.account.customer_name ?? "-"} (#{data.account.customer_no})
                      </Link>
                    }
                  />
                  <Pair label="이메일" value={data.account.customer_email ?? "-"} />
                  <Pair label="등급" value={gradeLabel(data.account.customer_grade_cd)} />
                  <Pair label="회원 상태" value={customerStatusLabel(data.account.customer_status_cd)} />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {/* 최근 거래 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 거래</CardTitle>
              <CardDescription>최신 20건</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent_transactions.length === 0 ? (
                <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  거래 내역이 없습니다.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>일시</TH>
                      <TH>유형</TH>
                      <TH className="text-right">금액</TH>
                      <TH className="text-right">잔액 후</TH>
                      <TH>상대</TH>
                      <TH>메모</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.recent_transactions.map((t) => (
                      <TR key={t.transaction_id}>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(t.tx_datetime)}</TD>
                        <TD>
                          <Badge variant={t.amount >= 0 ? "success" : "muted"}>
                            {txTypeLabel(t.tx_type_cd)}
                          </Badge>
                        </TD>
                        <TD
                          className={`num-tabular text-right font-semibold ${
                            t.amount < 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {t.amount > 0 ? "+" : ""}
                          {fmtKrw(t.amount)}
                        </TD>
                        <TD className="num-tabular text-right">{fmtKrw(t.balance_after)}</TD>
                        <TD className="text-xs">
                          {t.counterpart_holder_name ? (
                            <>
                              {t.counterpart_holder_name}
                              {t.counterpart_bank_name ? (
                                <span className="text-muted-foreground"> ({t.counterpart_bank_name})</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TD>
                        <TD className="text-xs text-muted-foreground">{t.memo ?? "-"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 관리자 액션 */}
          <AccountActionPanel account={data.account} reload={reload} />

          {/* 변경 이력 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AcctStatusHistoryCard items={statusHistory} />
            <AcctLimitHistoryCard items={limitHistory} />
          </div>
        </>
      ) : null}
    </div>
  );
}


function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}


function AccountActionPanel({
  account,
  reload,
}: {
  account: AccountDetail["account"];
  reload: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">관리자 액션</CardTitle>
        <CardDescription>계좌 상태·비밀번호 오류 초기화·일일 한도 강제 변경</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AcctStatusForm account={account} reload={reload} />
          <AcctPwdResetForm account={account} reload={reload} />
          <AcctLimitForm account={account} reload={reload} />
        </div>
      </CardContent>
    </Card>
  );
}


function AcctStatusForm({
  account,
  reload,
}: {
  account: AccountDetail["account"];
  reload: () => Promise<void>;
}) {
  const cur = account.status_cd ?? "";
  const [newStatus, setNewStatus] = useState(cur);
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setNewStatus(cur);
  }, [cur]);

  const disabled = submitting || !newStatus || newStatus === cur;

  async function submit() {
    if (disabled) return;
    if (!window.confirm(`상태를 [${ACCT_STATUS_LABEL[cur] ?? cur}] → [${ACCT_STATUS_LABEL[newStatus] ?? newStatus}] 로 변경할까요?`)) {
      return;
    }
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      await api.post(`/api/admin/accounts/${account.account_no}/status`, {
        new_status_cd: newStatus,
        reason_cd: reason || null,
        remark: remark || null,
      });
      setOk("상태가 변경되었어요.");
      setReason("");
      setRemark("");
      await reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "변경에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-3.5 w-3.5 text-warning" />
        계좌 상태
        <span className="text-[10px] text-muted-foreground">현재 {ACCT_STATUS_LABEL[cur] ?? cur}</span>
      </div>
      <select
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        {ACCT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ACCT_STATUS_LABEL[s] ?? s}
          </option>
        ))}
      </select>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 코드" />
      <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="비고" />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={() => void submit()}>
          {submitting ? "처리 중…" : "적용"}
        </Button>
        {ok ? <span className="text-xs text-success">{ok}</span> : null}
        {err ? <span className="text-xs text-destructive">{err}</span> : null}
      </div>
    </div>
  );
}


function AcctPwdResetForm({
  account,
  reload,
}: {
  account: AccountDetail["account"];
  reload: () => Promise<void>;
}) {
  const errCount = account.pwd_error_count;
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const disabled = submitting || errCount === 0;

  async function submit() {
    if (disabled) return;
    if (!window.confirm(`비밀번호 오류 횟수를 ${errCount} → 0 으로 초기화할까요?`)) return;
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      await api.post(`/api/admin/accounts/${account.account_no}/pwd-error-reset`, {
        remark: remark || null,
      });
      setOk("초기화되었어요.");
      setRemark("");
      await reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "초기화에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-3.5 w-3.5 text-primary" />
        비번 오류 초기화
        <span className="text-[10px] text-muted-foreground">현재 {errCount}회</span>
      </div>
      <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="비고 (선택)" />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={() => void submit()}>
          {submitting ? "처리 중…" : errCount === 0 ? "오류 없음" : "0 으로 초기화"}
        </Button>
        {ok ? <span className="text-xs text-success">{ok}</span> : null}
        {err ? <span className="text-xs text-destructive">{err}</span> : null}
      </div>
    </div>
  );
}


function AcctLimitForm({
  account,
  reload,
}: {
  account: AccountDetail["account"];
  reload: () => Promise<void>;
}) {
  const [limitType, setLimitType] = useState<"DAILY_WITHDRAW" | "DAILY_TRANSFER">("DAILY_WITHDRAW");
  const [newLimit, setNewLimit] = useState("");
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const currentValue =
    limitType === "DAILY_WITHDRAW" ? account.daily_withdraw_limit : account.daily_transfer_limit;
  const parsed = Number(newLimit.replace(/[^0-9]/g, ""));
  const valid = !Number.isNaN(parsed) && parsed >= 0 && parsed !== currentValue && parsed <= 1_000_000_000;
  const disabled = submitting || !valid;

  async function submit() {
    if (disabled) return;
    if (!window.confirm(`${limitType === "DAILY_WITHDRAW" ? "출금" : "이체"} 한도를 ${fmtKrw(currentValue)} → ${fmtKrw(parsed)} 로 강제 변경할까요?`)) {
      return;
    }
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      await api.post(`/api/admin/accounts/${account.account_no}/limit`, {
        limit_type_cd: limitType,
        new_limit_krw: parsed,
        reason_cd: reason || null,
        remark: remark || null,
      });
      setOk("한도가 변경되었어요.");
      setNewLimit("");
      setReason("");
      setRemark("");
      await reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "변경에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Gauge className="h-3.5 w-3.5 text-success" />
        일일 한도 강제 변경
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={limitType}
          onChange={(e) => setLimitType(e.target.value as "DAILY_WITHDRAW" | "DAILY_TRANSFER")}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="DAILY_WITHDRAW">출금 한도</option>
          <option value="DAILY_TRANSFER">이체 한도</option>
        </select>
        <Input
          value={newLimit}
          onChange={(e) => setNewLimit(e.target.value)}
          placeholder={`현재 ${fmtKrw(currentValue)}`}
        />
      </div>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 코드" />
      <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="비고" />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={() => void submit()}>
          {submitting ? "처리 중…" : "적용"}
        </Button>
        {ok ? <span className="text-xs text-success">{ok}</span> : null}
        {err ? <span className="text-xs text-destructive">{err}</span> : null}
      </div>
    </div>
  );
}


function AcctStatusHistoryCard({ items }: { items: AccountStatusHistoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">상태·잠금해제 이력</CardTitle>
        <CardDescription>{items.length}건 — 최근 순</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">이력이 없습니다.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>일시</TH>
                <TH>이벤트</TH>
                <TH>변화</TH>
                <TH>사유</TH>
                <TH>처리자</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((h) => (
                <TR key={h.history_id}>
                  <TD className="text-xs">{fmtDateTime(h.event_datetime)}</TD>
                  <TD className="text-xs">
                    <Badge variant={h.event_type_cd === "PWD_ERROR_RESET" ? "primary" : "muted"}>
                      {h.event_type_cd === "PWD_ERROR_RESET" ? "비번해제" : "상태변경"}
                    </Badge>
                  </TD>
                  <TD className="text-xs">
                    <span className="text-muted-foreground">{h.old_value ?? "-"}</span>
                    {" → "}
                    <span className="font-medium">{h.new_value ?? "-"}</span>
                  </TD>
                  <TD className="text-xs">{h.reason_cd ?? "-"}</TD>
                  <TD className="font-mono text-[10px] text-muted-foreground">{h.employee_no ?? "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


function AcctLimitHistoryCard({ items }: { items: AccountLimitHistoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">한도 변경 이력</CardTitle>
        <CardDescription>{items.length}건 — 고객 OTP 신청 + 어드민 강제 변경 통합</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">이력이 없습니다.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>신청일시</TH>
                <TH>유형</TH>
                <TH className="text-right">변경</TH>
                <TH>상태</TH>
                <TH>방식</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((h) => (
                <TR key={h.request_id}>
                  <TD className="text-xs">{fmtDateTime(h.request_datetime)}</TD>
                  <TD className="text-xs">{h.limit_type_cd === "DAILY_WITHDRAW" ? "출금" : "이체"}</TD>
                  <TD className="num-tabular text-right text-xs">
                    <span className="text-muted-foreground">{fmtKrw(h.old_limit_krw)}</span>
                    <br />
                    <span className="font-medium">→ {fmtKrw(h.new_limit_krw)}</span>
                  </TD>
                  <TD>
                    <Badge variant={h.status_cd === "APPLIED" ? "success" : h.status_cd === "CANCELED" ? "destructive" : "muted"}>
                      {limitRequestStatusLabel(h.status_cd)}
                    </Badge>
                  </TD>
                  <TD className="text-xs">
                    {h.verify_method_cd === "ADMIN" ? (
                      <Badge variant="warning">어드민</Badge>
                    ) : (
                      <span className="text-muted-foreground">{h.verify_method_cd}</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}