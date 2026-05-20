"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-CB-006 상담원 연결 요청. 챗봇 대화 + 본인 상황 첨부. */

interface HandoffResponse {
  complaint_token: string;
}

const CATEGORIES: { code: string; label: string }[] = [
  { code: "ACCOUNT", label: "계좌" },
  { code: "TRANSFER", label: "이체" },
  { code: "LOAN", label: "대출" },
  { code: "PRODUCT", label: "상품" },
  { code: "SECURITY", label: "보안" },
  { code: "FRAUD", label: "사기·도용" },
  { code: "ETC", label: "기타" },
];


function HandoffForm() {
  const router = useRouter();
  const search = useSearchParams();
  const fromSession = search.get("session");

  const [category, setCategory] = useState("ACCOUNT");
  const [content, setContent] = useState("");
  const [attachRecentN, setAttachRecentN] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !submitting && content.trim().length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<HandoffResponse>(
        "/api/chatbot/handoff",
        {
          session_id: fromSession ? parseInt(fromSession, 10) : null,
          category,
          content,
          attach_recent_n: attachRecentN,
        },
        { idempotent: true },
      );
      router.push(`/complaints/${res.complaint_token}`);
    } catch (err) {
      showApiError(err, "상담원 연결 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-CB-006</div>
        <CardTitle className="mt-1">상담원 연결 신청</CardTitle>
        <CardDescription>
          챗봇 대화 내용을 첨부하여 상담원에게 전달합니다. 영업일 기준 3일 이내 답변드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {fromSession ? (
            <div className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
              현재 챗봇 세션 #{fromSession} 의 최근 메시지가 함께 전달됩니다.
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">문의 카테고리 *</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">상담 요청 내용 *</span>
            <textarea
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={2000}
              placeholder="문의 내용을 자세히 작성해 주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
            />
            <p className="text-[10px] text-muted-foreground">{content.length} / 2000자</p>
          </label>

          {fromSession ? (
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">첨부할 최근 메시지 개수</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={attachRecentN}
                onChange={(e) => setAttachRecentN(parseInt(e.target.value, 10) || 20)}
              />
            </label>
          ) : null}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "신청 중…" : "상담원 연결 신청"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/chatbot" className="text-xs text-muted-foreground hover:text-foreground">
            ← 챗봇으로
          </Link>
        </div>
        <Suspense fallback={<Spinner label="로딩…" />}>
          <HandoffForm />
        </Suspense>
      </main>
    </Protected>
  );
}