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


/** SCR-OP-003 자유입출금 개설. */

interface OpenAccountResponse {
  account_token: string;
}

const krw = new Intl.NumberFormat("ko-KR");


function OpenSavingForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [initial, setInitial] = useState("0");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 약관 미동의 시 /terms 로 가드
  useEffect(() => {
    const s = getProductOpenSession();
    if (!s || s.product_id !== productId || !s.agreed_terms_at) {
      router.replace(`/products/${productId}/terms`);
    }
  }, [productId, router]);

  const initialN = parseInt(initial.replace(/[^0-9]/g, ""), 10) || 0;
  const passwordOk = password.length === 4 && password === passwordConfirm;
  const canSubmit = !submitting && passwordOk && /^\d{4}$/.test(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<OpenAccountResponse>(
        `/api/products/${productId}/open-saving`,
        {
          alias: alias || null,
          initial_deposit_krw: initialN,
          withdraw_password: password,
          consents: getProductOpenSession()?.consents ?? [],
        },
        { idempotent: true },
      );
      router.push(`/products/complete/${res.account_token}`);
    } catch (err) {
      showApiError(err, "계좌 개설에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="text-xs text-muted-foreground">가입 2/2 단계</div>
        <CardTitle className="mt-1">자유입출금 통장 개설</CardTitle>
        <CardDescription>입출금이 자유로운 통장입니다. 비밀번호는 출금 시 사용됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="통장 별명 (선택)">
            <Input
              maxLength={50}
              placeholder="예: 비상금, 월급통장"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={submitting}
            />
          </Field>
          <Field label="초기 입금 금액 (선택)">
            <Input
              inputMode="numeric"
              value={initial && initialN > 0 ? krw.format(initialN) : initial}
              onChange={(e) => setInitial(e.target.value)}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">0원으로 개설 후 추후 입금 가능합니다.</p>
          </Field>
          <Field label="계좌 비밀번호 (4자리 숫자)" required>
            <Input
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={4}
              pattern="\d{4}"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={submitting}
              required
            />
          </Field>
          <Field label="비밀번호 확인" required>
            <Input
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={4}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={submitting}
              required
            />
            {passwordConfirm.length > 0 && password !== passwordConfirm ? (
              <p className="mt-1 text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
            ) : null}
          </Field>
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "개설 중…" : "개설하기"}
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
        <OpenSavingForm productId={pid} />
      </main>
    </Protected>
  );
}