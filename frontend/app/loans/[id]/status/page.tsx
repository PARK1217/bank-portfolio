"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/**
 * SCR-LN-005 심사 진행 상황.
 *
 * Long-Polling 의 가벼운 클라이언트 측 폴백: useFetch refetch 를 일정 주기로 호출.
 * 백엔드가 SSE 를 지원하면 EventSource 로 교체 가능.
 */

interface ReviewStep {
  step_cd: string;
  status_cd: string;
  started_at: string | null;
  completed_at: string | null;
  note: string | null;
}

interface LoanStatusData {
  app_token: string;
  status_cd: string;
  review_steps: ReviewStep[];
  missing_documents: string[];
  current_step_cd: string | null;
}

const POLL_INTERVAL_MS = 5000;

const STEP_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  WAITING: { label: "대기", color: "text-muted-foreground" },
  IN_PROGRESS: { label: "진행 중", color: "text-warning" },
  DONE: { label: "완료", color: "text-success" },
  REJECTED: { label: "거절", color: "text-destructive" },
};

const APP_STATUS_LABEL: Record<string, string> = {
  APPLIED: "신청 접수",
  DOC_REQUIRED: "서류 제출 대기",
  REVIEWING: "심사 진행 중",
  APPROVED: "승인 — 약정 가능",
  REJECTED: "거절",
  CONTRACTED: "약정 완료",
  EXECUTED: "실행 완료",
};


function StatusContent({ appToken }: { appToken: string }) {
  const { data, error, loading, refetch } = useFetch<LoanStatusData>(
    `/api/loans/${appToken}/status`,
  );
  const [pollingErrored, setPollingErrored] = useState(false);

  useEffect(() => {
    if (error && !pollingErrored) {
      showApiError(error, "심사 정보를 불러오지 못했습니다.");
      setPollingErrored(true);
    }
  }, [error, pollingErrored]);

  // 종결 상태가 아니면 5초마다 폴링
  useEffect(() => {
    if (!data) return;
    const terminal =
      data.status_cd === "APPROVED" ||
      data.status_cd === "REJECTED" ||
      data.status_cd === "CONTRACTED" ||
      data.status_cd === "EXECUTED";
    if (terminal) return;
    const id = window.setInterval(() => void refetch(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [data, refetch]);

  if (loading && !data) return <Spinner label="심사 정보 불러오는 중…" />;
  if (!data) return null;

  const overallLabel = APP_STATUS_LABEL[data.status_cd] ?? data.status_cd;
  const canContract = data.status_cd === "APPROVED";
  const needDocs = data.missing_documents && data.missing_documents.length > 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-LN-005</div>
          <CardTitle className="mt-1">{overallLabel}</CardTitle>
          <CardDescription className="font-mono text-xs">{appToken}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2">
            {data.review_steps.map((s) => {
              const meta = STEP_STATUS_LABEL[s.status_cd] ?? {
                label: s.status_cd,
                color: "text-muted-foreground",
              };
              return (
                <li
                  key={s.step_cd}
                  className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.step_cd}</div>
                    {s.note ? (
                      <div className="text-xs text-muted-foreground">{s.note}</div>
                    ) : null}
                  </div>
                  <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                </li>
              );
            })}
          </ol>

          {needDocs ? (
            <div className="rounded-md bg-warning/10 p-3 text-sm">
              <p className="font-medium text-warning">제출이 필요한 서류가 있습니다.</p>
              <Link
                href={`/loans/${appToken}/documents`}
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                서류 제출 →
              </Link>
            </div>
          ) : null}

          {canContract ? (
            <Link
              href={`/loans/${appToken}/contract`}
              className="inline-block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              약정 진행하기 →
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <StatusContent appToken={params.id} />
      </main>
    </Protected>
  );
}