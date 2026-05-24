"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { TERMS_STATUS_OPTIONS, TERMS_TYPE_OPTIONS } from "@/lib/labels";


export default function NewTermsPage() {
  const router = useRouter();

  const [typeCd, setTypeCd] = useState("GENERAL");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [effective, setEffective] = useState("");
  const [expire, setExpire] = useState("");
  const [requiredYn, setRequiredYn] = useState<"Y" | "N">("Y");
  const [reAgreeYn, setReAgreeYn] = useState<"Y" | "N">("N");
  const [statusCd, setStatusCd] = useState("ACTIVE");
  const [ownerDept, setOwnerDept] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !body) {
      setErr("약관명과 본문은 필수입니다.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await api.post<{ terms_id: number; version: number }>("/api/admin/terms", {
        terms_type_cd: typeCd,
        terms_name: name,
        terms_body: body,
        effective_date: effective || null,
        expire_date: expire || null,
        agree_required_yn: requiredYn,
        re_agree_yn: reAgreeYn,
        status_cd: statusCd,
        owner_dept: ownerDept || null,
      });
      router.push(`/terms/${res.terms_id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "약관 발행에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

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
        <h1 className="text-2xl font-semibold tracking-tight">약관 신규 발행</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          같은 유형·약관명이 이미 있으면 버전이 자동으로 +1 됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">약관 정보</CardTitle>
          <CardDescription>유형·약관명·본문·시행일 + 동의 정책</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="유형" required>
                <select
                  value={typeCd}
                  onChange={(e) => setTypeCd(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {TERMS_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="상태">
                <select
                  value={statusCd}
                  onChange={(e) => setStatusCd(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {TERMS_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="담당 부서">
                <Input value={ownerDept} onChange={(e) => setOwnerDept(e.target.value)} maxLength={50} placeholder="예: 준법감시팀" />
              </Field>
            </div>

            <Field label="약관명" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </Field>

            <Field label="본문" required>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </Field>

            <div className="grid grid-cols-4 gap-3">
              <Field label="시행일 (YYYYMMDD)">
                <Input value={effective} onChange={(e) => setEffective(e.target.value)} placeholder="20260601" maxLength={8} />
              </Field>
              <Field label="만료일 (YYYYMMDD)">
                <Input value={expire} onChange={(e) => setExpire(e.target.value)} placeholder="" maxLength={8} />
              </Field>
              <Field label="동의 필수">
                <select
                  value={requiredYn}
                  onChange={(e) => setRequiredYn(e.target.value as "Y" | "N")}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="Y">필수</option>
                  <option value="N">선택</option>
                </select>
              </Field>
              <Field label="재동의 필요">
                <select
                  value={reAgreeYn}
                  onChange={(e) => setReAgreeYn(e.target.value as "Y" | "N")}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="N">아니오</option>
                  <option value="Y">예</option>
                </select>
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>{submitting ? "발행 중…" : "발행"}</Button>
              {err ? <span className="text-xs text-destructive">{err}</span> : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}
