"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { accountTypeLabel, txTypeLabel } from "@/lib/labels";


// ---------------------------------------------------------------------------
// 응답 타입 — backend/app/schema/account.py DashboardResponse 와 동기
// ---------------------------------------------------------------------------

interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  status_cd: string;
  hidden: boolean;
  account_no: string;
  primary_yn?: string;
  last_tx_datetime?: string | null;
}

interface LoanSummaryItem {
  loan_token: string;
  principal: number;
  balance: number;
  next_payment_date: string | null;
  overdue_days: number;
}

interface MaskedAccountRef {
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
  counterpart: MaskedAccountRef | null;
}

interface DashboardData {
  customer_no: number;
  accounts: AccountSummary[];
  total_balance_krw: number;
  loans: LoanSummaryItem[];
  recent_transactions: TransactionItem[];
  unread_notifications: number;
}


// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

const krw = new Intl.NumberFormat("ko-KR");
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatKrw(n: number): string {
  return `${krw.format(n)}원`;
}


// ---------------------------------------------------------------------------
// 화면
// ---------------------------------------------------------------------------

function DashboardContent() {
  const { data, error, loading, refetch } = useFetch<DashboardData>("/api/dashboard");

  useEffect(() => {
    if (error) showApiError(error, "대시보드를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) {
    return (
      <div className="py-10">
        <Spinner label="대시보드 로딩 중…" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          데이터를 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 총자산 + 미읽음 알림 ----------------------------------------- */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">총 자산</div>
          <div className="num-tabular text-3xl font-semibold tracking-tight">
            {formatKrw(data.total_balance_krw)}
          </div>
        </div>
        {data.unread_notifications > 0 ? (
          <Link
            href="/notifications"
            className="inline-flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning hover:bg-warning/15"
          >
            <span aria-hidden>🔔</span>
            <span>읽지 않은 알림 {data.unread_notifications}건</span>
          </Link>
        ) : null}
      </section>

      {/* 계좌 카드 — 유형별 그룹 + 주거래 우선 + 최근 거래순 ---------- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">계좌</h2>
          <Link href="/accounts" className="text-xs text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        {data.accounts.length === 0 ? (
          <EmptyHint
            title="계좌가 없습니다"
            cta={{ href: "/products", label: "상품 카탈로그" }}
          />
        ) : (
          <AccountGroups accounts={data.accounts} />
        )}
      </section>

      {/* 대출 ------------------------------------------------------- */}
      {data.loans.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">대출</h2>
            <Link href="/loans" className="text-xs text-primary hover:underline">
              전체 보기
            </Link>
          </div>
          <ul className="divide-y rounded-md border bg-card">
            {data.loans.map((loan) => (
              <li
                key={loan.loan_token}
                className={`flex items-center justify-between p-3 text-sm ${
                  loan.overdue_days > 0 ? "text-destructive" : ""
                }`}
              >
                <Link
                  href={`/loans/${loan.loan_token}`}
                  className="flex-1 truncate hover:underline"
                >
                  대출 잔액 <span className="num-tabular">{formatKrw(loan.balance)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    원금 {formatKrw(loan.principal)}
                  </span>
                </Link>
                {loan.overdue_days > 0 ? (
                  <span className="text-xs">연체 {loan.overdue_days}일</span>
                ) : loan.next_payment_date ? (
                  <span className="text-xs text-muted-foreground">
                    다음 상환 {loan.next_payment_date}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 최근 거래 -------------------------------------------------- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">최근 거래</h2>
        {data.recent_transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">최근 거래가 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {data.recent_transactions.slice(0, 5).map((tx) => (
              <li key={tx.tx_token} className="flex items-start justify-between p-3 text-sm">
                <Link href={`/transactions/${tx.tx_token}`} className="min-w-0 flex-1 hover:underline">
                  <div className="truncate">{tx.memo ?? txTypeLabel(tx.tx_type_cd)}</div>
                  <div className="text-xs text-muted-foreground">
                    {dtFmt.format(new Date(tx.tx_at))}
                    {tx.counterpart ? ` · ${tx.counterpart.bank_name ?? ""} ${tx.counterpart.masked}` : ""}
                  </div>
                </Link>
                <div
                  className={`num-tabular ml-3 whitespace-nowrap font-medium ${
                    tx.amount < 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {formatKrw(tx.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// 계좌 유형 표시 순서 — 일반적인 활용도 순. 빈 그룹은 자동 생략.
const ACCOUNT_TYPE_ORDER: { code: string; label: string }[] = [
  { code: "SAVING", label: "입출금" },
  { code: "INSTALL", label: "적금" },
  { code: "DEPOSIT", label: "정기예금" },
  { code: "FOREIGN", label: "외화" },
];

function sortAccounts(accounts: AccountSummary[]): AccountSummary[] {
  // 주거래(Y) 우선 → last_tx_datetime DESC → balance DESC.
  return [...accounts].sort((a, b) => {
    const ap = a.primary_yn === "Y" ? 1 : 0;
    const bp = b.primary_yn === "Y" ? 1 : 0;
    if (ap !== bp) return bp - ap;
    const al = a.last_tx_datetime ?? "";
    const bl = b.last_tx_datetime ?? "";
    if (al !== bl) return bl.localeCompare(al);
    return b.balance - a.balance;
  });
}

function AccountGroups({ accounts }: { accounts: AccountSummary[] }) {
  // 표시 가능한 유형으로만 묶고, 정의되지 않은 유형은 마지막에 '기타'로 묶음.
  const grouped = new Map<string, AccountSummary[]>();
  for (const a of accounts) {
    const key = ACCOUNT_TYPE_ORDER.some((t) => t.code === a.account_type_cd)
      ? a.account_type_cd
      : "OTHER";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  const groups = [
    ...ACCOUNT_TYPE_ORDER.filter((t) => grouped.has(t.code)).map((t) => ({
      code: t.code,
      label: t.label,
      items: sortAccounts(grouped.get(t.code)!),
    })),
    ...(grouped.has("OTHER")
      ? [{ code: "OTHER", label: "기타", items: sortAccounts(grouped.get("OTHER")!) }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.code}>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-medium text-muted-foreground">
              {g.label} <span className="ml-1 text-[10px]">{g.items.length}</span>
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((acct) => (
              <Link
                key={acct.account_token}
                href={`/accounts/${acct.account_token}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{accountTypeLabel(acct.account_type_cd)}</span>
                      <div className="flex items-center gap-1.5">
                        {acct.primary_yn === "Y" ? (
                          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                            주거래
                          </span>
                        ) : null}
                        {acct.currency !== "KRW" ? (
                          <span className="rounded bg-accent px-1.5 py-0.5">{acct.currency}</span>
                        ) : null}
                      </div>
                    </div>
                    <CardTitle className="text-base">{acct.alias ?? acct.account_no}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0">
                    <div className="font-mono text-xs text-muted-foreground">{acct.account_no}</div>
                    <div className="num-tabular text-xl font-semibold">{formatKrw(acct.balance)}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


function EmptyHint({
  title,
  cta,
}: {
  title: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm">
      <p className="text-muted-foreground">{title}</p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          {cta.label} →
        </Link>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-4xl py-8 animate-fade-in">
        <DashboardContent />
      </main>
    </Protected>
  );
}