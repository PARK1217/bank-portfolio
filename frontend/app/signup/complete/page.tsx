"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSignupSession } from "@/lib/signup-session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const REDIRECT_DELAY_MS = 4000;
const REDIRECT_TARGET = "/setup/simple-pin"; // AU-007 → AU-008

export default function SignupCompletePage() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(Math.ceil(REDIRECT_DELAY_MS / 1000));

  useEffect(() => {
    clearSignupSession();
    const tick = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    const t = setTimeout(() => router.push(REDIRECT_TARGET), REDIRECT_DELAY_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(t);
    };
  }, [router]);

  return (
    <main className="container max-w-md py-16 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-007 · 4/4</div>
          <CardTitle className="mt-1">가입이 완료되었습니다 🎉</CardTitle>
          <CardDescription>
            안전한 거래를 위해 간편비밀번호(6자리 PIN)를 설정해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {remaining > 0
              ? `${remaining}초 후 간편비밀번호 설정 화면으로 이동합니다.`
              : "이동 중입니다…"}
          </p>
          <div className="flex gap-2">
            <Link
              href={REDIRECT_TARGET}
              className={cn(buttonVariants(), "flex-1")}
            >
              지금 설정하기
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}