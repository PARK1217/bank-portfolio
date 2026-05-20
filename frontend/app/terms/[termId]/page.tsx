"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/**
 * 약관 상세 — 공개 페이지(미인증도 접근 가능, middleware whitelist).
 * `clauses` 배열이 있으면 조항별 렌더링, 없으면 `body` 통문장.
 */

interface TermsClause {
  clause_no: string;
  body: string;
}

interface TermsDetailData {
  terms_id: number;
  version: number;
  title: string;
  category: string;
  effective_date: string;
  body: string | null;
  clauses: TermsClause[] | null;
  required: boolean;
}


export default function Page() {
  const params = useParams<{ termId: string }>();
  const { data, error, loading } = useFetch<TermsDetailData>(`/api/terms/${params.termId}`);

  useEffect(() => {
    if (error) showApiError(error, "약관 본문을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) {
    return (
      <main className="container max-w-3xl py-8">
        <Spinner label="약관 불러오는 중…" />
      </main>
    );
  }
  if (error?.httpStatus === 404) {
    return (
      <main className="container max-w-3xl py-8">
        <div className="rounded-md border bg-card p-6 text-center text-sm">
          <p className="text-muted-foreground">해당 약관을 찾을 수 없습니다.</p>
          <Link href="/terms" className="mt-2 inline-block text-xs text-primary hover:underline">
            약관 목록 →
          </Link>
        </div>
      </main>
    );
  }
  if (!data) return null;

  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground">
          ← 약관 목록
        </Link>
      </div>

      <header className="mb-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{data.category}</span>
          <span>·</span>
          <span>v{data.version}</span>
          <span>·</span>
          <span>시행 {data.effective_date}</span>
          {data.required ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">필수</span>
          ) : null}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
      </header>

      {data.clauses && data.clauses.length > 0 ? (
        <ol className="space-y-3">
          {data.clauses.map((c) => (
            <li key={c.clause_no}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">제 {c.clause_no} 조</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap pt-0 text-sm leading-relaxed text-muted-foreground">
                  {c.body}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      ) : data.body ? (
        <article className="whitespace-pre-wrap rounded-md border bg-card p-5 text-sm leading-relaxed">
          {data.body}
        </article>
      ) : (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          본문이 등록되어 있지 않습니다.
        </p>
      )}
    </main>
  );
}