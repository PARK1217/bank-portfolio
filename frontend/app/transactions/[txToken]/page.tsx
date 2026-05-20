"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


interface MaskedAccount {
  masked: string;
  bank_cd?: string | null;
  bank_name?: string | null;
  holder_name?: string | null;
}

interface TransferInfoEmbed {
  transfer_id_masked: string;
  settlement_type: string;
  settlement_status: string;
  settlement_requested_at: string | null;
  settlement_completed_at: string | null;
  cancel_yn: boolean;
}

interface TransactionDetail {
  tx_token: string;
  tx_at: string;
  tx_type_cd: string;
  amount: number;
  balance_after: number;
  memo: string | null;
  counterpart: MaskedAccount | null;
  transfer_info: TransferInfoEmbed | null;
}


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

const SETTLEMENT_TYPE_LABEL: Record<string, string> = {
  INTRA_BANK: "당행 이체",
  KFTC_SMALL: "타행 소액 (금융결제원)",
  BOK_LARGE: "거액 (한국은행 BOK-Wire+)",
};

const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "요청됨",
  PENDING: "정산 대기",
  SETTLED: "정산 완료",
  FAILED: "실패",
  REVERSED: "역분개 (자금 복원)",
};

function TxDetailContent({ token }: { token: string }) {
  const { data, error, loading } = useFetch<TransactionDetail>(`/api/transactions/${token}`);

  useEffect(() => {
    if (error) showApiError(error, "거래를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="거래 불러오는 중…" />;
  if (error?.httpStatus === 404) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">해당 거래를 찾을 수 없습니다.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-xs text-primary hover:underline">
          대시보드로 →
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const isWithdraw = data.amount < 0;

  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs text-muted-foreground">{data.tx_type_cd}</div>
        <div
          className={`num-tabular text-3xl font-semibold ${
            isWithdraw ? "text-destructive" : "text-success"
          }`}
        >
          {data.amount >= 0 ? "+" : ""}
          {fmt(data.amount)}
        </div>
        <div className="num-tabular mt-1 text-xs text-muted-foreground">
          거래 후 잔액 {fmt(data.balance_after)}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">거래 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row k="거래 일시" v={dtFmt.format(new Date(data.tx_at))} />
          {data.memo ? <Row k="메모" v={data.memo} /> : null}
          {data.counterpart ? (
            <>
              <Row
                k="상대 계좌"
                v={`${data.counterpart.bank_name ?? data.counterpart.bank_cd ?? ""} ${data.counterpart.masked}`.trim()}
              />
              {data.counterpart.holder_name ? (
                <Row k="예금주" v={data.counterpart.holder_name} />
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {data.transfer_info ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">정산 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row
              k="결제 채널"
              v={SETTLEMENT_TYPE_LABEL[data.transfer_info.settlement_type] ?? data.transfer_info.settlement_type}
            />
            <Row
              k="정산 상태"
              v={SETTLEMENT_STATUS_LABEL[data.transfer_info.settlement_status] ?? data.transfer_info.settlement_status}
            />
            {data.transfer_info.settlement_requested_at ? (
              <Row
                k="요청 일시"
                v={dtFmt.format(new Date(data.transfer_info.settlement_requested_at))}
              />
            ) : null}
            {data.transfer_info.settlement_completed_at ? (
              <Row
                k="완료 일시"
                v={dtFmt.format(new Date(data.transfer_info.settlement_completed_at))}
              />
            ) : null}
            {data.transfer_info.cancel_yn ? (
              <Row k="취소" v="취소된 거래" />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="num-tabular text-right">{v}</span>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ txToken: string }>();
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            ← 대시보드
          </Link>
          <h1 className="mt-1 text-xl font-semibold">거래 상세</h1>
        </div>
        <TxDetailContent token={params.txToken} />
      </main>
    </Protected>
  );
}