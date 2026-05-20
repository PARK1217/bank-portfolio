"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-PL-004 동의 이력 조회. */

interface AgreementItem {
  agreement_id: number;
  terms_id: number;
  terms_title: string;
  version: number;
  agreed: boolean;
  agreed_at: string;
  channel_cd: string;
  context: string | null;
}

interface AgreementsResponse {
  items: AgreementItem[];
}

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANNEL_LABEL: Record<string, string> = {
  WEB: "웹",
  MOBILE: "모바일",
  BRANCH: "영업점",
  CALL: "콜센터",
};


function AgreementsContent() {
  const { data, error, loading } = useFetch<AgreementsResponse>("/api/terms/my-agreements");

  useEffect(() => {
    if (error) showApiError(error, "동의 이력을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="동의 이력 불러오는 중…" />;
  if (!data || data.items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        동의한 약관 이력이 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.items.map((it) => (
        <li key={it.agreement_id}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <Link href={`/terms/${it.terms_id}`} className="hover:underline">
                    {it.terms_title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">v{it.version}</span>
                </CardTitle>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    it.agreed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {it.agreed ? "동의" : "거부"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              {dtFmt.format(new Date(it.agreed_at))} · {CHANNEL_LABEL[it.channel_cd] ?? it.channel_cd}
              {it.context ? ` · ${it.context}` : ""}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground">
            ← 약관 목록
          </Link>
          <h1 className="mt-1 text-xl font-semibold">내 약관 동의 이력</h1>
        </div>
        <AgreementsContent />
      </main>
    </Protected>
  );
}