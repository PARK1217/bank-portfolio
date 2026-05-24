"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-SC-007 의심 거래 확인 — FDS_DETECTION 행 조회 + 본인 확인/신고. */

interface FdsAlertItem {
  fds_id: number;
  detected_at: string;
  tx_token: string | null;
  amount_krw: number;
  to_masked: string | null;
  score: number;
  reasons: string[];
  fired_rules?: string[];
  ml_anomaly?: number | null;
  llm_explain?: string | null;
  status_cd: "PENDING" | "CONFIRMED_OK" | "REPORTED";
}

interface FdsAlertListResponse {
  items: FdsAlertItem[];
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


function FdsAlertsContent() {
  const { data, error, loading, refetch } = useFetch<FdsAlertListResponse>("/api/security/fds-alerts");

  useEffect(() => {
    if (error) showApiError(error, "의심 거래 목록을 불러오지 못했습니다.");
  }, [error]);

  async function confirmOk(fdsId: number) {
    try {
      await api.post(`/api/security/fds-alerts/${fdsId}/confirm`, null);
      void refetch();
    } catch (err) {
      showApiError(err, "확인 처리에 실패했습니다.");
    }
  }

  async function report(fdsId: number) {
    if (!confirm("이 거래를 신고하시겠습니까? 즉시 거래 보류 및 추가 조사가 진행됩니다.")) return;
    try {
      await api.post(`/api/security/fds-alerts/${fdsId}/report`, null);
      void refetch();
    } catch (err) {
      showApiError(err, "신고 처리에 실패했습니다.");
    }
  }

  if (loading && !data) return <Spinner label="의심 거래 불러오는 중…" />;
  if (!data || data.items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        탐지된 의심 거래가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.items.map((a) => {
        const isPending = a.status_cd === "PENDING";
        return (
          <li key={a.fds_id}>
            <Card className={a.score >= 70 ? "border-destructive" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <span className={`num-tabular font-semibold ${a.score >= 70 ? "text-destructive" : "text-warning"}`}>
                      위험도 {a.score}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {dtFmt.format(new Date(a.detected_at))}
                    </span>
                  </CardTitle>
                  {a.status_cd === "CONFIRMED_OK" ? (
                    <span className="rounded bg-success/15 px-2 py-0.5 text-xs text-success">확인됨</span>
                  ) : a.status_cd === "REPORTED" ? (
                    <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">신고됨</span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                <div className="num-tabular">
                  {fmt(a.amount_krw)} {a.to_masked ? `→ ${a.to_masked}` : ""}
                </div>
                {a.llm_explain ? (
                  <p className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs leading-relaxed text-foreground">
                    {a.llm_explain}
                  </p>
                ) : null}
                {a.fired_rules && a.fired_rules.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {a.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {r}
                      </span>
                    ))}
                    {typeof a.ml_anomaly === "number" ? (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        ML 이상도 {(a.ml_anomaly * 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </div>
                ) : a.reasons.length > 0 ? (
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {a.reasons.map((r, i) => (
                      <li key={i}>· {r}</li>
                    ))}
                  </ul>
                ) : null}
                {isPending ? (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => confirmOk(a.fds_id)}>
                      본인 거래 확인
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => report(a.fds_id)}>
                      신고
                    </Button>
                    {a.tx_token ? (
                      <Link
                        href={`/transactions/${a.tx_token}`}
                        className="ml-auto text-xs text-primary hover:underline"
                      >
                        거래 상세 →
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground">
            ← 보안 설정
          </Link>
          <h1 className="mt-1 text-xl font-semibold">의심 거래 확인</h1>
          <p className="text-xs text-muted-foreground">
            FDS가 탐지한 거래를 본인이 직접 확인하거나 신고할 수 있습니다.
          </p>
        </div>
        <FdsAlertsContent />
      </main>
    </Protected>
  );
}