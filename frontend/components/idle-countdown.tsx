"use client";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * 세션 만료(JWT exp)까지 남은 시간 표시 (MM:SS).
 * 인증되지 않았거나 카운트다운이 활성화 안 됐으면 렌더링하지 않음.
 *
 * 색상 단계 (UI 경고)
 *  - >= 3분  : muted
 *  - 1~3분   : warning (주황)
 *  - <  1분  : destructive (빨강) — 60초 전 자동 토스트 경고 발화됨 (lib/auth.tsx)
 */
export function IdleCountdown() {
  const { idleRemainingSec, isAuthenticated, isReady, refreshIdle } = useAuth();

  if (!isReady || !isAuthenticated || idleRemainingSec === null) return null;

  const mm = Math.floor(idleRemainingSec / 60).toString().padStart(2, "0");
  const ss = (idleRemainingSec % 60).toString().padStart(2, "0");

  const colorCls =
    idleRemainingSec < 60
      ? "text-destructive"
      : idleRemainingSec < 180
        ? "text-warning"
        : "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={refreshIdle}
      title="세션 만료까지 남은 시간 — 만료 시 자동 로그아웃됩니다."
      className={cn(
        "num-tabular font-mono text-xs tabular-nums",
        "rounded-md px-2 py-1 hover:bg-accent transition-colors",
        colorCls,
      )}
      aria-label={`세션 만료까지 ${mm}분 ${ss}초 남음.`}
    >
      <span aria-hidden className="mr-1 opacity-60">⏱</span>
      {mm}:{ss}
    </button>
  );
}