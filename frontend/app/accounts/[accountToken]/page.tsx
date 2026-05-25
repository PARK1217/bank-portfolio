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
import { accountTypeLabel, txTypeLabel } from "@/lib/labels";


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

function formatBalance(n: number, currency: string): string {
  if (!currency || currency === "KRW") return fmt(n);
  return `${currency} ${n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_META: Record<string, { label: string; tone: string }> = {
  NORMAL: { label: "정상", tone: "bg-success/15 text-success" },
  ACTIVE: { label: "정상", tone: "bg-success/15 text-success" },
  SUSPENDED: { label: "거래 정지", tone: "bg-warning/15 text-warning" },
  DORMANT: { label: "휴면", tone: "bg-warning/15 text-warning" },
  RESTRICTED: { label: "출금 제한", tone: "bg-warning/15 text-warning" },
  CLOSED: { label: "해지", tone: "bg-muted text-muted-foreground" },
  LOST: { label: "분실 신고", tone: "bg-destructive/15 text-destructive" },
};

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

  const status = STATUS_META[account.status_cd] ?? null;
  const isForeign = account.currency && account.currency !== "KRW";
  const closed = account.status_cd === "CLOSED";

  return (
    <div className="space-y-6">
      <section>
        <Link href="/accounts" className="text-xs text-muted-foreground hover:text-foreground">
          ← 계좌 목록
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{accountTypeLabel(account.account_type_cd)}</span>
          {isForeign ? (
            <span className="rounded bg-accent px-1.5 py-0.5">{account.currency}</span>
          ) : null}
          {status ? (
            <span className={cn("rounded-md px-1.5 py-0.5 font-medium", status.tone)}>
              {status.label}
            </span>
          ) : null}
        </div>
        <h1 className="text-xl font-semibold">{account.alias ?? account.account_no}</h1>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{account.account_no}</div>
        <div className="num-tabular mt-3 text-3xl font-semibold">
          {formatBalance(account.balance, account.currency)}
        </div>
        {isForeign ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            외화 잔액은 총 자산 합산에서 제외됩니다.
          </p>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/transfer?from=${token}&from_no=${encodeURIComponent(account.account_no)}`}
          className={cn(buttonVariants(), "flex-1 min-w-[120px]", closed ? "pointer-events-none opacity-40" : "")}
          aria-disabled={closed}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">계좌 관리</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-1.5 pt-0 sm:grid-cols-3">
          <ManageLink href={`/accounts/${token}/edit`} label="별명 변경" />
          <ManageLink href={`/accounts/${token}/limit`} label="이체 한도" />
          <ManageLink href={`/accounts/${token}/hide`} label={account.hidden ? "숨김 해제" : "숨기기"} />
          <ManageLink href={`/accounts/${token}/lost`} label="분실 신고" tone="warn" />
          <ManageLink href={`/accounts/${token}/close`} label="계좌 해지" tone="destructive" disabled={closed} />
        </CardContent>
      </Card>

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
                  <div className="truncate">{tx.memo ?? txTypeLabel(tx.tx_type_cd)}</div>
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

function ManageLink({
  href,
  label,
  tone,
  disabled,
}: {
  href: string;
  label: string;
  tone?: "warn" | "destructive";
  disabled?: boolean;
}) {
  const base =
    "rounded-md border border-input bg-background px-2 py-1.5 text-center text-xs transition-colors hover:bg-accent";
  const toneCls =
    tone === "destructive"
      ? "text-destructive hover:bg-destructive/10"
      : tone === "warn"
        ? "text-warning hover:bg-warning/10"
        : "";
  if (disabled) {
    return (
      <span
        aria-disabled
        className={cn(base, toneCls, "pointer-events-none opacity-40")}
      >
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(base, toneCls)}>
      {label}
    </Link>
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