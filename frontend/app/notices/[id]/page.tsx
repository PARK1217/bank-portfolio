"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";

interface NoticeDetail {
  id: number;
  title: string;
  body: string;
  category_cd: string | null;
  pinned: boolean;
  author: string | null;
  published_at: string;
  view_count: number;
  prev_id: number | null;
  next_id: number | null;
}

export default function NoticeDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading } = useFetch<NoticeDetail>(`/api/notices/${params.id}`);

  const hitRef = useRef<string | null>(null);
  useEffect(() => {
    if (!params.id) return;
    if (hitRef.current === params.id) return;
    hitRef.current = params.id;
    void apiFetch(`/api/notices/${params.id}/hit`, { method: "POST" }).catch(() => {});
  }, [params.id]);

  if (loading && !data) return <Spinner label="불러오는 중…" />;
  if (!data) {
    return (
      <main className="container max-w-3xl py-8">
        <p className="text-sm text-muted-foreground">공지사항을 찾을 수 없습니다.</p>
        <Link href="/notices" className="text-xs text-primary hover:underline">
          ← 공지사항 목록
        </Link>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/notices" className="text-xs text-muted-foreground hover:text-foreground">
          ← 공지사항 목록
        </Link>
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {data.pinned && (
                <span className="rounded bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">
                  고정
                </span>
              )}
              {data.category_cd && (
                <span className="rounded border bg-background px-1.5 py-0.5">
                  {data.category_cd}
                </span>
              )}
              <span className="ml-auto">{new Date(data.published_at).toLocaleString("ko-KR")}</span>
              <span>· 조회 {data.view_count}</span>
            </div>
            <h1 className="text-lg font-semibold leading-snug">{data.title}</h1>
            {data.author && (
              <p className="text-xs text-muted-foreground">{data.author}</p>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7">{data.body}</div>
        </CardContent>
      </Card>
      {(data.prev_id || data.next_id) && (
        <nav className="mt-4 flex items-center justify-between gap-2 text-sm">
          {data.prev_id ? (
            <Link
              href={`/notices/${data.prev_id}`}
              className="rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              ← 이전 공지
            </Link>
          ) : (
            <span className="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              ← 이전 없음
            </span>
          )}
          {data.next_id ? (
            <Link
              href={`/notices/${data.next_id}`}
              className="rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              다음 공지 →
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