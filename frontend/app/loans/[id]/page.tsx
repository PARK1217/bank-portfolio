"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-LN-008 대출 상세 — loanToken 기반. */

interface LoanExecHistoryItem {
  exec_seq: number;
  exec_datetime: string;
  exec_type_cd: string;
  exec_amount_krw: number;
  post_exec_balance_krw: number;
}

interface LoanRepayItem {
  repay_seq: number;
  repaid_at: string;
  principal_krw: number;
  interest_krw: number;
  overdue_interest_krw: number;
  method_cd: string;
}

interface LoanDetailData {
  loan_token: string;
  loan_contract_no_masked: string;
  product_name: string;
  principal_krw: number;
  balance_krw: number;
  rate_applied: number;
  period_months: number;
  next_payment_date: string | null;
  monthly_payment_krw: number;
  overdue_days: number;
  exec_histories: LoanExecHistoryItem[];
  repay_histories: LoanRepayItem[];
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


function DetailContent({ loanToken }: { loanToken: string }) {
  const { data, error, loading } = useFetch<LoanDetailData>(`/api/loans/${loanToken}`);

  useEffect(() => {
    if (error) showApiError(error, "대출 정보를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="대출 정보 불러오는 중…" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <section className={data.overdue_days > 0 ? "text-destructive" : ""}>
        <div className="text-xs text-muted-foreground">{data.product_name}</div>
        <div className="num-tabular mt-1 text-3xl font-semibold">{fmt(data.balance_krw)}</div>
        <div className="text-xs text-muted-foreground">
          원금 {fmt(data.principal_krw)} · {data.rate_applied.toFixed(2)}% · {data.period_months}개월
        </div>
        {data.overdue_days > 0 ? (
          <div className="mt-2 inline-block rounded-md bg-destructive/10 px-2 py-1 text-xs">
            연체 {data.overdue_days}일
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">월 상환액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="num-tabular text-xl font-semibold">{fmt(data.monthly_payment_krw)}</div>
            {data.next_payment_date ? (
              <div className="text-xs text-muted-foreground">다음 상환일 {data.next_payment_date}</div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">계약번호</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm">{data.loan_contract_no_masked}</div>
          </CardContent>
        </Card>
      </section>

      <section className="flex gap-2">
        <Link
          href={`/loans/${loanToken}/schedule`}
          className="flex-1 rounded-md border bg-background py-2 text-center text-sm hover:bg-accent"
        >
          상환 스케줄
        </Link>
        <Link
          href={`/loans/${loanToken}/prepay`}
          className="flex-1 rounded-md border bg-background py-2 text-center text-sm hover:bg-accent"
        >
          중도상환
        </Link>
      </section>

      {data.exec_histories.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold">실행 이력</h2>
          <ul className="divide-y rounded-md border bg-card">
            {data.exec_histories.map((e) => (
              <li key={e.exec_seq} className="flex justify-between p-3 text-sm">
                <div>
                  <div>{e.exec_type_cd}</div>
                  <div className="text-xs text-muted-foreground">
                    {dtFmt.format(new Date(e.exec_datetime))}
                  </div>
                </div>
                <div className="num-tabular text-right">
                  {fmt(e.exec_amount_krw)}
                  <div className="text-xs text-muted-foreground">
                    잔여 {fmt(e.post_exec_balance_krw)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.repay_histories.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold">상환 이력</h2>
          <ul className="divide-y rounded-md border bg-card">
            {data.repay_histories.map((r) => (
              <li key={r.repay_seq} className="flex justify-between p-3 text-sm">
                <div>
                  <div>{r.method_cd === "AUTO" ? "자동이체" : r.method_cd === "PREPAY" ? "중도상환" : "수동상환"}</div>
                  <div className="text-xs text-muted-foreground">
                    {dtFmt.format(new Date(r.repaid_at))}
                  </div>
                </div>
                <div className="num-tabular text-right text-xs">
                  <div>원금 {fmt(r.principal_krw)}</div>
                  <div>이자 {fmt(r.interest_krw)}</div>
                  {r.overdue_interest_krw > 0 ? (
                    <div className="text-destructive">연체이자 {fmt(r.overdue_interest_krw)}</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <DetailContent loanToken={params.id} />
      </main>
    </Protected>
  );
}