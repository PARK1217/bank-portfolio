"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { accountTypeLabel, limitRequestStatusLabel } from "@/lib/labels";


/** SCR-SC-006 이체·출금 한도 변경 — 7일 점검 흐름.
 *  약관 근거: 자유입출금 통장 특약 §4(2), 자유입출금예금 §5(2).
 */

interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  hidden: boolean;
  account_no: string;
  status_cd: string;
}
interface AccountListData {
  accounts: AccountSummary[];
  total_balance_krw: number;
}

type LimitTypeCd = "DAILY_WITHDRAW" | "DAILY_TRANSFER";
type StatusCd = "PENDING" | "APPLIED" | "CANCELED" | "REJECTED";

interface LimitChangeItem {
  request_id: number;
  account_no: string;
  limit_type_cd: LimitTypeCd;
  old_limit_krw: number | null;
  new_limit_krw: number;
  request_datetime: string;
  apply_datetime: string;
  applied_datetime: string | null;
  canceled_datetime: string | null;
  status_cd: StatusCd;
  verify_method_cd: string;
  days_remaining: number;
}

interface LimitChangeStatus {
  current_daily_withdraw_krw: number | null;
  current_daily_transfer_krw: number | null;
  pending: LimitChangeItem[];
  history: LimitChangeItem[];
}

interface LimitChangeAccountStatus extends LimitChangeStatus {
  account_no: string;
}

interface LimitChangeBatchData {
  items: LimitChangeAccountStatus[];
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number | null) => (n == null ? "한도 없음" : `${krw.format(n)}원`);
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const TYPE_LABEL: Record<LimitTypeCd, string> = {
  DAILY_TRANSFER: "1일 이체 한도",
  DAILY_WITHDRAW: "1일 출금 한도",
};


function LimitTypeForm({
  accountNo,
  typeCd,
  currentKrw,
  pending,
  onChange,
}: {
  accountNo: string;
  typeCd: LimitTypeCd;
  currentKrw: number | null;
  pending: LimitChangeItem | undefined;
  onChange: () => void;
}) {
  const [newLimit, setNewLimit] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const newLimitN = parseInt(newLimit.replace(/[^0-9]/g, ""), 10) || 0;

  async function onApply(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !/^\d{6}$/.test(otp) || newLimitN <= 0) return;
    setSubmitting(true);
    try {
      await api.post(
        `/api/accounts/${accountNo}/limit-change`,
        { limit_type_cd: typeCd, new_limit_krw: newLimitN, otp_code: otp },
        { idempotent: true },
      );
      setOtp("");
      setNewLimit("");
      onChange();
    } catch (err) {
      showApiError(err, "한도 변경 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel() {
    if (!pending || canceling) return;
    if (!confirm("진행 중인 한도 변경 신청을 취소하시겠습니까?")) return;
    setCanceling(true);
    try {
      await api.post(
        `/api/accounts/${accountNo}/limit-change/${pending.request_id}/cancel`,
        {},
      );
      onChange();
    } catch (err) {
      showApiError(err, "취소에 실패했습니다.");
    } finally {
      setCanceling(false);
    }
  }

  if (pending) {
    return (
      <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
        <div className="text-sm font-medium text-foreground">
          {TYPE_LABEL[typeCd]} 변경 점검 중
        </div>
        <div className="text-muted-foreground">
          {fmt(pending.old_limit_krw)} → <span className="font-medium text-foreground">{fmt(pending.new_limit_krw)}</span>
        </div>
        <div className="text-muted-foreground">
          적용 예정 {dtFmt.format(new Date(pending.apply_datetime))} (
          <span className="font-medium text-primary">{pending.days_remaining}일 남음</span>)
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onCancel}
          disabled={canceling}
        >
          {canceling ? "취소 중…" : "신청 취소"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onApply} className="space-y-2">
      <div className="text-xs text-muted-foreground">
        현재 <span className="font-medium text-foreground">{fmt(currentKrw)}</span>
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">새 한도 (원)</span>
        <Input
          inputMode="numeric"
          value={newLimit && newLimitN > 0 ? krw.format(newLimitN) : newLimit}
          onChange={(e) => setNewLimit(e.target.value)}
          placeholder="예: 50,000,000"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">OTP 코드 6자리</span>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          pattern="\d{6}"
        />
      </label>
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={submitting || !/^\d{6}$/.test(otp) || newLimitN <= 0}
      >
        {submitting ? "신청 중…" : "변경 신청"}
      </Button>
    </form>
  );
}


function AccountLimitCard({
  account,
  status,
  expanded,
  onToggle,
  onChange,
}: {
  account: AccountSummary;
  status: LimitChangeAccountStatus | undefined;
  expanded: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const pendingByType = useMemo(() => {
    const map = new Map<LimitTypeCd, LimitChangeItem>();
    (status?.pending ?? []).forEach((p) => map.set(p.limit_type_cd, p));
    return map;
  }, [status]);

  const pendingCount = status?.pending.length ?? 0;
  const transferKrw = status?.current_daily_transfer_krw;
  const withdrawKrw = status?.current_daily_withdraw_krw;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="-mx-2 -my-1 flex w-[calc(100%+1rem)] items-start gap-3 rounded px-2 py-1 text-left hover:bg-accent"
        >
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">
              {account.alias ?? accountTypeLabel(account.account_type_cd)}
            </CardTitle>
            <div className="font-mono text-xs text-muted-foreground">{account.account_no}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              이체 <span className="num-tabular text-foreground">{fmt(transferKrw ?? null)}</span>
              <span className="mx-1.5">·</span>
              출금 <span className="num-tabular text-foreground">{fmt(withdrawKrw ?? null)}</span>
              {pendingCount > 0 ? (
                <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">
                  점검 중 {pendingCount}
                </span>
              ) : null}
            </div>
          </div>
          <span aria-hidden className="mt-1 text-xs text-muted-foreground">
            {expanded ? "▴" : "▾"}
          </span>
        </button>
      </CardHeader>
      {expanded ? (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <LimitTypeForm
              accountNo={account.account_no}
              typeCd="DAILY_TRANSFER"
              currentKrw={transferKrw ?? null}
              pending={pendingByType.get("DAILY_TRANSFER")}
              onChange={onChange}
            />
            <LimitTypeForm
              accountNo={account.account_no}
              typeCd="DAILY_WITHDRAW"
              currentKrw={withdrawKrw ?? null}
              pending={pendingByType.get("DAILY_WITHDRAW")}
              onChange={onChange}
            />
          </div>
          {status && status.history.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                변경 이력 ({status.history.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {status.history.slice(0, 5).map((h) => (
                  <li key={h.request_id} className="rounded bg-muted/30 px-2 py-1">
                    <span className="text-foreground">{TYPE_LABEL[h.limit_type_cd]}</span>{" "}
                    {fmt(h.old_limit_krw)} → {fmt(h.new_limit_krw)}{" "}
                    <span className="text-muted-foreground">
                      · {limitRequestStatusLabel(h.status_cd)}{" "}
                      {h.applied_datetime
                        ? `(${dtFmt.format(new Date(h.applied_datetime))})`
                        : h.canceled_datetime
                          ? `(${dtFmt.format(new Date(h.canceled_datetime))})`
                          : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}


function LimitsList() {
  const { data, loading, error } = useFetch<AccountListData>("/api/accounts");
  const {
    data: batch,
    loading: batchLoading,
    error: batchError,
    refetch: refetchBatch,
  } = useFetch<LimitChangeBatchData>("/api/accounts/limit-change-status");

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (error) showApiError(error, "계좌 목록을 불러오지 못했습니다.");
  }, [error]);
  useEffect(() => {
    if (batchError) showApiError(batchError, "한도 정보를 불러오지 못했습니다.");
  }, [batchError]);

  const krwAccounts = useMemo(
    () => (data?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [data],
  );

  const statusByAccount = useMemo(() => {
    const map = new Map<string, LimitChangeAccountStatus>();
    (batch?.items ?? []).forEach((it) => map.set(it.account_no, it));
    return map;
  }, [batch]);

  // PENDING 있는 계좌는 처음부터 펼쳐서 사용자가 바로 인지하도록.
  useEffect(() => {
    if (!batch) return;
    setExpanded((cur) => {
      const next = new Set(cur);
      for (const it of batch.items) {
        if (it.pending.length > 0) next.add(it.account_no);
      }
      return next;
    });
  }, [batch]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return krwAccounts;
    return krwAccounts.filter(
      (a) =>
        (a.alias ?? "").toLowerCase().includes(needle) ||
        a.account_no.toLowerCase().includes(needle),
    );
  }, [krwAccounts, query]);

  function toggle(no: string) {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  }
  function expandAll() {
    setExpanded(new Set(filtered.map((a) => a.account_no)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  if (loading && !data) return <Spinner label="계좌 불러오는 중…" />;
  if (!krwAccounts.length) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        한도 관리 가능한 계좌가 없습니다.
      </p>
    );
  }
  if (batchLoading && !batch) return <Spinner label="한도 정보 불러오는 중…" />;

  const allExpanded = filtered.length > 0 && filtered.every((a) => expanded.has(a.account_no));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="별명·계좌번호 검색"
            aria-label="계좌 검색"
            className="pr-8"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={allExpanded ? collapseAll : expandAll}
          disabled={filtered.length === 0}
        >
          {allExpanded ? "모두 접기" : "모두 펼치기"}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {query.trim() ? (
          <>
            <span className="num-tabular font-medium text-foreground">{filtered.length}</span>
            <span> / 전체 {krwAccounts.length}건</span>
          </>
        ) : (
          <>
            전체 <span className="num-tabular font-medium text-foreground">{krwAccounts.length}</span>건
          </>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          &quot;{query.trim()}&quot; 에 해당하는 계좌가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.account_token}>
              <AccountLimitCard
                account={a}
                status={statusByAccount.get(a.account_no)}
                expanded={expanded.has(a.account_no)}
                onToggle={() => toggle(a.account_no)}
                onChange={refetchBatch}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground">
            ← 보안 설정
          </Link>
          <h1 className="mt-1 text-xl font-semibold">이체·출금 한도 관리</h1>
          <p className="text-xs text-muted-foreground">
            OTP 인증 후 신청 → 7일 점검 후 자동 적용. 점검 기간 중 본인 취소 가능.
          </p>
        </div>
        <LimitsList />
      </main>
    </Protected>
  );
}