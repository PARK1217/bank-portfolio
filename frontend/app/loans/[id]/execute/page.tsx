"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { accountTypeLabel } from "@/lib/labels";


/**
 * SCR-LN-007 대출 실행 ⭐.
 *
 * 어필 포인트: **Idempotency-Key 멱등성**.
 *   - 같은 키 재호출 → 같은 응답 + `idempotent_replay: true` (중복 실행 차단)
 *   - lib/api 가 자동으로 UUID v4 Idempotency-Key 부착 (`idempotent: true`)
 *   - 응답 idempotent_replay 가 true 면 사용자에게 "이미 처리됨" 안내
 */

interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  hidden: boolean;
  account_no: string;
  status_cd: string;
}
interface AccountListData {
  accounts: AccountSummary[];
  total_balance_krw: number;
}

interface LoanDetailData {
  loan_token: string;
  loan_contract_no_masked: string;
  product_name: string;
  principal_krw: number;
  balance_krw: number;
  rate_applied: number;
  period_months: number;
  next_payment_date: string | null;
  monthly_payment_krw: number;
  overdue_days: number;
  // 이미 실행됐는지 — exec_histories 비어있지 않으면 재실행 불가
  exec_histories: { exec_seq: number }[];
}

interface ExecuteResponse {
  exec_seq: number;
  tx_token: string;
  executed_at: string;
  principal_krw: number;
  idempotent_replay: boolean;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function ExecuteContent({ loanToken }: { loanToken: string }) {
  const router = useRouter();
  const { data: loanData, error: loanError, loading: loanLoading } = useFetch<LoanDetailData>(
    `/api/loans/${loanToken}`,
  );
  const { data: accountsData, loading: accountsLoading } = useFetch<AccountListData>("/api/accounts");

  const krwAccounts = useMemo(
    () => (accountsData?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [accountsData],
  );

  const [depositToken, setDepositToken] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loanError) showApiError(loanError, "대출 정보를 불러오지 못했습니다.");
  }, [loanError]);

  useEffect(() => {
    if (krwAccounts.length && !depositToken) setDepositToken(krwAccounts[0].account_token);
  }, [krwAccounts, depositToken]);

  const alreadyExecuted = !!loanData && loanData.exec_histories.length > 0;
  const canSubmit = !submitting && !alreadyExecuted && depositToken && password.length >= 4;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<ExecuteResponse>(
        `/api/loans/${loanToken}/execute`,
        { deposit_account_token: depositToken, password },
        { idempotent: true },
      );
      if (res.idempotent_replay) {
        toast.info("이미 실행된 요청입니다. 기존 결과를 표시합니다.", {
          description: "Idempotency-Key 멱등성 보장",
        });
      } else {
        toast.success(`${fmt(res.principal_krw)} 입금 완료`);
      }
      router.push(`/loans/${loanToken}`);
    } catch (err) {
      showApiError(err, "대출 실행에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if ((loanLoading && !loanData) || (accountsLoading && !accountsData)) {
    return <Spinner label="실행 정보 불러오는 중…" />;
  }
  if (!loanData) return null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="mt-1">대출 실행</CardTitle>
          <CardDescription>
            약정된 대출 자금을 지정 계좌로 입금합니다. <strong className="text-foreground">멱등성</strong>으로 중복 실행이 차단됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y rounded-md border bg-card text-sm">
            <Row k="상품" v={loanData.product_name} />
            <Row k="계약번호" v={loanData.loan_contract_no_masked} muted />
            <Row k="원금" v={fmt(loanData.principal_krw)} highlight />
            <Row k="적용 금리" v={`${loanData.rate_applied.toFixed(2)}%`} />
            <Row k="기간" v={`${loanData.period_months}개월`} />
            <Row k="월 상환액" v={fmt(loanData.monthly_payment_krw)} />
          </dl>
        </CardContent>
      </Card>

      {alreadyExecuted ? (
        <div className="rounded-md bg-success/10 p-3 text-sm">
          <p className="font-medium text-success">이미 실행된 대출입니다.</p>
          <p className="text-xs text-muted-foreground">
            대출 상세에서 상환 스케줄을 확인하세요.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">입금 받을 계좌 및 본인 확인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  입금 계좌 <span className="text-destructive">*</span>
                </span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={depositToken}
                  onChange={(e) => setDepositToken(e.target.value)}
                  required
                >
                  {krwAccounts.map((a) => (
                    <option key={a.account_token} value={a.account_token}>
                      {(a.alias ?? accountTypeLabel(a.account_type_cd)) + " · " + a.account_no}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  비밀번호 / OTP <span className="text-destructive">*</span>
                </span>
                <Input
                  type="password"
                  autoComplete="one-time-code"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? "실행 중…" : `${fmt(loanData.principal_krw)} 실행하기`}
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 같은 요청을 두 번 보내도 1건만 처리됩니다 (Idempotency-Key).
              </p>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

function Row({
  k,
  v,
  highlight,
  muted,
}: {
  k: string;
  v: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between p-3">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={`num-tabular ${
          highlight ? "text-base font-semibold" : muted ? "text-xs text-muted-foreground" : ""
        }`}
      >
        {v}
      </span>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <ExecuteContent loanToken={params.id} />
      </main>
    </Protected>
  );
}