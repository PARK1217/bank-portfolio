"use client";

import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


/** SCR-SC-001 보안 설정 메인 — 보안 관련 화면 허브. */

interface MenuItem {
  href: string;
  title: string;
  desc: string;
  badge?: string;
}

const MENUS: MenuItem[] = [
  { href: "/security/password", title: "비밀번호 변경", desc: "현재 비밀번호 확인 후 새 비밀번호로 변경" },
  { href: "/setup/otp", title: "OTP 등록", desc: "Authenticator 앱과 연결해 일회용 비밀번호 등록", badge: "권장" },
  { href: "/security/otp", title: "OTP 재발급·변경", desc: "기존 OTP 재발급 또는 변경" },
  { href: "/security/devices", title: "기기 관리", desc: "등록된 기기 목록·접속 이력 조회" },
  { href: "/security/devices/new", title: "기기 등록", desc: "현재 기기를 신뢰 기기로 등록" },
  { href: "/security/transfer-limit", title: "이체 한도 관리", desc: "계좌별 1일·1회 이체 한도 조정" },
  { href: "/security/fds-alerts", title: "의심 거래 확인", desc: "FDS 탐지된 거래 확인·신고", badge: "FDS" },
];


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-2xl py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">보안 설정</h1>
          <p className="text-xs text-muted-foreground">
            본인 인증·기기·이체 한도·이상거래 등 보안 관련 항목을 한 곳에서 관리합니다.
          </p>
        </div>
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