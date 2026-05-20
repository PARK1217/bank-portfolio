"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-LN-010 중도상환 / 조건 변경 (Later). */

interface LoanDetailData {
  loan_token: string;
  product_name: string;
  principal_krw: number;
  balance_krw: number;
  rate_applied: number;
  period_months: number;
  monthly_payment_krw: number;
  contract_start_date: string | null;
}

interface PrepayResponse {
  repay_seq: number;
  prepay_amount_krw: number;
  fee_krw: number;
  new_balance_krw: number;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;

const PREPAY_FEE_RATE = 0.005; // 3년 이내 0.5%


function PrepayForm({ loanToken }: { loanToken: string }) {
  const router = useRouter();
  const { data, loading, refetch } = useFetch<LoanDetailData>(`/api/loans/${loanToken}`);
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [applyFee, setApplyFee] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const amountN = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const balanceN = data?.balance_krw ?? 0;
  const overBalance = amountN > balanceN;
  const feeN = applyFee ? Math.round(amountN * PREPAY_FEE_RATE) : 0;

  // 3년 경과 시 면제 추정 (계약 시작일 기준)
  const within3y = useMemo(() => {
    if (!data?.contract_start_date) return true;
    const start = new Date(data.contract_start_date).getTime();
    const elapsedYears = (Date.now() - start) / (365 * 24 * 60 * 60 * 1000);
    return elapsedYears < 3;
  }, [data]);

  useEffect(() => {
    setApplyFee(within3y);
  }, [within3y]);

  const canSubmit = !submitting && amountN > 0 && !overBalance && /^\d{4}$/.test(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<PrepayResponse>(
        `/api/loans/${loanToken}/prepay`,
        {
          amount_krw: amountN,
          apply_fee: applyFee,
          password,
        },
        { idempotent: true },
      );
      void refetch();
      router.push(`/loans/${loanToken}`);
    } catch (err) {
      showApiError(err, "중도상환에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <Spinner label="대출 정보 불러오는 중…" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-LN-010</div>
        <CardTitle className="mt-1">중도상환</CardTitle>
        <CardDescription>
          잔여 원금의 일부 또는 전부를 미리 상환합니다. 약정 후 3년 이내엔 수수료가 부과됩니다 (잔존원금의 0.5%).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="mb-4 divide-y rounded-md border bg-card text-sm">
          <Row k="상품" v={data.product_name} />
          <Row k="잔여 원금" v={fmt(data.balance_krw)} highlight />
          <Row k="적용 금리" v={`${data.rate_applied.toFixed(2)}%`} />
          <Row k="월 상환액" v={fmt(data.monthly_payment_krw)} />
        </dl>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">상환 금액 (원) *</span>
            <Input
              inputMode="numeric"
              value={amount && amountN > 0 ? krw.format(amountN) : amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[1, 5, 10, 50, 100].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAmount(String(m * 10000))}
                  className="rounded border bg-background px-2 py-0.5 text-[10px] hover:bg-accent"
                >
                  +{m}만원
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(balanceN))}
                className="rounded border bg-background px-2 py-0.5 text-[10px] hover:bg-accent"
              >
                전액
              </button>
            </div>
            {overBalance ? (
              <p className="mt-1 text-xs text-destructive">잔여 원금을 초과합니다.</p>
            ) : null}
          </label>

          <div className="rounded-md bg-muted/30 p-3 text-sm">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={applyFee}
                onChange={(e) => setApplyFee(e.target.checked)}
                disabled={!within3y}
              />
              <div className="text-xs">
                <span className="font-medium">중도상환 수수료 적용</span>
                <span className="ml-1 text-muted-foreground">
                  ({within3y ? "약정 3년 이내 — 필수" : "3년 경과 — 면제 가능"})
                </span>
                <div className="num-tabular mt-1 text-foreground">
                  수수료 {fmt(feeN)} ({(PREPAY_FEE_RATE * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">비밀번호 (4자리) *</span>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </label>

          <div className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
            상환 후 예상 잔여 원금 <span className="num-tabular font-medium text-foreground">{fmt(balanceN - amountN)}</span>
            {feeN > 0 ? <span> + 수수료 {fmt(feeN)}</span> : null}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "처리 중…" : `${amountN > 0 ? fmt(amountN) : ""} 중도상환`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between p-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={`num-tabular ${highlight ? "font-semibold text-foreground" : ""}`}>{v}</span>
    </div>
  );
}


export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href={`/loans/${params.id}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← 대출 상세
          </Link>
        </div>
        <PrepayForm loanToken={params.id} />
      </main>
    </Protected>
  );
}