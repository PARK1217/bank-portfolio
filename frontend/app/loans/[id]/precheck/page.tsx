"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { patchLoanDraft } from "@/lib/loan-session";
import { showApiError } from "@/lib/toast";


/** SCR-LN-002 대출 한도 조회 (가신청 / DSR 시뮬). 신용조회 동의 없음. */

interface PrecheckResponse {
  eligible: boolean;
  simulated_dsr_pct: number;
  max_amount_krw: number;
  applicable_rate: number;
  rejection_code: string | null;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function PrecheckForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [income, setIncome] = useState("");
  const [debt, setDebt] = useState("");
  const [desired, setDesired] = useState("");
  const [periodMonths, setPeriodMonths] = useState("36");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrecheckResponse | null>(null);

  const num = (s: string) => parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const incomeN = num(income);
    const debtN = num(debt);
    const desiredN = num(desired);
    const periodN = parseInt(periodMonths, 10);
    if (!incomeN || !desiredN || !periodN) return;

    setLoading(true);
    try {
      const res = await api.post<PrecheckResponse>(
        `/api/loans/${productId}/precheck`,
        {
          annual_income_krw: incomeN,
          annual_debt_total_krw: debtN,
          desired_amount_krw: desiredN,
          period_months: periodN,
        },
      );
      patchLoanDraft({
        product_id: productId,
        annual_income_krw: incomeN,
        annual_debt_total_krw: debtN,
        desired_amount_krw: desiredN,
        period_months: periodN,
        simulated_dsr_pct: res.simulated_dsr_pct,
        max_amount_krw: res.max_amount_krw,
        applicable_rate: res.applicable_rate,
      });
      setResult(res);
    } catch (err) {
      showApiError(err, "한도 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-LN-002</div>
          <CardTitle className="mt-1">대출 한도 조회 (가신청)</CardTitle>
          <CardDescription>
            소득·부채 정보로 한도와 금리를 시뮬레이션합니다. 신용조회는 정식 신청 시 별도 동의가 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="연 소득 (원)" required>
              <Input
                inputMode="numeric"
                value={income ? krw.format(num(income)) : ""}
                onChange={(e) => setIncome(e.target.value)}
                required
              />
            </Field>
            <Field label="연간 총 부채 원리금 (원)">
              <Input
                inputMode="numeric"
                placeholder="없으면 0"
                value={debt ? krw.format(num(debt)) : ""}
                onChange={(e) => setDebt(e.target.value)}
              />
            </Field>
            <Field label="희망 대출 금액 (원)" required>
              <Input
                inputMode="numeric"
                value={desired ? krw.format(num(desired)) : ""}
                onChange={(e) => setDesired(e.target.value)}
                required
              />
            </Field>
            <Field label="대출 기간" required>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={periodMonths}
                onChange={(e) => setPeriodMonths(e.target.value)}
                required
              >
                {[12, 24, 36, 48, 60, 84, 120, 180, 240, 360].map((m) => (
                  <option key={m} value={m}>
                    {m}개월{m % 12 === 0 ? ` (${m / 12}년)` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "시뮬레이션 중…" : "한도 조회"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시뮬레이션 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row k="DSR (총부채원리금상환비율)" v={`${result.simulated_dsr_pct.toFixed(1)}%`} highlight={result.simulated_dsr_pct > 40} />
            <Row k="가능 한도" v={fmt(result.max_amount_krw)} />
            <Row k="적용 금리" v={`${result.applicable_rate.toFixed(2)}%`} />
            {result.eligible ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => router.push(`/loans/${productId}/apply`)}
              >
                정식 신청하기 →
              </Button>
            ) : (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {result.rejection_code === "E_LOAN_DSR_OVER"
                  ? "DSR이 40%를 초과하여 정식 신청이 어렵습니다."
                  : "신청 조건에 부합하지 않습니다."}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`num-tabular font-medium ${highlight ? "text-destructive" : ""}`}>{v}</span>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id, 10);
  if (!productId) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <PrecheckForm productId={productId} />
      </main>
    </Protected>
  );
}