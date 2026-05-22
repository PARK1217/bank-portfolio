"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type ExternalHealth } from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";


const KNOWN_LABELS: Record<string, { name: string; desc: string }> = {
  KFTC: { name: "KFTC 금융결제원", desc: "타행 이체 · 계좌 실명조회" },
  BOK_WIRE: { name: "BOK-Wire+ 한은금융망", desc: "거액(10억+) 결제" },
  MYDATA: { name: "마이데이터", desc: "자산 통합 조회" },
  KCB: { name: "KCB 신용평가", desc: "신용 점수 · 평가" },
  NICE: { name: "NICE 신용평가", desc: "신용 점수 · 평가" },
};


export default function HealthPage() {
  const [items, setItems] = useState<ExternalHealth[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await api.get<{ items: ExternalHealth[]; count: number }>(
        "/api/admin/health/external",
      );
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "외부망 헬스를 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = items
    ? {
        total: items.length,
        up: items.filter((i) => i.status_cd === "UP").length,
        degraded: items.filter((i) => i.status_cd === "DEGRADED").length,
        down: items.filter((i) => i.status_cd === "DOWN").length,
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">외부망 헬스</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            KFTC / BOK-Wire+ / 마이데이터 / 신용평가사 등 외부 API 의 최근 1분 상태
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={refreshing}>
          <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="총 외부 API" value={String(stats.total)} unit="종" color="text-foreground" />
          <KpiCard label="정상 (UP)" value={String(stats.up)} unit="종" color="text-success" />
          <KpiCard label="저하 (DEGRADED)" value={String(stats.degraded)} unit="종" color="text-warning" />
          <KpiCard label="장애 (DOWN)" value={String(stats.down)} unit="종" color="text-destructive" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!items && !error ? <Spinner label="불러오는 중…" /> : null}

      {items ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((h) => (
            <HealthCard key={h.api_name} h={h} />
          ))}
        </div>
      ) : null}
    </div>
  );
}


function HealthCard({ h }: { h: ExternalHealth }) {
  const meta = KNOWN_LABELS[h.api_name] ?? { name: h.api_name, desc: "외부 API" };
  const status = h.status_cd as "UP" | "DEGRADED" | "DOWN";

  const accent =
    status === "UP" ? "border-success/50 bg-success/5"
      : status === "DEGRADED" ? "border-warning/50 bg-warning/5"
      : status === "DOWN" ? "border-destructive/50 bg-destructive/5"
      : "";

  const Icon = status === "UP" ? Wifi : status === "DEGRADED" ? AlertTriangle : WifiOff;
  const iconColor =
    status === "UP" ? "text-success"
      : status === "DEGRADED" ? "text-warning"
      : "text-destructive";

  return (
    <Card className={accent}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <CardDescription>
              <span className="font-mono">{h.api_name}</span> · {meta.desc}
            </CardDescription>
          </div>
          <StatusBadge status={status} icon={Icon} iconColor={iconColor} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Metric
            label="응답시간 p50"
            value={h.latency_p50_ms != null ? `${fmtNumber(h.latency_p50_ms)} ms` : "-"}
          />
          <Metric
            label="응답시간 p95"
            value={h.latency_p95_ms != null ? `${fmtNumber(h.latency_p95_ms)} ms` : "-"}
          />
          <Metric
            label="성공률"
            value={
              h.success_rate != null ? `${(h.success_rate * 100).toFixed(2)}%` : "-"
            }
            accent={
              h.success_rate != null
                ? h.success_rate >= 0.99
                  ? "success"
                  : h.success_rate >= 0.95
                    ? "warning"
                    : "destructive"
                : undefined
            }
          />
          <Metric
            label="요청·실패"
            value={
              h.request_count != null
                ? `${fmtNumber(h.request_count)} / ${fmtNumber(h.error_count ?? 0)}`
                : "-"
            }
          />
        </div>
        <div className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
          <span>
            샘플링 {h.window_minutes ?? "?"}분 · {fmtDateTime(h.sample_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}


function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Activity className={`h-4 w-4 ${color}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`num-tabular text-2xl font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}


function StatusBadge({
  status,
  icon: Icon,
  iconColor,
}: {
  status: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  const variant: "success" | "warning" | "destructive" | "muted" =
    status === "UP" ? "success" : status === "DEGRADED" ? "warning" : status === "DOWN" ? "destructive" : "muted";
  const label = status === "UP" ? "정상" : status === "DEGRADED" ? "저하" : status === "DOWN" ? "장애" : status;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <Badge variant={variant}>{label}</Badge>
    </span>
  );
}


function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "warning" | "destructive";
}) {
  const color =
    accent === "success" ? "text-success"
      : accent === "warning" ? "text-warning"
      : accent === "destructive" ? "text-destructive"
      : "";
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`num-tabular text-base font-semibold ${color}`}>{value}</div>
    </div>
  );
}