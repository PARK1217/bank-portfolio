"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-AC-010 분실 신고 (통장·카드·기타). 즉시 계좌 제한. */

const LOST_TYPES: { code: string; label: string; desc: string }[] = [
  { code: "PASSBOOK", label: "통장", desc: "분실 통장의 거래 정지" },
  { code: "CARD", label: "카드", desc: "카드 일시 정지 + 재발급 안내" },
  { code: "BOTH", label: "통장 + 카드", desc: "통장·카드 모두 일시 정지" },
];


function LostReportForm({ token }: { token: string }) {
  const router = useRouter();
  const [type, setType] = useState("PASSBOOK");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post(
        `/api/accounts/${token}/lost`,
        { lost_type_cd: type, note: note || null },
        { idempotent: true },
      );
      toast.success("분실 신고가 접수되었습니다. 즉시 거래가 정지됩니다.");
      router.push(`/accounts/${token}`);
    } catch (err) {
      showApiError(err, "분실 신고에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mt-1">분실 신고</CardTitle>
        <CardDescription>
          접수 즉시 본 계좌의 거래가 정지됩니다. 신고 이후 재발행은 영업점 본인 확인 후 가능합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">분실 항목 *</legend>
            {LOST_TYPES.map((t) => (
              <label
                key={t.code}
                className={`flex cursor-pointer items-start gap-2 rounded-md border bg-card p-3 text-sm ${
                  type === t.code ? "border-primary bg-primary/5" : ""
                }`}
              >
                <input
                  type="radio"
                  name="lost-type"
                  value={t.code}
                  checked={type === t.code}
                  onChange={() => setType(t.code)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{t.label}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t.desc}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">사고 경위 (선택)</span>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={500}
              placeholder="언제·어디서 분실했는지 간단히 적어주세요."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <Button type="submit" variant="destructive" className="w-full" disabled={submitting}>
            {submitting ? "신고 처리 중…" : "분실 신고 접수"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href={`/accounts/${params.accountToken}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← 계좌 상세
          </Link>
        </div>
        <LostReportForm token={params.accountToken} />
      </main>
    </Protected>
  );
}