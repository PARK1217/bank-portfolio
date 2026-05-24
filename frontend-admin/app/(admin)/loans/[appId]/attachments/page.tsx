"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, XCircle, FileX, Eye, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, getAdminToken, mapAttachmentsResponse, type AttachmentsResponse, ApiError } from "@/lib/api";
import { decodeId, fmtDateTime, fmtKrw } from "@/lib/utils";
import { docCategoryLabel } from "@/lib/labels";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:8001";


export default function LoanAttachmentsPage() {
  const params = useParams<{ appId: string }>();
  const router = useRouter();
  // URL 의 :appId 는 base64 인코딩된 application_id — 디코딩해서 정수 복원.
  const appId = (() => {
    if (!params.appId) return 0;
    try {
      return parseInt(decodeId(params.appId), 10) || 0;
    } catch {
      return parseInt(params.appId, 10) || 0;
    }
  })();

  const [data, setData] = useState<AttachmentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const raw = await api.get<Record<string, unknown>>(`/api/admin/loans/${appId}/attachments`);
      setData(mapAttachmentsResponse(raw));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "첨부서류를 불러오지 못했습니다.");
    }
  }, [appId]);

  useEffect(() => {
    if (!appId) return;
    void refetch();
  }, [appId, refetch]);

  // 액션 / 모달 상태
  const [pendingAttach, setPendingAttach] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ attach_id: number; doc_name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<{ attach_id: number; file_name: string; blob_url: string; mime: string } | null>(null);

  async function onVerify(attachId: number) {
    setActionMsg(null);
    setPendingAttach(attachId);
    try {
      await api.post(`/api/admin/loans/${appId}/attachments/${attachId}/verify`);
      setActionMsg(`서류 #${attachId} 가 승인되었습니다.`);
      await refetch();
    } catch (err) {
      setActionMsg(err instanceof ApiError ? `[${err.code}] ${err.message}` : "승인 처리 실패");
    } finally {
      setPendingAttach(null);
    }
  }

  function openReject(attachId: number, docName: string) {
    setRejectTarget({ attach_id: attachId, doc_name: docName });
    setRejectReason("");
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionMsg("반려 사유를 입력해 주세요.");
      return;
    }
    setActionMsg(null);
    setPendingAttach(rejectTarget.attach_id);
    try {
      await api.post(`/api/admin/loans/${appId}/attachments/${rejectTarget.attach_id}/reject`, { reason });
      setActionMsg(`서류 #${rejectTarget.attach_id} 가 반려 처리되었습니다.`);
      setRejectTarget(null);
      setRejectReason("");
      await refetch();
    } catch (err) {
      setActionMsg(err instanceof ApiError ? `[${err.code}] ${err.message}` : "반려 처리 실패");
    } finally {
      setPendingAttach(null);
    }
  }

  async function openPreview(attachId: number, fileName: string) {
    setActionMsg(null);
    try {
      const tok = getAdminToken();
      const res = await fetch(`${BASE_URL}/api/admin/loans/${appId}/attachments/${attachId}/file`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : undefined,
      });
      if (!res.ok) {
        setActionMsg(`파일을 불러오지 못했습니다 (HTTP ${res.status}).`);
        return;
      }
      const mime = res.headers.get("Content-Type") || "application/octet-stream";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreview({ attach_id: attachId, file_name: fileName, blob_url: url, mime });
    } catch (err) {
      setActionMsg("파일 미리보기 실패");
    }
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.blob_url);
    setPreview(null);
  }

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
      {actionMsg ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          {actionMsg}
        </div>
      ) : null}

      {!data && !error ? <Spinner label="불러오는 중…" /> : null}

      {data ? (
        <>
          {/* 신청 요약 + 완전성 카드 */}
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
                  <SummaryRow label="필수 검증 완료" value={`${data.summary.required_verified} / ${data.summary.required_total}`} />
                  <SummaryRow label="필수 제출" value={`${data.summary.required_submitted} / ${data.summary.required_total}`} />
                  <SummaryRow label="필수 누락" value={`${data.summary.required_missing}`} accent="destructive" />
                  <SummaryRow label="선택 제출" value={`${data.summary.optional_submitted} / ${data.summary.optional_total}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 요구사항 매트릭스 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">요구사항 매트릭스</CardTitle>
              <CardDescription>VERIFIED / PENDING / REJECTED / MISSING · ADMIN 등급만 승인·반려 가능</CardDescription>
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
                    <TH>액션</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.items.map((it) => {
                    const status = it.submission?.verify_status_cd ?? "MISSING";
                    const hasFile = !!it.submission?.attach_id;
                    const submitted = !!it.submission;
                    const isPending = pendingAttach === it.submission?.attach_id;
                    return (
                      <TR key={it.requirement_id}>
                        <TD>
                          <div className="font-medium">{it.doc_type_name}</div>
                          <div className="text-[10px] text-muted-foreground">{docCategoryLabel(it.doc_type_cd)}</div>
                        </TD>
                        <TD>
                          {it.required_yn === "Y" ? <Badge variant="primary">필수</Badge> : <Badge variant="muted">선택</Badge>}
                        </TD>
                        <TD>
                          <StatusBadge status={status} />
                        </TD>
                        <TD>
                          {hasFile && it.submission ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={() => openPreview(it.submission!.attach_id, it.submission!.file_name)}
                            >
                              <Eye className="h-3 w-3" />
                              {it.submission.file_name || "보기"}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(it.submission?.submitted_at)}</TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(it.submission?.verified_at)}</TD>
                        <TD className="font-mono text-xs">{it.submission?.verified_by ?? "-"}</TD>
                        <TD className="max-w-[200px] truncate text-xs text-destructive" title={it.submission?.reject_reason ?? ""}>
                          {it.submission?.reject_reason ?? "-"}
                        </TD>
                        <TD>
                          {submitted ? (
                            <div className="flex items-center gap-1">
                              {status !== "VERIFIED" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() => onVerify(it.submission!.attach_id)}
                                >
                                  승인
                                </Button>
                              ) : null}
                              {status !== "REJECTED" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() => openReject(it.submission!.attach_id, it.doc_type_name)}
                                >
                                  반려
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* 반려 사유 입력 모달 */}
      {rejectTarget ? (
        <ModalShell onClose={() => setRejectTarget(null)} title={`반려: ${rejectTarget.doc_name}`}>
          <p className="mb-2 text-xs text-muted-foreground">
            반려 사유를 명확히 작성해 주세요. 고객 화면에 그대로 노출됩니다 (1000자 이하).
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value.slice(0, 1000))}
            placeholder="예: 발급일이 24개월 초과로 유효기간 만료. 최근 3개월 내 재발급 자료 제출 부탁드립니다."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{rejectReason.length} / 1000</div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button onClick={confirmReject} disabled={!rejectReason.trim() || pendingAttach === rejectTarget.attach_id}>
              {pendingAttach === rejectTarget.attach_id ? "처리 중…" : "반려 확정"}
            </Button>
          </div>
        </ModalShell>
      ) : null}

      {/* 파일 미리보기 모달 */}
      {preview ? (
        <ModalShell onClose={closePreview} title={preview.file_name} size="lg">
          {preview.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.blob_url} alt={preview.file_name} className="mx-auto max-h-[70vh] object-contain" />
          ) : preview.mime === "application/pdf" ? (
            <iframe src={preview.blob_url} title={preview.file_name} className="h-[70vh] w-full rounded-md border" />
          ) : (
            <p className="text-sm text-muted-foreground">
              미리보기를 지원하지 않는 형식({preview.mime}) 입니다.{" "}
              <a href={preview.blob_url} download={preview.file_name} className="text-primary hover:underline">
                다운로드
              </a>
            </p>
          )}
        </ModalShell>
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
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent === "destructive" ? "font-medium text-destructive" : "font-medium"}>{value}</span>
    </div>
  );
}

function CompleteBadge({ complete }: { complete: string }) {
  if (complete === "Y") {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-success/50 bg-success/10 px-2 py-1.5 text-xs text-success">
        <CheckCircle2 className="h-4 w-4" />
        <span className="font-medium">완전 (Complete)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-warning/50 bg-warning/10 px-2 py-1.5 text-xs text-warning">
      <Clock className="h-4 w-4" />
      <span className="font-medium">미완 (Incomplete)</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "VERIFIED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] text-success">
          <CheckCircle2 className="h-3 w-3" />
          검증완료
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
          <XCircle className="h-3 w-3" />
          반려
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
          <Clock className="h-3 w-3" />
          검토 대기
        </span>
      );
    case "MISSING":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          <FileX className="h-3 w-3" />
          미제출
        </span>
      );
  }
}


function ModalShell({
  children,
  onClose,
  title,
  size,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  size?: "lg";
}) {
  const widthCls = size === "lg" ? "max-w-3xl" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`flex w-full ${widthCls} flex-col rounded-md bg-card shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}