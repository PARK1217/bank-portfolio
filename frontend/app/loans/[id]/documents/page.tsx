"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/**
 * SCR-LN-004 대출 서류 제출.
 *
 * 실제 파일 업로드는 별도 첨부 서비스에 던지는 게 정석이지만, 데모는 단순화 —
 * 서버가 요구한 doc_type_cd 목록을 받아 각각 "업로드" 모의 동작 후 attachment_id 를 즉석 발급(클라 mock).
 * 추후 백엔드의 POST /api/attachments 가 마련되면 mock 부분만 교체.
 */

interface LoanStatusData {
  app_token: string;
  status_cd: string;
  review_steps: { step_cd: string; status_cd: string }[];
  missing_documents: string[];
  current_step_cd: string | null;
}

const DOC_LABEL: Record<string, string> = {
  INCOME_PROOF: "소득 증빙 (원천징수영수증 등)",
  EMPLOYMENT_CERT: "재직 증명서",
  BANK_STATEMENT: "통장 사본 / 거래 내역",
  HOUSEHOLD: "가족관계증명서",
  ID_FRONT: "신분증 앞면",
  ID_BACK: "신분증 뒷면",
};


function DocsContent({ appToken }: { appToken: string }) {
  const router = useRouter();
  const { data, error, loading, refetch } = useFetch<LoanStatusData>(`/api/loans/${appToken}/status`);

  // doc_type → 가짜 attachment_id (백엔드 POST 대체용 mock — 추후 실제 업로드 endpoint 로 교체)
  const [uploaded, setUploaded] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) showApiError(error, "신청 정보를 불러오지 못했습니다.");
  }, [error]);

  function fakeUpload(docCd: string) {
    setUploaded((cur) => ({ ...cur, [docCd]: Date.now() }));
  }

  const required = data?.missing_documents ?? [];
  const allUploaded = required.length > 0 && required.every((d) => uploaded[d]);

  async function onSubmit() {
    if (!allUploaded || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/api/loans/${appToken}/documents`, {
        documents: required.map((doc_type_cd) => ({
          doc_type_cd,
          attachment_id: uploaded[doc_type_cd],
        })),
      });
      void refetch();
      router.push(`/loans/${appToken}/status`);
    } catch (err) {
      showApiError(err, "서류 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return null;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mt-1">대출 서류 제출</CardTitle>
        <CardDescription>심사에 필요한 서류를 모두 제출하면 다음 단계로 진행됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {required.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            제출이 필요한 서류가 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {required.map((doc) => {
              const ok = !!uploaded[doc];
              return (
                <li
                  key={doc}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{DOC_LABEL[doc] ?? doc}</div>
                    <div className="text-xs text-muted-foreground">{doc}</div>
                  </div>
                  {ok ? (
                    <span className="text-xs text-success">✓ 업로드 완료</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fakeUpload(doc)}
                    >
                      업로드
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Button
          type="button"
          className="mt-5 w-full"
          onClick={onSubmit}
          disabled={!allUploaded || submitting}
        >
          {submitting ? "제출 중…" : "서류 제출하기"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <DocsContent appToken={params.id} />
      </main>
    </Protected>
  );
}