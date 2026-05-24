"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Repeat, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  type AutoTransferDashboard,
  type AutoTransferItem,
  type AutoTransferListResponse,
} from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtNumber } from "@/lib/utils";
import {
  AUTO_TRANSFER_STATUS_OPTIONS,
  CYCLE_TYPE_OPTIONS,
  autoDelayReasonLabel,
  autoTransferStatusLabel,
  cycleTypeLabel,
} from "@/lib/labels";


export default function AutoTransfersPage() {
  const [query, setQuery] = useState("");
  const [statusCd, setStatusCd] = useState("");
  const [cycleCd, setCycleCd] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [mode, setMode] = useState<"dashboard" | "results">("dashboard");
  const [dashboard, setDashboard] = useState<AutoTransferDashboard | null>(null);
  const [dashboardErr, setDashboardErr] = useState<string | null>(null);

  const [data, setData] = useState<AutoTransferListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<AutoTransferDashboard>("/api/admin/auto-transfers/dashboard");
        setDashboard(res);
      } catch (err) {
        setDashboardErr(err instanceof Error ? err.message : "현황을 불러오지 못했습니다.");
      }
    })();
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (statusCd) params.set("status_cd", statusCd);
      if (cycleCd) params.set("cycle_cd", cycleCd);
      if (accountNo) params.set("account_no", accountNo);
      if (amountMin) params.set("amount_min", amountMin);
      if (amountMax) params.set("amount_max", amountMax);
      params.set("limit", "200");
      const res = await api.get<AutoTransferListResponse>(
        `/api/admin/auto-transfers?${params.toString()}`,
      );
      setData(res);
      setMode("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "자동이체 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function resetToDashboard() {
    setMode("dashboard");
    setData(null);
    setError(null);
    setQuery("");
    setStatusCd("");
    setCycleCd("");
    setAccountNo("");
    setAmountMin("");
    setAmountMax("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">자동이체 워커 모니터링</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "dashboard"
            ? "워커 운영 현황 + 이번 달 성공/실패/지연 + 가까운 도래"
            : "검색 결과 — 자동이체 1건당 클릭하면 실행 이력까지 조회"}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex-1 min-w-[240px] space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">검색어</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="회원번호 / 이름 / 출금·입금 계좌 / 받는분 이름"
                  className="pl-8"
                />
              </div>
            </label>
            <SelectField
              label="상태"
              value={statusCd}
              onChange={setStatusCd}
              options={[{ value: "", label: "전체" }, ...AUTO_TRANSFER_STATUS_OPTIONS]}
            />
            <SelectField
              label="주기"
              value={cycleCd}
              onChange={setCycleCd}
              options={[{ value: "", label: "전체" }, ...CYCLE_TYPE_OPTIONS]}
            />
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">계좌번호 (정확)</span>
              <Input
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="110-001-100001"
                className="w-44"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">금액 최소</span>
              <Input value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="0" className="w-24" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">금액 최대</span>
              <Input value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="1000000" className="w-28" />
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "검색 중…" : "검색"}
            </Button>
            {mode === "results" ? (
              <Button type="button" variant="outline" onClick={resetToDashboard}>
                현황으로
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {mode === "dashboard" ? (
        <DashboardView dashboard={dashboard} error={dashboardErr} />
      ) : (
        <ResultsView data={data} error={error} loading={loading} />
      )}
    </div>
  );
}


function DashboardView({
  dashboard,
  error,
}: {
  dashboard: AutoTransferDashboard | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!dashboard) return <Spinner label="현황 불러오는 중…" />;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="활성 자동이체" value={fmtNumber(dashboard.active_count)} unit="건" icon={Repeat} color="text-primary" sub={`완료 ${dashboard.complete_count} · 해지 ${dashboard.cancel_count}`} />
        <KpiCard label="오늘 도래" value={fmtNumber(dashboard.due_today)} unit="건" icon={CalendarClock} color={dashboard.due_today > 0 ? "text-warning" : "text-muted-foreground"} />
        <KpiCard label="이번 달 성공률" value={dashboard.month_success_rate != null ? `${dashboard.month_success_rate}%` : "-"} unit="" icon={CheckCircle2} color="text-success" sub={`성공 ${dashboard.month_success} · 실패 ${dashboard.month_fail} · 지연 ${dashboard.month_delay}`} />
        <KpiCard label="이번 달 실패+지연" value={fmtNumber(dashboard.month_fail + dashboard.month_delay)} unit="건" icon={AlertTriangle} color={dashboard.month_fail + dashboard.month_delay > 0 ? "text-destructive" : "text-muted-foreground"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">실패 사유 Top (이번 달)</CardTitle>
            <CardDescription>FAIL + DELAY 사유 코드별 집계</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.delay_reason_top.length === 0 ? (
              <p className="text-xs text-muted-foreground">이번 달 실패·지연 없음 — 워커 정상</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {dashboard.delay_reason_top.map((r) => (
                  <li key={r.reason_cd} className="flex items-center justify-between">
                    <span>{autoDelayReasonLabel(r.reason_cd)}</span>
                    <span className="font-mono text-xs text-muted-foreground">{r.count}건</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">가까운 도래 Top 5</CardTitle>
            <CardDescription>활성 자동이체 중 다음 실행일 임박 순</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">예정된 자동이체 없음</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {dashboard.upcoming.map((u) => (
                  <li key={u.auto_transfer_id} className="flex items-center justify-between">
                    <Link
                      href={`/auto-transfers/${u.auto_transfer_id}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {u.customer_name ?? "-"} → {u.deposit_holder_name ?? "-"}
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({cycleTypeLabel(u.cycle_type_cd)}
                        {u.cycle_type_cd === "MONTHLY" ? ` ${u.monthly_exec_day}일` : ""})
                      </span>
                    </Link>
                    <span className="num-tabular ml-2 text-xs font-medium">{fmtKrw(u.transfer_amount)}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{fmtDateTime(u.next_due_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

    </>
  );
}


function ResultsView({
  data,
  error,
  loading,
}: {
  data: AutoTransferListResponse | null;
  error: string | null;
  loading: boolean;
}) {
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (loading && !data) return <Spinner label="불러오는 중…" />;
  if (!data || data.items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        검색 결과가 없습니다.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          검색 결과
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {data.count} / 총 {data.total}건
          </span>
        </CardTitle>
        <CardDescription>행 클릭 → 자동이체 상세 + 전체 실행 이력</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>회원</TH>
                <TH>출금 계좌</TH>
                <TH>입금</TH>
                <TH className="text-right">금액</TH>
                <TH>주기</TH>
                <TH>실행일</TH>
                <TH>상태</TH>
                <TH>등록일</TH>
              </TR>
            </THead>
            <TBody>
              {data.items.map((row) => (
                <Row key={row.auto_transfer_id} row={row} />
              ))}
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


function Row({ row }: { row: AutoTransferItem }) {
  return (
    <TR>
      <TD>
        <Link href={`/auto-transfers/${row.auto_transfer_id}`} className="font-mono text-xs hover:underline">
          #{row.auto_transfer_id}
        </Link>
      </TD>
      <TD>
        <div className="text-sm font-medium">{row.customer_name ?? "-"}</div>
        <div className="text-[10px] text-muted-foreground">#{row.customer_no ?? "-"}</div>
      </TD>
      <TD>
        {row.withdraw_account_no ? (
          <Link href={`/accounts/${encodeId(row.withdraw_account_no)}`} className="font-mono text-xs hover:underline">
            {row.withdraw_account_no}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD>
        <div className="text-xs">{row.deposit_holder_name ?? "-"}</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {row.deposit_bank_name ? `${row.deposit_bank_name} · ` : ""}
          {row.deposit_account_no ?? "-"}
        </div>
      </TD>
      <TD className="num-tabular text-right font-semibold">{fmtKrw(row.transfer_amount)}</TD>
      <TD className="text-xs">
        {cycleTypeLabel(row.cycle_type_cd)}
      </TD>
      <TD className="text-xs text-muted-foreground">
        {row.cycle_type_cd === "MONTHLY" && row.monthly_exec_day != null
          ? `매월 ${row.monthly_exec_day}일`
          : row.valid_start_date
            ? `1회 ${fmtDateTime(row.valid_start_date)}`
            : "-"}
      </TD>
      <TD>
        <StatusBadge cd={row.auto_status_cd} />
      </TD>
      <TD className="text-xs text-muted-foreground">{fmtDateTime(row.created_at)}</TD>
    </TR>
  );
}


function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}


function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`num-tabular text-2xl font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
        {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}


function StatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "primary" | "muted" | "destructive"> = {
    ACTIVE: "success",
    COMPLETE: "muted",
    CANCEL: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{autoTransferStatusLabel(cd)}</Badge>;
}
