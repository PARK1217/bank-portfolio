"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-CM-001 민원 접수. */

interface ComplaintCreateResponse {
  cm_token: string;
}

const TYPES: { code: string; label: string }[] = [
  { code: "ACCOUNT", label: "계좌 관련" },
  { code: "TRANSFER", label: "이체 / 송금" },
  { code: "LOAN", label: "대출" },
  { code: "FRAUD", label: "사기·도용" },
  { code: "SERVICE", label: "서비스 이용" },
  { code: "ETC", label: "기타" },
];


function ComplaintForm() {
  const router = useRouter();
  const [type, setType] = useState("ACCOUNT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attached, setAttached] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !submitting && title.trim().length >= 4 && content.trim().length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<ComplaintCreateResponse>(
        "/api/complaints",
        {
          complaint_type_cd: type,
          title,
          content,
          attachment_ids: attached,
        },
        { idempotent: true },
      );
      router.push(`/complaints/${res.cm_token}`);
    } catch (err) {
      showApiError(err, "민원 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>        <CardTitle className="mt-1">민원 접수</CardTitle>
        <CardDescription>접수 후 담당자가 영업일 기준 3일 이내에 회신드립니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">민원 유형 *</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">제목 *</span>
            <Input
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={4}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">내용 *</span>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
            />
            <p className="text-[10px] text-muted-foreground">{content.length} / 2000자</p>
          </label>
          <div className="rounded-md border bg-card p-3 text-sm">
            <div className="mb-2 text-xs text-muted-foreground">첨부 파일 (선택)</div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAttached((cur) => [...cur, Date.now()])}
            >
              + 첨부
            </Button>
            {attached.length > 0 ? (
              <p className="mt-2 text-xs text-success">✓ {attached.length}개 첨부됨</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "접수 중…" : "민원 접수"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/complaints" className="text-xs text-muted-foreground hover:text-foreground">
            ← 민원 목록
          </Link>
        </div>
        <ComplaintForm />
      </main>
    </Protected>
  );
}