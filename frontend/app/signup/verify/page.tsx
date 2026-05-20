"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSignupSession, patchSignupSession } from "@/lib/signup-session";
import { showApiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface VerifyResponse {
  verification_id: string;
  party_id: number;
}

export default function SignupVerifyPage() {
  const router = useRouter();
  const [residentNo, setResidentNo] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // 가입 흐름 가드 — 약관 동의 안 했으면 첫 단계로
  useEffect(() => {
    if (!getSignupSession().agreedTermsAt) {
      router.replace("/signup/terms");
    }
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post<VerifyResponse>(
        "/api/signup/verify",
        { resident_no: residentNo, phone, otp_code: otp },
        { token: null },
      );
      patchSignupSession({
        verificationId: res.verification_id,
        partyId: res.party_id,
      });
      router.push("/signup/account");
    } catch (err) {
      showApiError(err, "본인인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-12 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-003 · 2/4</div>
          <CardTitle className="mt-1">본인인증</CardTitle>
          <CardDescription>주민번호 / 휴대폰 / 인증번호를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="주민번호" required>
              <Input
                placeholder="900101-1234567"
                pattern="\d{6}-\d{7}"
                title="900101-1234567 형식"
                value={residentNo}
                onChange={(e) => setResidentNo(e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <Field label="휴대폰" required>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <Field label="인증번호" required>
              <Input
                inputMode="numeric"
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중…" : "다음"}
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