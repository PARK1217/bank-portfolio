"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { showApiError } from "@/lib/toast";


/**
 * SCR-SC-002 비밀번호 변경.
 *
 * - 새 비밀번호 정책 (클라이언트 1차 검증): 8자 이상 + 문자/숫자/특수 중 2종 이상
 * - 성공 시 sheet 02 정책에 따라 백엔드가 모든 단기 토큰 폐기 →
 *   클라이언트도 즉시 signOut() + /login 으로 이동 (보안 표준 UX)
 */

function passwordRules(pw: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (pw.length < 8) reasons.push("8자 이상");
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);
  const variety = [hasLetter, hasDigit, hasSpecial].filter(Boolean).length;
  if (variety < 2) reasons.push("문자·숫자·특수문자 중 2종 이상");
  return { ok: reasons.length === 0, reasons };
}


function PasswordForm() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const newRules = useMemo(() => passwordRules(next), [next]);
  const confirmOk = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && newRules.ok && confirmOk && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.patch("/api/security/password", {
        current_password: current,
        new_password: next,
        new_password_confirm: confirm,
      });
      toast.success("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
      signOut();
      router.push("/login");
    } catch (err) {
      showApiError(err, "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>        <CardTitle className="mt-1">비밀번호 변경</CardTitle>
        <CardDescription>
          변경 즉시 모든 단기 토큰이 폐기되어 다시 로그인이 필요합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="현재 비밀번호" required>
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={loading}
              required
            />
          </Field>

          <Field label="새 비밀번호" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />
            {next.length > 0 && !newRules.ok ? (
              <p className="mt-1 text-xs text-destructive">
                다음 조건을 충족해야 합니다 — {newRules.reasons.join(", ")}.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                8자 이상 + 문자·숫자·특수문자 중 2종 이상.
              </p>
            )}
          </Field>

          <Field label="새 비밀번호 확인" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />
            {confirm.length > 0 && !confirmOk ? (
              <p className="mt-1 text-xs text-destructive">새 비밀번호와 일치하지 않습니다.</p>
            ) : null}
          </Field>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? "변경 중…" : "비밀번호 변경"}
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
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <PasswordForm />
      </main>
    </Protected>
  );
}