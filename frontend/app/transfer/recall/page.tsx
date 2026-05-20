"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-TR-009 오송금 회수 신청. */

interface TransferDetail {
  tx_token: string;
  amount_krw: number;
  to_account: { masked: string; bank_name?: string | null };
  requested_at: string;
  settlement_status: string;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function RecallForm() {
  const router = useRouter();
  const search = useSearchParams();
  const txToken = search.get("tx") ?? "";
  const { data, loading } = useFetch<TransferDetail>(txToken ? `/api/transfer/${txToken}` : null);

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !submitting && !!txToken && reason.length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post(
        "/api/transfer/recall",
        { tx_token: txToken, reason },
        { idempotent: true },
      );
      router.push("/complaints");
    } catch (err) {
      showApiError(err, "오송금 회수 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-TR-009</div>
        <CardTitle className="mt-1">오송금 회수 신청</CardTitle>
        <CardDescription>
          잘못 송금된 이체의 회수를 신청합니다. 수취 은행과 수취인의 동의가 필요하며, 일정 시간이 경과하면 회수가 불가할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!txToken ? (
          <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">
            오송금된 거래의 txToken 을 URL 쿼리(`?tx=...`)로 지정해 진입하세요. 거래 상세 화면의 "오송금 회수" 버튼으로 진입하는 것이 권장됩니다.
          </p>
        ) : loading && !data ? (
          <Spinner label="거래 정보 불러오는 중…" />
        ) : !data ? null : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="num-tabular text-base font-semibold">{fmt(data.amount_krw)}</div>
              <div className="text-xs text-muted-foreground">
                → {data.to_account.bank_name ?? ""} {data.to_account.masked}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(data.requested_at).toLocaleString("ko-KR")} · {data.settlement_status}
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">회수 사유 *</span>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                maxLength={500}
                placeholder="예: 수취인 계좌번호 끝자리를 잘못 입력했습니다."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={10}
              />
              <p className="text-[10px] text-muted-foreground">{reason.length} / 500자, 최소 10자</p>
            </label>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "신청 중…" : "오송금 회수 신청"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              ※ 회수 신청은 민원 형태로 접수되며, 처리 현황은 [민원] 메뉴에서 확인할 수 있습니다.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/transfer" className="text-xs text-muted-foreground hover:text-foreground">
            ← 이체로
          </Link>
        </div>
        <Suspense fallback={<Spinner label="로딩…" />}>
          <RecallForm />
        </Suspense>
      </main>
    </Protected>
  );
}