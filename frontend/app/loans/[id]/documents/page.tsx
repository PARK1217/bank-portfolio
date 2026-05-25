"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getStoredToken } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/**
 * SCR-LN-004 대출 서류 제출 — 실제 파일 업로드.
 *
 * 흐름
 *  1. GET /api/loans/applications/{appToken}/required-docs → 요구·제출 매트릭스
 *  2. 각 doc 별 input[type=file] 로 선택 → 클라 가드(MIME/size)
 *  3. POST /api/loans/applications/{appToken}/attachments (multipart) → 디스크 저장 + ATTACHED_DOC INSERT
 *  4. 응답 후 재조회 → 카드가 PENDING/REJECTED/VERIFIED 상태로 갱신
 */

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Submission {
  attach_id: number;
  file_name: string | null;
  status_cd: "PENDING" | "VERIFIED" | "REJECTED" | "MISSING";
  reject_reason: string | null;
}

interface RequiredDoc {
  requirement_id: number;
  doc_type_id: number;
  doc_name: string;
  doc_category_cd: string | null;
  required_yn: "Y" | "N";
  condition: string | null;
  valid_months: number | null;
  status_cd: "PENDING" | "VERIFIED" | "REJECTED" | "MISSING";
  submission: Submission | null;
}

interface RequiredDocsResponse {
  application_id: number;
  apply_status_cd: string | null;
  summary: {
    required_total: number;
    required_verified: number;
    required_missing: number;
    complete_yn: "Y" | "N";
  };
  items: RequiredDoc[];
}


function StatusPill({ status }: { status: RequiredDoc["status_cd"] }) {
  const map: Record<RequiredDoc["status_cd"], { label: string; tone: string }> = {
    VERIFIED: { label: "검증 완료", tone: "bg-success/15 text-success" },
    PENDING: { label: "검토 대기", tone: "bg-warning/15 text-warning" },
    REJECTED: { label: "반려", tone: "bg-destructive/15 text-destructive" },
    MISSING: { label: "미제출", tone: "bg-muted/40 text-muted-foreground" },
  };
  const m = map[status];
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", m.tone)}>
      {m.label}
    </span>
  );
}


function DocsContent({ appToken }: { appToken: string }) {
  const { data, error, loading, refetch } = useFetch<RequiredDocsResponse>(
    `/api/loans/applications/${appToken}/required-docs`,
  );

  const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (error) showApiError(error, "요구 서류 정보를 불러오지 못했습니다.");
  }, [error]);

  const upload = useCallback(
    async (docTypeId: number, file: File) => {
      if (!ALLOWED_MIMES.includes(file.type)) {
        showApiError(
          new Error("invalid mime"),
          "이미지(JPG/PNG/WEBP) 또는 PDF 파일만 업로드할 수 있어요.",
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showApiError(
          new Error("too large"),
          `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)} MB). 10MB 이하만 가능해요.`,
        );
        return;
      }
      if (file.size === 0) {
        showApiError(new Error("empty"), "빈 파일은 업로드할 수 없어요.");
        return;
      }

      setUploadingDocId(docTypeId);
      try {
        const fd = new FormData();
        fd.append("doc_type_id", String(docTypeId));
        fd.append("file", file);
        const token = getStoredToken();
        const res = await fetch(
          `${BASE_URL}/api/loans/applications/${appToken}/attachments`,
          {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd,
          },
        );
        if (!res.ok) {
          let msg = `업로드에 실패했습니다 (HTTP ${res.status})`;
          try {
            const body = await res.json();
            if (body?.message) msg = body.message;
          } catch {
            // ignore
          }
          showApiError(new Error(msg), msg);
          return;
        }
        await refetch();
      } finally {
        setUploadingDocId(null);
        const inp = fileInputs.current[docTypeId];
        if (inp) inp.value = "";
      }
    },
    [appToken, refetch],
  );

  if (loading && !data) return <Spinner label="요구 서류 불러오는 중…" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">서류 제출</CardTitle>
          <CardDescription>
            JPG · PNG · WEBP · PDF 파일 (최대 10MB). 제출하신 서류는 관리자 검토 후
            결과가 업데이트됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">필수 검증 완료</span>
            <span className="num-tabular font-medium">
              {data.summary.required_verified} / {data.summary.required_total}
            </span>
          </div>
          {data.summary.required_missing > 0 ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">필수 미제출</span>
              <span className="font-medium text-destructive">{data.summary.required_missing}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {data.items.map((it) => {
          const required = it.required_yn === "Y";
          const isUploading = uploadingDocId === it.doc_type_id;
          const sub = it.submission;
          const canReupload = it.status_cd !== "VERIFIED";
          return (
            <li key={it.requirement_id} className="rounded-md border bg-card p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{it.doc_name}</span>
                    {required ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        필수
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        선택
                      </span>
                    )}
                    <StatusPill status={it.status_cd} />
                  </div>
                  {it.condition ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{it.condition}</p>
                  ) : null}
                  {sub && sub.file_name ? (
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {sub.file_name}
                    </p>
                  ) : null}
                  {sub && sub.status_cd === "REJECTED" && sub.reject_reason ? (
                    <p className="mt-1 rounded bg-destructive/5 px-2 py-1 text-xs text-destructive">
                      반려 사유: {sub.reject_reason}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <input
                    ref={(el) => {
                      fileInputs.current[it.doc_type_id] = el;
                    }}
                    type="file"
                    accept={ALLOWED_MIMES.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(it.doc_type_id, f);
                    }}
                  />
                  <Button
                    size="sm"
                    variant={sub ? "outline" : "default"}
                    disabled={!canReupload || isUploading}
                    onClick={() => fileInputs.current[it.doc_type_id]?.click()}
                  >
                    {isUploading
                      ? "업로드 중…"
                      : sub
                        ? canReupload
                          ? "다시 업로드"
                          : "완료"
                        : "업로드"}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">대출 서류 제출</h1>
          <p className="text-xs text-muted-foreground">
            심사에 필요한 서류를 업로드해 주세요. 관리자가 검토 후 승인·반려를 처리합니다.
          </p>
        </div>
        <DocsContent appToken={params.id} />
      </main>
    </Protected>
  );
}
