"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { buttonVariants } from "@/components/ui/button";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


interface MaskedAccount {
  masked: string;
  bank_cd?: string | null;
  bank_name?: string | null;
  holder_name?: string | null;
}

interface TransferDetailData {
  tx_token: string;
  from_account: MaskedAccount;
  to_account: MaskedAccount;
  amount_krw: number;
  fee: number;
  memo: string | null;
  settlement_type: string;
  settlement_status: string;
  requested_at: string;
  completed_at: string | null;
  counterpart_approval_no: string | null;
}

const SETTLEMENT_TYPE_LABEL: Record<string, string> = {
  INTRA_BANK: "당행 이체",
  KFTC_SMALL: "타행 소액 (금융결제원)",
  BOK_LARGE: "거액 (한국은행 BOK-Wire+)",
};

const SETTLEMENT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: "요청됨", color: "text-muted-foreground" },
  PENDING: { label: "정산 대기", color: "text-warning" },
  SETTLED: { label: "정산 완료", color: "text-success" },
  FAILED: { label: "실패", color: "text-destructive" },
  REVERSED: { label: "역분개 (자금 복원)", color: "text-destructive" },
};

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});


function CompleteContent({ txToken }: { txToken: string }) {
  const { data, error, loading } = useFetch<TransferDetailData>(`/api/transfer/${txToken}`);

  useEffect(() => {
    if (error) showApiError(error, "이체 결과를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="결과 불러오는 중…" />;
  if (!data) return null;

  const status = SETTLEMENT_STATUS_LABEL[data.settlement_status] ?? {
    label: data.settlement_status,
    color: "text-muted-foreground",
  };
  const isSuccess = data.settlement_status === "SETTLED";
  const isPending = data.settlement_status === "PENDING" || data.settlement_status === "REQUESTED";

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-TR-003</div>
        <CardTitle className="mt-1 flex items-center gap-2">
          {isSuccess ? "✓ 이체 완료" : isPending ? "⏳ 이체 처리 중" : "이체 결과"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="text-center">
          <div className="num-tabular text-3xl font-bold">{fmt(data.amount_krw)}</div>
          <div className={`mt-1 text-sm font-medium ${status.color}`}>{status.label}</div>
        </section>

        <dl className="divide-y rounded-md border bg-card text-sm">
          <Row k="출금" v={`${data.from_account.bank_name ?? ""} ${data.from_account.masked}`.trim()} />
          <Row
            k="입금"
            v={`${data.to_account.bank_name ?? ""} ${data.to_account.masked}`.trim()}
          />
          {data.to_account.holder_name ? <Row k="예금주" v={data.to_account.holder_name} /> : null}
          {data.fee > 0 ? <Row k="수수료" v={fmt(data.fee)} /> : null}
          {data.memo ? <Row k="메모" v={data.memo} /> : null}
          <Row
            k="결제 채널"
            v={SETTLEMENT_TYPE_LABEL[data.settlement_type] ?? data.settlement_type}
          />
          <Row k="요청 일시" v={dtFmt.format(new Date(data.requested_at))} />
          {data.completed_at ? (
            <Row k="완료 일시" v={dtFmt.format(new Date(data.completed_at))} />
          ) : null}
          {data.counterpart_approval_no ? (
            <Row k="승인번호" v={data.counterpart_approval_no} muted />
          ) : null}
        </dl>

        {isPending ? (
          <p className="rounded-md bg-warning/10 p-3 text-xs text-warning">
            타행 이체는 결제망 정산 완료 후 입금이 반영됩니다. 잠시 후 거래 상세에서 상태 확인 가능합니다.
          </p>
        ) : null}

        <div className="flex gap-2">
          <Link href="/transfer" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
            다시 이체
          </Link>
          <Link href="/dashboard" className={cn(buttonVariants(), "flex-1")}>
            대시보드
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3 p-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={`num-tabular text-right ${muted ? "text-xs text-muted-foreground" : ""}`}>{v}</span>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ txToken: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <CompleteContent txToken={params.txToken} />
      </main>
    </Protected>
  );
}