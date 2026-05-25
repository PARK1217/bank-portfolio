"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSignupSession, patchSignupSession } from "@/lib/signup-session";
import { showApiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** SCR-AU-004 응답 — 가입 완료 시 자동 로그인 (JWT 즉시 발급). */
interface SignupAccountResponse {
  customer_no: number;
  access_token: string;
  expires_in: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordScore(pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string; tone: string } {
  if (pw.length === 0) return { level: 0, label: "", tone: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  // 0→너무 짧음, 1~2→약함, 3→보통, 4+→강함
  if (pw.length < 8) return { level: 1, label: "너무 짧음", tone: "text-destructive" };
  if (score <= 2) return { level: 2, label: "약함", tone: "text-warning" };
  if (score === 3) return { level: 3, label: "보통", tone: "text-warning" };
  return { level: 4, label: "강함", tone: "text-success" };
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  // 11자리 010-XXXX-XXXX, 10자리(02 등) 02-XXX-XXXX 또는 0XX-XXX-XXXX
  if (digits.startsWith("02") && digits.length <= 10) {
    return digits.length <= 9
      ? `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
      : `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
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

  const pwScore = useMemo(() => passwordScore(form.password), [form.password]);
  const emailValid = form.email === "" || EMAIL_RE.test(form.email);
  const pwConfirmTouched = form.password_confirm.length > 0;
  const pwMatch = form.password === form.password_confirm;
  const canSubmit =
    !loading &&
    EMAIL_RE.test(form.email) &&
    pwScore.level >= 2 &&
    pwMatch &&
    form.phone_main.length >= 9 &&
    form.address_main.trim().length > 0;

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
                aria-invalid={!emailValid}
              />
              {!emailValid ? (
                <p className="mt-1 text-[11px] text-destructive">이메일 형식이 올바르지 않습니다.</p>
              ) : null}
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
              {form.password ? (
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <div className="flex h-1 flex-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          i <= pwScore.level
                            ? pwScore.level === 1
                              ? "bg-destructive"
                              : pwScore.level === 2
                                ? "bg-warning"
                                : pwScore.level === 3
                                  ? "bg-warning/80"
                                  : "bg-success"
                            : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <span className={cn("min-w-12 text-right", pwScore.tone)}>{pwScore.label}</span>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  8자 이상 · 대소문자·숫자·특수문자 조합 권장
                </p>
              )}
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
                aria-invalid={pwConfirmTouched && !pwMatch}
              />
              {pwConfirmTouched ? (
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    pwMatch ? "text-success" : "text-destructive",
                  )}
                >
                  {pwMatch ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
                </p>
              ) : null}
            </Field>
            <Field label="휴대폰" required>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone_main}
                onChange={(e) => patch("phone_main", formatPhone(e.target.value))}
                disabled={loading}
                placeholder="010-1234-5678"
                maxLength={13}
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
            <Button type="submit" className="w-full" disabled={!canSubmit}>
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