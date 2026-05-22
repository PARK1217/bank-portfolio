"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StagedLoader — 시간이 지남에 따라 단계별 메시지를 회전 표시하는 로딩 표시.
 *
 * 단조로운 "처리 중..." 보다 사용자가 무엇이 진행되고 있는지 감을 잡을 수 있게
 * messages 배열을 intervalMs 마다 다음 메시지로 전환. 마지막 메시지는 작업이
 * 길어져도 계속 머무름 (loop 하지 않음). 옵션으로 점 3개가 살짝 흔들리는
 * "..." 애니메이션.
 *
 * 사용 예:
 *   <StagedLoader messages={["질문 이해 중", "약관 찾는 중", ...]} />
 */
export interface StagedLoaderProps {
  messages: string[];
  /** 메시지 사이 간격 ms. 기본 2500 */
  intervalMs?: number;
  /** Loader2 아이콘 크기 */
  size?: "sm" | "md" | "lg";
  /** dots 애니메이션 부착 여부 (기본 true) */
  withDots?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<StagedLoaderProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StagedLoader({
  messages,
  intervalMs = 2500,
  size = "sm",
  withDots = true,
  className,
}: StagedLoaderProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIdx((cur) => (cur < messages.length - 1 ? cur + 1 : cur));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [messages.length, intervalMs]);

  const current = messages[idx] ?? messages[messages.length - 1] ?? "";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin text-primary", SIZE_MAP[size])} />
      <span className="transition-opacity duration-300">{current}</span>
      {withDots ? <Dots /> : null}
    </div>
  );
}


function Dots() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
      <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:200ms]" />
      <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:400ms]" />
    </span>
  );
}
