"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Pin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  type AdminEventListResponse,
  type AdminNoticeListResponse,
} from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";
import {
  NOTICE_CATEGORY_OPTIONS,
  NOTICE_STATUS_OPTIONS,
  EVENT_STATUS_OPTIONS,
  noticeCategoryLabel,
  noticeStatusLabel,
  eventStatusLabel,
} from "@/lib/labels";


type Tab = "notice" | "event";


export default function NoticesPage() {
  const [tab, setTab] = useState<Tab>("notice");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">공지·이벤트 발행</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            모바일·웹 노출 공지 / 이벤트 등록·수정·숨김
          </p>
        </div>
        <Link href={`/notices/new?type=${tab}`}>
          <Button>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {tab === "notice" ? "공지 발행" : "이벤트 발행"}
          </Button>
        </Link>
      </div>

      <div className="flex border-b">
        <TabButton active={tab === "notice"} onClick={() => setTab("notice")}>
          공지사항
        </TabButton>
        <TabButton active={tab === "event"} onClick={() => setTab("event")}>
          이벤트
        </TabButton>
      </div>

      {tab === "notice" ? <NoticeList /> : <EventList />}
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


function NoticeList() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<AdminNoticeListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (category) params.set("category_cd", category);
      if (status) params.set("status_cd", status);
      params.set("limit", "100");
      const res = await api.get<AdminNoticeListResponse>(`/api/admin/notices?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "공지 목록을 불러오지 못했습니다.");
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
                placeholder="제목 / 본문 / 작성자"
              />
            </label>
            <Select label="분류" value={category} onChange={setCategory} options={[{ value: "", label: "전체" }, ...NOTICE_CATEGORY_OPTIONS]} />
            <Select label="상태" value={status} onChange={setStatus} options={[{ value: "", label: "전체" }, ...NOTICE_STATUS_OPTIONS]} />
            <Button type="submit" disabled={loading}>{loading ? "검색 중…" : "검색"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            공지 목록
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>고정된 공지는 상단 정렬 + 핀 아이콘</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorBox msg={error} />
          ) : loading && !data ? (
            <Spinner label="불러오는 중…" />
          ) : !data || data.items.length === 0 ? (
            <EmptyBox />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-8"></TH>
                  <TH>제목</TH>
                  <TH>분류</TH>
                  <TH>상태</TH>
                  <TH>작성자</TH>
                  <TH>게시일</TH>
                  <TH className="text-right">조회</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <TR key={row.notice_id}>
                    <TD>{row.pinned_yn === "Y" ? <Pin className="h-3.5 w-3.5 text-warning" /> : null}</TD>
                    <TD>
                      <Link href={`/notices/${row.notice_id}`} className="font-medium hover:underline">
                        {row.title}
                      </Link>
                    </TD>
                    <TD>
                      <Badge variant="muted">{noticeCategoryLabel(row.category_cd)}</Badge>
                    </TD>
                    <TD>
                      <NoticeStatusBadge cd={row.status_cd} />
                    </TD>
                    <TD className="text-xs">{row.author ?? "-"}</TD>
                    <TD className="text-xs text-muted-foreground">{fmtDateTime(row.published_at)}</TD>
                    <TD className="num-tabular text-right text-xs text-muted-foreground">{fmtNumber(row.view_count)}</TD>
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


function EventList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<AdminEventListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (status) params.set("status_cd", status);
      params.set("limit", "100");
      const res = await api.get<AdminEventListResponse>(`/api/admin/events?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이벤트 목록을 불러오지 못했습니다.");
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
                placeholder="제목 / 요약 / 본문"
              />
            </label>
            <Select label="상태" value={status} onChange={setStatus} options={[{ value: "", label: "전체" }, ...EVENT_STATUS_OPTIONS]} />
            <Button type="submit" disabled={loading}>{loading ? "검색 중…" : "검색"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            이벤트 목록
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.count} / 총 {data.total}건
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorBox msg={error} />
          ) : loading && !data ? (
            <Spinner label="불러오는 중…" />
          ) : !data || data.items.length === 0 ? (
            <EmptyBox />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>제목</TH>
                  <TH>요약</TH>
                  <TH>상태</TH>
                  <TH>기간</TH>
                  <TH>작성자</TH>
                  <TH className="text-right">조회</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <TR key={row.event_id}>
                    <TD>
                      <Link href={`/events/${row.event_id}`} className="font-medium hover:underline">
                        {row.title}
                      </Link>
                    </TD>
                    <TD className="text-xs text-muted-foreground max-w-[280px] truncate" title={row.summary ?? ""}>
                      {row.summary ?? "-"}
                    </TD>
                    <TD>
                      <EventStatusBadge cd={row.status_cd} />
                    </TD>
                    <TD className="text-xs">
                      {row.period_start ?? "-"} ~ {row.period_end ?? "-"}
                    </TD>
                    <TD className="text-xs">{row.author ?? "-"}</TD>
                    <TD className="num-tabular text-right text-xs text-muted-foreground">{fmtNumber(row.view_count)}</TD>
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


function NoticeStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "muted" | "warning"> = {
    PUBLISH: "success",
    DRAFT: "warning",
    ARCHIVE: "muted",
  };
  return <Badge variant={map[cd] ?? "muted"}>{noticeStatusLabel(cd)}</Badge>;
}


function EventStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "muted" | "warning"> = {
    PUBLISH: "success",
    DRAFT: "warning",
    ENDED: "muted",
  };
  return <Badge variant={map[cd] ?? "muted"}>{eventStatusLabel(cd)}</Badge>;
}


function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {msg}
    </div>
  );
}


function EmptyBox() {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm">
      <Megaphone className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-muted-foreground">등록된 항목이 없습니다.</p>
    </div>
  );
}
