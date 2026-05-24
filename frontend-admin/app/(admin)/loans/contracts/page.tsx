"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type LoanContractListItem, type LoanContractListResponse } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtNumber, fmtPercent } from "@/lib/utils";
import {
  LOAN_TYPE_OPTIONS,
  REPAY_METHOD_OPTIONS,
  loanStatusLabel,
  loanTypeLabel,
  overdueStageLabel,
  repayMethodLabel,
} from "@/lib/labels";


const LOAN_STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "NEW", label: "신규" },
  { value: "NORMAL", label: "정상" },
  { value: "OVERDUE", label: "연체" },
  { value: "CLOSED", label: "완납" },
];


export default function ContractsPage() {
  const [query, setQuery] = useState("");
  const [loanType, setLoanType] = useState("");
  const [status, setStatus] = useState("");
  const [repayMethod, setRepayMethod] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<LoanContractListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (loanType) params.set("loan_type_cd", loanType);
      if (status) params.set("status_cd", status);
      if (repayMethod) params.set("repay_method_cd", repayMethod);
      if (rateMin) params.set("rate_min", rateMin);
      if (rateMax) params.set("rate_max", rateMax);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("limit", "200");
      const res = await api.get<LoanContractListResponse>(`/api/admin/loans/contracts?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "대출 계약을 불러오지 못했습니다.");
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

  // 결과 합산 KPI
  const sumLimit = data?.items.reduce((s, x) => s + x.contract_limit, 0) ?? 0;
  const sumUsage = data?.items.reduce((s, x) => s + x.current_usage, 0) ?? 0;
  const overdueContracts = data?.items.filter((x) => x.loan_status_cd === "OVERDUE").length ?? 0;
  const avgRate =
    data && data.items.length > 0
      ? data.items.reduce((s, x) => s + (x.contract_rate || 0), 0) / data.items.length
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">실행 대출 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          계약번호·회원·상품·유형·상태·금리·약정일 필터
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
                  placeholder="계약번호 / 회원번호 / 이름 / 상품명"
                  className="pl-8"
                />
              </div>
            </label>
            <SelectField label="유형" value={loanType} onChange={setLoanType} options={[{ value: "", label: "전체" }, ...LOAN_TYPE_OPTIONS]} />
            <SelectField label="상태" value={status} onChange={setStatus} options={LOAN_STATUS_OPTIONS} />
            <SelectField label="상환 방식" value={repayMethod} onChange={setRepayMethod} options={[{ value: "", label: "전체" }, ...REPAY_METHOD_OPTIONS]} />
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">금리 최소(%)</span>
              <Input value={rateMin} onChange={(e) => setRateMin(e.target.value)} placeholder="3" className="w-20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">금리 최대(%)</span>
              <Input value={rateMax} onChange={(e) => setRateMax(e.target.value)} placeholder="8" className="w-20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">약정일 시작</span>
              <Input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="20240101" maxLength={8} className="w-32" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">약정일 종료</span>
              <Input value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="20261231" maxLength={8} className="w-32" />
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "검색 중…" : "검색"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="계약 건수" value={fmtNumber(data?.count ?? 0)} unit="건" color="text-primary" sub={data ? `전체 ${data.total}건` : null} />
        <KpiCard label="한도 합계" value={fmtKrw(sumLimit)} unit="" color="text-foreground" />
        <KpiCard label="사용 합계" value={fmtKrw(sumUsage)} unit="" color="text-success" />
        <KpiCard
          label="연체 계약"
          value={fmtNumber(overdueContracts)}
          unit="건"
          color={overdueContracts > 0 ? "text-destructive" : "text-muted-foreground"}
          sub={data && data.items.length > 0 ? `평균 금리 ${fmtPercent(avgRate / 100, 2)}` : null}
        />
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
          <CardDescription>계약번호 클릭 → 상환 스케줄·이력·자금 실행 상세</CardDescription>
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
              검색 결과가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>계약번호</TH>
                    <TH>회원 / 상품</TH>
                    <TH>유형</TH>
                    <TH>상환 방식</TH>
                    <TH className="text-right">한도</TH>
                    <TH className="text-right">사용</TH>
                    <TH className="text-right">잔여</TH>
                    <TH className="text-right">금리</TH>
                    <TH>약정일</TH>
                    <TH>만기일</TH>
                    <TH>상태</TH>
                    <TH className="text-right">연체회차</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.items.map((row) => (
                    <ContractRow key={row.loan_contract_no} row={row} />
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


function ContractRow({ row }: { row: LoanContractListItem }) {
  return (
    <TR>
      <TD>
        <Link
          href={`/loans/repayments/${encodeId(row.loan_contract_no)}`}
          className="font-mono text-xs hover:underline"
        >
          {row.loan_contract_no}
        </Link>
      </TD>
      <TD>
        <div className="text-sm font-medium">{row.customer_name ?? "-"}</div>
        <div className="text-[10px] text-muted-foreground">
          #{row.customer_no ?? "-"} · {row.product_name ?? "-"}
        </div>
      </TD>
      <TD>
        <Badge variant="muted">{loanTypeLabel(row.loan_type_cd)}</Badge>
      </TD>
      <TD className="text-xs">
        {repayMethodLabel(row.repay_method_cd)}
      </TD>
      <TD className="num-tabular text-right">{fmtKrw(row.contract_limit)}</TD>
      <TD className="num-tabular text-right text-muted-foreground">{fmtKrw(row.current_usage)}</TD>
      <TD className="num-tabular text-right">
        {row.available_amount > 0 ? (
          <span className="text-success">{fmtKrw(row.available_amount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD className="num-tabular text-right">
        {fmtPercent((row.contract_rate || 0) / 100, 2)}
        {row.overdue_spread_rate ? (
          <span className="ml-1 text-[10px] text-destructive">
            +{fmtPercent(row.overdue_spread_rate / 100, 2)}
          </span>
        ) : null}
      </TD>
      <TD className="text-xs text-muted-foreground">{fmtDateTime(row.contract_date)}</TD>
      <TD className="text-xs text-muted-foreground">{fmtDateTime(row.maturity_date)}</TD>
      <TD>
        <StatusBadge cd={row.loan_status_cd} stage={row.overdue_stage_cd} />
      </TD>
      <TD className="num-tabular text-right">
        {row.overdue_count > 0 ? (
          <span className="font-semibold text-destructive">{row.overdue_count}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
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
          <Briefcase className={`h-4 w-4 ${color}`} />
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


function StatusBadge({ cd, stage }: { cd?: string | null; stage?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "primary" | "warning" | "destructive" | "muted"> = {
    NORMAL: "success",
    NEW: "primary",
    OVERDUE: "destructive",
    CLOSED: "muted",
  };
  return (
    <div className="flex items-center gap-1">
      <Badge variant={map[cd] ?? "muted"}>{loanStatusLabel(cd)}</Badge>
      {stage ? <Badge variant="warning">{overdueStageLabel(stage)}</Badge> : null}
    </div>
  );
}
