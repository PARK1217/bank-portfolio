"use client";

/**
 * AI 직원 어시스턴트 — 관리자 RBAC 챗봇 (audience='ADMIN')
 *
 * 좌측 — 대화 목록 사이드 패널 (날짜 그룹 + 검색)
 * 중앙 — 챗 메시지 영역
 */

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, Send, Sparkles, FileText, AlertTriangle,
  Search, Plus, X as XIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Source {
  doc_token?: string;
  doc_type?: string;
  doc_id?: number;
  title?: string;
  clause?: string | null;
  snippet?: string;
  score?: number;
}

interface AssistantMessage {
  message_id: number;
  role_cd: "USER" | "ASSISTANT";
  content: string;
  rag_tier_cd: string | null;
  sources: Source[];
  confidence: string | null;
  follow_up_questions?: string[];
  created_at: string;
}

interface SendResponse {
  session_id: number;
  user_message: AssistantMessage;
  assistant_message: AssistantMessage;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/[#*_`~]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface SessionListItem {
  session_id: number;
  started_at: string;
  ended_at: string | null;
  status_cd: string;
  last_message_snippet: string | null;
  first_user_snippet: string | null;
  message_count: number;
}

function groupByDate(items: SessionListItem[]): Array<{ label: string; items: SessionListItem[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  const buckets: Record<string, SessionListItem[]> = {
    "오늘": [], "어제": [], "지난 7일": [], "지난 30일": [], "이전": [],
  };
  for (const it of items) {
    const d = new Date(it.started_at);
    d.setHours(0, 0, 0, 0);
    const diff = (t - d.getTime()) / 86_400_000;
    const k = diff <= 0 ? "오늘" : diff < 2 ? "어제" : diff < 7 ? "지난 7일" : diff < 30 ? "지난 30일" : "이전";
    buckets[k].push(it);
  }
  return Object.entries(buckets).filter(([, arr]) => arr.length > 0).map(([label, items]) => ({ label, items }));
}

const PRESET_QUESTIONS = [
  "보이스피싱 의심 거래 발생 시 1차 조치는 무엇인가요?",
  "1억 원 이상 현금 입출금 시 보고 절차를 알려주세요",
  "KYC 본인확인 절차에서 EDD 적용 기준은?",
  "민원 처리 표준 기한이 어떻게 되나요?",
  "결제망 장애 발생 시 외부 보고 라인은?",
  "분실신고 후 환수 책임 분담 기준은?",
];

export default function AiAssistPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 사이드 패널 — 세션 목록 + 검색
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);

  // 근거 modal
  const [sourceModal, setSourceModal] = useState<{ open: boolean; doc_token?: string; title?: string; content?: string; clause?: string | null; loading?: boolean }>({ open: false });

  async function loadSessions() {
    try {
      const qs = searchQ.trim() ? `?q=${encodeURIComponent(searchQ.trim())}` : "";
      const res = await api.get<{ items: SessionListItem[]; total: number }>(`/api/admin/chatbot/sessions${qs}`);
      setSessions(res.items || []);
    } catch {
      setSessions([]);
    }
  }

  useEffect(() => { void loadSessions(); }, [searchQ]);

  async function loadSession(id: number) {
    setLoadingSession(true);
    try {
      const res = await api.get<{ session_id: number; messages: AssistantMessage[] }>(`/api/admin/chatbot/sessions/${id}`);
      setSessionId(res.session_id);
      setMessages(res.messages || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "세션 불러오기 실패";
      setMessages([{ message_id: Date.now(), role_cd: "ASSISTANT", content: `[오류] ${msg}`, rag_tier_cd: null, sources: [], confidence: null, created_at: new Date().toISOString() }]);
    } finally {
      setLoadingSession(false);
    }
  }

  function startNewSession() {
    setSessionId(null);
    setMessages([]);
  }

  async function openSourceModal(doc_token: string, title: string, clause: string | null) {
    setSourceModal({ open: true, doc_token, title, clause, loading: true });
    try {
      const res = await api.get<{ title: string; clauses: { id: string; clause: string; body: string }[]; body?: string }>(`/api/admin/chatbot/source/${doc_token}`);
      const fullBody = res.body || res.clauses?.map(c => `## ${c.clause}\n\n${c.body}`).join("\n\n") || "";
      setSourceModal({ open: true, doc_token, title: res.title || title, clause, content: fullBody });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "전문 불러오기 실패";
      setSourceModal({ open: true, doc_token, title, clause, content: `[오류] ${msg}` });
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);

    // optimistic user msg
    const optimistic: AssistantMessage = {
      message_id: Date.now(),
      role_cd: "USER",
      content: text,
      rag_tier_cd: null,
      sources: [],
      confidence: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const res = await api.post<SendResponse>("/api/admin/chatbot/messages", {
        message: text,
        session_id: sessionId,
      });
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev.filter((m) => m.message_id !== optimistic.message_id),
        res.user_message,
        res.assistant_message,
      ]);
      void loadSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "요청 실패";
      setMessages((prev) => [
        ...prev,
        {
          message_id: Date.now() + 1,
          role_cd: "ASSISTANT",
          content: `[오류] ${msg}`,
          rag_tier_cd: null,
          sources: [],
          confidence: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const sessionGroups = groupByDate(sessions);

  return (
    <main className="container max-w-7xl py-6">
      <header className="mb-4 flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">AI 직원 어시스턴트</h1>
          <p className="text-xs text-muted-foreground">
            내부 SOP·규정·법령 기반 RAG 검색 — 직원 권한 적용 (`audience=ADMIN`)
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      {/* 좌측 세션 패널 */}
      <aside className="rounded-md border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={startNewSession}
            className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            새 대화
          </button>
          <span className="text-[10px] text-muted-foreground">대화 {sessions.length}건</span>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="대화 검색"
            className="w-full rounded-md border bg-background py-1 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {sessionGroups.length === 0 && (
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-[11px] text-muted-foreground">
              저장된 대화가 없습니다
            </div>
          )}
          {sessionGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{group.label}</div>
              <ul className="space-y-1">
                {group.items.map((s) => (
                  <li key={s.session_id}>
                    <button
                      type="button"
                      onClick={() => void loadSession(s.session_id)}
                      className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${sessionId === s.session_id ? "border-primary bg-primary/5" : "border-transparent"}`}
                    >
                      <div className="line-clamp-1 font-medium">{s.first_user_snippet || "(빈 대화)"}</div>
                      {s.last_message_snippet && (
                        <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{stripMarkdown(s.last_message_snippet)}</div>
                      )}
                      <div className="mt-0.5 text-[10px] text-muted-foreground">메시지 {s.message_count}건</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* 메인 메시지 영역 */}
      <div>

      <Card className="mb-4 border-warning/30 bg-warning/5">
        <CardContent className="flex items-start gap-2 py-3 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <div>
            본 어시스턴트는 직원 업무 보조용입니다. 컴플라이언스 의심·법령 해석은 본부 부서에 추가 확인하세요.
            모든 질의는 ADMIN_AUDIT_LOG 에 기록됩니다.
          </div>
        </CardContent>
      </Card>

      {messages.length === 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              자주 묻는 질문
            </CardTitle>
            <CardDescription className="text-xs">
              아래 질문을 클릭하면 바로 답변을 받을 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {PRESET_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={sending}
                className="rounded-md border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div
        ref={scrollRef}
        className="mb-4 max-h-[60vh] space-y-3 overflow-y-auto rounded-md border bg-card p-4"
        style={{ minHeight: messages.length > 0 ? "30vh" : "0" }}
      >
        {messages.map((m) => (
          <div
            key={m.message_id}
            className={`flex ${m.role_cd === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role_cd === "USER"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.role_cd === "USER" ? (
                <div className="whitespace-pre-wrap leading-6">{m.content}</div>
              ) : (
                <div className="prose-chat text-sm leading-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}
              {m.sources.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-foreground/10 pt-2">
                  <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider opacity-60">
                    <FileText className="h-3 w-3" />
                    근거 ({m.sources.length})
                  </div>
                  {m.sources.slice(0, 3).map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => s.doc_token && openSourceModal(s.doc_token, s.title || "", s.clause ?? null)}
                      disabled={!s.doc_token}
                      className="w-full rounded border border-transparent px-1.5 py-1 text-left text-[11px] opacity-80 transition-colors hover:bg-accent disabled:cursor-default"
                    >
                      <span className="font-medium">{s.title}</span>
                      {s.clause && <span className="opacity-60"> · {s.clause}</span>}
                      {s.snippet && (
                        <div className="opacity-60 line-clamp-2">{stripMarkdown(s.snippet)}</div>
                      )}
                      {s.doc_token && (
                        <div className="mt-0.5 text-[10px] text-primary/70">클릭하면 전문 보기</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {m.rag_tier_cd && (
                <div className="mt-1 text-[10px] opacity-50">
                  RAG: {m.rag_tier_cd} · 신뢰도 {m.confidence}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              답변 생성 중…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="업무 질의를 입력하세요 (예: STR 보고 절차)"
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          rows={2}
          disabled={sending}
        />
        <Button type="submit" disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      </div>
      </div>

      {/* 근거 전문 modal */}
      {sourceModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSourceModal({ open: false })}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">{sourceModal.title || "근거 전문"}</h2>
                {sourceModal.clause && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{sourceModal.clause}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSourceModal({ open: false })}
                className="rounded p-1 hover:bg-accent"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
              {sourceModal.loading ? (
                <div className="text-center text-xs text-muted-foreground">불러오는 중…</div>
              ) : (
                <div className="prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{sourceModal.content || ""}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
