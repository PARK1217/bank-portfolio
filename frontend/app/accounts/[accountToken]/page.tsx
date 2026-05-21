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


interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  status_cd: string;
  hidden: boolean;
  account_no: string;
}

interface DepositContractInfo {
  product_id: number;
  product_name: string;
  base_rate: number;
  period_months: number | null;
  maturity_date: string | null;
}

interface TransactionItem {
  tx_token: string;
  tx_at: string;
  tx_type_cd: string;
  amount: number;
  balance_after: number;
  memo: string | null;
}

interface AccountDetail {
  account: AccountSummary;
  deposit_contract: DepositContractInfo | null;
  daily_limit_krw: number | null;
  once_limit_krw: number | null;
  recent_transactions: TransactionItem[];
}

const krw = new Intl.NumberFormat("ko-KR");
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmt = (n: number) => `${krw.format(n)}원`;

function AccountDetailContent({ token }: { token: string }) {
  const { data, error, loading } = useFetch<AccountDetail>(`/api/accounts/${token}`);

  useEffect(() => {
    if (error) showApiError(error, "계좌 정보를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="계좌 정보 불러오는 중…" />;
  if (error?.httpStatus === 404) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">해당 계좌를 찾을 수 없습니다.</p>
        <Link href="/accounts" className="mt-2 inline-block text-xs text-primary hover:underline">
          계좌 목록으로 →
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { account, deposit_contract, daily_limit_krw, once_limit_krw, recent_transactions } = data;

  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs text-muted-foreground">{account.account_type_cd}</div>
        <h1 className="text-xl font-semibold">{account.alias ?? account.account_no}</h1>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{account.account_no}</div>
        <div className="num-tabular mt-3 text-3xl font-semibold">{fmt(account.balance)}</div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/transfer?from=${token}&from_no=${encodeURIComponent(account.account_no)}`}
          className={cn(buttonVariants(), "flex-1 min-w-[120px]")}
        >
          이체
        </Link>
        <Link
          href={`/accounts/${token}/transactions`}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1 min-w-[120px]")}
        >
          거래 내역
        </Link>
        <Link
          href={`/accounts/${token}/passbook`}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1 min-w-[120px]")}
        >
          통장 보기
        </Link>
      </section>

      {deposit_contract ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상품 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row k="상품명" v={deposit_contract.product_name} />
            <Row k="기본 금리" v={`${deposit_contract.base_rate.toFixed(2)}%`} />
            {deposit_contract.period_months ? (
              <Row k="가입 기간" v={`${deposit_contract.period_months}개월`} />
            ) : null}
            {deposit_contract.maturity_date ? (
              <Row k="만기일" v={deposit_contract.maturity_date} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {daily_limit_krw != null || once_limit_krw != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이체 한도</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {daily_limit_krw != null ? <Row k="1일 한도" v={fmt(daily_limit_krw)} /> : null}
            {once_limit_krw != null ? <Row k="1회 한도" v={fmt(once_limit_krw)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">최근 거래</h2>
          <Link
            href={`/accounts/${token}/transactions`}
            className="text-xs text-primary hover:underline"
          >
            전체 보기
          </Link>
        </div>
        {recent_transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">최근 거래가 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {recent_transactions.map((tx) => (
              <li key={tx.tx_token} className="flex items-start justify-between p-3 text-sm">
                <Link href={`/transactions/${tx.tx_token}`} className="min-w-0 flex-1 hover:underline">
                  <div className="truncate">{tx.memo ?? tx.tx_type_cd}</div>
                  <div className="text-xs text-muted-foreground">
                    {dtFmt.format(new Date(tx.tx_at))}
                  </div>
                </Link>
                <div
                  className={`num-tabular ml-3 whitespace-nowrap font-medium ${
                    tx.amount < 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="num-tabular">{v}</span>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <AccountDetailContent token={params.accountToken} />
      </main>
    </Protected>
  );
}