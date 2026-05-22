"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListTodo, Bot, AlertOctagon, Activity, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, type ReviewQueueItem, type DecisionItem, type OverdueListItem, type ExternalHealth } from "@/lib/api";
import { fmtNumber } from "@/lib/utils";


interface DashboardData {
  reviewQueueCount: number;
  todayAutoApprove: number;
  todayAutoReject: number;
  overdueCount: number;
  healthUp: number;
  healthTotal: number;
}


export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [queue, decisions, overdue, health] = await Promise.all([
          api.get<{ items: ReviewQueueItem[]; count: number }>("/api/admin/loans/review-queue?limit=200"),
          api.get<{ items: DecisionItem[]; count: number }>("/api/admin/loans/decisions?limit=200"),
          api.get<{ items: OverdueListItem[]; count: number }>("/api/admin/customers/overdue?limit=200"),
          api.get<{ items: ExternalHealth[] }>("/api/admin/health/external").catch(() => ({ items: [] })),
        ]);

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const todayDecisions = decisions.items.filter(
          (d) => d.created_at && d.created_at.slice(0, 8) === today,
        );
        const autoA = todayDecisions.filter((d) => d.decision_cd === "AUTO_APPROVE").length;
        const autoR = todayDecisions.filter((d) => d.decision_cd === "AUTO_REJECT").length;
        const upCount = health.items.filter((h) => h.status_cd === "UP").length;

        setData({
          reviewQueueCount: queue.count,
          todayAutoApprove: autoA,
          todayAutoReject: autoR,
          overdueCount: overdue.count,
          healthUp: upCount,
          healthTotal: health.items.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "대시보드 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">사람 + AI 협업 은행 운영 콘솔</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading || !data ? (
        <Spinner label="집계 중…" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              icon={ListTodo}
              label="검토 대기"
              value={fmtNumber(data.reviewQueueCount)}
              unit="건"
              href="/loans/review-queue"
              accent="warning"
            />
            <KpiCard
              icon={Bot}
              label="오늘 자동 승인"
              value={fmtNumber(data.todayAutoApprove)}
              unit="건"
              href="/loans/decisions"
              accent="success"
              sub={`자동 반려 ${data.todayAutoReject}건`}
            />
            <KpiCard
              icon={AlertOctagon}
              label="연체 회원"
              value={fmtNumber(data.overdueCount)}
              unit="명"
              href="/overdue"
              accent="destructive"
            />
            <KpiCard
              icon={Activity}
              label="외부망 정상"
              value={`${data.healthUp} / ${data.healthTotal || "?"}`}
              unit=""
              href="/health"
              accent={data.healthUp === data.healthTotal ? "success" : "warning"}
            />
            <KpiCard
              icon={Sparkles}
              label="AI 관측"
              value="Phoenix"
              unit=""
              href="/observability"
              accent="primary"
              sub="LLM 트레이스·Faithfulness"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">바로가기</CardTitle>
              <CardDescription>핵심 운영 작업 진입</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <QuickLink href="/loans/review-queue" title="대출 검토 큐" desc="ML 스코어 0.30~0.85 사람 검토 대기" />
                <QuickLink href="/loans/decisions" title="AI 의사결정 이력" desc="자동 승인·반려·검토중 전체 결정 조회" />
                <QuickLink href="/overdue" title="연체 회원 추적" desc="등급별 연체액·연체일수" />
                <QuickLink href="/audit" title="감사 로그" desc="모든 관리자 API 호출 적재 (Phase C)" />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  href,
  accent,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
  href: string;
  accent: "primary" | "success" | "warning" | "destructive";
  sub?: string;
}) {
  const accentClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[accent];

  return (
    <Link href={href} className="group">
      <Card className="transition-colors group-hover:border-primary/50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="text-xs text-muted-foreground">{label}</div>
            <Icon className={`h-4 w-4 ${accentClass}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`num-tabular text-2xl font-semibold ${accentClass}`}>{value}</span>
            {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
          </div>
          {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
        </CardContent>
      </Card>
    </Link>
  );
}


function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/30"
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}