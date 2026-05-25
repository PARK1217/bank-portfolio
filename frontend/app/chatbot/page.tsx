"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { StagedLoader } from "@/components/staged-loader";
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
  follow_up_questions: string[];
  created_at: string;
}

interface ChatSuggestionItem {
  faq_id: number;
  category: string;
  question: string;
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

// LLM 응답 대기 중 단계별 메시지 — 단조로운 "답변 생성 중…" 대신 사용자에게
// 진행 단계를 짐작할 단서 제공. 3-tier RAG 순서(키워드 → FAQ → 약관 검색 → LLM 합성)
// 와 대략 매칭. 마지막 메시지는 작업이 길어져도 그대로 머무름.
const CHATBOT_LOADING_MESSAGES = [
  "질문 이해 중…",
  "관련 FAQ 와 약관 찾는 중…",
  "찾은 내용 비교·정렬하고 있어요",
  "이건 좀 깊게 들어가야 할 것 같네요",
  "답변 정리하는 중…",
];


const CONFIDENCE_BADGE: Record<string, { label: string; color: string }> = {
  HIGH: { label: "신뢰도 높음", color: "text-success" },
  MEDIUM: { label: "보통", color: "text-muted-foreground" },
  LOW: { label: "신중 — 정보 부족", color: "text-warning" },
};

// 상담원 연결 더미 연락처 — 시연 환경. 실제 운영은 콜센터/응대팀 채널 연결로 교체.
const HANDOFF_PHONE = "1588-0098";
const HANDOFF_EMAIL = "support@daon.example";

// 종료된 챗봇 세션 sessionStorage 키 — 탭을 닫으면 자연스럽게 해제.
const ENDED_SESSIONS_KEY = "chatbot.endedSessions";


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
  // 종료된 세션 집합 — sessionStorage(키 ENDED_KEY) 와 mirror. 새 세션 시작하면 자연스럽게 해제.
  const [endedSessions, setEndedSessions] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 종료된 세션 마스터 — sessionStorage 에서 초기 로드
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ENDED_SESSIONS_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        setEndedSessions(new Set(arr.filter((x) => typeof x === "number")));
      }
    } catch {
      // ignore
    }
  }, []);

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

  const isEnded = sessionId !== null && endedSessions.has(sessionId);

  function endSession() {
    if (sessionId == null) {
      // 메시지 0건 상태에서는 종료할 대상이 없음
      toast.info("아직 시작된 대화가 없어요.");
      return;
    }
    const next = new Set(endedSessions);
    next.add(sessionId);
    setEndedSessions(next);
    try {
      sessionStorage.setItem(ENDED_SESSIONS_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // ignore — 종료 표시는 best-effort
    }
    toast.success("상담을 종료했어요. 새 대화를 시작하려면 새 탭/새 세션을 열어주세요.");
  }

  function startNewSession() {
    // 헤더 "새 대화" — 같은 화면에서 세션을 새로 시작 (다음 send 호출이 session_id=null 로 새로 발급)
    setSessionId(null);
    setMessages([]);
    setFeedbackGiven({});
  }

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(textOverride?: string) {
    const text = (textOverride || input).trim();
    if (!text || sending || isEnded) return;
    setSending(true);
    // 사용자 메시지 낙관적으로 먼저 그림
    const optimistic: ChatMessageItem = {
      message_id: -Date.now(),
      role_cd: "USER",
      content: text,
      rag_tier_cd: null,
      sources: [],
      confidence: null,
      follow_up_questions: [],
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
    const prev = feedbackGiven[messageId];
    if (prev === rating) return;
    let comment: string | null = null;
    if (rating === 1) {
      const input = window.prompt(
        "어떤 부분이 부족했나요? (선택 — Enter 만 눌러도 평가는 저장돼요)",
        "",
      );
      if (input === null) return; // 취소면 평가 자체 보류
      comment = input.trim() || null;
    }
    setFeedbackGiven((cur) => ({ ...cur, [messageId]: rating }));
    try {
      await api.post("/api/chatbot/feedback", {
        message_id: messageId,
        rating,
        comment,
      });
      toast.success(
        rating === 5
          ? "도움이 됐다니 다행입니다 👍"
          : "피드백 감사합니다 — 개선에 반영합니다",
      );
    } catch (err) {
      setFeedbackGiven((cur) => {
        if (prev === undefined) {
          const { [messageId]: _, ...rest } = cur;
          return rest;
        }
        return { ...cur, [messageId]: prev };
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
        <div className="flex items-center gap-2 text-xs">
          <Link href="/chatbot/faq" className="text-primary hover:underline">
            FAQ
          </Link>
          <Link href="/chatbot/terms-search" className="text-primary hover:underline">
            약관 검색
          </Link>
          {isEnded ? (
            <button
              type="button"
              onClick={startNewSession}
              className="rounded border border-input bg-background px-2 py-0.5 text-foreground hover:bg-accent"
            >
              새 대화
            </button>
          ) : sessionId !== null && messages.length > 0 ? (
            <button
              type="button"
              onClick={endSession}
              className="rounded border border-input bg-background px-2 py-0.5 text-muted-foreground hover:bg-accent"
            >
              상담 종료
            </button>
          ) : null}
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
              onFollowUp={(q) => void send(q)}
              sending={sending}
              sessionId={sessionId}
            />
          ))
        )}
        {sending ? (
          <div className="px-2">
            <StagedLoader
              messages={CHATBOT_LOADING_MESSAGES}
              intervalMs={2500}
              className="text-xs"
            />
          </div>
        ) : null}
      </div>

      {isEnded ? (
        <div className="rounded-md border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          상담이 종료되었어요. <button
            type="button"
            onClick={startNewSession}
            className="ml-1 text-primary underline-offset-2 hover:underline"
          >
            새 대화 시작
          </button>
        </div>
      ) : (
        <ChatInputForm
          input={input}
          setInput={setInput}
          onKeyDown={onKeyDown}
          send={send}
          sending={sending}
        />
      )}
    </div>
  );
}


const CATEGORY_LABEL: Record<string, string> = {
  ACCOUNT: "계좌",
  AUTO_TRANSFER: "자동이체",
  LOAN: "대출",
  PRODUCT: "상품",
  SECURITY: "보안",
  SIGNUP: "가입",
  TRANSFER: "이체",
  OTHER: "기타",
};

function ChatInputForm({
  input,
  setInput,
  onKeyDown,
  send,
  sending,
}: {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  send: () => Promise<void>;
  sending: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);

  // textarea 자동 높이 — scrollHeight 따라 grow, 최대 200px.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  function toggleVoice() {
    if (listening) {
      setListening(false);
      return;
    }
    const W = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
    const SR =
      (W?.["SpeechRecognition"] as { new (): SpeechRecognitionLike } | undefined) ??
      (W?.["webkitSpeechRecognition"] as { new (): SpeechRecognitionLike } | undefined);
    if (SR) {
      try {
        const rec = new SR();
        rec.lang = "ko-KR";
        rec.continuous = false;
        rec.interimResults = false;
        rec.onresult = (e: SpeechRecognitionEventLike) => {
          const text = e.results?.[0]?.[0]?.transcript ?? "";
          if (text) setInput((cur) => (cur ? cur + " " : "") + text);
          setListening(false);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        setListening(true);
        rec.start();
        return;
      } catch {
        setListening(false);
      }
    }
    // 폴백 — Web Speech API 미지원 환경 (시연용 mock)
    setListening(true);
    setTimeout(() => {
      setInput((cur) => (cur ? cur + " " : "") + "(예시) 정기예금 금리 알려주세요");
      setListening(false);
    }, 1200);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      className="flex items-end gap-2 border-t pt-3"
    >
      <div className="flex-1">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="궁금한 점을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          maxLength={2000}
          disabled={sending}
          className="block w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {listening ? "🎙️ 음성 인식 중…" : "Enter 전송 · Shift+Enter 줄바꿈"}
          </span>
          <span className={cn("num-tabular", input.length > 1800 ? "text-warning" : "")}>
            {input.length} / 2000
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleVoice}
        disabled={sending}
        aria-label={listening ? "음성 인식 중지" : "음성 입력"}
        title={listening ? "음성 인식 중지" : "음성 입력"}
      >
        {listening ? "■" : "🎙️"}
      </Button>
      <Button type="submit" disabled={sending || !input.trim()}>
        전송
      </Button>
    </form>
  );
}


// Web Speech API 타입 (브라우저 지원 환경에서만 사용; 폴백 분기 있음).
interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}


const FALLBACK_SAMPLES = [
  "정기예금 만기 자동 재예치는 어떻게 설정하나요?",
  "타행 이체 한도가 어떻게 되나요?",
  "공동명의 통장 개설 절차가 궁금합니다",
  "신용대출 중도상환수수료는 얼마인가요?",
];

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const [items, setItems] = useState<ChatSuggestionItem[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await api.get<{ items: ChatSuggestionItem[] }>(
          "/api/chatbot/suggestions?limit=4",
        );
        if (!canceled) setItems(res.items);
      } catch {
        if (!canceled) setErrored(true);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const showFallback = errored || items === null;
  return (
    <div className="px-2 py-8">
      <p className="text-sm text-muted-foreground">
        {showFallback
          ? "예시 질문을 클릭해 시작할 수 있어요."
          : "보유 상품·자동이체 패턴에 맞춰 추천한 질문이에요."}
      </p>
      <ul className="mt-3 space-y-1.5">
        {showFallback
          ? FALLBACK_SAMPLES.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  className="rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {s}
                </button>
              </li>
            ))
          : items.map((it) => (
              <li key={it.faq_id}>
                <button
                  type="button"
                  onClick={() => onPick(it.question)}
                  className="flex w-full items-start gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {CATEGORY_LABEL[it.category] ?? it.category}
                  </span>
                  <span>{it.question}</span>
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
  onFollowUp,
  sending,
  sessionId,
}: {
  msg: ChatMessageItem;
  feedback?: number;
  onFeedback: (id: number, rating: 1 | 5) => void;
  onFollowUp: (q: string) => void;
  sending: boolean;
  sessionId: number | null;
}) {
  const isUser = msg.role_cd === "USER";
  // 상담원 연결 카드 노출 트리거:
  //   - confidence=LOW: 백엔드가 명시적으로 정보 부족 라벨
  //   - rag_tier_cd=null: 어떤 RAG 단계에도 매칭 안 된 fallback 답변
  //   - 출처 0건: 매칭 자체가 없었음
  //   - 모든 출처가 score < 0.40: 약관 검색은 매칭됐지만 유사도가 낮아 답변 신뢰성↓ (휴리스틱)
  const lowScoreOnly =
    !isUser &&
    msg.sources.length > 0 &&
    msg.sources.every((s) => (s.score ?? 1) < 0.4);
  const needsHandoff =
    !isUser &&
    (msg.confidence === "LOW" ||
      msg.rag_tier_cd === null ||
      msg.sources.length === 0 ||
      lowScoreOnly);
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

        {!isUser ? (
          <>
            <AssistantMeta msg={msg} feedback={feedback} onFeedback={onFeedback} />
            {needsHandoff ? <HandoffCard sessionId={sessionId} /> : null}
            {msg.follow_up_questions?.length > 0 ? (
              <FollowUpChips items={msg.follow_up_questions} onPick={onFollowUp} disabled={sending} />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}


function HandoffCard({ sessionId }: { sessionId: number | null }) {
  const handoffHref = sessionId ? `/chatbot/handoff?session=${sessionId}` : "/chatbot/handoff";
  return (
    <div className="rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs">
      <p className="text-foreground">
        답변이 충분하지 않다면 <span className="font-medium">상담원</span>이 도와드릴 수 있어요.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <a
          href={`tel:${HANDOFF_PHONE}`}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-foreground/90 hover:bg-accent"
        >
          전화 <span className="num-tabular text-muted-foreground">{HANDOFF_PHONE}</span>
        </a>
        <a
          href={`mailto:${HANDOFF_EMAIL}`}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-foreground/90 hover:bg-accent"
        >
          이메일 <span className="text-muted-foreground">{HANDOFF_EMAIL}</span>
        </a>
        <Link
          href={handoffHref}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/15"
        >
          상담원 연결 신청 →
        </Link>
      </div>
    </div>
  );
}


function FollowUpChips({
  items,
  onPick,
  disabled,
}: {
  items: string[];
  onPick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1 px-1 pt-1">
      <p className="text-[11px] text-muted-foreground">이어서 물어볼 만한 질문</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-foreground/80 hover:bg-accent disabled:opacity-50"
          >
            {q}
          </button>
        ))}
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

        {/* 피드백 — 같은 메시지에 토글 변경 가능, 👎는 코멘트 prompt */}
        <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            onClick={() => onFeedback(msg.message_id, 5)}
            className={cn(
              "rounded p-1 hover:bg-accent",
              feedback === 5 ? "text-success" : "",
            )}
            aria-label="도움됨"
            aria-pressed={feedback === 5}
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => onFeedback(msg.message_id, 1)}
            className={cn(
              "rounded p-1 hover:bg-accent",
              feedback === 1 ? "text-destructive" : "",
            )}
            aria-label="도움 안 됨"
            aria-pressed={feedback === 1}
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