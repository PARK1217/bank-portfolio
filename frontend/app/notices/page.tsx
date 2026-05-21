"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";


// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface NoticeItem {
  id: number;
  title: string;
  category_cd: string | null;
  pinned: boolean;
  published_at: string;
  view_count: number;
}

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

interface BoardListResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}


// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

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


// ---------------------------------------------------------------------------
// 페이지 — 탭 통합 뷰
// ---------------------------------------------------------------------------

type Tab = "notices" | "events";

export default function NoticesPage() {
  const [tab, setTab] = useState<Tab>("notices");

  // 두 종류 모두 동시에 가져옴 (탭 전환 시 재호출 X)
  const noticeRes = useFetch<BoardListResponse<NoticeItem>>("/api/notices");
  const eventRes = useFetch<BoardListResponse<EventItem>>("/api/events");

  const loading = (noticeRes.loading && !noticeRes.data) || (eventRes.loading && !eventRes.data);

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">공지·이벤트</h1>
        <p className="text-xs text-muted-foreground">
          다온뱅크의 주요 안내와 진행 중인 이벤트를 확인하세요.
        </p>
      </div>

      {/* ----- 탭 ----- */}
      <div role="tablist" className="mb-4 flex gap-1 border-b">
        <TabBtn active={tab === "notices"} onClick={() => setTab("notices")}>
          공지사항
          <span className="ml-1.5 text-[10px] opacity-60">
            {noticeRes.data?.total ?? "·"}
          </span>
        </TabBtn>
        <TabBtn active={tab === "events"} onClick={() => setTab("events")}>
          이벤트
          <span className="ml-1.5 text-[10px] opacity-60">
            {eventRes.data?.total ?? "·"}
          </span>
        </TabBtn>
      </div>

      {loading ? (
        <Spinner label={tab === "notices" ? "공지사항 불러오는 중…" : "이벤트 불러오는 중…"} />
      ) : tab === "notices" ? (
        <NoticeList items={noticeRes.data?.items ?? []} />
      ) : (
        <EventList items={eventRes.data?.items ?? []} />
      )}
    </main>
  );
}


function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}


function NoticeList({ items }: { items: NoticeItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        등록된 공지사항이 없습니다.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((n) => (
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
    </div>
  );
}


function EventList({ items }: { items: EventItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        등록된 이벤트가 없습니다.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((ev) => (
        <Link key={ev.id} href={`/events/${ev.id}`} className="block">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium",
                    isOngoing(ev.period_start, ev.period_end)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
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
    </div>
  );
}