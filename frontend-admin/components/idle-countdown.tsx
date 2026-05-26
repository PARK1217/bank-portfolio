"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * 관리자 세션 만료(JWT exp)까지 남은 시간 + 수동 연장 버튼.
 *
 * 색상 단계
 *  - >= 3분  : muted
 *  - 1~3분   : warning (주황)
 *  - <  1분  : destructive (빨강) — 콘솔 경고 1회 발화됨 (lib/auth.tsx)
 *
 * 연장 성공 시 chip 이 잠깐 primary 톤으로 강조됨 (시각적 피드백, 토스트 미사용).
 */
export function IdleCountdown() {
  const { idleRemainingSec, admin, loading, refreshIdle, lastRefreshedAt } = useAdminAuth();
  const [justRefreshed, setJustRefreshed] = useState(false);

  useEffect(() => {
    if (!lastRefreshedAt) return;
    setJustRefreshed(true);
    const t = window.setTimeout(() => setJustRefreshed(false), 1500);
    return () => window.clearTimeout(t);
  }, [lastRefreshedAt]);

  if (loading || !admin || idleRemainingSec === null) return null;

  const mm = Math.floor(idleRemainingSec / 60).toString().padStart(2, "0");
  const ss = (idleRemainingSec % 60).toString().padStart(2, "0");

  const colorCls = justRefreshed
    ? "text-primary"
    : idleRemainingSec < 60
      ? "text-destructive"
      : idleRemainingSec < 180
        ? "text-warning"
        : "text-sidebar-foreground/70";

  return (
    <div className="flex items-center justify-between gap-1.5">
      <span
        title="세션 만료까지 남은 시간 — 만료 시 자동 로그아웃됩니다."
        className={cn(
          "font-mono text-[11px] tabular-nums transition-colors",
          colorCls,
        )}
        aria-label={`세션 만료까지 ${mm}분 ${ss}초 남음.`}
      >
        <span aria-hidden className="mr-1 opacity-60">⏱</span>
        {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={refreshIdle}
        title="세션을 30분 더 연장합니다."
        className="rounded-md border border-sidebar-foreground/20 bg-sidebar px-2 py-0.5 text-[10px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/10"
        aria-label="세션 30분 연장"
      >
        연장
      </button>
    </div>
  );
}