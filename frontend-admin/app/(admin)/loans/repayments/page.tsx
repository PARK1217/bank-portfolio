"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type RepaymentListResponse, type RepaymentListItem } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtNumber } from "@/lib/utils";


const REPAY_TYPES = ["", "SCHEDULE", "PREPAY", "OVERDUE"];
const REPAY_TYPE_LABEL: Record<string, string> = {
  SCHEDULE: "정기",
  PREPAY: "중도",
  OVERDUE: "연체",
};
const CHANNELS = ["", "APP", "COUNTER", "AUTO"];
const CHANNEL_LABEL: Record<string, string> = {
  APP: "앱",
  COUNTER: "창구",
  AUTO: "자동이체",
};
const STATUSES = ["", "OK", "CANCEL"];


export default function RepaymentsPage() {
  const [query, setQuery] = useState("");
  const [repayType, setRepayType] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<RepaymentListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
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
      const res = await api.get<RepaymentListResponse>(`/api/admin/loans/repayments?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "상환 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void load();
  }

  // 검색결과 합산 — 화면의 신뢰성 보조 KPI.
  const sumTotal = data?.items.reduce((s, x) => s + x.repay_total, 0) ?? 0;
  const sumPrincipal = data?.items.reduce((s, x) => s + x.repay_principal, 0) ?? 0;
  const sumInterest =
    data?.items.reduce((s, x) => s + x.repay_normal_interest + x.repay_overdue_interest, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">대출 상환 내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LOAN_REPAY_HISTORY — 시간 역순 · 계약/회원/일자/구분 필터
        </p>
      </div>

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
            <SelectField label="구분" value={repayType} onChange={setRepayType} options={REPAY_TYPES} labels={REPAY_TYPE_LABEL} />
            <SelectField label="채널" value={channel} onChange={setChannel} options={CHANNELS} labels={CHANNEL_LABEL} />
            <SelectField label="상태" value={status} onChange={setStatus} options={STATUSES} />
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
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="상환 건수" value={fmtNumber(data?.count ?? 0)} unit="건" color="text-primary" sub={data ? `전체 ${data.total}건` : null} />
        <KpiCard label="합계" value={fmtKrw(sumTotal)} unit="" color="text-foreground" />
        <KpiCard label="원금 합계" value={fmtKrw(sumPrincipal)} unit="" color="text-success" />
        <KpiCard label="이자 합계 (정상+연체)" value={fmtKrw(sumInterest)} unit="" color="text-warning" />
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
    </div>
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
      <TD className="text-xs">{CHANNEL_LABEL[row.channel_cd ?? ""] ?? row.channel_cd ?? "-"}</TD>
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
  labels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
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
          <option key={o} value={o}>
            {o ? (labels?.[o] ?? o) : "전체"}
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
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  sub?: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Wallet className={`h-4 w-4 ${color}`} />
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
  return <Badge variant={map[cd] ?? "muted"}>{REPAY_TYPE_LABEL[cd] ?? cd}</Badge>;
}


function RepayStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "destructive" | "muted"> = {
    OK: "success",
    CANCEL: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{cd}</Badge>;
}
