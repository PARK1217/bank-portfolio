"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, mapReviewQueueItem, type ReviewQueueItem } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw } from "@/lib/utils";


export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: Record<string, unknown>[]; count: number }>(
          "/api/admin/loans/review-queue?limit=100",
        );
        setItems(res.items.map(mapReviewQueueItem));
      } catch (err) {
        setError(err instanceof Error ? err.message : "큐를 불러오지 못했습니다.");
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">심사 대기</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ML 점수가 임계 구간(low ~ high)에 떨어진 신청 — 사람 판단 필요
          </p>
        </div>
        {items ? (
          <div className="text-sm text-muted-foreground">
            <span className="num-tabular text-xl font-semibold text-foreground">{items.length}</span> 건 대기
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">사람 검토 대기</CardTitle>
          <CardDescription>행 클릭 → 신청 상세 + ML 추론 + 라벨링</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : !items ? (
            <Spinner label="불러오는 중…" />
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              검토 대기 건이 없습니다.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>신청ID</TH>
                  <TH>고객</TH>
                  <TH>상품</TH>
                  <TH className="text-right">희망액</TH>
                  <TH className="text-right">ML 점수</TH>
                  <TH>임계</TH>
                  <TH>등록</TH>
                  <TH>첨부</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.decision_id} className="cursor-pointer">
                    <TD className="font-mono text-xs">
                      <Link href={`/loans/${encodeId(row.application_id)}`} className="hover:underline">
                        {row.application_id}
                      </Link>
                    </TD>
                    <TD>
                      <div className="font-medium">{row.customer_name ?? "-"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">#{row.customer_no}</div>
                    </TD>
                    <TD>{row.product_name ?? row.product_id ?? "-"}</TD>
                    <TD className="num-tabular text-right">{fmtKrw(row.request_amount)}</TD>
                    <TD className="num-tabular text-right">
                      <ScoreBadge score={row.score} high={row.threshold_high} low={row.threshold_low} />
                    </TD>
                    <TD className="num-tabular text-[10px] text-muted-foreground">
                      {row.threshold_low.toFixed(2)} ~ {row.threshold_high.toFixed(2)}
                    </TD>
                    <TD className="text-xs text-muted-foreground">{fmtDateTime(row.created_at)}</TD>
                    <TD>
                      <Link
                        href={`/loans/${encodeId(row.application_id)}/attachments`}
                        className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="첨부서류 일치성"
                      >
                        <Paperclip className="h-3 w-3" />
                        첨부
                      </Link>
                    </TD>
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


function ScoreBadge({ score, high, low }: { score: number; high: number; low: number }) {
  let variant: "success" | "destructive" | "warning" = "warning";
  if (score >= high) variant = "success";
  else if (score <= low) variant = "destructive";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="num-tabular font-semibold">{score.toFixed(3)}</span>
      <Badge variant={variant}>
        {variant === "success" ? "승인권" : variant === "destructive" ? "반려권" : "회색지대"}
      </Badge>
    </span>
  );
}