"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/**
 * SCR-CB-005 답변 출처 (약관 원문) ⭐.
 *
 * 챗봇 답변의 근거가 된 약관 원문을 그대로 보여주어 사용자가 답변 vs 원문을 1:1 검증할 수 있게 함.
 *
 * 폴리시: 키워드 검색(매칭 강조) + 조항 ToC 칩(anchor 점프) + 카드별 anchor id + 링크 복사.
 */

interface ChatSourceClause {
  clause: string;
  body: string;
}

interface ChatSourceData {
  doc_token: string;
  terms_id: number;
  title: string;
  version: number;
  effective_date: string;
  clauses: ChatSourceClause[];
}


function highlight(text: string, needle: string): React.ReactNode {
  if (!needle) return text;
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(n, i);
    if (idx < 0) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={`m-${idx}`}
        className="rounded bg-warning/30 px-0.5 text-foreground"
      >
        {text.slice(idx, idx + n.length)}
      </mark>,
    );
    i = idx + n.length;
  }
  return parts;
}


function clauseAnchor(clause: string): string {
  // "1" / "1-2" 같은 string → DOM id 안전 변환.
  return `clause-${clause.replace(/[^a-zA-Z0-9가-힣-]/g, "")}`;
}


function SourceContent({ docToken }: { docToken: string }) {
  const { data, error, loading } = useFetch<ChatSourceData>(`/api/chatbot/source/${docToken}`);
  const [query, setQuery] = useState("");
  const [copiedClause, setCopiedClause] = useState<string | null>(null);

  useEffect(() => {
    if (error) showApiError(error, "출처 약관을 불러오지 못했습니다.");
  }, [error]);

  const needle = query.trim();
  const matches = useMemo(() => {
    if (!needle || !data) return new Set<string>();
    const set = new Set<string>();
    const n = needle.toLowerCase();
    for (const c of data.clauses) {
      if (c.body.toLowerCase().includes(n)) set.add(c.clause);
    }
    return set;
  }, [data, needle]);

  if (loading && !data) return <Spinner label="약관 불러오는 중…" />;
  if (error?.httpStatus === 404) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">출처 약관을 찾을 수 없습니다.</p>
        <Link href="/chatbot" className="mt-2 inline-block text-xs text-primary hover:underline">
          챗봇으로 돌아가기 →
        </Link>
      </div>
    );
  }
  if (!data) return null;

  async function copyClauseLink(clause: string) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${clauseAnchor(clause)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedClause(clause);
      setTimeout(() => setCopiedClause((c) => (c === clause ? null : c)), 1500);
    } catch {
      // ignore — older browsers
    }
  }

  function scrollTo(clause: string) {
    const el = document.getElementById(clauseAnchor(clause));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs text-muted-foreground">
          v{data.version} · 시행 {data.effective_date} · 약관 ID {data.terms_id}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-2 rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
          💡 챗봇이 인용한 출처 원문입니다. 답변과 원문을 직접 비교해 신뢰성을 확인할 수 있습니다.
        </p>
      </header>

      {data.clauses.length > 0 ? (
        <>
          <div className="relative">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="조항 본문에서 검색"
              aria-label="조항 본문 검색"
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
            {needle ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="num-tabular font-medium text-foreground">{matches.size}</span>개 조항 매칭
              </p>
            ) : null}
          </div>

          <nav aria-label="조항 점프" className="flex flex-wrap gap-1.5">
            {data.clauses.map((c) => {
              const dimmed = needle.length > 0 && !matches.has(c.clause);
              return (
                <button
                  key={c.clause}
                  type="button"
                  onClick={() => scrollTo(c.clause)}
                  className={cn(
                    "rounded-full border border-input bg-background px-2.5 py-1 text-xs transition-colors hover:bg-accent",
                    dimmed ? "opacity-40" : "",
                    matches.has(c.clause) && needle ? "border-warning text-warning" : "",
                  )}
                >
                  제 {c.clause} 조
                </button>
              );
            })}
          </nav>
        </>
      ) : null}

      {data.clauses.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          본문이 등록되어 있지 않습니다.
        </p>
      ) : (
        <ol className="space-y-3">
          {data.clauses.map((c) => {
            const matched = needle.length > 0 && matches.has(c.clause);
            return (
              <li key={c.clause} id={clauseAnchor(c.clause)}>
                <Card className={matched ? "border-warning" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">제 {c.clause} 조</CardTitle>
                    <button
                      type="button"
                      onClick={() => void copyClauseLink(c.clause)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      aria-label={`제 ${c.clause} 조 링크 복사`}
                    >
                      {copiedClause === c.clause ? "복사됨 ✓" : "🔗 링크 복사"}
                    </button>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap pt-0 text-sm leading-relaxed">
                    {highlight(c.body, needle)}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <div className="border-t pt-3">
        <Link
          href={`/terms/${data.terms_id}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          약관 전체 보기 →
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ docToken: string }>();
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/chatbot" className="text-xs text-muted-foreground hover:text-foreground">
            ← 챗봇으로
          </Link>
        </div>
        <SourceContent docToken={params.docToken} />
      </main>
    </Protected>
  );
}
