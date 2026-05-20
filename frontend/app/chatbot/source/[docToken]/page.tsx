"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/**
 * SCR-CB-005 답변 출처 (약관 원문) ⭐.
 *
 * 챗봇 답변의 근거가 된 약관 원문을 그대로 보여주어 사용자가 답변 vs 원문을 1:1 검증할 수 있게 함.
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


function SourceContent({ docToken }: { docToken: string }) {
  const { data, error, loading } = useFetch<ChatSourceData>(`/api/chatbot/source/${docToken}`);

  useEffect(() => {
    if (error) showApiError(error, "출처 약관을 불러오지 못했습니다.");
  }, [error]);

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

      {data.clauses.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          본문이 등록되어 있지 않습니다.
        </p>
      ) : (
        <ol className="space-y-3">
          {data.clauses.map((c) => (
            <li key={c.clause}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">제 {c.clause} 조</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap pt-0 text-sm leading-relaxed">
                  {c.body}
                </CardContent>
              </Card>
            </li>
          ))}
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