"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


interface FaqItem {
  faq_id: number;
  category: string;
  category_label: string;
  question: string;
  answer: string;
  hit_count: number;
}

interface FaqCategory {
  code: string;
  label: string;
  count: number;
}

interface FaqListResponse {
  items: FaqItem[];
  total: number;
  categories: FaqCategory[];
}


function FaqContent() {
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [debouncedQ, setDebouncedQ] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const qs = new URLSearchParams({ limit: "200" });
  if (category) qs.set("category", category);
  if (debouncedQ) qs.set("q", debouncedQ);

  const { data, error, loading } = useFetch<FaqListResponse>(
    `/api/faqs?${qs.toString()}`,
  );

  useEffect(() => {
    if (error) showApiError(error, "FAQ 를 불러오지 못했습니다.");
  }, [error]);

  const totalAllCategories = useMemo(
    () => data?.categories.reduce((s, c) => s + c.count, 0) ?? 0,
    [data],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">자주 묻는 질문 (FAQ)</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          카테고리에서 찾거나, 키워드로 검색하세요. 더 자세한 답변은 챗봇에서 물어보세요.
        </p>
      </div>

      <Input
        placeholder="질문·답변 본문 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={cn(
            "rounded-full border px-3 py-1.5 transition-colors",
            category === ""
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background hover:bg-accent",
          )}
        >
          전체 <span className="ml-1 text-muted-foreground">({totalAllCategories})</span>
        </button>
        {data?.categories.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCategory(c.code)}
            className={cn(
              "rounded-full border px-3 py-1.5 transition-colors",
              category === c.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {c.label} <span className="ml-1 text-muted-foreground">({c.count})</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Spinner label="FAQ 불러오는 중…" />
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          조건에 맞는 FAQ 가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((f) => {
            const open = expanded === f.faq_id;
            return (
              <li key={f.faq_id}>
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : f.faq_id)}
                    className="block w-full px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {f.category_label}
                      </span>
                      <div className="flex-1 text-sm font-medium">{f.question}</div>
                      <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {open ? (
                    <CardContent className="border-t bg-muted/20 pt-3">
                      <p className="whitespace-pre-wrap text-sm text-foreground/90">{f.answer}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-md border bg-card p-4 text-xs">
        원하는 답을 찾지 못하셨나요?{" "}
        <Link href="/chatbot" className="font-medium text-primary hover:underline">
          챗봇에 직접 물어보기 →
        </Link>
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <FaqContent />
    </main>
  );
}
