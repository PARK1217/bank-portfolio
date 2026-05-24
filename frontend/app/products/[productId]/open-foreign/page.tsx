"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getProductOpenSession } from "@/lib/product-open-session";
import { showApiError } from "@/lib/toast";


/** SCR-OP-007 외화계좌 개설. (John Smith 시드 USD) */

interface OpenAccountResponse {
  account_token: string;
}

const CURRENCIES = ["USD", "EUR", "JPY", "CNY", "GBP"];
// mock 환율 (USD 기준)
const RATES_TO_KRW: Record<string, number> = {
  USD: 1350,
  EUR: 1450,
  JPY: 9.2,
  CNY: 188,
  GBP: 1700,
};


function OpenForeignForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  const [mode, setMode] = useState<"foreign" | "krw">("foreign");
  const [foreignAmt, setForeignAmt] = useState("");
  const [krwAmt, setKrwAmt] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getProductOpenSession();
    if (!s || s.product_id !== productId || !s.agreed_terms_at) {
      router.replace(`/products/${productId}/terms`);
    }
  }, [productId, router]);

  const rate = RATES_TO_KRW[currency] ?? 1;
  const foreignN = parseFloat(foreignAmt) || 0;
  const krwN = parseInt(krwAmt.replace(/[^0-9]/g, ""), 10) || 0;
  // 입력 모드에 따라 반대편 자동 계산
  const computedForeign = mode === "krw" ? (krwN / rate).toFixed(2) : foreignAmt;
  const computedKrw = mode === "foreign" ? Math.round(foreignN * rate) : krwN;

  const canSubmit = !submitting && (mode === "foreign" ? foreignN > 0 : krwN > 0) && /^\d{4}$/.test(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<OpenAccountResponse>(
        `/api/products/${productId}/open-foreign`,
        {
          currency,
          foreign_amount: mode === "foreign" ? foreignN : null,
          krw_amount: mode === "krw" ? krwN : null,
          password,
          consents: getProductOpenSession()?.consents ?? [],
        },
        { idempotent: true },
      );
      router.push(`/products/complete/${res.account_token}`);
    } catch (err) {
      showApiError(err, "외화계좌 개설에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mt-1">외화계좌 개설</CardTitle>
        <CardDescription>
          통화 선택 후 외화 금액 또는 원화 환전 금액 중 하나를 입력합니다. 환율은 실시간 고시 환율을 따릅니다 (현재 화면은 mock).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="통화 *">
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    currency === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              현재 환율 1 {currency} ≈ {rate.toLocaleString("ko-KR")}원
            </p>
          </Field>

          <Field label="입력 방식 *">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("foreign")}
                className={`rounded-md border py-2 text-sm ${
                  mode === "foreign"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                외화 금액 직접 입력
              </button>
              <button
                type="button"
                onClick={() => setMode("krw")}
                className={`rounded-md border py-2 text-sm ${
                  mode === "krw"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                원화 환전 입력
              </button>
            </div>
          </Field>

          {mode === "foreign" ? (
            <Field label={`외화 금액 (${currency}) *`}>
              <Input
                type="number"
                step={0.01}
                min={0}
                value={foreignAmt}
                onChange={(e) => setForeignAmt(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                예상 원화 환전: {computedKrw.toLocaleString("ko-KR")}원
              </p>
            </Field>
          ) : (
            <Field label="원화 금액 (KRW) *">
              <Input
                inputMode="numeric"
                value={krwAmt && krwN > 0 ? krwN.toLocaleString("ko-KR") : krwAmt}
                onChange={(e) => setKrwAmt(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                예상 외화 금액: {computedForeign} {currency}
              </p>
            </Field>
          )}

          <Field label="계좌 비밀번호 (4자리) *">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "개설 처리 중…" : `${currency} 외화 계좌 개설`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
        <OpenForeignForm productId={pid} />
      </main>
    </Protected>
  );
}