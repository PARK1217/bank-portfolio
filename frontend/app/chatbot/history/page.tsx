"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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


function HistoryContent() {
  const { data, error, loading } = useFetch<ChatHistoryResponse>("/api/chatbot/sessions");

  useEffect(() => {
    if (error) showApiError(error, "대화 이력을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="대화 이력 불러오는 중…" />;
  if (!data || data.sessions.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm">
        <p className="text-muted-foreground">대화 이력이 없습니다.</p>
        <Link href="/chatbot" className="mt-2 inline-block text-xs text-primary hover:underline">
          새 대화 시작 →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {data.sessions.map((s) => {
        const status = STATUS_LABEL[s.status_cd] ?? { label: s.status_cd, color: "text-muted-foreground" };
        return (
          <li key={s.session_id}>
            <Link href={`/chatbot?session=${s.session_id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {dtFmt.format(new Date(s.started_at))}
                      {s.ended_at ? ` ~ ${dtFmt.format(new Date(s.ended_at))}` : ""}
                    </span>
                    <span className={status.color}>{status.label}</span>
                  </div>
                  <CardTitle className="text-sm font-normal text-foreground">
                    {s.last_message_snippet ?? "(메시지 없음)"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
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