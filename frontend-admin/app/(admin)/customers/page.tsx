"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type CustomerListResponse } from "@/lib/api";
import { encodeId, fmtKrw, fmtNumber, fmtDateTime } from "@/lib/utils";
import {
  CUSTOMER_STATUS_OPTIONS,
  GRADE_OPTIONS,
  customerStatusLabel,
  gradeLabel,
} from "@/lib/labels";


export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [gradeCd, setGradeCd] = useState("");
  const [statusCd, setStatusCd] = useState("");
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (gradeCd) params.set("grade_cd", gradeCd);
      if (statusCd) params.set("status_cd", statusCd);
      params.set("limit", "100");
      const res = await api.get<CustomerListResponse>(`/api/admin/customers?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원을 불러오지 못했습니다.");
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">회원 조회</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회원번호 · 이메일 · 이름 부분 일치 검색 / 등급·상태 필터
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
                  placeholder="회원번호 / 이메일 / 이름"
                  className="pl-8"
                />
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">등급</span>
              <select
                value={gradeCd}
                onChange={(e) => setGradeCd(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                 <option value="">전체</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">상태</span>
              <select
                value={statusCd}
                onChange={(e) => setStatusCd(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">전체</option>
                {CUSTOMER_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "검색 중…" : "검색"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            검색 결과
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}명
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>행 클릭 → 회원 상세 (계좌·대출·연락처·위임 종합)</CardDescription>
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
            <Table>
              <THead>
                <TR>
                  <TH>고객</TH>
                  <TH>이메일</TH>
                  <TH>등급</TH>
                  <TH>상태</TH>
                  <TH className="text-right">계좌</TH>
                  <TH className="text-right">총 잔액</TH>
                  <TH className="text-right">대출</TH>
                  <TH>가입일</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <TR key={row.customer_no}>
                    <TD>
                      <Link
                        href={`/customers/${encodeId(row.customer_no)}`}
                        className="font-medium hover:underline"
                      >
                        {row.name ?? "-"}
                      </Link>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        #{row.customer_no}
                      </div>
                    </TD>
                    <TD className="text-xs">{row.email ?? "-"}</TD>
                    <TD>
                      <GradeBadge grade={row.grade_cd} />
                    </TD>
                    <TD>
                      <StatusBadge status={row.status_cd} />
                    </TD>
                    <TD className="num-tabular text-right">{fmtNumber(row.account_count)}</TD>
                    <TD className="num-tabular text-right font-medium">{fmtKrw(row.total_balance)}</TD>
                    <TD className="num-tabular text-right">{fmtNumber(row.loan_count)}</TD>
                    <TD className="text-xs text-muted-foreground">{fmtDateTime(row.join_datetime)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function GradeBadge({ grade }: { grade?: string | null }) {
  if (!grade) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "primary" | "success" | "warning" | "muted"> = {
    VIP: "primary",
    SENIOR: "warning",
    MINOR: "success",
  };
  return <Badge variant={map[grade] ?? "muted"}>{gradeLabel(grade)}</Badge>;
}


function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "warning" | "destructive" | "muted"> = {
    "5050": "success",
    LIMITED: "warning",
    LOCKED: "destructive",
    "5052": "destructive",
    DORMANT: "muted",
    "5051": "muted",
    "5053": "muted",
  };
  return <Badge variant={map[status] ?? "muted"}>{customerStatusLabel(status)}</Badge>;
}