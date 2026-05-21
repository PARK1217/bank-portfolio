"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";

interface EventItem {
  id: number;
  title: string;
  summary: string | null;
  banner_url: string | null;
  period_start: string | null;
  period_end: string | null;
  status_cd: string;
  published_at: string;
  view_count: number;
}

interface EventListResponse {
  items: EventItem[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

function fmtRange(s: string | null, e: string | null): string {
  if (!s && !e) return "상시";
  const ss = s ? new Date(s).toLocaleDateString("ko-KR") : "";
  const ee = e ? new Date(e).toLocaleDateString("ko-KR") : "";
  return `${ss} ~ ${ee}`;
}

function isOngoing(s: string | null, e: string | null): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (s && s > today) return false;
  if (e && e < today) return false;
  return true;
}

export default function EventsPage() {
  const { data, loading } = useFetch<EventListResponse>("/api/events");

  if (loading && !data) return <Spinner label="이벤트 불러오는 중…" />;

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">이벤트</h1>
        <p className="text-xs text-muted-foreground">
          다온뱅크의 진행 중인 프로모션과 혜택을 확인하세요.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.items ?? []).map((ev) => (
          <Link key={ev.id} href={`/events/${ev.id}`} className="block">
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span
                    className={
                      "rounded px-1.5 py-0.5 font-medium " +
                      (isOngoing(ev.period_start, ev.period_end)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {isOngoing(ev.period_start, ev.period_end) ? "진행중" : "종료"}
                  </span>
                  <span className="ml-auto">조회 {ev.view_count}</span>
                </div>
                <CardTitle className="text-sm font-medium leading-snug">
                  {ev.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-xs">
                {ev.summary && (
                  <p className="text-muted-foreground line-clamp-2">{ev.summary}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  기간 · {fmtRange(ev.period_start, ev.period_end)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {data?.items.length === 0 && (
          <p className="col-span-full rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            등록된 이벤트가 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}