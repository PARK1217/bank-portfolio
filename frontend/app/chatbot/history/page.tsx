"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-CB-004 챗봇 대화 이력 — 본인의 과거 세션 목록. */

interface ChatSessionItem {
  session_id: number;
  started_at: string;
  ended_at: string | null;
  status_cd: string;
  last_message_snippet: string | null;
  first_user_snippet: string | null;
  message_count: number;
}

interface ChatHistoryResponse {
  sessions: ChatSessionItem[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "진행 중", color: "text-warning" },
  CLOSED: { label: "종료", color: "text-muted-foreground" },
  HANDOFF: { label: "상담원 연결", color: "text-primary" },
};

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


function dayKey(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - dayStart.getTime()) / 86_400_000);
  if (diffDays <= 0) return { key: "today", label: "오늘" };
  if (diffDays === 1) return { key: "yesterday", label: "어제" };
  if (diffDays <= 7) return { key: "week", label: "지난 7일" };
  if (diffDays <= 30) return { key: "month", label: "지난 30일" };
  return { key: "older", label: "이전" };
}


function HistoryContent() {
  const [query, setQuery] = useState("");
  const qs = new URLSearchParams();
  if (query.trim()) qs.set("q", query.trim());
  const { data, error, loading } = useFetch<ChatHistoryResponse>(
    `/api/chatbot/sessions${qs.toString() ? "?" + qs.toString() : ""}`,
  );

  useEffect(() => {
    if (error) showApiError(error, "대화 이력을 불러오지 못했습니다.");
  }, [error]);

  const groups = useMemo(() => {
    const order = ["today", "yesterday", "week", "month", "older"];
    const map = new Map<string, { label: string; items: ChatSessionItem[] }>();
    for (const s of data?.sessions ?? []) {
      const g = dayKey(s.started_at);
      if (!map.has(g.key)) map.set(g.key, { label: g.label, items: [] });
      map.get(g.key)!.items.push(s);
    }
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, ...map.get(k)! }));
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="대화 본문 검색"
          aria-label="대화 본문 검색"
          className="pr-8"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        ) : null}
      </div>

      {loading && !data ? (
        <Spinner label="대화 이력 불러오는 중…" />
      ) : !data || data.sessions.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm">
          <p className="text-muted-foreground">
            {query.trim()
              ? `"${query.trim()}" 에 해당하는 대화가 없습니다.`
              : "대화 이력이 없습니다."}
          </p>
          {query.trim() ? null : (
            <Link href="/chatbot" className="mt-2 inline-block text-xs text-primary hover:underline">
              새 대화 시작 →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                {g.label}
                <span className="ml-1.5 text-[10px] opacity-60">{g.items.length}</span>
              </h2>
              <ul className="space-y-2">
                {g.items.map((s) => {
                  const status = STATUS_LABEL[s.status_cd] ?? {
                    label: s.status_cd,
                    color: "text-muted-foreground",
                  };
                  return (
                    <li key={s.session_id}>
                      <Link href={`/chatbot?session=${s.session_id}`}>
                        <Card className="transition-colors hover:bg-accent">
                          <CardHeader className="space-y-1.5 pb-3">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                {dtFmt.format(new Date(s.started_at))}
                                {s.ended_at ? ` ~ ${dtFmt.format(new Date(s.ended_at))}` : ""}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">
                                  메시지 {s.message_count}개
                                </span>
                                <span className={status.color}>{status.label}</span>
                              </span>
                            </div>
                            <CardTitle className="text-sm font-medium text-foreground line-clamp-1">
                              {s.first_user_snippet ?? "(질문 없음)"}
                            </CardTitle>
                            {s.last_message_snippet ? (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                → {s.last_message_snippet}
                              </p>
                            ) : null}
                          </CardHeader>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/chatbot" className="text-xs text-muted-foreground hover:text-foreground">
            ← 챗봇으로
          </Link>
          <h1 className="mt-1 text-xl font-semibold">대화 이력</h1>
          <p className="text-xs text-muted-foreground">지금까지 챗봇과 나눈 대화 세션입니다.</p>
        </div>
        <HistoryContent />
      </main>
    </Protected>
  );
}