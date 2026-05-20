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
import { cn } from "@/lib/utils";


/**
 * SCR-OP-005 적금 개설 ⭐.
 *
 * 어필: **1 트랜잭션 4 테이블** — 수신계약 + 계좌 + 적금납입약정 + AUTO_TRANSFER 동시 INSERT.
 * 우대조건 다중 선택 → 가산 금리 시뮬 표시.
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

interface BonusCondition {
  condition_cd: string;
  description: string;
  bonus_rate: number;
}
interface ProductPeriodEntry {
  period_months: number;
  rate: number;
}
interface ProductDetailData {
  product: { product_id: number; product_name: string; product_type_cd: string; min_monthly_amt?: number | null; max_monthly_amt?: number | null };
  periods: ProductPeriodEntry[];
  bonus_conditions: BonusCondition[];
}

interface OpenAccountResponse {
  account_token: string;
  auto_token?: string;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function OpenInstallmentForm({ productId }: { productId: number }) {
  const router = useRouter();
  const { data: product, loading: productLoading } = useFetch<ProductDetailData>(`/api/products/${productId}`);
  const { data: accounts, loading: accountsLoading } = useFetch<AccountListData>("/api/accounts");

  const krwAccounts = useMemo(
    () => (accounts?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [accounts],
  );

  const [monthly, setMonthly] = useState("");
  const [periodMonths, setPeriodMonths] = useState("24");
  const [transferDay, setTransferDay] = useState("25");
  const [withdrawToken, setWithdrawToken] = useState("");
  const [bonusSel, setBonusSel] = useState<Record<string, boolean>>({});
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getProductOpenSession();
    if (!s || s.product_id !== productId || !s.agreed_terms_at) {
      router.replace(`/products/${productId}/terms`);
    }
  }, [productId, router]);

  useEffect(() => {
    if (product?.periods?.length && !product.periods.some((p) => String(p.period_months) === periodMonths)) {
      setPeriodMonths(String(product.periods[0].period_months));
    }
  }, [product, periodMonths]);

  useEffect(() => {
    if (krwAccounts.length && !withdrawToken) setWithdrawToken(krwAccounts[0].account_token);
  }, [krwAccounts, withdrawToken]);

  const monthlyN = parseInt(monthly.replace(/[^0-9]/g, ""), 10) || 0;
  const period = parseInt(periodMonths, 10) || 0;
  const baseRate = product?.periods?.find((p) => String(p.period_months) === periodMonths)?.rate ?? 0;
  const bonusRate = useMemo(
    () => (product?.bonus_conditions ?? []).filter((b) => bonusSel[b.condition_cd]).reduce((s, b) => s + b.bonus_rate, 0),
    [product, bonusSel],
  );
  const appliedRate = baseRate + bonusRate;
  const totalPrincipal = monthlyN * period;
  const minOk = !product?.product.min_monthly_amt || monthlyN >= product.product.min_monthly_amt;
  const maxOk = !product?.product.max_monthly_amt || monthlyN <= product.product.max_monthly_amt;
  const canSubmit =
    !submitting &&
    monthlyN > 0 &&
    period > 0 &&
    /^\d{4}$/.test(password) &&
    !!withdrawToken &&
    minOk &&
    maxOk;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<OpenAccountResponse>(
        `/api/products/${productId}/open-installment`,
        {
          monthly_amount_krw: monthlyN,
          period_months: period,
          transfer_day: parseInt(transferDay, 10),
          withdraw_account_token: withdrawToken,
          bonus_condition_codes: Object.keys(bonusSel).filter((k) => bonusSel[k]),
          password,
        },
        { idempotent: true },
      );
      router.push(`/products/complete/${res.account_token}`);
    } catch (err) {
      showApiError(err, "적금 가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if ((productLoading && !product) || (accountsLoading && !accounts)) {
    return <Spinner label="가입 정보 불러오는 중…" />;
  }
  if (!product) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-OP-005 · 가입 2/2 단계</div>
          <CardTitle className="mt-1">{product.product.product_name} 가입 ⭐</CardTitle>
          <CardDescription>
            매월 자동이체로 납입됩니다. 가입 시 자동이체가 함께 등록됩니다 (1 트랜잭션 4 테이블).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="월 납입액 (원)" required>
              <Input
                inputMode="numeric"
                value={monthly && monthlyN > 0 ? krw.format(monthlyN) : monthly}
                onChange={(e) => setMonthly(e.target.value)}
                required
              />
              {product.product.min_monthly_amt || product.product.max_monthly_amt ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {product.product.min_monthly_amt ? `최소 ${fmt(product.product.min_monthly_amt)}` : ""}
                  {product.product.max_monthly_amt ? ` · 최대 ${fmt(product.product.max_monthly_amt)}` : ""}
                </div>
              ) : null}
              {!minOk ? <p className="mt-1 text-xs text-destructive">최소 납입액 미달</p> : null}
              {!maxOk ? <p className="mt-1 text-xs text-destructive">최대 납입액 초과</p> : null}
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
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="자동이체일 (1~31일)" required>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={transferDay}
                  onChange={(e) => setTransferDay(e.target.value)}
                  required
                />
              </Field>
              <Field label="비밀번호 (4자리)" required>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                />
              </Field>
            </div>

            <Field label="자동이체 출금 계좌" required>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={withdrawToken}
                onChange={(e) => setWithdrawToken(e.target.value)}
                required
              >
                {krwAccounts.map((a) => (
                  <option key={a.account_token} value={a.account_token}>
                    {(a.alias ?? a.account_type_cd) + " · " + a.account_no}
                  </option>
                ))}
              </select>
            </Field>

            {product.bonus_conditions && product.bonus_conditions.length > 0 ? (
              <Field label="우대 조건 선택">
                <ul className="space-y-1.5">
                  {product.bonus_conditions.map((b) => (
                    <li key={b.condition_cd} className="flex items-start gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!bonusSel[b.condition_cd]}
                        onChange={(e) =>
                          setBonusSel((cur) => ({ ...cur, [b.condition_cd]: e.target.checked }))
                        }
                      />
                      <span className="min-w-0 flex-1">{b.description}</span>
                      <span className="num-tabular shrink-0 text-success">+{b.bonus_rate.toFixed(2)}%p</span>
                    </li>
                  ))}
                </ul>
              </Field>
            ) : null}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "가입 처리 중…" : "가입하기 (자동이체 동시 등록)"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 시뮬 요약 */}
      {monthlyN > 0 && period > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">가입 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row k="총 납입 원금" v={fmt(totalPrincipal)} />
            <Row k="기본 금리" v={`${baseRate.toFixed(2)}%`} />
            {bonusRate > 0 ? (
              <Row k="우대 가산" v={`+${bonusRate.toFixed(2)}%p`} positive />
            ) : null}
            <Row k="적용 금리" v={`${appliedRate.toFixed(2)}%`} highlight />
            <Row
              k="예상 만기 이자 (단리·연 365일)"
              v={fmt(Math.round(((totalPrincipal * appliedRate) / 100) * (period / 12) / 2))}
              note
            />
            <p className="pt-1 text-[10px] text-muted-foreground">
              ※ 단순 추정 — 실제는 월별 잔액·우대조건 충족 여부에 따라 변동
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({
  k,
  v,
  highlight,
  positive,
  note,
}: {
  k: string;
  v: string;
  highlight?: boolean;
  positive?: boolean;
  note?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={cn(
          "num-tabular",
          highlight ? "font-semibold text-foreground" : "",
          positive ? "text-success" : "",
          note ? "text-xs" : "",
        )}
      >
        {v}
      </span>
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

export default function Page() {
  const params = useParams<{ productId: string }>();
  const pid = parseInt(params.productId, 10);
  if (!pid) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <OpenInstallmentForm productId={pid} />
      </main>
    </Protected>
  );
}