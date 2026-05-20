"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { showApiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** SCR-AU-001 로그인 응답 — backend/app/schema/auth.py LoginResponse 와 동일. */
interface LoginResponse {
  access_token: string;
  expires_in: number;
  customer_no: number;
  requires_device_otp: boolean;
  account_tokens: string[];
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>(
        "/api/auth/login",
        { email, password },
        { token: null }, // 로그인 자체엔 기존 JWT 부착 X
      );
      signIn(res.access_token, res.customer_no);
      router.push(res.requires_device_otp ? "/setup/otp" : "/dashboard");
    } catch (err) {
      showApiError(err, "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-16 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-001</div>
          <CardTitle className="mt-1">로그인</CardTitle>
          <CardDescription>아이디와 비밀번호로 로그인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                이메일
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={50}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                비밀번호
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중…" : "로그인"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link href="/signup/terms" className="text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}