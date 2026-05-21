"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";

interface NoticeItem {
  id: number;
  title: string;
  category_cd: string | null;
  pinned: boolean;
  published_at: string;
  view_count: number;
}

interface NoticeListResponse {
  items: NoticeItem[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  SYSTEM: "시스템",
  SECURITY: "보안",
  SERVICE: "서비스",
  POLICY: "정책",
};

function fmt(d: string): string {
  try {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function NoticesPage() {
  const { data, loading } = useFetch<NoticeListResponse>("/api/notices");

  if (loading && !data) return <Spinner label="공지사항 불러오는 중…" />;

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">공지사항</h1>
        <p className="text-xs text-muted-foreground">
          다온뱅크의 주요 안내사항을 모아 보여드립니다.
        </p>
      </div>
      <div className="space-y-2">
        {(data?.items ?? []).map((n) => (
          <Link key={n.id} href={`/notices/${n.id}`} className="block">
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="space-y-1.5 pb-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {n.pinned && (
                    <span className="rounded bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">
                      고정
                    </span>
                  )}
                  {n.category_cd && (
                    <span className="rounded border bg-background px-1.5 py-0.5">
                      {CATEGORY_LABEL[n.category_cd] ?? n.category_cd}
                    </span>
                  )}
                  <span className="ml-auto">{fmt(n.published_at)}</span>
                  <span>· 조회 {n.view_count}</span>
                </div>
                <CardTitle className="text-sm font-medium">{n.title}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {data?.items.length === 0 && (
          <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            등록된 공지사항이 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}