"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertOctagon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, mapOverdueItem, type OverdueListItem } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtNumber } from "@/lib/utils";


export default function OverduePage() {
  const [items, setItems] = useState<OverdueListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: Record<string, unknown>[]; count: number }>(
          "/api/admin/customers/overdue?limit=100",
        );
        setItems(res.items.map(mapOverdueItem));
      } catch (err) {
        setError(err instanceof Error ? err.message : "연체 회원을 불러오지 못했습니다.");
      }
    })();
  }, []);

  const totalAmount = items?.reduce((s, x) => s + x.overdue_amount_krw, 0) ?? 0;
  const maxDays = items?.reduce((m, x) => Math.max(m, x.max_overdue_days), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">연체 회원 추적</h1>
          <p className="mt-1 text-sm text-muted-foreground">대출 상환이 지연된 회원 — 등급·연체액·최장 연체일</p>
        </div>
        {items ? (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">총 {items.length}명</div>
            <div className="num-tabular text-xl font-semibold text-destructive">{fmtKrw(totalAmount)}</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="연체 회원" value={fmtNumber(items?.length ?? 0)} unit="명" color="text-destructive" />
        <KpiCard label="연체 총액" value={fmtKrw(totalAmount)} unit="" color="text-destructive" />
        <KpiCard label="최장 연체일" value={fmtNumber(maxDays)} unit="일" color="text-warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">연체 명단</CardTitle>
          <CardDescription>회원 행 클릭 → 회원 상세 (계약·상환 스케줄)</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : !items ? (
            <Spinner label="불러오는 중…" />
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              연체 회원이 없습니다.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>고객</TH>
                  <TH className="text-right">연체 계약</TH>
                  <TH className="text-right">연체 금액</TH>
                  <TH className="text-right">연체 원금</TH>
                  <TH className="text-right">최장 연체일</TH>
                  <TH>최초 연체일</TH>
                  <TH>위험도</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.customer_no}>
                    <TD>
                      <Link href={`/overdue/${encodeId(row.customer_no)}`} className="font-medium hover:underline">
                        {row.name ?? "-"}
                      </Link>
                      <div className="font-mono text-[10px] text-muted-foreground">#{row.customer_no}</div>
                    </TD>
                    <TD className="num-tabular text-right">
                      <span className="font-medium">{row.overdue_count}</span>
                      <span className="text-[10px] text-muted-foreground"> / {row.loan_contract_count}</span>
                    </TD>
                    <TD className="num-tabular text-right text-destructive font-semibold">
                      {fmtKrw(row.overdue_amount_krw)}
                    </TD>
                    <TD className="num-tabular text-right text-muted-foreground">
                      {fmtKrw(row.overdue_principal_krw)}
                    </TD>
                    <TD className="num-tabular text-right">
                      <span className="font-semibold">{row.max_overdue_days}</span>
                      <span className="text-[10px] text-muted-foreground"> 일</span>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{fmtDateTime(row.earliest_overdue_date)}</TD>
                    <TD>
                      <RiskBadge days={row.max_overdue_days} />
                    </TD>
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


function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <AlertOctagon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`num-tabular text-2xl font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}


function RiskBadge({ days }: { days: number }) {
  if (days >= 90) return <Badge variant="destructive">고위험</Badge>;
  if (days >= 30) return <Badge variant="warning">중위험</Badge>;
  if (days >= 1) return <Badge variant="primary">경미</Badge>;
  return <Badge variant="muted">정상</Badge>;
}