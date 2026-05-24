"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { complaintTypeLabel } from "@/lib/labels";


const COMPLAINT_STEP_LABEL: Record<string, string> = {
  RECEIVED: "접수",
  REVIEWING: "검토 중",
  ASSIGNED: "담당자 배정",
  IN_PROGRESS: "처리 중",
  RESOLVED: "처리 완료",
  CLOSED: "종결",
  REJECTED: "반려",
};


/** SCR-CM-003 민원 처리 이력 상세. */

interface ComplaintProcessStep {
  step_seq: number;
  step_cd: string;
  occurred_at: string;
  note: string | null;
  actor: string | null;
}

interface ComplaintDetailData {
  cm_token: string;
  complaint_type_cd: string;
  title: string;
  content: string;
  status_cd: string;
  receipt_at: string;
  responded_at: string | null;
  response_content: string | null;
  satisfaction_score: number | null;
  process_history: ComplaintProcessStep[];
}

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "접수됨", color: "text-muted-foreground" },
  ASSIGNED: { label: "배정됨", color: "text-warning" },
  IN_PROGRESS: { label: "처리 중", color: "text-warning" },
  RESPONDED: { label: "답변 완료", color: "text-success" },
  CLOSED: { label: "종료", color: "text-muted-foreground" },
};


function ComplaintDetailContent({ token }: { token: string }) {
  const { data, error, loading } = useFetch<ComplaintDetailData>(`/api/complaints/${token}`);

  useEffect(() => {
    if (error) showApiError(error, "민원 정보를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="민원 정보 불러오는 중…" />;
  if (!data) return null;

  const status = STATUS_LABEL[data.status_cd] ?? { label: data.status_cd, color: "text-muted-foreground" };

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{complaintTypeLabel(data.complaint_type_cd)}</span>
          <span className={status.color}>{status.label}</span>
        </div>
        <h1 className="mt-1 text-xl font-semibold">{data.title}</h1>
        <div className="text-xs text-muted-foreground">
          접수 {dtFmt.format(new Date(data.receipt_at))}
          {data.responded_at ? ` · 답변 ${dtFmt.format(new Date(data.responded_at))}` : ""}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">민원 내용</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">{data.content}</CardContent>
      </Card>

      {data.response_content ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">답변 내용</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">{data.response_content}</CardContent>
        </Card>
      ) : null}

      {data.process_history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">처리 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {data.process_history.map((s) => (
                <li key={s.step_seq} className="flex gap-3 text-sm">
                  <span className="num-tabular shrink-0 text-xs text-muted-foreground">
                    {dtFmt.format(new Date(s.occurred_at))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{COMPLAINT_STEP_LABEL[s.step_cd] ?? s.step_cd}</div>
                    {s.note ? <div className="text-xs text-muted-foreground">{s.note}</div> : null}
                    {s.actor ? <div className="text-[10px] text-muted-foreground">담당 {s.actor}</div> : null}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <Link href="/complaints" className="text-xs text-primary hover:underline">
          ← 민원 목록
        </Link>
      </div>
    </div>
  );
}


export default function Page() {
  const params = useParams<{ cmToken: string }>();
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <ComplaintDetailContent token={params.cmToken} />
      </main>
    </Protected>
  );
}