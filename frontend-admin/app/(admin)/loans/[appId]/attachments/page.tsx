"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, XCircle, FileX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, mapAttachmentsResponse, type AttachmentsResponse, ApiError } from "@/lib/api";
import { fmtDateTime, fmtKrw } from "@/lib/utils";


export default function LoanAttachmentsPage() {
  const params = useParams<{ appId: string }>();
  const router = useRouter();
  const appId = parseInt(params.appId, 10);

  const [data, setData] = useState<AttachmentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;
    (async () => {
      try {
        const res = await api.get<Record<string, unknown>>(`/api/admin/loans/${appId}/attachments`);
        setData(mapAttachmentsResponse(res));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "첨부서류를 불러오지 못했습니다.");
      }
    })();
  }, [appId]);

  if (!appId) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        뒤로
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">첨부서류 일치성</h1>
        <p className="mt-1 text-sm text-muted-foreground">신청 #{appId} 의 요구·제출·검증 매트릭스</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!data && !error ? <Spinner label="불러오는 중…" /> : null}

      {data ? (
        <>
          {/* 신청 요약 + 요약 카드 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">신청 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <Pair label="고객" value={`${data.application.customer_name ?? "-"} (#${data.application.customer_no})`} />
                  <Pair label="상품" value={data.application.product_name ?? data.application.product_id ?? "-"} />
                  <Pair label="희망액" value={fmtKrw(data.application.request_amount)} />
                  <Pair label="신청ID" value={`#${data.application.application_id}`} />
                </dl>
              </CardContent>
            </Card>

            <Card className="md:w-[280px]">
              <CardHeader>
                <CardTitle className="text-base">완전성</CardTitle>
              </CardHeader>
              <CardContent>
                <CompleteBadge complete={data.summary.complete_yn} />
                <div className="mt-3 space-y-1 text-xs">
                  <SummaryRow
                    label="필수 검증 완료"
                    value={`${data.summary.required_verified} / ${data.summary.required_total}`}
                  />
                  <SummaryRow
                    label="필수 제출"
                    value={`${data.summary.required_submitted} / ${data.summary.required_total}`}
                  />
                  <SummaryRow label="필수 누락" value={`${data.summary.required_missing}`} accent="destructive" />
                  <SummaryRow
                    label="선택 제출"
                    value={`${data.summary.optional_submitted} / ${data.summary.optional_total}`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 요구사항 매트릭스 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">요구사항 매트릭스</CardTitle>
              <CardDescription>VERIFIED / PENDING / REJECTED / MISSING</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <TR>
                    <TH>서류</TH>
                    <TH>필수</TH>
                    <TH>상태</TH>
                    <TH>제출 파일</TH>
                    <TH>제출 일시</TH>
                    <TH>검증 일시</TH>
                    <TH>검증자</TH>
                    <TH>반려 사유</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.items.map((it) => {
                    const status = it.submission?.verify_status_cd ?? "MISSING";
                    return (
                      <TR key={it.requirement_id}>
                        <TD>
                          <div className="font-medium">{it.doc_type_name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{it.doc_type_cd}</div>
                        </TD>
                        <TD>
                          {it.required_yn === "Y" ? (
                            <Badge variant="primary">필수</Badge>
                          ) : (
                            <Badge variant="muted">선택</Badge>
                          )}
                        </TD>
                        <TD>
                          <StatusBadge status={status} />
                        </TD>
                        <TD className="text-xs">{it.submission?.file_name ?? "-"}</TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(it.submission?.submitted_at)}</TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(it.submission?.verified_at)}</TD>
                        <TD className="font-mono text-xs">{it.submission?.verified_by ?? "-"}</TD>
                        <TD className="text-xs text-destructive">{it.submission?.reject_reason ?? "-"}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}


function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </>
  );
}


function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: "destructive" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num-tabular font-medium ${accent === "destructive" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}


function CompleteBadge({ complete }: { complete: string }) {
  if (complete === "Y") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/50 bg-success/5 px-3 py-2">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <span className="text-sm font-semibold text-success">완전 (Complete)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/5 px-3 py-2">
      <Clock className="h-5 w-5 text-warning" />
      <span className="text-sm font-semibold text-warning">미완 (Incomplete)</span>
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "VERIFIED":
      return (
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3 w-3" />
          <Badge variant="success">검증완료</Badge>
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3 text-warning" />
          <Badge variant="warning">검증대기</Badge>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1">
          <XCircle className="h-3 w-3 text-destructive" />
          <Badge variant="destructive">반려</Badge>
        </span>
      );
    case "MISSING":
    default:
      return (
        <span className="inline-flex items-center gap-1">
          <FileX className="h-3 w-3 text-muted-foreground" />
          <Badge variant="muted">미제출</Badge>
        </span>
      );
  }
}