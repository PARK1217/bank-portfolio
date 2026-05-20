"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  status_cd: string;
  hidden: boolean;
  masked_account_no: string;
}

interface AccountListData {
  accounts: AccountSummary[];
  total_balance_krw: number;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;

function AccountsContent() {
  const { data, error, loading, refetch } = useFetch<AccountListData>("/api/accounts");

  useEffect(() => {
    if (error) showApiError(error, "계좌 목록을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="계좌 불러오는 중…" />;
  if (!data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">계좌 정보를 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs text-primary hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const visible = data.accounts.filter((a) => !a.hidden);
  const hidden = data.accounts.filter((a) => a.hidden);

  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs text-muted-foreground">총 자산</div>
        <div className="num-tabular text-3xl font-semibold">{fmt(data.total_balance_krw)}</div>
      </section>

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm">
          <p className="text-muted-foreground">계좌가 없습니다.</p>
          <Link href="/products" className="mt-2 inline-block text-xs text-primary hover:underline">
            상품 카탈로그 →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((acct) => (
            <Link key={acct.account_token} href={`/accounts/${acct.account_token}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{acct.account_type_cd}</span>
                    {acct.currency !== "KRW" ? (
                      <span className="rounded bg-accent px-1.5 py-0.5">{acct.currency}</span>
                    ) : null}
                  </div>
                  <CardTitle className="text-base">
                    {acct.alias ?? acct.masked_account_no}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="font-mono text-xs text-muted-foreground">
                    {acct.masked_account_no}
                  </div>
                  <div className="num-tabular text-xl font-semibold">{fmt(acct.balance)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {hidden.length > 0 ? (
        <details className="rounded-md border bg-card p-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            숨김 계좌 {hidden.length}개
          </summary>
          <ul className="mt-2 space-y-1">
            {hidden.map((a) => (
              <li key={a.account_token}>
                <Link href={`/accounts/${a.account_token}`} className="text-muted-foreground hover:text-foreground">
                  {a.alias ?? a.masked_account_no}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-4xl py-8 animate-fade-in">
        <AccountsContent />
      </main>
    </Protected>
  );
}