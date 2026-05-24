"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, type AdminNoticeDetail } from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";
import {
  NOTICE_CATEGORY_OPTIONS,
  NOTICE_STATUS_OPTIONS,
  noticeCategoryLabel,
  noticeStatusLabel,
} from "@/lib/labels";


export default function NoticeDetailPage() {
  const params = useParams<{ noticeId: string }>();
  const router = useRouter();
  const noticeId = Number(params.noticeId);

  const [data, setData] = useState<AdminNoticeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 편집 폼 상태
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryCd, setCategoryCd] = useState("");
  const [pinnedYn, setPinnedYn] = useState<"Y" | "N">("N");
  const [statusCd, setStatusCd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function load() {
    if (!noticeId) return;
    try {
      const res = await api.get<AdminNoticeDetail>(`/api/admin/notices/${noticeId}`);
      setData(res);
      setTitle(res.title);
      setBody(res.body);
      setCategoryCd(res.category_cd ?? "SERVICE");
      setPinnedYn((res.pinned_yn as "Y" | "N") ?? "N");
      setStatusCd(res.status_cd ?? "PUBLISH");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "공지 상세를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await api.patch(`/api/admin/notices/${noticeId}`, {
        title,
        body,
        category_cd: categoryCd,
        pinned_yn: pinnedYn,
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
    if (!window.confirm("이 공지를 삭제하시겠습니까? (논리 삭제)")) return;
    try {
      await api.delete(`/api/admin/notices/${noticeId}`);
      router.push("/notices");
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "삭제에 실패했어요.");
    }
  }

  if (!noticeId) return null;

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
              <h1 className="text-2xl font-semibold tracking-tight">공지 #{data.notice_id}</h1>
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
                <CardDescription>제목·본문·분류·상태 수정 + 게시 토글</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitEdit} className="space-y-4">
                  <Field label="제목">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
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
                    <Field label="분류">
                      <select value={categoryCd} onChange={(e) => setCategoryCd(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        {NOTICE_CATEGORY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="상단 고정">
                      <select value={pinnedYn} onChange={(e) => setPinnedYn(e.target.value as "Y" | "N")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="N">고정 안 함</option>
                        <option value="Y">고정</option>
                      </select>
                    </Field>
                    <Field label="상태">
                      <select value={statusCd} onChange={(e) => setStatusCd(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        {NOTICE_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
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
                  {data.pinned_yn === "Y" ? <Badge variant="warning">고정</Badge> : null}
                  <Badge variant="muted">{noticeCategoryLabel(data.category_cd)}</Badge>
                  <Badge variant={data.status_cd === "PUBLISH" ? "success" : "muted"}>
                    {noticeStatusLabel(data.status_cd)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{data.body}</div>
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
