"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Wallet, AlertTriangle, CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  type RepaymentListResponse,
  type RepaymentListItem,
  type RepayDashboardResponse,
} from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtNumber } from "@/lib/utils";
import {
  REPAY_STATUS_OPTIONS,
  REPAY_TYPE_OPTIONS,
  repayStatusLabel,
  repayTypeLabel,
  txChannelLabel,
} from "@/lib/labels";


const CHANNEL_OPTIONS = [
  { value: "", label: "전체" },
  { value: "APP", label: "앱" },
  { value: "COUNTER", label: "창구" },
  { value: "AUTO", label: "자동이체" },
];


export default function RepaymentsPage() {
  const [query, setQuery] = useState("");
  const [repayType, setRepayType] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // 메인 진입 시 dashboard. 검색 누르면 results 모드로 전환.
  const [mode, setMode] = useState<"dashboard" | "results">("dashboard");

  const [dashboard, setDashboard] = useState<RepayDashboardResponse | null>(null);
  const [dashboardErr, setDashboardErr] = useState<string | null>(null);

  const [data, setData] = useState<RepaymentListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 진입 시 dashboard 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<RepayDashboardResponse>(
          "/api/admin/loans/repayments/dashboard",
        );
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
      if (repayType) params.set("repay_type_cd", repayType);
      if (channel) params.set("channel_cd", channel);
      if (status) params.set("status_cd", status);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("limit", "200");
      const res = await api.get<RepaymentListResponse>(
        `/api/admin/loans/repayments?${params.toString()}`,
      );
      setData(res);
      setMode("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "상환 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch();
  }

  function resetToDashboard() {
    setMode("dashboard");
    setData(null);
    setError(null);
    setQuery("");
    setRepayType("");
    setChannel("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">대출 상환 내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "dashboard"
            ? "현재 진행 중인 상환 현황. 검색 폼으로 과거 이력 조회 가능."
            : "검색 결과 — 시간 역순"}
        </p>
      </div>

      {/* 검색 폼 — 항상 노출 */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[240px] space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">검색어</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="계약번호 / 회원번호 / 이름"
                  className="pl-8"
                />
              </div>
            </label>
            <SelectField label="구분" value={repayType} onChange={setRepayType} options={[{ value: "", label: "전체" }, ...REPAY_TYPE_OPTIONS]} />
            <SelectField label="채널" value={channel} onChange={setChannel} options={CHANNEL_OPTIONS} />
            <SelectField label="상태" value={status} onChange={setStatus} options={[{ value: "", label: "전체" }, ...REPAY_STATUS_OPTIONS]} />
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">시작일 (YYYYMMDD)</span>
              <Input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="20260101" maxLength={8} className="w-32" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">종료일 (YYYYMMDD)</span>
              <Input value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="20260531" maxLength={8} className="w-32" />
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
  dashboard: RepayDashboardResponse | null;
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label="진행 중 계약"
          value={fmtNumber(dashboard.in_progress_contracts)}
          unit="건"
          color="text-foreground"
          icon={Wallet}
        />
        <KpiCard
          label="연체 회차"
          value={fmtNumber(dashboard.overdue_installments)}
          unit="회"
          color={dashboard.overdue_installments > 0 ? "text-destructive" : "text-muted-foreground"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="오늘 도래"
          value={fmtNumber(dashboard.due_today)}
          unit="건"
          color={dashboard.due_today > 0 ? "text-warning" : "text-muted-foreground"}
          icon={CalendarClock}
        />
        <KpiCard
          label="이번 달 도래"
          value={fmtNumber(dashboard.due_this_month)}
          unit="건"
          color="text-foreground"
          icon={CalendarClock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최장 연체</CardTitle>
            <CardDescription>연체일 기준 상위 5건 — 계약 클릭 시 상세</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.overdue_top.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                연체된 회차가 없습니다.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>회원 / 상품</TH>
                    <TH>계약번호</TH>
                    <TH className="text-right">연체</TH>
                    <TH className="text-right">최장</TH>
                    <TH className="text-right">총액</TH>
                  </TR>
                </THead>
                <TBody>
                  {dashboard.overdue_top.map((r) => (
                    <TR key={r.loan_contract_no}>
                      <TD>
                        <div className="text-sm font-medium">{r.customer_name ?? "-"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          #{r.customer_no ?? "-"} · {r.product_name ?? "-"}
                        </div>
                      </TD>
                      <TD>
                        <Link
                          href={`/loans/repayments/${encodeId(r.loan_contract_no)}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {r.loan_contract_no}
                        </Link>
                      </TD>
                      <TD className="num-tabular text-right text-xs">{r.overdue_count}회</TD>
                      <TD className="num-tabular text-right">
                        <span className="font-semibold text-destructive">{r.max_overdue_days}</span>
                        <span className="text-[10px] text-muted-foreground"> 일</span>
                      </TD>
                      <TD className="num-tabular text-right text-xs">{fmtKrw(r.total_overdue_krw)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">가까운 도래</CardTitle>
            <CardDescription>다가오는 예정 회차 5건</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.upcoming_top.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                가까운 예정이 없습니다.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>회원 / 상품</TH>
                    <TH>계약번호</TH>
                    <TH className="text-right">회차</TH>
                    <TH className="text-right">예정일</TH>
                    <TH className="text-right">금액</TH>
                  </TR>
                </THead>
                <TBody>
                  {dashboard.upcoming_top.map((r) => (
                    <TR key={`${r.loan_contract_no}-${r.installment_no}`}>
                      <TD>
                        <div className="text-sm font-medium">{r.customer_name ?? "-"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          #{r.customer_no ?? "-"} · {r.product_name ?? "-"}
                        </div>
                      </TD>
                      <TD>
                        <Link
                          href={`/loans/repayments/${encodeId(r.loan_contract_no)}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {r.loan_contract_no}
                        </Link>
                      </TD>
                      <TD className="num-tabular text-right text-xs">{r.installment_no}회</TD>
                      <TD className="num-tabular text-right">
                        <div className="text-xs">{fmtDateTime(r.scheduled_date)}</div>
                        <div className="text-[10px] text-muted-foreground">D-{r.days_left}</div>
                      </TD>
                      <TD className="num-tabular text-right text-xs">{fmtKrw(r.scheduled_total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
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
  data: RepaymentListResponse | null;
  error: string | null;
  loading: boolean;
}) {
  const sumTotal = data?.items.reduce((s, x) => s + x.repay_total, 0) ?? 0;
  const sumPrincipal = data?.items.reduce((s, x) => s + x.repay_principal, 0) ?? 0;
  const sumInterest =
    data?.items.reduce((s, x) => s + x.repay_normal_interest + x.repay_overdue_interest, 0) ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="상환 건수" value={fmtNumber(data?.count ?? 0)} unit="건" color="text-primary" sub={data ? `전체 ${data.total}건` : null} icon={Wallet} />
        <KpiCard label="합계" value={fmtKrw(sumTotal)} unit="" color="text-foreground" icon={Wallet} />
        <KpiCard label="원금 합계" value={fmtKrw(sumPrincipal)} unit="" color="text-success" icon={Wallet} />
        <KpiCard label="이자 합계 (정상+연체)" value={fmtKrw(sumInterest)} unit="" color="text-warning" icon={Wallet} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            검색 결과
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>계약번호 클릭 → 계약 1건의 스케줄·이력·잔액 흐름</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : loading && !data ? (
            <Spinner label="불러오는 중…" />
          ) : !data || data.items.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              상환 내역이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>일시</TH>
                    <TH>회원 / 상품</TH>
                    <TH>계약번호</TH>
                    <TH className="text-right">회차</TH>
                    <TH>구분</TH>
                    <TH>채널</TH>
                    <TH className="text-right">원금</TH>
                    <TH className="text-right">정상이자</TH>
                    <TH className="text-right">연체이자</TH>
                    <TH className="text-right">합계</TH>
                    <TH className="text-right">상환 후 잔액</TH>
                    <TH>상태</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.items.map((row) => (
                    <RepayRow key={`${row.loan_contract_no}-${row.repay_seq}`} row={row} />
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}


function RepayRow({ row }: { row: RepaymentListItem }) {
  return (
    <TR>
      <TD className="text-xs">{fmtDateTime(row.repay_datetime)}</TD>
      <TD>
        <div className="text-sm font-medium">{row.customer_name ?? "-"}</div>
        <div className="text-[10px] text-muted-foreground">
          #{row.customer_no ?? "-"} · {row.product_name ?? "-"}
        </div>
      </TD>
      <TD>
        <Link
          href={`/loans/repayments/${encodeId(row.loan_contract_no)}`}
          className="font-mono text-xs hover:underline"
        >
          {row.loan_contract_no}
        </Link>
      </TD>
      <TD className="num-tabular text-right text-xs">{row.schedule_ref ?? "-"}</TD>
      <TD>
        <RepayTypeBadge cd={row.repay_type_cd} />
      </TD>
      <TD className="text-xs">{txChannelLabel(row.channel_cd)}</TD>
      <TD className="num-tabular text-right">{fmtKrw(row.repay_principal)}</TD>
      <TD className="num-tabular text-right text-muted-foreground">{fmtKrw(row.repay_normal_interest)}</TD>
      <TD className="num-tabular text-right">
        {row.repay_overdue_interest > 0 ? (
          <span className="text-destructive">{fmtKrw(row.repay_overdue_interest)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD className="num-tabular text-right font-semibold">{fmtKrw(row.repay_total)}</TD>
      <TD className="num-tabular text-right text-xs text-muted-foreground">
        {fmtKrw(row.post_principal_balance)}
      </TD>
      <TD>
        <RepayStatusBadge cd={row.repay_status_cd} />
      </TD>
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
  label,
  value,
  unit,
  color,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  sub?: string | null;
  icon: typeof Wallet;
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


function RepayTypeBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "primary" | "destructive" | "muted"> = {
    SCHEDULE: "success",
    PREPAY: "primary",
    OVERDUE: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{repayTypeLabel(cd)}</Badge>;
}


function RepayStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "destructive" | "muted"> = {
    OK: "success",
    CANCEL: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{repayStatusLabel(cd)}</Badge>;
}
