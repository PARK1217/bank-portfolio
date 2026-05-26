"use client";

/**
 * AI 직원 어시스턴트 — 관리자 RBAC 챗봇 (audience='ADMIN')
 *
 * 설계 (메모리 admin-chatbot-rbac-design):
 * - 5001 콘솔에서만 노출, ADMIN JWT 자동 첨부
 * - POST /api/admin/chatbot/messages → backend audience='ADMIN' 분기로
 *   AUDIENCE_CD IN ('USER','ADMIN','BOTH') 검색 + 직원 SOP 톤 system prompt
 * - 같은 endpoint 가 AdminAuditMiddleware 로 ACTION_CD='CHATBOT_QUERY' 자동 적재
 */

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles, FileText, AlertTriangle } from "lucide-react";
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

  return (
    <main className="container max-w-4xl py-6">
      <header className="mb-4 flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">AI 직원 어시스턴트</h1>
          <p className="text-xs text-muted-foreground">
            내부 SOP·규정·법령 기반 RAG 검색 — 직원 권한 적용 (`audience=ADMIN`)
          </p>
        </div>
      </header>

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
              <div className="whitespace-pre-wrap leading-6">{m.content}</div>
              {m.sources.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-foreground/10 pt-2">
                  <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider opacity-60">
                    <FileText className="h-3 w-3" />
                    근거 ({m.sources.length})
                  </div>
                  {m.sources.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-[11px] opacity-80">
                      <span className="font-medium">{s.title}</span>
                      {s.clause && <span className="opacity-60"> · {s.clause}</span>}
                      {s.snippet && (
                        <div className="opacity-60 line-clamp-2">{s.snippet}</div>
                      )}
                    </div>
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
    </main>
  );
}
