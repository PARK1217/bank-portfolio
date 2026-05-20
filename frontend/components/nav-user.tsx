"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { IdleCountdown } from "@/components/idle-countdown";

/**
 * 우측 상단 인증 상태 + 로그아웃.
 * 미로그인  → "로그인" 링크
 * 로그인 됨 → "고객 #N · 로그아웃"
 */
export function NavUser() {
  const { isAuthenticated, customerNo, signOut, isReady } = useAuth();
  const router = useRouter();

  if (!isReady) {
    // localStorage 초기 동기화 전 — 잠시 비워둠 (깜빡임 방지)
    return <div className="h-7 w-20" aria-hidden />;
  }

  if (!isAuthenticated) {
    return (
      <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
        로그인
      </Link>
    );
  }

  async function onLogout() {
    // 서버 측 기기접속이력 UPDATE — 실패해도 클라이언트 폐기는 계속
    try {
      await api.post("/api/auth/logout", null);
    } catch (err) {
      if (err instanceof ApiError) {
        console.warn("logout endpoint failed:", err.code, err.requestId);
      }
    }
    signOut();
    router.push("/login");
    toast.success("로그아웃되었습니다.");
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <IdleCountdown />
      <span className="text-muted-foreground">
        고객 <span className="font-mono">#{customerNo ?? "-"}</span>
      </span>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        로그아웃
      </Button>
    </div>
  );
}