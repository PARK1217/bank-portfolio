"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import {
  NOTICE_CATEGORY_OPTIONS,
  NOTICE_STATUS_OPTIONS,
  EVENT_STATUS_OPTIONS,
} from "@/lib/labels";


type Type = "notice" | "event";


export default function NewNoticePage() {
  return (
    <Suspense fallback={<Spinner label="로딩 중…" />}>
      <NewForm />
    </Suspense>
  );
}


function NewForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const typeParam = (sp.get("type") as Type | null) ?? "notice";
  const [type, setType] = useState<Type>(typeParam);

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {type === "notice" ? "공지 발행" : "이벤트 발행"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {type === "notice"
            ? "모바일·웹 메인 노출. 임시저장 후 검토하고 게시 전환 가능."
            : "배너 + 진행 기간 설정. 종료 후에도 본문은 ENDED 상태로 유지."}
        </p>
      </div>

      <div className="flex border-b">
        <TabButton active={type === "notice"} onClick={() => setType("notice")}>
          공지사항
        </TabButton>
        <TabButton active={type === "event"} onClick={() => setType("event")}>
          이벤트
        </TabButton>
      </div>

      {type === "notice" ? <NoticeForm /> : <EventForm />}
    </div>
  );
}


function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-b-2 border-primary text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}


function NoticeForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryCd, setCategoryCd] = useState("SERVICE");
  const [pinnedYn, setPinnedYn] = useState<"Y" | "N">("N");
  const [statusCd, setStatusCd] = useState("PUBLISH");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !body) {
      setErr("제목과 본문은 필수입니다.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await api.post<{ notice_id: number }>("/api/admin/notices", {
        title,
        body,
        category_cd: categoryCd,
        pinned_yn: pinnedYn,
        status_cd: statusCd,
      });
      router.push(`/notices/${res.notice_id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "공지 발행에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">공지 정보</CardTitle>
        <CardDescription>분류·고정·상태 설정 + 본문</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field label="제목" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </Field>
          <Field label="본문" required>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="분류">
              <select
                value={categoryCd}
                onChange={(e) => setCategoryCd(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {NOTICE_CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="상단 고정">
              <select
                value={pinnedYn}
                onChange={(e) => setPinnedYn(e.target.value as "Y" | "N")}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="N">고정 안 함</option>
                <option value="Y">고정</option>
              </select>
            </Field>
            <Field label="상태">
              <select
                value={statusCd}
                onChange={(e) => setStatusCd(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {NOTICE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
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
  );
}


function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [statusCd, setStatusCd] = useState("PUBLISH");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !body) {
      setErr("제목과 본문은 필수입니다.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await api.post<{ event_id: number }>("/api/admin/events", {
        title,
        summary: summary || null,
        body,
        banner_url: bannerUrl || null,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        status_cd: statusCd,
      });
      router.push(`/events/${res.event_id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "이벤트 발행에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">이벤트 정보</CardTitle>
        <CardDescription>요약·배너 URL·진행 기간 + 본문</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field label="제목" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </Field>
          <Field label="요약 (목록·카드 노출)">
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} placeholder="한 줄 요약" />
          </Field>
          <Field label="본문" required>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="시작일 (YYYY-MM-DD)">
              <Input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} placeholder="2026-06-01" />
            </Field>
            <Field label="종료일 (YYYY-MM-DD)">
              <Input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} placeholder="2026-08-31" />
            </Field>
            <Field label="상태">
              <select
                value={statusCd}
                onChange={(e) => setStatusCd(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {EVENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="배너 이미지 URL (선택)">
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} maxLength={500} placeholder="https://..." />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? "발행 중…" : "발행"}</Button>
            {err ? <span className="text-xs text-destructive">{err}</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
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
