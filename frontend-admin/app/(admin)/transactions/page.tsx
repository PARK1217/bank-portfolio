"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, ArrowDownCircle, ArrowUpCircle, Hash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  type AdminTransactionItem,
  type AdminTransactionListResponse,
} from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw, fmtNumber } from "@/lib/utils";
import {
  TX_TYPE_OPTIONS,
  TX_STATUS_OPTIONS,
  txChannelLabel,
  txStatusLabel,
  txTypeLabel,
} from "@/lib/labels";


const OWN_BANK_OPTIONS = [
  { value: "", label: "전체" },
  { value: "Y", label: "당행" },
  { value: "N", label: "타행" },
];


export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [txType, setTxType] = useState("");
  const [status, setStatus] = useState("");
  const [ownBank, setOwnBank] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [data, setData] = useState<AdminTransactionListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (accountNo) params.set("account_no", accountNo);
      if (txType) params.set("tx_type_cd", txType);
      if (status) params.set("status_cd", status);
      if (ownBank) params.set("own_bank_yn", ownBank);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (amountMin) params.set("amount_min", amountMin);
      if (amountMax) params.set("amount_max", amountMax);
      params.set("limit", "200");
      const res = await api.get<AdminTransactionListResponse>(
        `/api/admin/transactions?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "거래내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void load();
  }

  const net = (data?.sum_in_krw ?? 0) - (data?.sum_out_krw ?? 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">거래내역 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          시간 역순 · 계좌·회원·일자·금액·유형·채널·상대 필터
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[240px] space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">검색어</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="계좌 / 회원 / 메모 / 상대 이름·계좌"
                  className="pl-8"
                />
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">계좌번호 (정확)</span>
              <Input
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="110-001-100001"
                className="w-44"
              />
            </label>
            <SelectField label="유형" value={txType} onChange={setTxType} options={[{ value: "", label: "전체" }, ...TX_TYPE_OPTIONS]} />
            <SelectField label="상태" value={status} onChange={setStatus} options={[{ value: "", label: "전체" }, ...TX_STATUS_OPTIONS]} />
            <SelectField label="당행/타행" value={ownBank} onChange={setOwnBank} options={OWN_BANK_OPTIONS} />
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">시작일</span>
              <Input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="20260101" maxLength={8} className="w-28" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">종료일</span>
              <Input value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="20260531" maxLength={8} className="w-28" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">금액 최소</span>
              <Input value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="0" className="w-24" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">금액 최대</span>
              <Input value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="10000000" className="w-28" />
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "검색 중…" : "검색"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard icon={Hash} label="건수" value={fmtNumber(data?.count ?? 0)} unit="건" color="text-primary" sub={data ? `전체 ${data.total}건` : null} />
        <KpiCard icon={ArrowDownCircle} label="입금 합계" value={fmtKrw(data?.sum_in_krw ?? 0)} unit="" color="text-success" />
        <KpiCard icon={ArrowUpCircle} label="출금 합계" value={fmtKrw(data?.sum_out_krw ?? 0)} unit="" color="text-destructive" />
        <KpiCard
          icon={Hash}
          label="순증감"
          value={fmtKrw(net)}
          unit=""
          color={net >= 0 ? "text-success" : "text-destructive"}
          sub="입금 − 출금"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            검색 결과
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>거래ID 클릭 → 거래 1건 상세 (메타·플래그·원거래 참조)</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : loading && !data ? (
            <Spinner label="불러오는 중…" />
          ) : !data || data.items.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>일시</TH>
                    <TH>ID</TH>
                    <TH>계좌 / 회원</TH>
                    <TH>유형</TH>
                    <TH className="text-right">금액</TH>
                    <TH className="text-right">잔액 후</TH>
                    <TH>상대</TH>
                    <TH>채널</TH>
                    <TH>상태</TH>
                    <TH>메모</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.items.map((row) => (
                    <TxRow key={row.transaction_id} row={row} />
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function TxRow({ row }: { row: AdminTransactionItem }) {
  const isOut = row.tx_amount < 0;
  return (
    <TR>
      <TD className="text-xs">{fmtDateTime(row.tx_datetime)}</TD>
      <TD>
        <Link href={`/transactions/${row.transaction_id}`} className="font-mono text-xs hover:underline">
          #{row.transaction_id}
        </Link>
      </TD>
      <TD>
        {row.account_no ? (
          <Link href={`/accounts/${encodeId(row.account_no)}`} className="font-mono text-xs hover:underline">
            {row.account_no}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
        <div className="text-[10px] text-muted-foreground">
          {row.customer_name ?? "-"} {row.customer_no ? `(#${row.customer_no})` : ""}
        </div>
      </TD>
      <TD>
        <Badge variant={isOut ? "muted" : "success"}>{txTypeLabel(row.tx_type_cd)}</Badge>
        {row.own_bank_yn === "N" ? <span className="ml-1 text-[10px] text-muted-foreground">타행</span> : null}
      </TD>
      <TD className={`num-tabular text-right font-semibold ${isOut ? "text-destructive" : "text-success"}`}>
        {row.tx_amount > 0 ? "+" : ""}
        {fmtKrw(row.tx_amount)}
      </TD>
      <TD className="num-tabular text-right text-xs text-muted-foreground">{fmtKrw(row.post_tx_balance)}</TD>
      <TD className="text-xs">
        {row.counterpart_holder_name ? (
          <>
            {row.counterpart_holder_name}
            {row.counterpart_bank_name ? (
              <div className="text-[10px] text-muted-foreground">{row.counterpart_bank_name}</div>
            ) : null}
            {row.counterpart_account_no ? (
              <div className="font-mono text-[10px] text-muted-foreground">{row.counterpart_account_no}</div>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD className="text-xs text-muted-foreground">{txChannelLabel(row.tx_channel_cd)}</TD>
      <TD>
        <StatusBadge cd={row.tx_status_cd} cancel={row.cancel_yn} />
      </TD>
      <TD className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.memo ?? ""}>
        {row.memo ?? "-"}
      </TD>
    </TR>
  );
}


function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}


function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
  color: string;
  sub?: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`num-tabular text-2xl font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
        {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}


function StatusBadge({ cd, cancel }: { cd?: string | null; cancel?: string | null }) {
  if (cancel === "Y") return <Badge variant="destructive">취소</Badge>;
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "primary" | "warning" | "destructive" | "muted"> = {
    COMPLETE: "success",
    SETTLED: "primary",
    PENDING: "warning",
    FAILED: "destructive",
    CANCELED: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{txStatusLabel(cd)}</Badge>;
}
