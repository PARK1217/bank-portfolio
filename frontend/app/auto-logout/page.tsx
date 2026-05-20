"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IDLE_TIMEOUT_MINUTES } from "@/lib/auth";

/**
 * 자동 로그아웃 안내 페이지.
 *
 * 진입 경로
 *  - Layer A (idle 타임아웃)            : ?reason=idle
 *  - Layer B (E_TOKEN_EXPIRED)          : ?reason=expired
 *  - Layer B (E_TOKEN_INVALID)          : ?reason=invalid
 *  - 직접 진입(권한 만료된 페이지에서 등) : reason 없음 → idle 메시지 폴백
 *
 * AuthProvider 가 이미 signOut() 한 뒤 라우팅하므로,
 * 이 화면에선 추가 처리 없이 안내 + 재로그인 CTA 만 노출.
 */

const REASONS: Record<string, { title: string; body: string }> = {
  idle: {
    title: "자동 로그아웃되었습니다",
    body: `${IDLE_TIMEOUT_MINUTES}분간 활동이 감지되지 않아 안전을 위해 로그아웃 처리되었습니다.`,
  },
  expired: {
    title: "로그인 세션이 만료되었습니다",
    body: "로그인 유효 시간이 지나 다시 로그인이 필요합니다.",
  },
  invalid: {
    title: "로그인 정보가 더 이상 유효하지 않습니다",
    body: "보안상의 이유로 세션이 종료되었습니다. 다시 로그인해 주세요.",
  },
};

function AutoLogoutBody() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "idle";
  const meta = REASONS[reason] ?? REASONS.idle;

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">자동 로그아웃</div>
        <CardTitle className="mt-1">{meta.title}</CardTitle>
        <CardDescription>{meta.body}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          다시 로그인
        </Link>
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            홈으로
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AutoLogoutPage() {
  return (
    <main className="container max-w-md py-16 animate-fade-in">
      <Suspense
        fallback={
          <Card>
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