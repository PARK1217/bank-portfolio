"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/**
 * SCR-CB-001 챗봇 메인 / 대화창 ⭐
 *
 * 3-tier RAG 라우팅(서버) → 응답에 `rag_tier_cd` (KEYWORD / FAQ / VECTOR) 동봉.
 * 클라이언트는 그 값에 따라 단계별 배지 + 출처 미리보기 + 출처 페이지 링크 노출.
 *
 * 신뢰도(`confidence`) 가 LOW 면 사용자에게 신중 표시 (warning).
 * 응답 메시지 옆 👍 / 👎 → POST /api/chatbot/feedback (SCR-CB-007).
 */

interface ChatSourceRef {
  doc_token: string;
  doc_type: "TERMS" | "FAQ" | string;
  title: string;
  clause: string | null;
  snippet: string;
  score: number | null;
}

interface ChatMessageItem {
  message_id: number;
  role_cd: "USER" | "ASSISTANT";
  content: string;
  rag_tier_cd: "KEYWORD" | "FAQ" | "VECTOR" | null;
  sources: ChatSourceRef[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  created_at: string;
}

interface ChatSendResponse {
  session_id: number;
  user_message: ChatMessageItem;
  assistant_message: ChatMessageItem;
}

interface ChatHistoryEntry {
  session_id: number;
  messages: ChatMessageItem[];
}


const TIER_BADGE: Record<string, { label: string; color: string }> = {
  KEYWORD: { label: "키워드", color: "bg-muted text-muted-foreground" },
  FAQ: { label: "FAQ", color: "bg-success/15 text-success" },
  VECTOR: { label: "약관 검색", color: "bg-primary/15 text-primary" },
};

const CONFIDENCE_BADGE: Record<string, { label: string; color: string }> = {
  HIGH: { label: "신뢰도 높음", color: "text-success" },
  MEDIUM: { label: "보통", color: "text-muted-foreground" },
  LOW: { label: "신중 — 정보 부족", color: "text-warning" },
};


function ChatScreen() {
  const search = useSearchParams();
  const initialSessionId = search.get("session");

  const [sessionId, setSessionId] = useState<number | null>(
    initialSessionId ? parseInt(initialSessionId, 10) || null : null,
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, number>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 기존 세션이면 히스토리 로드
  useEffect(() => {
    if (!sessionId) return;
    let canceled = false;
    (async () => {
      try {
        const res = await api.get<ChatHistoryEntry>(`/api/chatbot/sessions/${sessionId}`);
        if (!canceled) setMessages(res.messages);
      } catch (err) {
        // 세션이 없거나 본인 것 아니면 새 세션처럼 시작 — 토스트 안 띄움(UX 자연스럽게)
        console.warn("session load failed", err);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [sessionId]);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(textOverride?: string) {
    const text = (textOverride || input).trim();
    if (!text || sending) return;
    setSending(true);
    // 사용자 메시지 낙관적으로 먼저 그림
    const optimistic: ChatMessageItem = {
      message_id: -Date.now(),
      role_cd: "USER",
      content: text,
      rag_tier_cd: null,
      sources: [],
      confidence: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");

    try {
      const res = await api.post<ChatSendResponse>("/api/chatbot/messages", {
        session_id: sessionId,
        message: text,
      });
      if (res.session_id !== sessionId) setSessionId(res.session_id);
      setMessages((m) => {
        // optimistic 제거 + 서버 응답의 user_message + assistant_message 추가
        const without = m.filter((x) => x.message_id !== optimistic.message_id);
        return [...without, res.user_message, res.assistant_message];
      });
    } catch (err) {
      // optimistic 메시지 제거
      setMessages((m) => m.filter((x) => x.message_id !== optimistic.message_id));
      showApiError(err, "메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  async function sendFeedback(messageId: number, rating: 1 | 5) {
    if (feedbackGiven[messageId]) return;
    setFeedbackGiven((cur) => ({ ...cur, [messageId]: rating }));
    try {
      await api.post("/api/chatbot/feedback", { message_id: messageId, rating });
      toast.success(rating === 5 ? "도움이 됐다니 다행입니다 👍" : "피드백 감사합니다 — 개선에 반영합니다");
    } catch (err) {
      setFeedbackGiven((cur) => {
        const { [messageId]: _, ...rest } = cur;
        return rest;
      });
      showApiError(err, "피드백 전송에 실패했습니다.");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem-4rem)] min-h-[480px] flex-col">
      <header className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-base font-semibold">상담 챗봇</h1>
          <p className="text-xs text-muted-foreground">
            3-tier RAG: 키워드 → FAQ → 약관 검색. 정보 부족 시 상담원 연결을 제안합니다.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/chatbot/faq" className="text-primary hover:underline">
            FAQ
          </Link>
          <Link href="/chatbot/terms-search" className="text-primary hover:underline">
            약관 검색
          </Link>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <EmptyState onPick={(p) => void send(p)} />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.message_id}
              msg={m}
              feedback={feedbackGiven[m.message_id]}
              onFeedback={sendFeedback}
            />
          ))
        )}
        {sending ? (
          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Spinner size="sm" />
            <span>답변 생성 중…</span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t pt-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="궁금한 점을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          maxLength={2000}
          disabled={sending}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          전송
        </Button>
      </form>
    </div>
  );
}


function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const samples = [
    "정기예금 만기 자동 재예치는 어떻게 설정하나요?",
    "타행 이체 한도가 어떻게 되나요?",
    "공동명의 통장 개설 절차가 궁금합니다",
    "신용대출 중도상환수수료는 얼마인가요?",
  ];
  return (
    <div className="px-2 py-8">
      <p className="text-sm text-muted-foreground">예시 질문을 클릭해 시작할 수 있어요.</p>
      <ul className="mt-3 space-y-1.5">
        {samples.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


function MessageBubble({
  msg,
  feedback,
  onFeedback,
}: {
  msg: ChatMessageItem;
  feedback?: number;
  onFeedback: (id: number, rating: 1 | 5) => void;
}) {
  const isUser = msg.role_cd === "USER";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-1", isUser ? "items-end text-right" : "items-start")}>
        <Card
          className={cn(
            "whitespace-pre-wrap text-sm leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "bg-card",
          )}
        >
          <CardContent className="px-3 py-2.5">{msg.content}</CardContent>
        </Card>

        {!isUser ? <AssistantMeta msg={msg} feedback={feedback} onFeedback={onFeedback} /> : null}
      </div>
    </div>
  );
}


function AssistantMeta({
  msg,
  feedback,
  onFeedback,
}: {
  msg: ChatMessageItem;
  feedback?: number;
  onFeedback: (id: number, rating: 1 | 5) => void;
}) {
  const tier = msg.rag_tier_cd ? TIER_BADGE[msg.rag_tier_cd] : null;
  const conf = msg.confidence ? CONFIDENCE_BADGE[msg.confidence] : null;

  return (
    <div className="space-y-1.5 px-1 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {tier ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px]", tier.color)}>{tier.label}</span>
        ) : null}
        {conf ? <span className={conf.color}>{conf.label}</span> : null}

        {/* 피드백 */}
        <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            disabled={!!feedback}
            onClick={() => onFeedback(msg.message_id, 5)}
            className={cn(
              "rounded p-1 hover:bg-accent disabled:opacity-50",
              feedback === 5 ? "text-success" : "",
            )}
            aria-label="도움됨"
          >
            👍
          </button>
          <button
            type="button"
            disabled={!!feedback}
            onClick={() => onFeedback(msg.message_id, 1)}
            className={cn(
              "rounded p-1 hover:bg-accent disabled:opacity-50",
              feedback === 1 ? "text-destructive" : "",
            )}
            aria-label="도움 안 됨"
          >
            👎
          </button>
        </span>
      </div>

      {msg.sources.length > 0 ? (
        <ul className="space-y-1">
          {msg.sources.slice(0, 3).map((s, i) => (
            <li key={`${s.doc_token}-${i}`}>
              <Link
                href={s.doc_type === "TERMS" ? `/chatbot/source/${s.doc_token}` : "/chatbot/faq"}
                className="block rounded border bg-muted/30 p-2 hover:bg-accent"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">
                    {s.doc_type === "TERMS" ? "약관" : "FAQ"} · {s.title}
                    {s.clause ? ` · ${s.clause}` : ""}
                  </span>
                  {s.score != null ? (
                    <span className="num-tabular text-muted-foreground">{s.score.toFixed(2)}</span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.snippet}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-4 animate-fade-in">
        <Suspense fallback={<Spinner label="챗봇 로딩…" />}>
          <ChatScreen />
        </Suspense>
      </main>
    </Protected>
  );
}