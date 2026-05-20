"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-AU-011 비밀번호 찾기·재설정. 본인인증 → 새 비밀번호 설정. */


export default function Page() {
  const router = useRouter();
  const [stage, setStage] = useState<"IDENT" | "OTP" | "RESET" | "DONE">("IDENT");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [residentNo, setResidentNo] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const pwRules = useMemo(() => {
    const reasons: string[] = [];
    if (newPw.length < 8) reasons.push("8자 이상");
    const variety = [/[A-Za-z]/.test(newPw), /\d/.test(newPw), /[!@#$%^&*()_+\-=]/.test(newPw)].filter(Boolean).length;
    if (variety < 2) reasons.push("문자·숫자·특수 중 2종 이상");
    return { ok: reasons.length === 0, reasons };
  }, [newPw]);

  async function startIdent(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // mock: send OTP to phone
      await api.post(
        "/api/password/reset/init",
        { email, phone, resident_no: residentNo },
        { token: null },
      );
      setStage("OTP");
    } catch (err) {
      showApiError(err, "본인 확인을 시작하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post<{ verification_id: string }>(
        "/api/password/reset/verify",
        { email, otp_code: otp },
        { token: null },
      );
      setVerificationId(res.verification_id);
      setStage("RESET");
    } catch (err) {
      showApiError(err, "OTP 인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPw(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !pwRules.ok || newPw !== newPwConfirm) return;
    setLoading(true);
    try {
      await api.post(
        "/api/password/reset",
        {
          verification_id: verificationId,
          new_password: newPw,
          new_password_confirm: newPwConfirm,
        },
        { token: null },
      );
      setStage("DONE");
      toast.success("비밀번호가 재설정되었습니다.");
      window.setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      showApiError(err, "비밀번호 재설정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-12 animate-fade-in">
      <div className="mb-4">
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
          ← 로그인으로
        </Link>
      </div>
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-011 · {stage} 단계</div>
          <CardTitle className="mt-1">비밀번호 재설정</CardTitle>
          <CardDescription>
            본인 확인 후 새 비밀번호로 재설정합니다. 재설정 시 모든 단기 토큰이 폐기되어 다시 로그인이 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "IDENT" ? (
            <form onSubmit={startIdent} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">가입 시 등록한 이메일 *</span>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">휴대폰 *</span>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">주민번호 앞 6자리 *</span>
                <Input pattern="\d{6}" maxLength={6} value={residentNo} onChange={(e) => setResidentNo(e.target.value.replace(/[^0-9]/g, ""))} required />
              </label>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "확인 중…" : "OTP 발송"}
              </Button>
            </form>
          ) : null}

          {stage === "OTP" ? (
            <form onSubmit={verifyOtp} className="space-y-3">
              <p className="text-xs text-muted-foreground">{phone} 로 OTP 코드가 발송되었습니다.</p>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">6자리 OTP *</span>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  pattern="\d{6}"
                  required
                />
              </label>
              <Button type="submit" className="w-full" disabled={loading || !/^\d{6}$/.test(otp)}>
                {loading ? "확인 중…" : "OTP 확인"}
              </Button>
            </form>
          ) : null}

          {stage === "RESET" ? (
            <form onSubmit={resetPw} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">새 비밀번호 *</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                />
                {newPw && !pwRules.ok ? (
                  <p className="mt-1 text-xs text-destructive">{pwRules.reasons.join(", ")}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">8자 이상 · 문자·숫자·특수 중 2종 이상</p>
                )}
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">새 비밀번호 확인 *</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPwConfirm}
                  onChange={(e) => setNewPwConfirm(e.target.value)}
                  required
                />
              </label>
              <Button type="submit" className="w-full" disabled={loading || !pwRules.ok || newPw !== newPwConfirm}>
                {loading ? "재설정 중…" : "비밀번호 재설정"}
              </Button>
            </form>
          ) : null}

          {stage === "DONE" ? (
            <div className="space-y-2 rounded-md bg-success/10 p-4 text-center text-sm">
              <p className="font-semibold text-success">✓ 재설정 완료</p>
              <p className="text-xs text-muted-foreground">로그인 페이지로 이동합니다…</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}