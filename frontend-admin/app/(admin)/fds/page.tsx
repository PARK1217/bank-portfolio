"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, Clock, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  type FdsDashboardResponse,
  type FdsListResponse,
  type FdsListItem,
} from "@/lib/api";
import {
  fdsInvestStatusLabel,
  fdsJudgmentLabel,
  FDS_INVEST_OPTIONS,
  FDS_JUDGMENT_OPTIONS,
} from "@/lib/labels";
import { encodeId, fmtDateTime, fmtNumber } from "@/lib/utils";


export default function FdsPage() {
  const [query, setQuery] = useState("");
  const [judgment, setJudgment] = useState("");
  const [invest, setInvest] = useState("");

  const [dashboard, setDashboard] = useState<FdsDashboardResponse | null>(null);
  const [dashboardErr, setDashboardErr] = useState<string | null>(null);

  const [data, setData] = useState<FdsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 진입 시 dashboard + 큐 동시 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<FdsDashboardResponse>("/api/admin/fds/dashboard");
        setDashboard(res);
      } catch (err) {
        setDashboardErr(err instanceof Error ? err.message : "현황을 불러오지 못했습니다.");
      }
    })();
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (judgment) params.set("judgment_cd", judgment);
      if (invest) params.set("investigation_status_cd", invest);
      params.set("limit", "200");
      const res = await api.get<FdsListResponse>(`/api/admin/fds?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "의심거래를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">의심거래 모니터링 (FDS)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          판정·조사 상태별 큐 — 행 클릭 시 거래·접속 컨텍스트와 조사 액션
        </p>
      </div>

      {/* KPI */}
      {dashboardErr ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {dashboardErr}
        </div>
      ) : !dashboard ? (
        <Spinner label="현황 불러오는 중…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard
            label="조사 대기"
            value={fmtNumber(dashboard.pending)}
            unit="건"
            color={dashboard.pending > 0 ? "text-warning" : "text-muted-foreground"}
            icon={Clock}
          />
          <KpiCard
            label="오늘 발생"
            value={fmtNumber(dashboard.today_detected)}
            unit="건"
            color="text-foreground"
            icon={ShieldAlert}
          />
          <KpiCard
            label="고위험 대기 (경고·차단)"
            value={fmtNumber(dashboard.high_risk_pending)}
            unit="건"
            color={dashboard.high_risk_pending > 0 ? "text-destructive" : "text-muted-foreground"}
            icon={AlertTriangle}
          />
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">판정 분포</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboard.by_judgment.length === 0 ? (
                  <span className="text-xs text-muted-foreground">-</span>
                ) : (
                  dashboard.by_judgment.map((j) => (
                    <JudgmentBadge key={j.judgment_cd} cd={j.judgment_cd} count={j.count} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 */}
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
                  placeholder="회원이름 / 회원번호"
                  className="pl-8"
                />
              </div>
            </label>
            <SelectField label="판정" value={judgment} onChange={setJudgment} options={FDS_JUDGMENT_OPTIONS} />
            <SelectField label="조사 상태" value={invest} onChange={setInvest} options={FDS_INVEST_OPTIONS} />
            <Button type="submit" disabled={loading}>
              {loading ? "검색 중…" : "검색"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 큐 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            의심거래 큐
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>행 클릭 시 상세 + 조사 액션</CardDescription>
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
              조건에 맞는 의심거래가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>발생 일시</TH>
                    <TH>회원</TH>
                    <TH className="text-right">점수</TH>
                    <TH>판정</TH>
                    <TH>조사 상태</TH>
                    <TH>접속</TH>
                    <TH>요약</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.items.map((row) => (
                    <FdsRow key={`${row.customer_no}-${row.detect_seq}`} row={row} />
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


function FdsRow({ row }: { row: FdsListItem }) {
  return (
    <TR>
      <TD className="text-xs">{fmtDateTime(row.detect_datetime)}</TD>
      <TD>
        <Link
          href={`/fds/${encodeId(row.customer_no)}/${encodeId(row.detect_seq)}`}
          className="text-sm font-medium hover:underline"
        >
          {row.customer_name ?? "-"}
        </Link>
        <div className="font-mono text-[10px] text-muted-foreground">#{row.customer_no}</div>
      </TD>
      <TD className="num-tabular text-right">
        {row.total_score != null ? (
          <span
            className={`font-semibold ${
              row.total_score >= 80
                ? "text-destructive"
                : row.total_score >= 60
                ? "text-warning"
                : "text-foreground"
            }`}
          >
            {row.total_score}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD>
        <JudgmentBadge cd={row.judgment_cd} />
      </TD>
      <TD>
        <InvestBadge cd={row.investigation_status_cd} />
      </TD>
      <TD className="text-xs">
        {row.access_country ? (
          <span className="font-medium">{row.access_country}</span>
        ) : null}
        <div className="font-mono text-[10px] text-muted-foreground">{row.access_ip ?? "-"}</div>
      </TD>
      <TD className="max-w-[300px] truncate text-xs text-muted-foreground" title={row.remark ?? ""}>
        {row.remark ?? "-"}
      </TD>
    </TR>
  );
}


function JudgmentBadge({ cd, count }: { cd?: string | null; count?: number }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "warning" | "destructive" | "muted"> = {
    NORMAL: "success",
    WARN: "warning",
    BLOCK: "destructive",
  };
  return (
    <Badge variant={map[cd] ?? "muted"}>
      {fdsJudgmentLabel(cd)}
      {count != null ? <span className="ml-1 opacity-70">×{count}</span> : null}
    </Badge>
  );
}


function InvestBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "muted" | "primary" | "success" | "destructive"> = {
    PENDING: "muted",
    CONFIRM: "success",
    REPORT: "destructive",
    CLOSE: "primary",
  };
  return <Badge variant={map[cd] ?? "muted"}>{fdsInvestStatusLabel(cd)}</Badge>;
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
        <option value="">전체</option>
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
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  icon: typeof ShieldAlert;
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
      </CardContent>
    </Card>
  );
}
