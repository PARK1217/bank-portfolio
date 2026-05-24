"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { delayReasonLabel } from "@/lib/labels";
import { showApiError } from "@/lib/toast";


/** SCR-TR-007 자동이체 실행 이력. AUTO_TRANSFER_EXEC 시계열. */

interface AutoTransferExecItem {
  scheduled_date: string;
  biz_day_adjusted: string | null;
  exec_status_cd: string;
  exec_datetime: string | null;
  delay_reason_cd: string | null;
  tx_token: string | null;
}

interface AutoTransferExecHistoryData {
  auto_token: string;
  items: AutoTransferExecItem[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  SUCCESS: { label: "성공", color: "text-success" },
  FAIL: { label: "실패", color: "text-destructive" },
  DELAY: { label: "지연", color: "text-warning" },
  PENDING: { label: "예정", color: "text-muted-foreground" },
};

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


function HistoryContent({ autoToken }: { autoToken: string }) {
  const { data, error, loading } = useFetch<AutoTransferExecHistoryData>(
    `/api/transfer/auto/${autoToken}/history`,
  );

  useEffect(() => {
    if (error) showApiError(error, "실행 이력을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="실행 이력 불러오는 중…" />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          실행 이력이 없습니다. 다음 예정일에 첫 실행됩니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">예정일</th>
                <th className="px-3 py-2 text-left">영업일 조정</th>
                <th className="px-3 py-2 text-left">실행 시각</th>
                <th className="px-3 py-2 text-center">상태</th>
                <th className="px-3 py-2 text-right">거래</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((e, idx) => {
                const status = STATUS_LABEL[e.exec_status_cd] ?? {
                  label: e.exec_status_cd,
                  color: "text-muted-foreground",
                };
                return (
                  <tr key={`${e.scheduled_date}-${idx}`}>
                    <td className="px-3 py-2 font-mono text-xs">{e.scheduled_date}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {e.biz_day_adjusted && e.biz_day_adjusted !== e.scheduled_date
                        ? e.biz_day_adjusted
                        : "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {e.exec_datetime ? dtFmt.format(new Date(e.exec_datetime)) : "-"}
                    </td>
                    <td className={`px-3 py-2 text-center text-xs ${status.color}`}>
                      {status.label}
                      {e.delay_reason_cd ? (
                        <div className="text-[10px] text-muted-foreground">
                          {delayReasonLabel(e.delay_reason_cd)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {e.tx_token ? (
                        <Link
                          href={`/transactions/${e.tx_token}`}
                          className="text-primary hover:underline"
                        >
                          상세 →
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        💡 사실 vs 약속 — 약속(자동이체)은 한 행, 사실(실행 거래)은 매번 별도로 기록됩니다.
        실패·지연이 있어도 다음 회차는 예정대로 시도됩니다.
      </p>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ autoToken: string }>();
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link
            href="/transfer/auto"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 자동이체 목록
          </Link>
          <h1 className="mt-1 text-xl font-semibold">실행 이력</h1>
          <p className="font-mono text-xs text-muted-foreground">{params.autoToken}</p>
        </div>
        <HistoryContent autoToken={params.autoToken} />
      </main>
    </Protected>
  );
}