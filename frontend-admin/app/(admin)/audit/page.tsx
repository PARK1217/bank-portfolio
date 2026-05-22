"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type AuditFacets, type AuditListResponse, type AuditLogItem } from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";


const RESULTS = ["", "OK", "DENIED", "ERROR"];


export default function AuditPage() {
  const [query, setQuery] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [actionCd, setActionCd] = useState("");
  const [resultCd, setResultCd] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [facets, setFacets] = useState<AuditFacets | null>(null);
  const [data, setData] = useState<AuditListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (employeeNo) params.set("employee_no", employeeNo);
      if (actionCd) params.set("action_cd", actionCd);
      if (resultCd) params.set("result_cd", resultCd);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("limit", "200");
      const res = await api.get<AuditListResponse>(`/api/admin/audit/logs?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "감사 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [query, employeeNo, actionCd, resultCd, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      try {
        const f = await api.get<AuditFacets>("/api/admin/audit/facets");
        setFacets(f);
      } catch {
        // facets 실패해도 화면은 동작
      }
    })();
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            감사 로그
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ADMIN_AUDIT_LOG · 모든 /api/admin/* 호출이 미들웨어로 자동 적재
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* KPI */}
      {facets ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard label="누적" value={fmtNumber(facets.stats.total)} unit="건" color="text-foreground" />
          <KpiCard label="오늘" value={fmtNumber(facets.stats.today)} unit="건" color="text-primary" />
          <KpiCard label="정상 (OK)" value={fmtNumber(facets.stats.ok)} unit="건" color="text-success" />
          <KpiCard label="거부 (DENIED)" value={fmtNumber(facets.stats.denied)} unit="건" color="text-warning" />
          <KpiCard label="오류 (ERROR)" value={fmtNumber(facets.stats.error)} unit="건" color="text-destructive" />
        </div>
      ) : null}

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">검색어 (사번 / TARGET_ID)</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ADMIN001 또는 20001 등"
                  className="pl-8"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">직원</span>
              <select
                value={employeeNo}
                onChange={(e) => setEmployeeNo(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">전체</option>
                {facets?.employees.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.value} ({e.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">액션</span>
              <select
                value={actionCd}
                onChange={(e) => setActionCd(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">전체</option>
                {facets?.actions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.value} ({a.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">결과</span>
              <select
                value={resultCd}
                onChange={(e) => setResultCd(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r || "전체"}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">시작일</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">종료일</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>

            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "조회 중…" : "조회"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 결과 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            결과
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>행 클릭 → BEFORE/AFTER JSON 펼침 (있는 경우)</CardDescription>
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
              결과가 없습니다.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">#</TH>
                  <TH>일시</TH>
                  <TH>직원</TH>
                  <TH>액션</TH>
                  <TH>대상</TH>
                  <TH>결과</TH>
                  <TH>IP</TH>
                  <TH>비고</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <AuditRow
                    key={row.audit_id}
                    row={row}
                    expanded={expanded === row.audit_id}
                    onToggle={() => setExpanded(expanded === row.audit_id ? null : row.audit_id)}
                  />
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function AuditRow({
  row,
  expanded,
  onToggle,
}: {
  row: AuditLogItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail = row.before_json != null || row.after_json != null || row.user_agent || row.remark;

  return (
    <>
      <TR
        onClick={hasDetail ? onToggle : undefined}
        className={hasDetail ? "cursor-pointer" : ""}
      >
        <TD className="num-tabular font-mono text-[10px] text-muted-foreground">{row.audit_id}</TD>
        <TD className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(row.created_at)}</TD>
        <TD>
          <span className="font-mono text-xs">{row.employee_no}</span>
        </TD>
        <TD>
          <span className="font-mono text-[11px]">{row.action_cd}</span>
        </TD>
        <TD className="text-xs">
          {row.target_table ? (
            <>
              <span className="text-muted-foreground">{row.target_table}</span>
              {row.target_id ? <span className="ml-1 font-mono">/{row.target_id}</span> : null}
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TD>
        <TD>
          <ResultBadge result={row.result_cd} />
        </TD>
        <TD className="font-mono text-[10px] text-muted-foreground">{row.access_ip ?? "-"}</TD>
        <TD className="text-xs text-muted-foreground max-w-[160px] truncate">{row.remark ?? "-"}</TD>
      </TR>
      {expanded && hasDetail ? (
        <tr>
          <td colSpan={8} className="border-b bg-muted/20 px-3 py-3">
            <div className="space-y-3 text-xs">
              {row.user_agent ? (
                <div>
                  <span className="text-muted-foreground">User-Agent:</span>{" "}
                  <span className="font-mono">{row.user_agent}</span>
                </div>
              ) : null}
              {row.remark ? (
                <div>
                  <span className="text-muted-foreground">비고:</span> {row.remark}
                </div>
              ) : null}
              {row.before_json != null ? (
                <JsonBlock label="BEFORE" data={row.before_json} />
              ) : null}
              {row.after_json != null ? (
                <JsonBlock label="AFTER" data={row.after_json} />
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}


function JsonBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <pre className="overflow-x-auto rounded border bg-card p-2 text-[11px] leading-snug">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}


function ResultBadge({ result }: { result?: string | null }) {
  if (!result) return <Badge variant="muted">-</Badge>;
  if (result === "OK") return <Badge variant="success">OK</Badge>;
  if (result === "DENIED") return <Badge variant="warning">DENIED</Badge>;
  if (result === "ERROR") return <Badge variant="destructive">ERROR</Badge>;
  return <Badge variant="muted">{result}</Badge>;
}


function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`num-tabular text-xl font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-[10px] text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}