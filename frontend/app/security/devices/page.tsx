"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/** SCR-SC-003 기기 관리 — 등록된 기기 + 접속 이력. */

interface DeviceItem {
  device_id: number;
  device_token: string;
  alias: string | null;
  device_kind: string;
  os_name: string | null;
  browser_name: string | null;
  is_trusted: boolean;
  last_access_at: string | null;
  registered_at: string;
}

interface DeviceListResponse {
  items: DeviceItem[];
}

const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


function DevicesContent() {
  const { data, error, loading, refetch } = useFetch<DeviceListResponse>("/api/security/devices");

  useEffect(() => {
    if (error) showApiError(error, "기기 목록을 불러오지 못했습니다.");
  }, [error]);

  async function revoke(token: string) {
    if (!confirm("이 기기를 신뢰 해제하시겠습니까? 해당 기기에서 다시 로그인하려면 추가 인증이 필요합니다.")) return;
    try {
      await api.delete(`/api/security/devices/${token}`);
      void refetch();
    } catch (err) {
      showApiError(err, "기기 해제에 실패했습니다.");
    }
  }

  if (loading && !data) return <Spinner label="기기 목록 불러오는 중…" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/security/devices/new" className={cn(buttonVariants({ size: "sm" }))}>
          + 현재 기기 등록
        </Link>
      </div>
      {!data || data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          등록된 기기가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((d) => (
            <li key={d.device_token}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {d.alias ?? "(별칭 없음)"}
                      {d.is_trusted ? (
                        <span className="ml-2 rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
                          신뢰 기기
                        </span>
                      ) : null}
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => revoke(d.device_token)}>
                      해제
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-0.5 pt-0 text-xs text-muted-foreground">
                  <div>{d.device_kind} · {d.os_name ?? "-"} · {d.browser_name ?? "-"}</div>
                  <div>등록 {dtFmt.format(new Date(d.registered_at))}</div>
                  {d.last_access_at ? (
                    <div>마지막 접속 {dtFmt.format(new Date(d.last_access_at))}</div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground">
            ← 보안 설정
          </Link>
          <h1 className="mt-1 text-xl font-semibold">기기 관리</h1>
        </div>
        <DevicesContent />
      </main>
    </Protected>
  );
}