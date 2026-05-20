"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/** SCR-CM-002 민원 처리 현황. */

interface ComplaintItem {
  cm_token: string;
  complaint_type_cd: string;
  title: string;
  status_cd: string;
  receipt_at: string;
  responded_at: string | null;
}

interface ComplaintListResponse {
  items: ComplaintItem[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "접수됨", color: "text-muted-foreground" },
  ASSIGNED: { label: "배정됨", color: "text-warning" },
  IN_PROGRESS: { label: "처리 중", color: "text-warning" },
  RESPONDED: { label: "답변 완료", color: "text-success" },
  CLOSED: { label: "종료", color: "text-muted-foreground" },
};

const TYPE_LABEL: Record<string, string> = {
  ACCOUNT: "계좌",
  TRANSFER: "이체",
  LOAN: "대출",
  FRAUD: "사기",
  SERVICE: "서비스",
  ETC: "기타",
};

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});


function ComplaintsContent() {
  const { data, error, loading } = useFetch<ComplaintListResponse>("/api/complaints");

  useEffect(() => {
    if (error) showApiError(error, "민원 목록을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="민원 목록 불러오는 중…" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href="/complaints/new" className={cn(buttonVariants({ size: "sm" }))}>
          + 새 민원 접수
        </Link>
      </div>
      {!data || data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          접수한 민원이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((c) => {
            const status = STATUS_LABEL[c.status_cd] ?? { label: c.status_cd, color: "text-muted-foreground" };
            return (
              <li key={c.cm_token}>
                <Link href={`/complaints/${c.cm_token}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{TYPE_LABEL[c.complaint_type_cd] ?? c.complaint_type_cd}</span>
                        <span className={status.color}>{status.label}</span>
                      </div>
                      <CardTitle className="text-base">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      접수 {dtFmt.format(new Date(c.receipt_at))}
                      {c.responded_at ? ` · 답변 ${dtFmt.format(new Date(c.responded_at))}` : ""}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">민원 처리 현황</h1>
          <p className="text-xs text-muted-foreground">접수한 민원과 처리 상태를 확인합니다.</p>
        </div>
        <ComplaintsContent />
      </main>
    </Protected>
  );
}