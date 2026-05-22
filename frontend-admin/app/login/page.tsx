"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [employeeNo, setEmployeeNo] = useState("ADMIN001");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeNo || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(employeeNo.trim(), password);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "로그인에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--sidebar))]">
      <Card className="w-[360px]">
        <CardHeader>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">DA-ON BANK</div>
          <CardTitle className="mt-1 text-xl">Admin Console</CardTitle>
          <CardDescription>임직원 계정으로 로그인</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">사번</span>
              <Input
                value={employeeNo}
                onChange={(e) => setEmployeeNo(e.target.value)}
                placeholder="ADMIN001"
                autoComplete="username"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">비밀번호</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "확인 중…" : "로그인"}
            </Button>
            <p className="pt-1 text-center text-[10px] text-muted-foreground">
              시드 직원: <span className="font-mono">ADMIN001</span> / <span className="font-mono">admin1234</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}