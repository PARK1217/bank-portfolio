"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-AU-005 회원가입 — 사업자·법인. (두리테크 시드 활용) */

interface CorpSignupResponse {
  customer_no: number;
  access_token: string;
}


export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState({
    business_no: "",
    corp_name: "",
    corp_reg_no: "",
    representative_name: "",
    representative_resident_no: "",
    business_type: "",
    business_item: "",
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

  const canSubmit =
    !loading &&
    agreed &&
    form.business_no.length >= 10 &&
    form.corp_name &&
    form.representative_name &&
    form.email &&
    form.password.length >= 8 &&
    form.password === form.password_confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post<CorpSignupResponse>(
        "/api/signup/corporation",
        { ...form, agreed_terms: true },
        { token: null, idempotent: true },
      );
      router.push("/signup/complete");
    } catch (err) {
      showApiError(err, "법인 가입에 실패했습니다.");
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
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-005</div>
          <CardTitle className="mt-1">사업자·법인 가입</CardTitle>
          <CardDescription>
            사업자등록증·법인등기부등본 정보로 가입합니다. 대표자 본인 인증이 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="사업자등록번호 *" placeholder="000-00-00000">
              <Input
                inputMode="numeric"
                pattern="\d{3}-\d{2}-\d{5}|\d{10}"
                value={form.business_no}
                onChange={(e) => patch("business_no", e.target.value)}
                required
              />
            </Field>
            <Field label="법인명 *">
              <Input value={form.corp_name} onChange={(e) => patch("corp_name", e.target.value)} required />
            </Field>
            <Field label="법인등록번호">
              <Input
                value={form.corp_reg_no}
                onChange={(e) => patch("corp_reg_no", e.target.value)}
                placeholder="법인일 때만 입력"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="대표자 성명 *">
                <Input
                  value={form.representative_name}
                  onChange={(e) => patch("representative_name", e.target.value)}
                  required
                />
              </Field>
              <Field label="대표자 주민번호 *">
                <Input
                  pattern="\d{6}-\d{7}"
                  placeholder="900101-1234567"
                  value={form.representative_resident_no}
                  onChange={(e) => patch("representative_resident_no", e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="업태">
                <Input
                  value={form.business_type}
                  onChange={(e) => patch("business_type", e.target.value)}
                  placeholder="예: 정보통신업"
                />
              </Field>
              <Field label="종목">
                <Input
                  value={form.business_item}
                  onChange={(e) => patch("business_item", e.target.value)}
                  placeholder="예: 소프트웨어 개발"
                />
              </Field>
            </div>
            <Field label="사업장 주소 *">
              <Input value={form.address_main} onChange={(e) => patch("address_main", e.target.value)} required />
            </Field>
            <Field label="대표 전화 *">
              <Input
                type="tel"
                value={form.phone_main}
                onChange={(e) => patch("phone_main", e.target.value)}
                required
              />
            </Field>
            <Field label="이메일 (로그인 ID) *">
              <Input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
                required
              />
            </Field>
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
            <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                여신·수신 거래 기본약관, 전자금융거래 이용약관, 개인(신용)정보 수집·이용 동의를 확인하고 동의합니다.
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? "가입 처리 중…" : "법인 가입 신청"}
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