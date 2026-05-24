"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getLoanDraft, patchLoanDraft } from "@/lib/loan-session";
import { showApiError } from "@/lib/toast";


/** SCR-LN-003 대출 정식 신청. 신용조회 동의 필수. */

interface ApplyResponse {
  app_token: string;
  status_cd: string;
  required_documents: string[];
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function ApplyForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ReturnType<typeof getLoanDraft>>(null);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [purpose, setPurpose] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  // precheck 결과 prefill
  useEffect(() => {
    const d = getLoanDraft();
    if (!d || d.product_id !== productId || d.max_amount_krw == null) {
      router.replace(`/loans/${productId}/precheck`);
      return;
    }
    setDraft(d);
    setAmount(String(d.desired_amount_krw ?? d.max_amount_krw));
    setPeriod(String(d.period_months ?? 36));
  }, [productId, router]);

  const num = (s: string) => parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
  const amountN = num(amount);
  const overMax = draft?.max_amount_krw != null && amountN > draft.max_amount_krw;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !consent || !amountN || overMax) return;
    setLoading(true);
    try {
      const res = await api.post<ApplyResponse>(
        `/api/loans/${productId}/apply`,
        {
          product_id: productId,
          amount_krw: amountN,
          period_months: parseInt(period, 10),
          credit_inquiry_consent: true,
          purpose_code: purpose || null,
        },
        { idempotent: true },
      );
      patchLoanDraft({ app_token: res.app_token });
      // app_token 기반 다음 단계는 [id] 슬롯 공용 → /loans/{token}/documents
      router.push(`/loans/${res.app_token}/documents`);
    } catch (err) {
      showApiError(err, "대출 신청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!draft) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mt-1">대출 정식 신청</CardTitle>
        <CardDescription>
          신용조회 동의가 포함됩니다. 가능 한도 {fmt(draft.max_amount_krw ?? 0)} / 적용 금리{" "}
          {(draft.applicable_rate ?? 0).toFixed(2)}%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="신청 금액 (원)" required>
            <Input
              inputMode="numeric"
              value={amount ? krw.format(amountN) : ""}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {overMax ? (
              <p className="mt-1 text-xs text-destructive">
                한도 {fmt(draft.max_amount_krw ?? 0)} 를 초과합니다.
              </p>
            ) : null}
          </Field>

          <Field label="기간 (개월)" required>
            <Input
              inputMode="numeric"
              value={period}
              onChange={(e) => setPeriod(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </Field>

          <Field label="대출 목적 (선택)">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              <option value="">선택 안 함</option>
              <option value="LIVING">생활자금</option>
              <option value="EDUCATION">교육비</option>
              <option value="MEDICAL">의료비</option>
              <option value="BUSINESS">사업자금</option>
              <option value="OTHER">기타</option>
            </select>
          </Field>

          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={loading}
            />
            <span>
              <span className="font-medium">[필수]</span> 신용정보 조회 및 활용 동의.
              <span className="ml-1 text-xs text-muted-foreground">
                심사를 위해 신용평가기관 조회가 진행됩니다.
              </span>
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={loading || !consent || !amountN || overMax}>
            {loading ? "신청 중…" : "신청 제출"}
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
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id, 10);
  if (!productId) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <ApplyForm productId={productId} />
      </main>
    </Protected>
  );
}