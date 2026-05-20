"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-CB-003 약관 벡터 검색. */

interface TermsSearchItem {
  doc_token: string;
  terms_id: number;
  title: string;
  clause: string | null;
  snippet: string;
  score: number;
}

interface TermsSearchResponse {
  query: string;
  items: TermsSearchItem[];
}


function TermsSearchContent() {
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const path = active ? `/api/chatbot/terms-search?query=${encodeURIComponent(active)}` : null;
  const { data, error, loading } = useFetch<TermsSearchResponse>(path);

  useEffect(() => {
    if (error) showApiError(error, "약관 검색에 실패했습니다.");
  }, [error]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    setActive(q);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          type="search"
          placeholder="예: 만기 자동 재예치, 중도해지 수수료, 일 이체 한도"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!draft.trim()}>
          검색
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        벡터 검색으로 약관 전문에서 의미가 가까운 조항을 찾습니다.
      </p>

      {!active ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          검색어를 입력하고 [검색] 을 눌러주세요.
        </p>
      ) : loading && !data ? (
        <Spinner label="검색 중…" />
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          관련 약관을 찾지 못했습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((it, i) => (
            <li key={`${it.doc_token}-${i}`}>
              <Link
                href={`/chatbot/source/${it.doc_token}`}
                className="block rounded-md border bg-card p-3 hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{it.title}</div>
                    <div className="mt-0.5 text-sm font-medium">
                      {it.clause ? `제 ${it.clause} 조` : "본문"}
                    </div>
                  </div>
                  <span className="num-tabular shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    {(it.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {it.snippet}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
          <h1 className="mt-1 text-xl font-semibold">약관 검색</h1>
        </div>
        <TermsSearchContent />
      </main>
    </Protected>
  );
}