"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiError, type AutoTransferDetail, type AutoTransferExecRow } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw } from "@/lib/utils";
import {
  autoDelayReasonLabel,
  autoExecStatusLabel,
  autoTransferStatusLabel,
  cycleTypeLabel,
  regChannelLabel,
} from "@/lib/labels";


export default function AutoTransferDetailPage() {
  const params = useParams<{ autoId: string }>();
  const router = useRouter();
  const autoId = Number(params.autoId);

  const [data, setData] = useState<AutoTransferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoId) return;
    (async () => {
      try {
        const res = await api.get<AutoTransferDetail>(`/api/admin/auto-transfers/${autoId}`);
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "자동이체 상세를 불러오지 못했습니다.");
      }
    })();
  }, [autoId]);

  if (!autoId) return null;

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
                자동이체 #{data.auto_transfer.auto_transfer_id}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.auto_transfer.customer_name ?? "-"}{" "}
                {data.auto_transfer.customer_no != null ? (
                  <Link
                    href={`/customers/${encodeId(data.auto_transfer.customer_no)}`}
                    className="hover:underline"
                  >
                    (#{data.auto_transfer.customer_no})
                  </Link>
                ) : null}
              </p>
            </div>
            <Badge
              variant={
                data.auto_transfer.auto_status_cd === "ACTIVE"
                  ? "success"
                  : data.auto_transfer.auto_status_cd === "CANCEL"
                    ? "destructive"
                    : "muted"
              }
            >
              {autoTransferStatusLabel(data.auto_transfer.auto_status_cd)}
            </Badge>
          </div>

          {/* 등록 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">등록 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="출금 계좌" value={
                  data.auto_transfer.withdraw_account_no ? (
                    <Link href={`/accounts/${encodeId(data.auto_transfer.withdraw_account_no)}`} className="font-mono hover:underline">
                      {data.auto_transfer.withdraw_account_no}
                    </Link>
                  ) : "-"
                } />
                <Pair label="입금 계좌" value={<span className="font-mono">{data.auto_transfer.deposit_account_no ?? "-"}</span>} />
                <Pair label="입금 은행" value={`${data.auto_transfer.deposit_bank_name ?? "-"}${data.auto_transfer.deposit_bank_cd ? ` (${data.auto_transfer.deposit_bank_cd})` : ""}`} />
                <Pair label="받는 분" value={data.auto_transfer.deposit_holder_name ?? "-"} />
                <Pair label="금액" value={fmtKrw(data.auto_transfer.transfer_amount)} />
                <Pair label="주기" value={cycleTypeLabel(data.auto_transfer.cycle_type_cd)} />
                <Pair
                  label="실행일"
                  value={
                    data.auto_transfer.cycle_type_cd === "MONTHLY" && data.auto_transfer.monthly_exec_day != null
                      ? `매월 ${data.auto_transfer.monthly_exec_day}일`
                      : data.auto_transfer.valid_start_date
                        ? `1회 ${fmtDateTime(data.auto_transfer.valid_start_date)}`
                        : "-"
                  }
                />
                <Pair label="유효 시작" value={fmtDateTime(data.auto_transfer.valid_start_date)} />
                <Pair label="유효 종료" value={fmtDateTime(data.auto_transfer.valid_end_date)} />
                <Pair label="등록 채널" value={regChannelLabel(data.auto_transfer.reg_channel_cd)} />
                <Pair label="최대 재시도" value={data.auto_transfer.max_retry_count ?? "-"} />
                <Pair label="다음 달 이월" value={data.auto_transfer.carry_next_month_yn === "Y" ? "예" : "아니오"} />
                <Pair label="출금 메모" value={data.auto_transfer.withdraw_memo ?? "-"} />
                <Pair label="입금 메모" value={data.auto_transfer.deposit_memo ?? "-"} />
                <Pair label="등록일" value={fmtDateTime(data.auto_transfer.created_at)} />
              </dl>
            </CardContent>
          </Card>

          {/* 실행 이력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">실행 이력</CardTitle>
              <CardDescription>{data.executions.length}건 — 예정일 역순</CardDescription>
            </CardHeader>
            <CardContent>
              {data.executions.length === 0 ? (
                <p className="text-xs text-muted-foreground">실행된 이력이 없습니다.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>예정일</TH>
                      <TH>영업일 조정</TH>
                      <TH>실행일시</TH>
                      <TH>상태</TH>
                      <TH>사유</TH>
                      <TH>이체 ID</TH>
                      <TH>거래 ID</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.executions.map((e, i) => (
                      <ExecRow key={`${e.scheduled_date}-${i}`} e={e} />
                    ))}
                  </TBody>
                </Table>
              )}
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


function ExecRow({ e }: { e: AutoTransferExecRow }) {
  return (
    <TR>
      <TD className="text-xs">{fmtDateTime(e.scheduled_date)}</TD>
      <TD className="text-xs text-muted-foreground">{fmtDateTime(e.biz_day_adjusted)}</TD>
      <TD className="text-xs">{fmtDateTime(e.exec_datetime)}</TD>
      <TD>
        <ExecStatusBadge cd={e.exec_status_cd} />
      </TD>
      <TD className="text-xs">
        {e.delay_reason_cd ? (
          <span className="text-destructive">{autoDelayReasonLabel(e.delay_reason_cd)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD className="text-xs font-mono text-muted-foreground">{e.transfer_id ?? "-"}</TD>
      <TD className="text-xs font-mono text-muted-foreground">
        {e.transaction_id ? (
          <Link href={`/transactions/${e.transaction_id}`} className="hover:underline">
            #{e.transaction_id}
          </Link>
        ) : "-"}
      </TD>
    </TR>
  );
}


function ExecStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "warning" | "destructive" | "muted"> = {
    SUCCESS: "success",
    FAIL: "destructive",
    DELAY: "warning",
    PENDING: "muted",
  };
  return <Badge variant={map[cd] ?? "muted"}>{autoExecStatusLabel(cd)}</Badge>;
}
