"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Users, FileCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiError, type AdminTermsDetail } from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";
import {
  TERMS_STATUS_OPTIONS,
  termsChangeTypeLabel,
  termsStatusLabel,
  termsTypeLabel,
} from "@/lib/labels";


export default function TermsDetailPage() {
  const params = useParams<{ termsId: string }>();
  const router = useRouter();
  const termsId = Number(params.termsId);

  const [data, setData] = useState<AdminTermsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [effective, setEffective] = useState("");
  const [expire, setExpire] = useState("");
  const [requiredYn, setRequiredYn] = useState<"Y" | "N">("Y");
  const [reAgreeYn, setReAgreeYn] = useState<"Y" | "N">("N");
  const [statusCd, setStatusCd] = useState("");
  const [ownerDept, setOwnerDept] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function load() {
    if (!termsId) return;
    try {
      const res = await api.get<AdminTermsDetail>(`/api/admin/terms/${termsId}`);
      setData(res);
      setName(res.terms.name);
      setBody(res.terms.body ?? "");
      setEffective(res.terms.effective_date ?? "");
      setExpire(res.terms.expire_date ?? "");
      setRequiredYn((res.terms.agree_required_yn as "Y" | "N") ?? "Y");
      setReAgreeYn((res.terms.re_agree_yn as "Y" | "N") ?? "N");
      setStatusCd(res.terms.status_cd ?? "ACTIVE");
      setOwnerDept(res.terms.owner_dept ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "약관 상세를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termsId]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await api.patch(`/api/admin/terms/${termsId}`, {
        terms_name: name,
        terms_body: body,
        effective_date: effective || null,
        expire_date: expire || null,
        agree_required_yn: requiredYn,
        re_agree_yn: reAgreeYn,
        status_cd: statusCd,
        owner_dept: ownerDept || null,
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
    if (!window.confirm("이 약관을 삭제하시겠습니까? (논리 삭제 — 이력은 유지)")) return;
    try {
      await api.delete(`/api/admin/terms/${termsId}`);
      router.push("/terms");
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "삭제에 실패했어요.");
    }
  }

  if (!termsId) return null;

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
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.terms.name}
                <span className="ml-2 font-mono text-sm text-muted-foreground">v{data.terms.version ?? "-"}</span>
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                #{data.terms.terms_id} · {termsTypeLabel(data.terms.type_cd)} ·{" "}
                시행 {fmtDateTime(data.terms.effective_date)}
                {data.terms.expire_date ? ` ~ 만료 ${fmtDateTime(data.terms.expire_date)}` : ""} ·{" "}
                {data.terms.owner_dept ?? "-"}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard label="상태" value={termsStatusLabel(data.terms.status_cd)} icon={FileCheck} />
            <KpiCard
              label="동의자 수 / 전체"
              value={`${fmtNumber(data.agree_stats.agreed)} / ${fmtNumber(data.agree_stats.total)}`}
              icon={Users}
            />
            <KpiCard
              label="동의율"
              value={`${data.agree_stats.rate}%`}
              icon={FileCheck}
              color={data.agree_stats.rate >= 95 ? "text-success" : data.agree_stats.rate >= 80 ? "text-warning" : "text-destructive"}
            />
          </div>

          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">편집</CardTitle>
                <CardDescription>유형·버전은 변경 불가 (새 버전을 발행하세요)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitEdit} className="space-y-4">
                  <Field label="약관명">
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
                  </Field>
                  <Field label="본문">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={14}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </Field>
                  <div className="grid grid-cols-4 gap-3">
                    <Field label="시행일">
                      <Input value={effective} onChange={(e) => setEffective(e.target.value)} maxLength={8} placeholder="20260601" />
                    </Field>
                    <Field label="만료일">
                      <Input value={expire} onChange={(e) => setExpire(e.target.value)} maxLength={8} />
                    </Field>
                    <Field label="동의 필수">
                      <select value={requiredYn} onChange={(e) => setRequiredYn(e.target.value as "Y" | "N")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="Y">필수</option>
                        <option value="N">선택</option>
                      </select>
                    </Field>
                    <Field label="재동의">
                      <select value={reAgreeYn} onChange={(e) => setReAgreeYn(e.target.value as "Y" | "N")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="N">아니오</option>
                        <option value="Y">예</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="상태">
                      <select value={statusCd} onChange={(e) => setStatusCd(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        {TERMS_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="담당 부서">
                      <Input value={ownerDept} onChange={(e) => setOwnerDept(e.target.value)} maxLength={50} />
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
                  <CardTitle className="text-lg">{data.terms.name}</CardTitle>
                  <Badge variant="muted">{termsTypeLabel(data.terms.type_cd)}</Badge>
                  <Badge variant={data.terms.status_cd === "ACTIVE" ? "success" : "muted"}>
                    {termsStatusLabel(data.terms.status_cd)}
                  </Badge>
                  {data.terms.agree_required_yn === "Y" ? <Badge variant="warning">동의 필수</Badge> : null}
                  {data.terms.re_agree_yn === "Y" ? <Badge variant="primary">재동의 필요</Badge> : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {data.terms.body ?? <span className="text-muted-foreground">본문이 비어 있습니다.</span>}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">같은 약관 다른 버전</CardTitle>
                <CardDescription>같은 유형 · 같은 약관명, 본 약관 제외</CardDescription>
              </CardHeader>
              <CardContent>
                {data.siblings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">다른 버전이 없습니다.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>ID</TH>
                        <TH className="text-right">버전</TH>
                        <TH>시행일</TH>
                        <TH>상태</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.siblings.map((s) => (
                        <TR key={s.terms_id}>
                          <TD>
                            <Link href={`/terms/${s.terms_id}`} className="font-mono text-xs hover:underline">
                              #{s.terms_id}
                            </Link>
                          </TD>
                          <TD className="num-tabular text-right">v{s.version ?? "-"}</TD>
                          <TD className="text-xs">{fmtDateTime(s.effective_date)}</TD>
                          <TD>
                            <Badge variant={s.status_cd === "ACTIVE" ? "success" : "muted"}>
                              {termsStatusLabel(s.status_cd)}
                            </Badge>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">변경 이력</CardTitle>
                <CardDescription>TERMS_CHANGE_HISTORY {data.history.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                {data.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">변경 이력이 없습니다.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.history.map((h) => (
                      <li key={h.change_seq} className="rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">#{h.change_seq} · {termsChangeTypeLabel(h.change_type_cd)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {h.effective_date ? fmtDateTime(h.effective_date) : "-"}
                          </span>
                        </div>
                        {h.change_reason ? (
                          <p className="mt-1 text-xs text-muted-foreground">{h.change_reason}</p>
                        ) : null}
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {h.owner ?? "-"} · {h.order_no ?? "-"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
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


function KpiCard({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className={`mt-2 num-tabular text-2xl font-semibold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
