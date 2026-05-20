"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";


/**
 * 본행 메인 (로그인 전 진입화면).
 * 시중 은행 사이트의 표준 구조 — 히어로 / 빠른 메뉴 / 추천 상품 / 이벤트·공지 / 고객센터 / 푸터.
 * 개발자 전체 화면 인덱스는 푸터 링크로 `/dev-testpage` 에서 접근.
 */


// ---------------------------------------------------------------------------
// Mock 데이터 — 백엔드 시드 적용 후 GET /api/products?featured=true 로 대체 가능
// ---------------------------------------------------------------------------

const FEATURED_PRODUCTS: {
  product_id: number;
  name: string;
  type_label: string;
  rate_text: string;
  highlight: string;
  badge?: "특판" | "신규";
  href: string;
}[] = [
  {
    product_id: 202,
    name: "프리미엄 거치식 정기예금",
    type_label: "정기예금",
    rate_text: "최고 연 4.00%",
    highlight: "특판 — 24개월",
    badge: "특판",
    href: "/products/202",
  },
  {
    product_id: 303,
    name: "청년도약 적금",
    type_label: "적금",
    rate_text: "최고 연 5.00%",
    highlight: "만 19~34세 전용",
    badge: "신규",
    href: "/products/303",
  },
  {
    product_id: 401,
    name: "직장인 우대 신용대출",
    type_label: "대출",
    rate_text: "연 4.50%부터",
    highlight: "급여이체 시 추가 우대",
    href: "/products/401",
  },
];

const NOTICES: { title: string; tag: string; date: string }[] = [
  { title: "신규 가입 고객 정기예금 우대금리 +0.5%p 이벤트", tag: "이벤트", date: "2026-05-15" },
  { title: "2026년 6월 자동이체 수수료 면제 안내", tag: "공지", date: "2026-05-10" },
  { title: "본행 콜센터 운영시간 변경 안내", tag: "공지", date: "2026-05-08" },
];

const QUICK_SERVICES: { href: string; icon: string; label: string; desc: string }[] = [
  { href: "/products", icon: "💰", label: "상품 카탈로그", desc: "예금·적금·대출" },
  { href: "/loans/1/precheck", icon: "🏦", label: "대출 한도 조회", desc: "신용조회 없이 시뮬레이션" },
  { href: "/chatbot", icon: "💬", label: "상담 챗봇", desc: "24시간 RAG 응답" },
  { href: "/terms", icon: "📄", label: "약관·정책", desc: "전체 약관 열람" },
];


// ---------------------------------------------------------------------------
// 페이지
// ---------------------------------------------------------------------------

export default function Page() {
  const { isAuthenticated, isReady } = useAuth();

  return (
    <main className="container max-w-5xl animate-fade-in space-y-12 py-8">
      {/* ----------------------------------------- 히어로 */}
      <section className="overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-10 sm:px-10 sm:py-14">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          본행 · Bank Portfolio
        </div>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          가장 가까운 은행,
          <br />
          가장 신뢰받는 일상
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          24시간 비대면 거래, 합리적인 금리, 안전한 보안. 새 계좌 개설부터 대출 약정·실행까지 모바일로 한 번에.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {isReady && isAuthenticated ? (
            <Link href="/dashboard" className={cn(buttonVariants(), "px-6")}>
              내 대시보드로
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants(), "px-6")}>
                로그인
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ variant: "outline" }), "px-6")}>
                비대면 가입
              </Link>
            </>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>⚡ 당행 이체 즉시 처리 (&lt; 100ms)</span>
          <span>🛡️ FDS 이상거래 자동 탐지</span>
          <span>🤖 챗봇 3-tier RAG (약관 출처 인용)</span>
        </div>
      </section>

      {/* ----------------------------------------- 빠른 메뉴 */}
      <section>
        <h2 className="text-lg font-semibold">주요 서비스</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_SERVICES.map((s) => (
            <Link key={s.href} href={s.href} className="block">
              <Card className="h-full transition-colors hover:bg-accent">
                <CardContent className="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-center">
                  <div className="text-3xl">{s.icon}</div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------- 인기 상품 */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">이달의 인기 상품</h2>
          <Link href="/products" className="text-xs text-primary hover:underline">
            전체 상품 보기 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {FEATURED_PRODUCTS.map((p) => (
            <Link key={p.product_id} href={p.href} className="block">
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.type_label}</span>
                    {p.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          p.badge === "특판" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary",
                        )}
                      >
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                  <div className="num-tabular text-xl font-bold text-primary">{p.rate_text}</div>
                  <div className="text-xs text-muted-foreground">{p.highlight}</div>
                  <div className="pt-2 text-xs text-primary">자세히 보기 →</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------- 이벤트·공지 */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">이벤트·공지</h2>
        </div>
        <ul className="mt-3 divide-y rounded-md border bg-card">
          {NOTICES.map((n, i) => (
            <li key={i} className="flex items-center gap-3 p-3 text-sm">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  n.tag === "이벤트" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
                )}
              >
                {n.tag}
              </span>
              <span className="min-w-0 flex-1 truncate">{n.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{n.date}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------- 고객센터 */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">고객센터</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="num-tabular text-xl font-bold">1599-XXXX</div>
            <div className="text-xs text-muted-foreground">평일 09:00 ~ 18:00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">사고·분실 신고</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            <div className="font-medium">24시간 접수</div>
            <Link href="/login" className="text-xs text-primary hover:underline">
              로그인 후 신고 →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">상담 챗봇</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            <div className="font-medium">3-tier RAG · 24시간</div>
            <Link href="/chatbot" className="text-xs text-primary hover:underline">
              상담 시작 →
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* ----------------------------------------- 푸터 */}
      <footer className="border-t pt-6 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-semibold text-foreground">bank-portfolio</span>
          <Link href="/terms" className="hover:text-foreground">약관</Link>
          <Link href="/terms/7" className="hover:text-foreground">개인정보처리방침</Link>
          <Link href="/terms/8" className="hover:text-foreground">마케팅 동의</Link>
          <Link href="/complaints/new" className="hover:text-foreground">민원 접수</Link>
          <span className="ml-auto">
            <Link
              href="/dev-testpage"
              className="font-mono text-[10px] opacity-60 hover:text-foreground hover:opacity-100"
            >
              dev · 전체 화면 인덱스
            </Link>
          </span>
        </div>
        <p className="mt-3 text-[10px] opacity-70">
          본 사이트는 명세서 v53 기반 포트폴리오 프로젝트입니다. 실제 금융 거래가 발생하지 않습니다.
        </p>
      </footer>
    </main>
  );
}