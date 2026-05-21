"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";

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

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground">
          ← 이벤트 목록
        </Link>
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          {data.banner_url && (
            <img
              src={data.banner_url}
              alt={data.title}
              className="w-full rounded-md object-cover"
            />
          )}
          <div className="space-y-1">
            <h1 className="text-lg font-semibold leading-snug">{data.title}</h1>
            {data.summary && (
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>기간 · {fmtRange(data.period_start, data.period_end)}</span>
            <span>· 조회 {data.view_count}</span>
            {data.author && <span>· {data.author}</span>}
          </div>
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