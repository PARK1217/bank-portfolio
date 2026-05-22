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
import { api, type AccountListResponse } from "@/lib/api";
import { encodeId, fmtKrw, fmtDateTime } from "@/lib/utils";


const TYPES = ["", "SAVING", "DEPOSIT", "INSTALL", "FOREIGN"];
const STATUSES = ["", "NORMAL", "5050", "LIMITED", "LOCKED", "CLOSED"];


export default function AccountsPage() {
  const [query, setQuery] = useState("");
  const [accountTypeCd, setAccountTypeCd] = useState("");
  const [statusCd, setStatusCd] = useState("");
  const [data, setData] = useState<AccountListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (accountTypeCd) params.set("account_type_cd", accountTypeCd);
      if (statusCd) params.set("status_cd", statusCd);
      params.set("limit", "100");
      const res = await api.get<AccountListResponse>(`/api/admin/accounts?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "계좌를 불러오지 못했습니다.");
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
        <h1 className="text-2xl font-semibold tracking-tight">계좌 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          계좌번호 · 예금주 · customer_no 부분 일치 / 유형·상태 필터
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
                  placeholder="계좌번호 / 예금주 / customer_no"
                  className="pl-8"
                />
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">유형</span>
              <select
                value={accountTypeCd}
                onChange={(e) => setAccountTypeCd(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || "전체"}
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
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s || "전체"}
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
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>행 클릭 → 계좌 상세 + 최근 거래</CardDescription>
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
                  <TH>계좌번호</TH>
                  <TH>유형</TH>
                  <TH>상태</TH>
                  <TH className="text-right">잔액</TH>
                  <TH>예금주</TH>
                  <TH>고객</TH>
                  <TH>별명</TH>
                  <TH>개설</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <TR key={row.account_no}>
                    <TD>
                      <Link href={`/accounts/${encodeId(row.account_no)}`} className="font-mono text-xs hover:underline">
                        {row.account_no}
                      </Link>
                    </TD>
                    <TD>{row.account_type_cd}</TD>
                    <TD>
                      <StatusBadge status={row.status_cd} />
                    </TD>
                    <TD
                      className={`num-tabular text-right font-medium ${
                        row.balance < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {fmtKrw(row.balance)}
                    </TD>
                    <TD>{row.holder_name ?? "-"}</TD>
                    <TD>
                      {row.customer_no ? (
                        <Link
                          href={`/customers/${encodeId(row.customer_no)}`}
                          className="font-mono text-xs hover:underline"
                        >
                          #{row.customer_no}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                      <div className="text-[10px] text-muted-foreground">{row.customer_name ?? ""}</div>
                    </TD>
                    <TD className="text-xs">{row.alias ?? "-"}</TD>
                    <TD className="text-xs text-muted-foreground">{fmtDateTime(row.open_date)}</TD>
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


function StatusBadge({ status }: { status: string }) {
  if (status === "NORMAL" || status === "5050") return <Badge variant="success">{status}</Badge>;
  if (status === "LIMITED") return <Badge variant="warning">{status}</Badge>;
  if (status === "LOCKED" || status === "CLOSED") return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}