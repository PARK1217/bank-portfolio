"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ShieldOff, LogOut } from "lucide-react";

/**
 * 관리자 자동 로그아웃 안내 페이지.
 *
 * 진입 경로
 *  - 토큰 만료(E_TOKEN_EXPIRED / 401)            : ?reason=expired
 *  - 토큰 위조·세션 만료(SESSION_STATUS=LOGOUT)  : ?reason=invalid
 *  - 다른 세션 작업으로 backend 임시 down 등     : ?reason=disconnected
 *  - 직접 진입 / reason 없음                      : expired 폴백
 *
 * `AdminAuthProvider` 가 이미 setAdminToken(null) + setAdmin(null) 한 뒤
 * 라우팅하므로, 이 화면에서는 추가 처리 없이 안내 + 재로그인 CTA 만 노출.
 */

const REASONS: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  expired: {
    title: "로그인 세션이 만료되었습니다",
    body: "보안 정책에 따라 일정 시간이 지나면 자동 로그아웃됩니다. 다시 로그인해 주세요.",
    icon: <Clock className="h-8 w-8 text-primary" />,
  },
  invalid: {
    title: "로그인 정보가 더 이상 유효하지 않습니다",
    body: "다른 곳에서 로그아웃되었거나 세션이 종료되었습니다. 보안을 위해 다시 로그인해 주세요.",
    icon: <ShieldOff className="h-8 w-8 text-destructive" />,
  },
  disconnected: {
    title: "서버 점검으로 연결이 끊겼습니다",
    body: "일시적인 백엔드 점검·재기동으로 세션이 종료되었습니다. 잠시 후 다시 로그인해 주세요.",
    icon: <LogOut className="h-8 w-8 text-warning" />,
  },
  idle: {
    title: "오랜 시간 활동이 없어 로그아웃되었습니다",
    body: "관리자 콘솔은 일정 시간 활동이 없으면 자동 로그아웃됩니다. 다시 로그인해 주세요.",
    icon: <Clock className="h-8 w-8 text-muted-foreground" />,
  },
};


function AutoLogoutBody() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "expired";
  const meta = REASONS[reason] ?? REASONS.expired;

  return (
    <Card className="w-[420px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          {meta.icon}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              DA-ON BANK · ADMIN
            </div>
            <CardTitle className="mt-0.5">{meta.title}</CardTitle>
          </div>
        </div>
        <CardDescription className="mt-3">{meta.body}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link href="/login" className="block">
          <Button className="w-full">다시 로그인</Button>
        </Link>
        <p className="text-center text-[10px] text-muted-foreground">
          모든 관리자 호출은 ADMIN_AUDIT_LOG 에 자동 기록되어 보호됩니다.
        </p>
      </CardContent>
    </Card>
  );
}


export default function AutoLogoutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--sidebar))]">
      <Suspense
        fallback={
          <Card className="w-[420px]">
            <CardHeader>
              <CardTitle>로그아웃 처리 중…</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <AutoLogoutBody />
      </Suspense>
    </main>
  );
}