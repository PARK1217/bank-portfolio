"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/**
 * 약관 목록 — 공개 페이지(미인증도 접근 가능, middleware whitelist 에 /terms/* 포함).
 * 카테고리 필터 + 검색 1 박스.
 */

interface TermsItem {
  terms_id: number;
  version: number;
  title: string;
  category: string;
  effective_date: string;
  required: boolean;
}

interface TermsListResponse {
  items: TermsItem[];
}


const CATEGORY_FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "GENERAL", label: "일반" },
  { key: "DEPOSIT", label: "수신" },
  { key: "LOAN", label: "대출" },
  { key: "TRANSFER", label: "이체" },
  { key: "PRIVACY", label: "개인정보" },
  { key: "MARKETING", label: "마케팅" },
];


export default function Page() {
  const { data, error, loading, refetch } = useFetch<TermsListResponse>("/api/terms");
  const [category, setCategory] = useState<string>("ALL");
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    if (error) showApiError(error, "약관 목록을 불러오지 못했습니다.");
  }, [error]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return all.filter((t) => {
      if (category !== "ALL" && t.category !== category) return false;
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [data, category, query]);

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">약관·정책</h1>
        <p className="text-xs text-muted-foreground">서비스 이용 관련 약관 및 정책을 확인할 수 있습니다.</p>
      </div>

      <div className="space-y-3">
        <input
          type="search"
          placeholder="약관명 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setCategory(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                category === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {loading && !data ? (
          <Spinner label="약관 불러오는 중…" />
        ) : !data ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">약관 목록을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs text-primary hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            조건에 맞는 약관이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.terms_id}>
                <Link href={`/terms/${t.terms_id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t.category}</span>
                        <span>v{t.version} · 시행 {t.effective_date}</span>
                      </div>
                      <CardTitle className="text-base">
                        {t.title}
                        {t.required ? (
                          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            필수
                          </span>
                        ) : null}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      자세히 보기 →
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}