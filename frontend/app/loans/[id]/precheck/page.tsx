"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, TrendingDown, Wallet, Percent, Calendar } from "lucide-react";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { patchLoanDraft } from "@/lib/loan-session";
import { showApiError } from "@/lib/toast";


/** SCR-LN-002 대출 한도 조회 종합 대시보드 — 입력 1회로 다중 상품 비교 + DSR 분석 + 가이드 */

interface PrecheckResponse {
  eligible: boolean;
  simulated_dsr_pct: number;
  max_amount_krw: number;
  applicable_rate: number;
  rejection_code: string | null;
}

interface LoanProduct {
  product_id: number;
  product_name: string;
  product_type_cd: string;
  base_rate: number;
  min_amount: number;
  max_amount: number;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(Math.round(n))}원`;
const fmtShort = (n: number) => {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return krw.format(n);
};

function monthlyEPI(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

const DSR_LIMIT = 40;
const DSR_WARN = 60;


function PrecheckDashboard({ productId }: { productId: number }) {
  const router = useRouter();
  const [income, setIncome] = useState("");
  const [debt, setDebt] = useState("");
  const [desired, setDesired] = useState("");
  const [periodMonths, setPeriodMonths] = useState("36");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrecheckResponse | null>(null);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [currentProduct, setCurrentProduct] = useState<LoanProduct | null>(null);

  const num = (s: string) => parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
  const incomeN = num(income);
  const debtN = num(debt);
  const desiredN = num(desired);
  const periodN = parseInt(periodMonths, 10);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ items: LoanProduct[] }>("/api/products");
        const loans = (res.items ?? []).filter((p) => p.product_type_cd === "LOAN");
        setProducts(loans);
        setCurrentProduct(loans.find((p) => p.product_id === productId) ?? null);
      } catch {
        /* 카탈로그 로드 실패해도 단일 상품 조회는 동작하도록 silent */
      }
    })();
  }, [productId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !incomeN || !desiredN || !periodN) return;
    setLoading(true);
    try {
      const res = await api.post<PrecheckResponse>(`/api/loans/${productId}/precheck`, {
        annual_income_krw: incomeN,
        annual_debt_total_krw: debtN,
        desired_amount_krw: desiredN,
        period_months: periodN,
      });
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

  const monthly = useMemo(
    () => (result ? monthlyEPI(desiredN, result.applicable_rate, periodN) : 0),
    [result, desiredN, periodN],
  );

  return (
    <div className="space-y-5">
      {/* 입력 카드 */}
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-LN-002</div>
          <CardTitle className="mt-1">대출 한도 조회</CardTitle>
          <CardDescription>
            소득·부채 정보 한 번 입력으로 {currentProduct?.product_name ?? "대출"} 한도와 함께
            전체 대출 상품 {products.length || 8}종을 비교·분석합니다. 신용조회는 정식 신청 시 별도 동의가 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="연 소득 (원)" required>
              <Input
                inputMode="numeric"
                value={income ? krw.format(incomeN) : ""}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="예: 50,000,000"
                required
              />
            </Field>
            <Field label="연간 총 부채 원리금 (원)">
              <Input
                inputMode="numeric"
                value={debt ? krw.format(debtN) : ""}
                onChange={(e) => setDebt(e.target.value)}
                placeholder="없으면 0"
              />
            </Field>
            <Field label="희망 대출 금액 (원)" required>
              <Input
                inputMode="numeric"
                value={desired ? krw.format(desiredN) : ""}
                onChange={(e) => setDesired(e.target.value)}
                placeholder="예: 30,000,000"
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
              {loading ? "분석 중…" : "한도 조회 및 분석"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <>
          {/* 요약 KPI 4종 */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              icon={Wallet}
              label="가능 한도"
              value={fmtShort(result.max_amount_krw)}
              suffix="원"
              color={result.eligible ? "text-success" : "text-destructive"}
              sub={result.eligible ? "DSR 40% 기준" : "조건 미달"}
            />
            <KpiCard
              icon={TrendingDown}
              label="예상 DSR"
              value={`${result.simulated_dsr_pct.toFixed(1)}`}
              suffix="%"
              color={
                result.simulated_dsr_pct <= DSR_LIMIT
                  ? "text-success"
                  : result.simulated_dsr_pct <= DSR_WARN
                    ? "text-warning"
                    : "text-destructive"
              }
              sub="총부채원리금상환비율"
            />
            <KpiCard
              icon={Percent}
              label="적용 금리"
              value={result.applicable_rate.toFixed(2)}
              suffix="%"
              color="text-foreground"
              sub="연 (기본금리 기준)"
            />
            <KpiCard
              icon={Calendar}
              label="월 상환액"
              value={fmtShort(monthly)}
              suffix="원"
              color="text-foreground"
              sub={`희망 ${fmtShort(desiredN)} · ${periodN}개월`}
            />
          </div>

          {/* DSR 게이지 + 설명 */}
          <DSRGaugeCard pct={result.simulated_dsr_pct} />

          {/* 거절/통과 가이드 */}
          <GuidanceCard
            result={result}
            income={incomeN}
            debt={debtN}
            desired={desiredN}
            periodMonths={periodN}
          />

          {/* 다중 상품 비교 */}
          {products.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">대출 상품별 비교 ({products.length}종)</CardTitle>
                <CardDescription>
                  내 가능 한도 <strong>{fmt(result.max_amount_krw)}</strong> 안에서 각 상품의 한도·금리·월 상환을 한눈에.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {products
                    .map((p) => ({
                      product: p,
                      score: rankScore(p, result.max_amount_krw, desiredN),
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map(({ product }) => (
                      <ProductCard
                        key={product.product_id}
                        product={product}
                        userMax={result.max_amount_krw}
                        desired={desiredN}
                        periodMonths={periodN}
                        isCurrent={product.product_id === productId}
                        onApply={() => router.push(`/loans/${product.product_id}/apply`)}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* 정식 신청 (현재 상품 기준) */}
          {result.eligible ? (
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={() => router.push(`/loans/${productId}/apply`)}
            >
              {currentProduct?.product_name ?? "이 상품"}으로 정식 신청하기 →
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}


function rankScore(p: LoanProduct, userMax: number, desired: number): number {
  // 사용자가 원하는 금액을 충족할 수 있고 금리가 낮을수록 높은 점수.
  const willGet = Math.min(userMax, p.max_amount, desired);
  const fitsMin = willGet >= p.min_amount ? 1 : 0;
  const fillRatio = desired > 0 ? Math.min(1, willGet / desired) : 0;
  // base_rate 가 낮을수록 점수 ↑ (역수). 최대 한도가 클수록 가산.
  return fitsMin * (fillRatio * 100 - p.base_rate);
}


function ProductCard({
  product,
  userMax,
  desired,
  periodMonths,
  isCurrent,
  onApply,
}: {
  product: LoanProduct;
  userMax: number;
  desired: number;
  periodMonths: number;
  isCurrent: boolean;
  onApply: () => void;
}) {
  const productCap = Math.min(userMax, product.max_amount);
  const willGet = Math.min(productCap, desired);
  const fitsMin = productCap >= product.min_amount;
  const fillRatio = desired > 0 ? Math.min(1, willGet / desired) : 0;
  const monthly = fitsMin ? monthlyEPI(willGet, product.base_rate, periodMonths) : 0;
  const totalInterest = fitsMin ? monthly * periodMonths - willGet : 0;

  type Tone = "success" | "warning" | "destructive" | "primary";
  let badge: { label: string; tone: Tone };
  if (!fitsMin) badge = { label: "한도 미달", tone: "destructive" };
  else if (fillRatio >= 0.95) badge = { label: "희망액 가능", tone: "success" };
  else badge = { label: `${Math.round(fillRatio * 100)}% 가능`, tone: "warning" };

  return (
    <Card className={`relative ${!fitsMin ? "opacity-60" : ""} ${isCurrent ? "border-primary border-2" : ""}`}>
      {isCurrent ? (
        <Pill tone="primary" className="absolute -top-2 left-3">
          현재 상품
        </Pill>
      ) : null}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{product.product_name}</CardTitle>
          <Pill tone={badge.tone}>{badge.label}</Pill>
        </div>
        <CardDescription className="text-[11px] num-tabular">
          상품 한도 {fmtShort(product.min_amount)}원 ~ {fmtShort(product.max_amount)}원 · 기본 {product.base_rate.toFixed(2)}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        <Row label="이 상품에서 가능" value={fmt(productCap)} bold />
        {fitsMin ? (
          <>
            <Row label={`희망 ${fmtShort(desired)} 기준 월 상환`} value={fmt(monthly)} />
            <Row label="총 이자 부담" value={fmt(totalInterest)} muted />
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground py-1">
            DSR 한도가 이 상품 최소 금액 {fmtShort(product.min_amount)}원에 미달합니다.
          </p>
        )}
        {fitsMin ? (
          <Button size="sm" variant="outline" className="w-full mt-2" onClick={onApply}>
            이 상품으로 신청
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}


function GuidanceCard({
  result,
  income,
  debt,
  desired,
  periodMonths,
}: {
  result: PrecheckResponse;
  income: number;
  debt: number;
  desired: number;
  periodMonths: number;
}) {
  if (result.eligible) {
    const margin = DSR_LIMIT - result.simulated_dsr_pct;
    return (
      <Card className="border-success/40 bg-success/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            신청 가능 — 안전 구간
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            현재 DSR <strong>{result.simulated_dsr_pct.toFixed(1)}%</strong> 로 한도(40%) 까지{" "}
            <strong className="text-success">{margin.toFixed(1)}%p</strong> 여유가 있어요.
          </p>
          <p>
            희망 금액 <strong>{fmt(desired)}</strong> 정식 신청이 가능합니다. 가능 한도{" "}
            <strong>{fmt(result.max_amount_krw)}</strong> 까지는 추가 차입 여력이 있어요.
          </p>
          {margin > 10 ? (
            <p className="text-muted-foreground">
              여유가 충분합니다. 우대 금리·신용 한도 향상 상품도 함께 고려해보세요.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // 거절 — 시나리오 분석
  const reduced = result.max_amount_krw; // 금액 줄이기
  const longer = periodMonths + 60;
  const longerMonthly = monthlyEPI(desired, result.applicable_rate, longer);
  const longerDSR = ((debt + longerMonthly * 12) / Math.max(1, income)) * 100;
  const longerWorks = longerDSR <= DSR_LIMIT;
  const debtReduceTarget = Math.max(
    0,
    debt - (income * DSR_LIMIT) / 100 + monthlyEPI(desired, result.applicable_rate, periodMonths) * 12,
  );

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          조건 미달 — 이렇게 하면 가능해요
        </CardTitle>
        <CardDescription className="text-xs">
          DSR이 <strong>{result.simulated_dsr_pct.toFixed(1)}%</strong> 로 한도(40%)를 초과했어요. 아래 방법 중 하나로 신청해보세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {reduced > 0 ? (
          <Scenario
            num={1}
            title="신청 금액 줄이기"
            detail={
              <>
                희망 {fmt(desired)} → <strong>{fmt(reduced)}</strong> 까지 줄이면 DSR 40% 이내로 진입.
              </>
            }
          />
        ) : null}
        {longerWorks ? (
          <Scenario
            num={2}
            title="대출 기간 늘리기"
            detail={
              <>
                {periodMonths}개월 → <strong>{longer}개월</strong> 로 늘리면 월 상환액 감소로 DSR{" "}
                <strong>{longerDSR.toFixed(1)}%</strong>. 단, 총 이자 부담은 늘어납니다.
              </>
            }
          />
        ) : null}
        {debt > 0 && debtReduceTarget > 0 && debtReduceTarget < debt ? (
          <Scenario
            num={3}
            title="기존 부채 정리"
            detail={
              <>
                기존 연간 부채 {fmt(debt)} → <strong>{fmt(Math.max(0, debt - debtReduceTarget))}</strong> 이하로 줄이면 신규 대출 여력 회복.
              </>
            }
          />
        ) : null}
        <Scenario
          num={debt > 0 && debtReduceTarget > 0 ? 4 : 3}
          title="소득 증빙 보강"
          detail={
            <>
              연 소득에 상여·인센티브·임대 소득 등을 추가 증빙하면 DSR이 낮아집니다. 정식 신청 시 추가 서류로 가능합니다.
            </>
          }
        />
      </CardContent>
    </Card>
  );
}


function Scenario({ num, title, detail }: { num: number; title: string; detail: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="flex items-baseline gap-2">
        <span className="num-tabular text-[10px] font-mono text-muted-foreground">방법 {num}</span>
        <strong className="text-xs">{title}</strong>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{detail}</div>
    </div>
  );
}


function DSRGaugeCard({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const status =
    clamped <= DSR_LIMIT
      ? { label: "안전 구간", color: "text-success", bg: "bg-success", tone: "success" as const }
      : clamped <= DSR_WARN
        ? { label: "주의 구간", color: "text-warning", bg: "bg-warning", tone: "warning" as const }
        : { label: "한도 초과", color: "text-destructive", bg: "bg-destructive", tone: "destructive" as const };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">DSR 분석</CardTitle>
        <CardDescription className="text-xs">
          연 소득 대비 모든 대출의 연간 원리금 상환액 비율 — 금융감독원 규제 한도 <strong>40%</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className={`num-tabular text-3xl font-bold ${status.color}`}>{clamped.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">현재 시뮬레이션</div>
          </div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-muted">
          <div className="absolute inset-y-0 left-0 w-[40%] bg-success/20" />
          <div className="absolute inset-y-0 left-[40%] w-[20%] bg-warning/20" />
          <div className="absolute inset-y-0 left-[60%] w-[40%] bg-destructive/20" />
          <div
            className={`absolute inset-y-0 left-0 transition-all ${status.bg}`}
            style={{ width: `${clamped}%` }}
          />
          <div
            className="absolute -top-1 h-5 w-[2px] bg-foreground"
            style={{ left: `calc(${clamped}% - 1px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 num-tabular">
          <span>0%</span>
          <span className="text-success">40%<br />대출 한계</span>
          <span className="text-warning">60%</span>
          <span>100%</span>
        </div>
      </CardContent>
    </Card>
  );
}


function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <div className="mt-1.5 flex items-baseline gap-0.5">
          <span className={`num-tabular text-xl font-bold ${color}`}>{value}</span>
          {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
        </div>
        {sub ? <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}


function Pill({
  tone,
  children,
  className,
}: {
  tone: "success" | "warning" | "destructive" | "primary";
  children: React.ReactNode;
  className?: string;
}) {
  const toneCls = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    primary: "bg-primary/15 text-primary",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${toneCls} ${className ?? ""}`}>
      {children}
    </span>
  );
}


function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-[11px] ${muted ? "text-muted-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`num-tabular ${bold ? "font-semibold text-foreground" : ""} ${muted ? "text-muted-foreground" : ""}`}>
        {value}
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
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id, 10);
  if (!productId) return null;
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <PrecheckDashboard productId={productId} />
      </main>
    </Protected>
  );
}