"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, mapDecisionItem, type DecisionItem } from "@/lib/api";
import { encodeId, fmtDateTime, fmtKrw } from "@/lib/utils";


type FilterCd = "ALL" | "AUTO_APPROVE" | "AUTO_REJECT" | "HUMAN_REVIEW" | "APPROVE" | "REJECT";

const FILTERS: { cd: FilterCd; label: string }[] = [
  { cd: "ALL", label: "전체" },
  { cd: "AUTO_APPROVE", label: "자동 승인" },
  { cd: "AUTO_REJECT", label: "자동 반려" },
  { cd: "HUMAN_REVIEW", label: "검토중" },
  { cd: "APPROVE", label: "사람 승인" },
  { cd: "REJECT", label: "사람 반려" },
];


export default function DecisionsPage() {
  const [filter, setFilter] = useState<FilterCd>("ALL");
  const [items, setItems] = useState<DecisionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setError(null);
    const q = filter === "ALL" ? "" : `?decision_cd=${filter}`;
    (async () => {
      try {
        const res = await api.get<{ items: Record<string, unknown>[]; count: number }>(
          `/api/admin/loans/decisions${q}${q ? "&" : "?"}limit=200`,
        );
        setItems(res.items.map(mapDecisionItem));
      } catch (err) {
        setError(err instanceof Error ? err.message : "결정 이력을 불러오지 못했습니다.");
      }
    })();
  }, [filter]);

  const totals = useMemo(() => {
    if (!items) return null;
    return {
      total: items.length,
      auto_a: items.filter((d) => d.decision_cd === "AUTO_APPROVE").length,
      auto_r: items.filter((d) => d.decision_cd === "AUTO_REJECT").length,
      review: items.filter((d) => d.decision_cd === "HUMAN_REVIEW").length,
    };
  }, [items]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 의사결정 이력</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ML XGBoost 추론 결과 — 점수 ≥ 0.85 자동 승인 · ≤ 0.30 자동 반려 · 그 외 사람 검토
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.cd}
            onClick={() => setFilter(f.cd)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f.cd
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">결정 {filter === "ALL" ? "전체" : FILTERS.find((f) => f.cd === filter)?.label}</CardTitle>
          {totals ? (
            <CardDescription>
              총 {totals.total}건 · 자동승인 {totals.auto_a} · 자동반려 {totals.auto_r} · 검토 {totals.review}
            </CardDescription>
          ) : null}
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
              해당 조건의 결정이 없습니다.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>결정ID</TH>
                  <TH>신청ID</TH>
                  <TH>고객</TH>
                  <TH>상품</TH>
                  <TH className="text-right">희망액</TH>
                  <TH className="text-right">ML 점수</TH>
                  <TH>결정</TH>
                  <TH>사람 라벨</TH>
                  <TH>일시</TH>
                  <TH>첨부</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.decision_id}>
                    <TD className="font-mono text-xs">{row.decision_id}</TD>
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
                    <TD className="num-tabular text-right font-semibold">{row.score.toFixed(3)}</TD>
                    <TD>
                      <DecisionBadge cd={row.decision_cd} />
                    </TD>
                    <TD>
                      {row.human_decision_cd ? (
                        <DecisionBadge cd={row.human_decision_cd} />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
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


function DecisionBadge({ cd }: { cd: string }) {
  const map: Record<string, { variant: "success" | "destructive" | "warning" | "muted"; label: string }> = {
    AUTO_APPROVE: { variant: "success", label: "자동 승인" },
    APPROVE: { variant: "success", label: "승인" },
    AUTO_REJECT: { variant: "destructive", label: "자동 반려" },
    REJECT: { variant: "destructive", label: "반려" },
    HUMAN_REVIEW: { variant: "warning", label: "검토중" },
  };
  const entry = map[cd] ?? { variant: "muted" as const, label: cd };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}