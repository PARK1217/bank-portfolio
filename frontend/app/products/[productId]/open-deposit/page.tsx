"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { getProductOpenSession } from "@/lib/product-open-session";
import { showApiError } from "@/lib/toast";


/** SCR-OP-004 정기예금 개설. */

interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  hidden: boolean;
  masked_account_no: string;
  status_cd: string;
}
interface AccountListData {
  accounts: AccountSummary[];
  total_balance_krw: number;
}

interface ProductPeriodEntry {
  period_months: number;
  rate: number;
}
interface ProductDetailData {
  product: { product_id: number; product_name: string; product_type_cd: string; min_amount: number | null; max_amount: number | null };
  periods: ProductPeriodEntry[];
}

interface OpenAccountResponse {
  account_token: string;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function OpenDepositForm({ productId }: { productId: number }) {
  const router = useRouter();
  const { data: product, loading: productLoading } = useFetch<ProductDetailData>(`/api/products/${productId}`);
  const { data: accounts, loading: accountsLoading } = useFetch<AccountListData>("/api/accounts");

  const krwAccounts = useMemo(
    () => (accounts?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [accounts],
  );

  const [amount, setAmount] = useState("");
  const [periodMonths, setPeriodMonths] = useState<string>("12");
  const [interestCycle, setInterestCycle] = useState<"MATURITY" | "MONTHLY" | "QUARTERLY">("MATURITY");
  const [withdrawToken, setWithdrawToken] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 약관 미동의 시 /terms
  useEffect(() => {
    const s = getProductOpenSession();
    if (!s || s.product_id !== productId || !s.agreed_terms_at) {
      router.replace(`/products/${productId}/terms`);
    }
  }, [productId, router]);

  // 기간 기본값 = 첫 항목
  useEffect(() => {
    if (product?.periods?.length && !product.periods.some((p) => String(p.period_months) === periodMonths)) {
      setPeriodMonths(String(product.periods[0].period_months));
    }
  }, [product, periodMonths]);

  // 출금계좌 기본
  useEffect(() => {
    if (krwAccounts.length && !withdrawToken) setWithdrawToken(krwAccounts[0].account_token);
  }, [krwAccounts, withdrawToken]);

  const amountN = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const selectedPeriod = product?.periods?.find((p) => String(p.period_months) === periodMonths);
  const minOk = product?.product.min_amount == null || amountN >= product.product.min_amount;
  const maxOk = product?.product.max_amount == null || amountN <= product.product.max_amount;
  const balOk = krwAccounts.find((a) => a.account_token === withdrawToken)?.balance ?? 0;
  const balEnough = amountN <= balOk;

  const canSubmit =
    !submitting &&
    amountN > 0 &&
    minOk &&
    maxOk &&
    balEnough &&
    /^\d{4}$/.test(password) &&
    !!withdrawToken;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<OpenAccountResponse>(
        `/api/products/${productId}/open-deposit`,
        {
          amount_krw: amountN,
          period_months: parseInt(periodMonths, 10),
          interest_payment_cd: interestCycle,
          withdraw_account_token: withdrawToken,
          password,
        },
        { idempotent: true },
      );
      router.push(`/products/complete/${res.account_token}`);
    } catch (err) {
      showApiError(err, "정기예금 가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if ((productLoading && !product) || (accountsLoading && !accounts)) {
    return <Spinner label="가입 정보 불러오는 중…" />;
  }
  if (!product) return null;

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-OP-004 · 가입 2/2 단계</div>
        <CardTitle className="mt-1">{product.product.product_name} 가입</CardTitle>
        <CardDescription>
          금액과 기간을 지정하면 출금계좌에서 자동 이체되어 정기예금이 개설됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="가입 금액 (원)" required>
            <Input
              inputMode="numeric"
              value={amount && amountN > 0 ? krw.format(amountN) : amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {product.product.min_amount != null ? `최소 ${fmt(product.product.min_amount)}` : "최소 제한 없음"}
              {product.product.max_amount != null ? ` · 최대 ${fmt(product.product.max_amount)}` : ""}
            </div>
            {!minOk ? <p className="mt-1 text-xs text-destructive">최소 가입금액에 미달합니다.</p> : null}
            {!maxOk ? <p className="mt-1 text-xs text-destructive">최대 가입금액을 초과합니다.</p> : null}
          </Field>

          <Field label="가입 기간" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(product.periods ?? []).map((p) => (
                <button
                  key={p.period_months}
                  type="button"
                  onClick={() => setPeriodMonths(String(p.period_months))}
                  className={`rounded-md border py-2 text-xs ${
                    String(p.period_months) === periodMonths
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  <div className="font-medium">{p.period_months}개월</div>
                  <div className="num-tabular text-[10px]">{p.rate.toFixed(2)}%</div>
                </button>
              ))}
            </div>
            {selectedPeriod ? (
              <p className="mt-2 text-xs text-success">
                선택 금리 <span className="num-tabular font-semibold">{selectedPeriod.rate.toFixed(2)}%</span>
              </p>
            ) : null}
          </Field>

          <Field label="이자 지급 방식" required>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={interestCycle}
              onChange={(e) => setInterestCycle(e.target.value as typeof interestCycle)}
            >
              <option value="MATURITY">만기 일시 지급</option>
              <option value="MONTHLY">매월 지급</option>
              <option value="QUARTERLY">분기 지급</option>
            </select>
          </Field>

          <Field label="출금 계좌 (가입 자금 출금)" required>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={withdrawToken}
              onChange={(e) => setWithdrawToken(e.target.value)}
              required
            >
              {krwAccounts.map((a) => (
                <option key={a.account_token} value={a.account_token}>
                  {(a.alias ?? a.account_type_cd) + " · " + a.masked_account_no + " · " + fmt(a.balance)}
                </option>
              ))}
            </select>
            {!balEnough && amountN > 0 ? (
              <p className="mt-1 text-xs text-destructive">출금계좌 잔액이 부족합니다.</p>
            ) : null}
          </Field>

          <Field label="계좌 비밀번호 (4자리)" required>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "가입 처리 중…" : `${amountN > 0 ? fmt(amountN) : ""} 가입하기`}
          </Button>
        </form>
      </CardContent>
    </Card>
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

export default function Page() {
  const params = useParams<{ productId: string }>();
  const pid = parseInt(params.productId, 10);
  if (!pid) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <OpenDepositForm productId={pid} />
      </main>
    </Protected>
  );
}