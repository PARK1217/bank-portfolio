"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";

interface EventDetail {
  id: number;
  title: string;
  summary: string | null;
  body: string;
  banner_url: string | null;
  period_start: string | null;
  period_end: string | null;
  status_cd: string;
  author: string | null;
  published_at: string;
  view_count: number;
  prev_id: number | null;
  next_id: number | null;
}

function fmtRange(s: string | null, e: string | null): string {
  if (!s && !e) return "상시";
  const ss = s ? new Date(s).toLocaleDateString("ko-KR") : "";
  const ee = e ? new Date(e).toLocaleDateString("ko-KR") : "";
  return `${ss} ~ ${ee}`;
}

type EventState = "upcoming" | "ongoing" | "ended" | "always";

function eventState(s: string | null, e: string | null): EventState {
  if (!s && !e) return "always";
  const today = new Date().toISOString().slice(0, 10);
  if (s && s > today) return "upcoming";
  if (e && e < today) return "ended";
  return "ongoing";
}

function daysBetween(today: string, target: string): number {
  // YYYY-MM-DD 두 날짜의 정수 일수 차 (target - today). 시각 무시.
  const d1 = Date.parse(today + "T00:00:00");
  const d2 = Date.parse(target.slice(0, 10) + "T00:00:00");
  return Math.round((d2 - d1) / 86_400_000);
}

function countdownLabel(state: EventState, s: string | null, e: string | null): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (state === "upcoming" && s) {
    const d = daysBetween(today, s);
    if (d === 0) return "오늘 시작";
    if (d === 1) return "내일 시작";
    return `D-${d}일 후 시작`;
  }
  if (state === "ongoing" && e) {
    const d = daysBetween(today, e);
    if (d === 0) return "오늘 종료";
    if (d === 1) return "내일 종료";
    return `종료까지 D-${d}`;
  }
  return null;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading } = useFetch<EventDetail>(`/api/events/${params.id}`);

  // 조회수 hit — 같은 id 에 대해 1회만 (Strict Mode 중복 회피).
  const hitRef = useRef<string | null>(null);
  useEffect(() => {
    if (!params.id) return;
    if (hitRef.current === params.id) return;
    hitRef.current = params.id;
    void apiFetch(`/api/events/${params.id}/hit`, { method: "POST" }).catch(() => {});
  }, [params.id]);

  const [copied, setCopied] = useState(false);
  async function copyLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  if (loading && !data) return <Spinner label="불러오는 중…" />;

  if (!data) {
    return (
      <main className="container max-w-3xl py-8">
        <p className="text-sm text-muted-foreground">이벤트를 찾을 수 없습니다.</p>
        <Link href="/events" className="text-xs text-primary hover:underline">
          ← 이벤트 목록
        </Link>
      </main>
    );
  }

  const state = eventState(data.period_start, data.period_end);
  const countdown = countdownLabel(state, data.period_start, data.period_end);

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground">
          ← 이벤트 목록
        </Link>
      </div>
      <Card className={cn(state === "ended" ? "opacity-60" : "")}>
        <CardContent className="space-y-4 py-6">
          {data.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.banner_url}
              alt={data.title}
              className={cn(
                "w-full rounded-md object-cover",
                state === "ended" ? "grayscale" : "",
              )}
            />
          )}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-medium",
                  state === "ongoing"
                    ? "bg-primary text-primary-foreground"
                    : state === "upcoming"
                      ? "bg-warning/15 text-warning"
                      : state === "ended"
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent",
                )}
              >
                {state === "ongoing"
                  ? "진행중"
                  : state === "upcoming"
                    ? "예정"
                    : state === "ended"
                      ? "종료"
                      : "상시"}
              </span>
              {countdown ? (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 font-medium",
                    state === "ongoing" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                  )}
                >
                  {countdown}
                </span>
              ) : null}
            </div>
            <h1 className="text-lg font-semibold leading-snug">{data.title}</h1>
            {data.summary && (
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>기간 · {fmtRange(data.period_start, data.period_end)}</span>
            <span>· 조회 {data.view_count}</span>
            {data.author && <span>· {data.author}</span>}
            <button
              type="button"
              onClick={copyLink}
              className="ml-auto rounded border bg-background px-1.5 py-0.5 hover:bg-accent"
              aria-label="링크 복사"
            >
              {copied ? "복사됨 ✓" : "🔗 공유"}
            </button>
          </div>
          {state === "ended" ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              종료된 이벤트입니다.
            </div>
          ) : null}
          <div className="whitespace-pre-wrap text-sm leading-7">{data.body}</div>
        </CardContent>
      </Card>
      {(data.prev_id || data.next_id) && (
        <nav className="mt-4 flex items-center justify-between gap-2 text-sm">
          {data.prev_id ? (
            <Link
              href={`/events/${data.prev_id}`}
              className="rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              ← 이전 이벤트
            </Link>
          ) : (
            <span className="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              ← 이전 없음
            </span>
          )}
          {data.next_id ? (
            <Link
              href={`/events/${data.next_id}`}
              className="rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              다음 이벤트 →
            </Link>
          ) : (
            <span className="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              다음 없음 →
            </span>
          )}
        </nav>
      )}
    </main>
  );
}