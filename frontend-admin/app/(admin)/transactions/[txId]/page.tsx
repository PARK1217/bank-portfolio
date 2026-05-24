"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, type AdminTransactionDetail } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtTxType } from "@/lib/utils";


export default function TransactionDetailPage() {
  const params = useParams<{ txId: string }>();
  const router = useRouter();
  const txId = Number(params.txId);

  const [data, setData] = useState<AdminTransactionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txId) return;
    (async () => {
      try {
        const res = await api.get<AdminTransactionDetail>(`/api/admin/transactions/${txId}`);
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "거래 상세를 불러오지 못했습니다.");
      }
    })();
  }, [txId]);

  if (!txId) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        뒤로
      </button>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!data && !error ? <Spinner label="불러오는 중…" /> : null}

      {data ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight font-mono">
                #{data.transaction.transaction_id}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmtTxType(data.transaction.tx_type_cd)} · {fmtDateTime(data.transaction.tx_datetime)}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={data.transaction.cancel_yn === "Y" ? "destructive" : "success"}>
                {data.transaction.cancel_yn === "Y" ? "취소" : data.transaction.tx_status_cd ?? "-"}
              </Badge>
              {data.transaction.own_bank_yn === "N" ? <Badge variant="warning">타행</Badge> : null}
            </div>
          </div>

          {/* 금액 + 잔액 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">금액</div>
                <div
                  className={`mt-1 num-tabular text-2xl font-semibold ${
                    data.transaction.tx_amount < 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {data.transaction.tx_amount > 0 ? "+" : ""}
                  {fmtKrw(data.transaction.tx_amount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">거래 후 잔액</div>
                <div className="mt-1 num-tabular text-2xl font-semibold">
                  {fmtKrw(data.transaction.post_tx_balance)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">계좌</div>
                <div className="mt-1">
                  {data.transaction.account_no ? (
                    <Link
                      href={`/accounts/${encodeId(data.transaction.account_no)}`}
                      className="font-mono text-sm hover:underline"
                    >
                      {data.transaction.account_no}
                    </Link>
                  ) : "-"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {data.owner.account_type_cd ?? "-"} · {data.owner.account_status_cd ?? "-"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 거래 메타 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">거래 메타</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="유형" value={fmtTxType(data.transaction.tx_type_cd)} />
                <Pair label="채널" value={data.transaction.tx_channel_cd ?? "-"} />
                <Pair label="상태" value={data.transaction.tx_status_cd ?? "-"} />
                <Pair label="실패 사유" value={data.transaction.failure_reason_cd ?? "-"} />
                <Pair label="당행/타행" value={data.transaction.own_bank_yn === "Y" ? "당행" : data.transaction.own_bank_yn === "N" ? "타행" : "-"} />
                <Pair label="취소 여부" value={data.transaction.cancel_yn ?? "-"} />
                <Pair label="원거래 참조" value={data.transaction.original_tx_ref != null ? <Link href={`/transactions/${data.transaction.original_tx_ref}`} className="hover:underline">#{data.transaction.original_tx_ref}</Link> : "-"} />
                <Pair label="이체 ID" value={data.transaction.transfer_id ?? "-"} />
                <Pair label="대출 실행 SEQ" value={data.transaction.exec_seq_ref ?? "-"} />
                <Pair label="대출 상환 SEQ" value={data.transaction.repay_seq_ref ?? "-"} />
                <Pair label="멱등키" value={<span className="font-mono text-[10px]">{data.transaction.idempotency_key ?? "-"}</span>} />
                <Pair label="DB 적재일시" value={fmtDateTime(data.transaction.created_at)} />
              </dl>
            </CardContent>
          </Card>

          {/* 상대 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">상대</CardTitle>
              <CardDescription>이체 거래만 유효</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="상대 계좌" value={data.transaction.counterpart_account_no ?? "-"} />
                <Pair label="상대 은행" value={`${data.transaction.counterpart_bank_name ?? "-"}${data.transaction.counterpart_bank_cd ? ` (${data.transaction.counterpart_bank_cd})` : ""}`} />
                <Pair label="상대 예금주" value={data.transaction.counterpart_holder_name ?? "-"} />
                <Pair label="메모" value={data.transaction.memo ?? "-"} />
              </dl>
            </CardContent>
          </Card>

          {/* 보유 회원 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">계좌 소유 회원</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair
                  label="회원"
                  value={
                    data.owner.customer_no != null ? (
                      <Link href={`/customers/${encodeId(data.owner.customer_no)}`} className="hover:underline">
                        {data.owner.customer_name ?? "-"} (#{data.owner.customer_no})
                      </Link>
                    ) : "-"
                  }
                />
                <Pair label="이메일" value={data.owner.customer_email ?? "-"} />
                <Pair label="계좌 유형" value={data.owner.account_type_cd ?? "-"} />
                <Pair label="계좌 상태" value={data.owner.account_status_cd ?? "-"} />
              </dl>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}


function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num-tabular text-sm font-medium">{value}</div>
    </div>
  );
}
