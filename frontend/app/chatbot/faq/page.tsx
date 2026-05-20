"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/** SCR-CB-002 카테고리별 FAQ. */

interface FaqItem {
  faq_id: number;
  category: string;
  question: string;
  answer_snippet: string;
  hit_count: number;
}

interface FaqListResponse {
  category: string | null;
  items: FaqItem[];
}


const CATEGORIES: { code: string; label: string }[] = [
  { code: "ALL", label: "전체" },
  { code: "ACCOUNT", label: "계좌" },
  { code: "TRANSFER", label: "이체" },
  { code: "LOAN", label: "대출" },
  { code: "PRODUCT", label: "상품" },
  { code: "CARD", label: "카드" },
  { code: "SECURITY", label: "보안" },
];


function FaqContent() {
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const path = category === "ALL" ? "/api/chatbot/faq" : `/api/chatbot/faq?category=${category}`;
  const { data, error, loading } = useFetch<FaqListResponse>(path);

  useEffect(() => {
    if (error) showApiError(error, "FAQ 를 불러오지 못했습니다.");
  }, [error]);

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.question.toLowerCase().includes(q) || it.answer_snippet.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="질문 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCategory(c.code)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              category === c.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Spinner label="FAQ 불러오는 중…" />
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          조건에 맞는 FAQ 가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <li key={it.faq_id}>
              <details className="group rounded-md border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {it.category}
                    </span>
                    <span className="truncate font-medium">{it.question}</span>
                  </div>
                  <span className="ml-2 text-xs text-muted-foreground">
                    조회 {it.hit_count}
                  </span>
                </summary>
                <div className="border-t bg-muted/30 px-3 py-2.5 text-sm leading-relaxed">
                  {it.answer_snippet}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
        💬 원하는 답을 찾지 못했나요?{" "}
        <Link href="/chatbot" className="text-primary hover:underline">
          챗봇에게 직접 물어보기 →
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/chatbot" className="text-xs text-muted-foreground hover:text-foreground">
            ← 챗봇으로
          </Link>
          <h1 className="mt-1 text-xl font-semibold">자주 묻는 질문</h1>
        </div>
        <FaqContent />
      </main>
    </Protected>
  );
}