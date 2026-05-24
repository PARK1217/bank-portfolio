"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { txTypeLabel } from "@/lib/labels";


interface MaskedAccount {
  masked: string;
  bank_cd?: string | null;
  bank_name?: string | null;
  holder_name?: string | null;
}

interface TransactionItem {
  tx_token: string;
  tx_at: string;
  tx_type_cd: string;
  amount: number;
  balance_after: number;
  memo: string | null;
  counterpart: MaskedAccount | null;
}

interface TransactionListResponse {
  items: TransactionItem[];
  page: number;
  size: number;
  has_next: boolean;
}

const krw = new Intl.NumberFormat("ko-KR");
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmt = (n: number) => `${krw.format(n)}원`;

function TxListContent({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [typeCd, setTypeCd] = useState<string>("");

  const qs = new URLSearchParams({ page: String(page), size: "20" });
  if (fromDate) qs.set("from_date", fromDate);
  if (toDate) qs.set("to_date", toDate);
  if (typeCd) qs.set("tx_type_cd", typeCd);

  const { data, error, loading } = useFetch<TransactionListResponse>(
    `/api/accounts/${token}/transactions?${qs.toString()}`,
  );

  useEffect(() => {
    if (error) showApiError(error, "거래 내역을 불러오지 못했습니다.");
  }, [error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3 text-xs">
        <Field label="시작일">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border bg-background px-2"
          />
        </Field>
        <Field label="종료일">
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border bg-background px-2"
          />
        </Field>
        <Field label="유형">
          <select
            value={typeCd}
            onChange={(e) => {
              setTypeCd(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border bg-background px-2"
          >
            <option value="">전체</option>
            <option value="DEPOSIT">입금</option>
            <option value="WITHDRAW">출금</option>
            <option value="INTEREST">이자</option>
            <option value="FEE">수수료</option>
          </select>
        </Field>
      </div>

      {loading && !data ? (
        <Spinner label="거래 내역 불러오는 중…" />
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          조회된 거래가 없습니다.
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-md border bg-card">
            {data.items.map((tx) => (
              <li key={tx.tx_token} className="flex items-start justify-between p-3 text-sm">
                <Link
                  href={`/transactions/${tx.tx_token}`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <div className="truncate">{tx.memo ?? txTypeLabel(tx.tx_type_cd)}</div>
                  <div className="text-xs text-muted-foreground">
                    {dtFmt.format(new Date(tx.tx_at))}
                    {tx.counterpart
                      ? ` · ${tx.counterpart.bank_name ?? ""} ${tx.counterpart.masked}`
                      : ""}
                  </div>
                </Link>
                <div className="ml-3 text-right">
                  <div
                    className={`num-tabular font-medium ${
                      tx.amount < 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {fmt(tx.amount)}
                  </div>
                  <div className="num-tabular text-xs text-muted-foreground">
                    잔액 {fmt(tx.balance_after)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← 이전
            </Button>
            <span className="text-muted-foreground">{data.page} 페이지</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.has_next}
            >
              다음 →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link
            href={`/accounts/${params.accountToken}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 계좌 상세
          </Link>
          <h1 className="mt-1 text-xl font-semibold">거래 내역</h1>
        </div>
        <TxListContent token={params.accountToken} />
      </main>
    </Protected>
  );
}