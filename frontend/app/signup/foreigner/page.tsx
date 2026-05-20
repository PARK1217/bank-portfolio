"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-AU-006 회원가입 — 외국인. (John Smith 시드 활용) */


export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState({
    passport_no: "",
    foreigner_reg_no: "",
    full_name_en: "",
    nationality: "USA",
    birth_date: "",
    visa_type: "E-7",
    visa_expiry: "",
    address_main: "",
    phone_main: "",
    email: "",
    password: "",
    password_confirm: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  function patch<K extends keyof typeof form>(k: K, v: string) {
    setForm((cur) => ({ ...cur, [k]: v }));
  }

  const today = new Date().toISOString().slice(0, 10);
  const expiryOk = !form.visa_expiry || form.visa_expiry > today;
  const canSubmit =
    !loading &&
    agreed &&
    form.passport_no &&
    form.full_name_en &&
    form.nationality &&
    form.email &&
    form.password.length >= 8 &&
    form.password === form.password_confirm &&
    expiryOk;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post(
        "/api/signup/foreigner",
        { ...form, agreed_terms: true },
        { token: null, idempotent: true },
      );
      router.push("/signup/complete");
    } catch (err) {
      showApiError(err, "외국인 가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/signup" className="text-xs text-muted-foreground hover:text-foreground">
          ← 가입 안내로
        </Link>
      </div>
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-006</div>
          <CardTitle className="mt-1">외국인 가입 (Foreigner Signup)</CardTitle>
          <CardDescription>
            여권·외국인등록증 정보로 가입합니다. 비자 유효기간 이상의 거래 기간을 선택할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Full name (passport) *">
              <Input
                value={form.full_name_en}
                onChange={(e) => patch("full_name_en", e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="여권번호 / Passport No *">
                <Input
                  value={form.passport_no}
                  onChange={(e) => patch("passport_no", e.target.value)}
                  required
                />
              </Field>
              <Field label="외국인등록번호">
                <Input
                  value={form.foreigner_reg_no}
                  onChange={(e) => patch("foreigner_reg_no", e.target.value)}
                  placeholder="국내 거주자만"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="국적 *">
                <Input
                  value={form.nationality}
                  onChange={(e) => patch("nationality", e.target.value.toUpperCase())}
                  placeholder="USA / CHN / VNM / ..."
                  required
                />
              </Field>
              <Field label="생년월일 *">
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => patch("birth_date", e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="비자 유형 *">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.visa_type}
                  onChange={(e) => patch("visa_type", e.target.value)}
                >
                  {["D-2", "D-4", "D-7", "D-8", "D-10", "E-1", "E-2", "E-7", "F-2", "F-4", "F-5", "F-6", "H-1", "H-2"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="비자 만료일 *">
                <Input
                  type="date"
                  min={today}
                  value={form.visa_expiry}
                  onChange={(e) => patch("visa_expiry", e.target.value)}
                  required
                />
                {!expiryOk ? (
                  <p className="mt-1 text-xs text-destructive">비자가 만료되었습니다.</p>
                ) : null}
              </Field>
            </div>
            <Field label="국내 주소 *">
              <Input value={form.address_main} onChange={(e) => patch("address_main", e.target.value)} required />
            </Field>
            <Field label="휴대폰 *">
              <Input
                type="tel"
                value={form.phone_main}
                onChange={(e) => patch("phone_main", e.target.value)}
                required
              />
            </Field>
            <Field label="Email (로그인 ID) *">
              <Input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="비밀번호 *">
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => patch("password", e.target.value)}
                  required
                />
              </Field>
              <Field label="비밀번호 확인 *">
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password_confirm}
                  onChange={(e) => patch("password_confirm", e.target.value)}
                  required
                />
              </Field>
            </div>
            <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the Terms of Service, Privacy Policy, and consent to credit information collection.
                (본행 약관 동의)
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? "Processing…" : "Sign up / 가입 신청"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({
  label,
  children,
  placeholder,
}: {
  label: string;
  children: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {placeholder ? <span className="hidden">{placeholder}</span> : null}
    </label>
  );
}