"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-LN-009 대출 상환 스케줄. */

interface LoanScheduleItem {
  seq: number;
  due_date: string;
  principal_krw: number;
  interest_krw: number;
  total_krw: number;
  balance_after_krw: number;
  status_cd: string;
  repaid_at: string | null;
}

interface LoanScheduleData {
  loan_token: string;
  schedule: LoanScheduleItem[];
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  WAITING: { label: "대기", color: "text-muted-foreground" },
  PAID: { label: "납입", color: "text-success" },
  OVERDUE: { label: "연체", color: "text-destructive" },
  PREPAID: { label: "조기상환", color: "text-primary" },
};


function ScheduleContent({ loanToken }: { loanToken: string }) {
  const { data, error, loading } = useFetch<LoanScheduleData>(`/api/loans/${loanToken}/schedule`);

  useEffect(() => {
    if (error) showApiError(error, "상환 스케줄을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="상환 스케줄 불러오는 중…" />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {data.schedule.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          스케줄이 아직 생성되지 않았습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">회차</th>
                <th className="px-3 py-2 text-left">납입일</th>
                <th className="px-3 py-2 text-right">원금</th>
                <th className="px-3 py-2 text-right">이자</th>
                <th className="px-3 py-2 text-right">합계</th>
                <th className="px-3 py-2 text-right">잔액</th>
                <th className="px-3 py-2 text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.schedule.map((s) => {
                const status = STATUS_LABEL[s.status_cd] ?? {
                  label: s.status_cd,
                  color: "text-muted-foreground",
                };
                return (
                  <tr key={s.seq}>
                    <td className="px-3 py-2 font-mono text-xs">{s.seq}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.due_date}</td>
                    <td className="num-tabular px-3 py-2 text-right text-xs">
                      {fmt(s.principal_krw)}
                    </td>
                    <td className="num-tabular px-3 py-2 text-right text-xs">
                      {fmt(s.interest_krw)}
                    </td>
                    <td className="num-tabular px-3 py-2 text-right text-xs font-medium">
                      {fmt(s.total_krw)}
                    </td>
                    <td className="num-tabular px-3 py-2 text-right text-xs text-muted-foreground">
                      {fmt(s.balance_after_krw)}
                    </td>
                    <td className={`px-3 py-2 text-center text-xs ${status.color}`}>
                      {status.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-4xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link
            href={`/loans/${params.id}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 대출 상세
          </Link>
          <h1 className="mt-1 text-xl font-semibold">상환 스케줄</h1>
        </div>
        <ScheduleContent loanToken={params.id} />
      </main>
    </Protected>
  );
}