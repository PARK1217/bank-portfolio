"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, type AdminEventDetail } from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";
import { EVENT_STATUS_OPTIONS, eventStatusLabel } from "@/lib/labels";


export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = Number(params.eventId);

  const [data, setData] = useState<AdminEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [statusCd, setStatusCd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function load() {
    if (!eventId) return;
    try {
      const res = await api.get<AdminEventDetail>(`/api/admin/events/${eventId}`);
      setData(res);
      setTitle(res.title);
      setSummary(res.summary ?? "");
      setBody(res.body);
      setBannerUrl(res.banner_url ?? "");
      setPeriodStart(res.period_start ?? "");
      setPeriodEnd(res.period_end ?? "");
      setStatusCd(res.status_cd ?? "PUBLISH");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "이벤트 상세를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await api.patch(`/api/admin/events/${eventId}`, {
        title,
        summary: summary || null,
        body,
        banner_url: bannerUrl || null,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        status_cd: statusCd,
      });
      setEditing(false);
      await load();
    } catch (e) {
      setSubmitErr(e instanceof ApiError ? e.message : "수정에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function doDelete() {
    if (!window.confirm("이 이벤트를 삭제하시겠습니까? (논리 삭제)")) return;
    try {
      await api.delete(`/api/admin/events/${eventId}`);
      router.push("/notices");
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "삭제에 실패했어요.");
    }
  }

  if (!eventId) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        뒤로
      </button>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!data && !error ? <Spinner label="불러오는 중…" /> : null}

      {data ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">이벤트 #{data.event_id}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDateTime(data.published_at)} · {data.author ?? "-"} · 조회 {fmtNumber(data.view_count)}
              </p>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  편집 취소
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  편집
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => void doDelete()}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                삭제
              </Button>
            </div>
          </div>

          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">편집</CardTitle>
                <CardDescription>제목·요약·본문·기간·배너 수정</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitEdit} className="space-y-4">
                  <Field label="제목">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
                  </Field>
                  <Field label="요약">
                    <Input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} />
                  </Field>
                  <Field label="본문">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="시작일">
                      <Input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} placeholder="2026-06-01" />
                    </Field>
                    <Field label="종료일">
                      <Input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} placeholder="2026-08-31" />
                    </Field>
                    <Field label="상태">
                      <select value={statusCd} onChange={(e) => setStatusCd(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        {EVENT_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="배너 이미지 URL">
                    <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} maxLength={500} />
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={submitting}>{submitting ? "저장 중…" : "저장"}</Button>
                    {submitErr ? <span className="text-xs text-destructive">{submitErr}</span> : null}
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{data.title}</CardTitle>
                  <Badge variant={data.status_cd === "PUBLISH" ? "success" : data.status_cd === "ENDED" ? "muted" : "warning"}>
                    {eventStatusLabel(data.status_cd)}
                  </Badge>
                </div>
                <CardDescription>
                  {data.period_start ?? "-"} ~ {data.period_end ?? "-"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.summary ? (
                  <p className="mb-3 text-sm font-medium text-muted-foreground">{data.summary}</p>
                ) : null}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{data.body}</div>
                {data.banner_url ? (
                  <div className="mt-3 text-[10px] text-muted-foreground">
                    배너 URL: <span className="font-mono">{data.banner_url}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
