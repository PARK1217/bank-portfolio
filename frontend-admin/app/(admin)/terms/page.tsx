"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type AdminTermsListResponse } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";
import {
  TERMS_STATUS_OPTIONS,
  TERMS_TYPE_OPTIONS,
  termsStatusLabel,
  termsTypeLabel,
} from "@/lib/labels";


export default function TermsListPage() {
  const [query, setQuery] = useState("");
  const [typeCd, setTypeCd] = useState("");
  const [statusCd, setStatusCd] = useState("");
  const [requiredYn, setRequiredYn] = useState("");
  const [data, setData] = useState<AdminTermsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (typeCd) params.set("type_cd", typeCd);
      if (statusCd) params.set("status_cd", statusCd);
      if (requiredYn) params.set("required_yn", requiredYn);
      params.set("limit", "200");
      const res = await api.get<AdminTermsListResponse>(`/api/admin/terms?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "약관 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">약관 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            TERMS_MASTER — 공통/예적금/대출/이체/개인정보/마케팅/상품 특약 발행·개정·이력·동의 통계
          </p>
        </div>
        <Link href="/terms/new">
          <Button>
            <Plus className="mr-1 h-3.5 w-3.5" />
            약관 신규 발행
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex-1 min-w-[240px] space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">검색어</span>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="약관명 / 담당부서"
              />
            </label>
            <Select label="유형" value={typeCd} onChange={setTypeCd} options={[{ value: "", label: "전체" }, ...TERMS_TYPE_OPTIONS]} />
            <Select label="상태" value={statusCd} onChange={setStatusCd} options={[{ value: "", label: "전체" }, ...TERMS_STATUS_OPTIONS]} />
            <Select label="동의 필수" value={requiredYn} onChange={setRequiredYn} options={[
              { value: "", label: "전체" },
              { value: "Y", label: "필수" },
              { value: "N", label: "선택" },
            ]} />
            <Button type="submit" disabled={loading}>{loading ? "검색 중…" : "검색"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            약관 목록
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>유형·약관명 정렬, 같은 유형·약관명은 버전 역순</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : loading && !data ? (
            <Spinner label="불러오는 중…" />
          ) : !data || data.items.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm">
              <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-muted-foreground">등록된 약관이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>약관명</TH>
                  <TH>유형</TH>
                  <TH className="text-right">버전</TH>
                  <TH>상태</TH>
                  <TH>필수</TH>
                  <TH>시행일</TH>
                  <TH>담당</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <TR key={row.terms_id}>
                    <TD>
                      <Link href={`/terms/${row.terms_id}`} className="font-mono text-xs hover:underline">
                        #{row.terms_id}
                      </Link>
                    </TD>
                    <TD>
                      <Link href={`/terms/${row.terms_id}`} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                    </TD>
                    <TD>
                      <Badge variant="muted">{termsTypeLabel(row.type_cd)}</Badge>
                    </TD>
                    <TD className="num-tabular text-right">v{row.version ?? "-"}</TD>
                    <TD>
                      <StatusBadge cd={row.status_cd} />
                    </TD>
                    <TD>
                      {row.agree_required_yn === "Y" ? (
                        <Badge variant="warning">필수</Badge>
                      ) : (
                        <Badge variant="muted">선택</Badge>
                      )}
                    </TD>
                    <TD className="text-xs text-muted-foreground">{fmtDateTime(row.effective_date)}</TD>
                    <TD className="text-xs text-muted-foreground">{row.owner_dept ?? "-"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}


function StatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "muted" | "warning"> = {
    ACTIVE: "success",
    INACTIVE: "warning",
    ARCHIVED: "muted",
  };
  return <Badge variant={map[cd] ?? "muted"}>{termsStatusLabel(cd)}</Badge>;
}
