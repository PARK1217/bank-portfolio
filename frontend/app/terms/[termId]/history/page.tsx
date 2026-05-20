"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-PL-003 약관 변경 이력. */

interface TermsChangeEntry {
  version: number;
  effective_date: string;
  change_summary: string;
  changed_clauses: string[];
}

interface TermsChangeHistoryData {
  terms_id: number;
  title: string;
  current_version: number;
  entries: TermsChangeEntry[];
}


function HistoryContent({ termId }: { termId: string }) {
  const { data, error, loading } = useFetch<TermsChangeHistoryData>(`/api/terms/${termId}/history`);

  useEffect(() => {
    if (error) showApiError(error, "변경 이력을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="변경 이력 불러오는 중…" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">{data.title}</h1>
        <p className="text-xs text-muted-foreground">변경 이력 · 현재 버전 v{data.current_version}</p>
      </header>

      {data.entries.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          변경 이력이 없습니다 (최초 시행).
        </p>
      ) : (
        <ol className="space-y-3">
          {data.entries.map((e) => (
            <li key={e.version}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">v{e.version}</CardTitle>
                    <span className="text-xs text-muted-foreground">시행 {e.effective_date}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm">
                  <p>{e.change_summary}</p>
                  {e.changed_clauses.length > 0 ? (
                    <div className="rounded-md bg-muted/30 p-2 text-xs">
                      <div className="font-medium">변경 조항</div>
                      <ul className="mt-1 space-y-0.5">
                        {e.changed_clauses.map((c, i) => (
                          <li key={i} className="text-muted-foreground">· {c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <div className="border-t pt-3">
        <Link href={`/terms/${data.terms_id}`} className="text-xs text-primary hover:underline">
          ← 약관 본문 보기
        </Link>
      </div>
    </div>
  );
}


export default function Page() {
  const params = useParams<{ termId: string }>();
  return (
    <main className="container max-w-2xl py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground">
          ← 약관 목록
        </Link>
      </div>
      <HistoryContent termId={params.termId} />
    </main>
  );
}