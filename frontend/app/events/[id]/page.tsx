"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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
    </main>
  );
}