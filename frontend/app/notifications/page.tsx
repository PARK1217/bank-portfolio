"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { notificationTypeLabel } from "@/lib/labels";


interface NotificationItem {
  id: number;
  type_cd: string;
  title: string;
  body_snippet: string;
  link_url: string | null;
  reference_id: number | null;
  reference_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  unread_by_type: Record<string, number>;
  page: number;
  size: number;
  has_next: boolean;
}

const TYPE_LABEL: Record<string, { label: string; icon: string }> = {
  TRANSFER: { label: "이체", icon: "💸" },
  AUTO_TRANSFER: { label: "자동이체", icon: "🔁" },
  LOAN: { label: "대출", icon: "🏦" },
  LOAN_DUE: { label: "대출", icon: "🏦" },
  FDS: { label: "보안", icon: "🛡️" },
  SECURITY: { label: "보안", icon: "🛡️" },
  SIGNUP: { label: "가입", icon: "🎉" },
  SYSTEM: { label: "시스템", icon: "⚙️" },
  MARKETING: { label: "혜택", icon: "🎁" },
};

interface TabDef {
  key: string;
  label: string;
  types: string[] | null;
}

const TABS: TabDef[] = [
  { key: "all", label: "전체", types: null },
  { key: "transfer", label: "거래", types: ["TRANSFER", "AUTO_TRANSFER"] },
  { key: "security", label: "보안", types: ["SECURITY", "FDS"] },
  { key: "loan", label: "대출", types: ["LOAN", "LOAN_DUE"] },
  { key: "etc", label: "기타", types: ["SIGNUP", "SYSTEM", "MARKETING"] },
];

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


function NotificationsContent() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [tabKey, setTabKey] = useState<string>("all");

  const activeTab = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  const qs = new URLSearchParams({ page: String(page), size: "30" });
  if (unreadOnly) qs.set("unread_only", "true");
  if (activeTab.types) qs.set("types", activeTab.types.join(","));

  const { data, error, loading, refetch } = useFetch<NotificationListResponse>(
    `/api/notifications?${qs.toString()}`,
  );

  const unreadByType = data?.unread_by_type ?? {};
  const unreadByTab = useMemo(() => {
    const sums: Record<string, number> = {};
    TABS.forEach((t) => {
      if (!t.types) sums[t.key] = Object.values(unreadByType).reduce((a, b) => a + b, 0);
      else sums[t.key] = t.types.reduce((acc, type) => acc + (unreadByType[type] ?? 0), 0);
    });
    return sums;
  }, [unreadByType]);

  useEffect(() => {
    if (error) showApiError(error, "알림을 불러오지 못했습니다.");
  }, [error]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const hasAnyUnread = (data?.unread_count ?? 0) > 0;

  async function markAllRead() {
    try {
      await api.post("/api/notifications/read", { ids: null });
      void refetch();
    } catch (err) {
      showApiError(err, "읽음 처리에 실패했습니다.");
    }
  }

  async function markOneRead(id: number) {
    try {
      await api.post("/api/notifications/read", { ids: [id] });
      void refetch();
    } catch (err) {
      showApiError(err, "읽음 처리에 실패했습니다.");
    }
  }

  if (loading && !data) return <Spinner label="알림 불러오는 중…" />;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="알림 카테고리"
        className="flex flex-wrap gap-1 border-b"
      >
        {TABS.map((t) => {
          const active = t.key === tabKey;
          const n = unreadByTab[t.key] ?? 0;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTabKey(t.key);
                setPage(1);
              }}
              className={cn(
                "relative -mb-px flex items-center gap-1 border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{t.label}</span>
              {n > 0 ? (
                <span className="num-tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {n > 99 ? "99+" : n}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          미읽음 <span className="num-tabular font-medium text-foreground">{data?.unread_count ?? 0}</span>건
        </div>
        <div className="flex gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setUnreadOnly((v) => !v);
              setPage(1);
            }}
          >
            {unreadOnly ? "전체" : "미읽음만"}
          </Button>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={!hasAnyUnread}>
            전체 읽음
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {unreadOnly
            ? `읽지 않은 ${tabKey === "all" ? "" : activeTab.label + " "}알림이 없습니다.`
            : `${tabKey === "all" ? "" : activeTab.label + " "}알림이 없습니다.`}
        </p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {items.map((n) => {
            const meta = TYPE_LABEL[n.type_cd] ?? { label: notificationTypeLabel(n.type_cd), icon: "🔔" };
            const inner = (
              <article
                className={cn(
                  "flex gap-3 p-3 text-sm transition-colors",
                  !n.is_read ? "bg-primary/5" : "",
                )}
              >
                <span aria-hidden className="select-none text-lg">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium",
                        !n.is_read ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {n.title}
                    </span>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {dtFmt.format(new Date(n.created_at))}
                    </time>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body_snippet}</p>
                </div>
                {!n.is_read ? (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    aria-label="읽지 않음"
                  />
                ) : null}
              </article>
            );
            return (
              <li key={n.id}>
                {n.link_url ? (
                  <Link
                    href={n.link_url}
                    onClick={() => {
                      if (!n.is_read) void markOneRead(n.id);
                    }}
                    className="block hover:bg-accent"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) void markOneRead(n.id);
                    }}
                    className="block w-full text-left hover:bg-accent"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data && (data.has_next || page > 1) ? (
        <div className="flex items-center justify-between text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← 이전
          </Button>
          <span className="text-muted-foreground">{data.page} 페이지</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.has_next}
          >
            다음 →
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">알림</h1>
          <p className="text-xs text-muted-foreground">미읽음 우선, 거래·자동이체·대출·보안·혜택 통합</p>
        </div>
        <NotificationsContent />
      </main>
    </Protected>
  );
}