"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSignupSession, patchSignupSession } from "@/lib/signup-session";
import { showApiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** SCR-AU-004 응답 — 가입 완료 시 자동 로그인 (JWT 즉시 발급). */
interface SignupAccountResponse {
  customer_no: number;
  access_token: string;
  expires_in: number;
}

export default function SignupAccountPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [form, setForm] = useState({
    password: "",
    password_confirm: "",
    email: "",
    address_main: "",
    address_detail: "",
    zip_code: "",
    phone_main: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getSignupSession();
    if (!s.verificationId) {
      router.replace("/signup/verify");
      return;
    }
    setVerificationId(s.verificationId);
  }, [router]);

  function patch<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !verificationId) return;
    if (form.password !== form.password_confirm) {
      showApiError(new Error("password mismatch"), "비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<SignupAccountResponse>(
        "/api/signup/account",
        { verification_id: verificationId, ...form },
        { token: null },
      );
      // 가입 완료 → 자동 로그인 (백엔드가 JWT 즉시 발급)
      signIn(res.access_token, res.customer_no);
      patchSignupSession({});
      router.push("/signup/complete");
    } catch (err) {
      showApiError(err, "계정 정보 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-12 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="text-xs text-muted-foreground">3/4</div>
          <CardTitle className="mt-1">계정 정보</CardTitle>
          <CardDescription>이메일·비밀번호·연락처를 입력하세요. (이메일이 로그인 ID 입니다)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="이메일 (로그인 ID)" required>
              <Input
                type="email"
                autoComplete="email"
                maxLength={50}
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <Field label="비밀번호" required>
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={form.password}
                onChange={(e) => patch("password", e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <Field label="비밀번호 확인" required>
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password_confirm}
                onChange={(e) => patch("password_confirm", e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <Field label="휴대폰" required>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone_main}
                onChange={(e) => patch("phone_main", e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <Field label="우편번호">
                <Input
                  inputMode="numeric"
                  value={form.zip_code}
                  onChange={(e) => patch("zip_code", e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field label="주소" required>
                <Input
                  value={form.address_main}
                  onChange={(e) => patch("address_main", e.target.value)}
                  disabled={loading}
                  required
                />
              </Field>
            </div>
            <Field label="상세주소">
              <Input
                value={form.address_detail}
                onChange={(e) => patch("address_detail", e.target.value)}
                disabled={loading}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "등록 중…" : "가입 완료"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
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