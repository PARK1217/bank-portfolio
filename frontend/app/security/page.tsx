"use client";

import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";


/** SCR-SC-001 보안 설정 메인 — 보안 관련 화면 허브. */

interface MeResponse {
  customer_no: number;
  name: string | null;
  otp_active: boolean;
  last_access_at: string | null;
}

interface DeviceItem {
  device_token: string;
  is_trusted: boolean;
}

interface DeviceListResponse {
  items: DeviceItem[];
}

interface FdsAlertItem {
  fds_id: number;
  status_cd: "PENDING" | "CONFIRMED_OK" | "REPORTED";
}

interface FdsAlertListResponse {
  items: FdsAlertItem[];
}

interface MenuItem {
  href: string;
  title: string;
  desc: string;
  badge?: string;
}

const MENUS: MenuItem[] = [
  { href: "/security/password", title: "비밀번호 변경", desc: "현재 비밀번호 확인 후 새 비밀번호로 변경" },
  { href: "/security/simple-pin/reset", title: "계좌 비밀번호 재설정", desc: "OTP 인증으로 6자리 PIN 변경 · 5회 오류 잠금도 함께 해제" },
  { href: "/setup/otp", title: "OTP 등록", desc: "Authenticator 앱과 연결해 일회용 비밀번호 등록", badge: "권장" },
  { href: "/security/otp", title: "OTP 재발급·변경", desc: "기존 OTP 재발급 또는 변경" },
  { href: "/security/devices", title: "기기 관리", desc: "등록된 기기 목록·접속 이력 조회" },
  { href: "/security/devices/new", title: "기기 등록", desc: "현재 기기를 신뢰 기기로 등록" },
  { href: "/security/transfer-limit", title: "이체 한도 관리", desc: "계좌별 1일·1회 이체 한도 조정" },
  { href: "/security/withdraw-unlock", title: "출금 제한 해제", desc: "OTP 등록으로 기본 일일 한도 30만 → 5천만 상향" },
  { href: "/security/fds-alerts", title: "의심 거래 확인", desc: "FDS 탐지된 거래 확인·신고", badge: "FDS" },
];


const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


function SecurityOverview() {
  const me = useFetch<MeResponse>("/api/auth/me");
  const devices = useFetch<DeviceListResponse>("/api/security/devices");
  const alerts = useFetch<FdsAlertListResponse>("/api/security/fds-alerts");

  const otpActive = me.data?.otp_active ?? false;
  const lastAccessAt = me.data?.last_access_at ?? null;
  const deviceCount = devices.data?.items.length ?? 0;
  const pendingAlerts = (alerts.data?.items ?? []).filter((a) => a.status_cd === "PENDING").length;

  const lastAccessLabel = lastAccessAt
    ? dtFmt.format(new Date(lastAccessAt))
    : me.loading
      ? "조회 중…"
      : "기록 없음";

  return (
    <section
      aria-label="보안 요약"
      className="grid grid-cols-2 gap-2 rounded-md border bg-card p-3 sm:grid-cols-4"
    >
      <Stat
        label="마지막 접속"
        value={lastAccessLabel}
        muted={!lastAccessAt}
      />
      <Stat
        label="OTP 등록"
        value={otpActive ? "활성" : "미등록"}
        tone={me.loading ? "muted" : otpActive ? "ok" : "warn"}
      />
      <Stat
        label="등록 기기"
        value={devices.loading && !devices.data ? "…" : `${deviceCount}대`}
        tone={deviceCount > 0 ? "ok" : "muted"}
      />
      <Stat
        label="의심 거래"
        value={alerts.loading && !alerts.data ? "…" : `${pendingAlerts}건`}
        tone={pendingAlerts > 0 ? "warn" : "muted"}
      />
    </section>
  );
}


function Stat({
  label,
  value,
  tone = "default",
  muted = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "muted";
  muted?: boolean;
}) {
  const toneClass =
    tone === "ok"
      ? "text-primary"
      : tone === "warn"
        ? "text-warning"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 truncate text-sm font-medium",
          muted ? "text-muted-foreground" : toneClass,
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in space-y-4">
        <div>
          <h1 className="text-xl font-semibold">보안 설정</h1>
          <p className="text-xs text-muted-foreground">
            본인 인증·기기·이체 한도·이상거래 등 보안 관련 항목을 한 곳에서 관리합니다.
          </p>
        </div>
        <SecurityOverview />
        <ul className="grid gap-2 sm:grid-cols-2">
          {MENUS.map((m) => (
            <li key={m.href}>
              <Link href={m.href}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{m.title}</CardTitle>
                      {m.badge ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {m.badge}
                        </span>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription>{m.desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </Protected>
  );
}