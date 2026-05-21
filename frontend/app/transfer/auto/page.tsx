"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/** SCR-TR-006 자동이체 목록·관리. AUTO_TRANSFER 조회 + 상태 액션. */

interface MaskedAccount {
  masked: string;
  bank_cd?: string | null;
  bank_name?: string | null;
  holder_name?: string | null;
}

interface AutoTransferItem {
  auto_token: string;
  from_account: MaskedAccount;
  to_account: MaskedAccount;
  amount_krw: number;
  cycle_type_cd: string;
  monthly_exec_day: number | null;
  auto_status_cd: string;
  valid_start_date: string;
  valid_end_date: string | null;
  next_execute_at: string | null;
  linked_to: string | null;
}

interface AutoTransferListResponse {
  items: AutoTransferItem[];
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const CYCLE_LABEL: Record<string, string> = {
  DAILY: "매일",
  WEEKLY: "매주",
  MONTHLY: "매월",
  ONCE: "예약",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "정상", color: "text-success" },
  PAUSED: { label: "일시정지", color: "text-warning" },
  CANCEL: { label: "취소", color: "text-muted-foreground" },
  COMPLETE: { label: "종료", color: "text-muted-foreground" },
};

const LINKED_LABEL: Record<string, string> = {
  USER: "일반",
  UTILITY: "공과금",
  INSTALLMENT: "적금",
  LOAN: "대출",
};


function AutoTransferList() {
  const { data, error, loading, refetch } = useFetch<AutoTransferListResponse>("/api/transfer/auto");

  useEffect(() => {
    if (error) showApiError(error, "자동이체 목록을 불러오지 못했습니다.");
  }, [error]);

  async function patchAction(token: string, action: "PAUSE" | "RESUME" | "CANCEL") {
    if (action === "CANCEL" && !confirm("이 자동이체를 취소할까요? 되돌릴 수 없습니다.")) return;
    try {
      await api.patch(`/api/transfer/auto/${token}`, { action });
      void refetch();
    } catch (err) {
      showApiError(err, "상태 변경에 실패했습니다.");
    }
  }

  if (loading && !data) return <Spinner label="자동이체 불러오는 중…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/transfer/auto/new" className={cn(buttonVariants(), "")}>
          + 새 자동이체 등록
        </Link>
        <Link href="/transfer/scheduled" className={cn(buttonVariants({ variant: "outline" }), "")}>
          1회 예약 이체
        </Link>
      </div>

      {!data || data.items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          등록된 자동이체가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((it) => {
            const status = STATUS_LABEL[it.auto_status_cd] ?? {
              label: it.auto_status_cd,
              color: "text-muted-foreground",
            };
            const isActive = it.auto_status_cd === "ACTIVE";
            const isPaused = it.auto_status_cd === "PAUSED";
            const isTerminal =
              it.auto_status_cd === "CANCEL" || it.auto_status_cd === "COMPLETE";

            return (
              <li key={it.auto_token}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {CYCLE_LABEL[it.cycle_type_cd] ?? it.cycle_type_cd}
                          {it.monthly_exec_day ? ` ${it.monthly_exec_day}일` : ""}
                        </span>
                        {it.linked_to ? (
                          <span className="rounded bg-accent px-1.5 py-0.5">
                            {LINKED_LABEL[it.linked_to] ?? it.linked_to}
                          </span>
                        ) : null}
                      </div>
                      <span className={`font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <CardTitle className="text-base">
                      <span className="num-tabular">{fmt(it.amount_krw)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 text-sm">
                    <div className="text-xs text-muted-foreground">
                      <div>
                        출금 {it.from_account.bank_name ?? ""} {it.from_account.masked}
                      </div>
                      <div>
                        입금 {it.to_account.bank_name ?? ""} {it.to_account.masked}
                        {it.to_account.holder_name ? ` · ${it.to_account.holder_name}` : ""}
                      </div>
                      {it.next_execute_at ? (
                        <div>다음 실행 {dtFmt.format(new Date(it.next_execute_at))}</div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/transfer/auto/${it.auto_token}/history`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "")}
                      >
                        실행 이력
                      </Link>
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patchAction(it.auto_token, "PAUSE")}
                        >
                          일시정지
                        </Button>
                      ) : null}
                      {isPaused ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patchAction(it.auto_token, "RESUME")}
                        >
                          재개
                        </Button>
                      ) : null}
                      {!isTerminal ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchAction(it.auto_token, "CANCEL")}
                        >
                          취소
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
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
          <h1 className="text-xl font-semibold">자동이체</h1>
          <p className="text-xs text-muted-foreground">
            등록한 자동이체를 한 곳에서 관리합니다. 일시정지·재개·취소는 즉시 반영됩니다.
          </p>
        </div>
        <AutoTransferList />
      </main>
    </Protected>
  );
}