import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 홈 / 진입 페이지 — 화면 로직 미구현. MVP/Signature 라우트 인덱스를 노출해
 * 스캐폴딩 점검 + 다음 세션에서 화면 구현 시 진입점을 빠르게 찾을 수 있게 함.
 */
const ROUTE_SECTIONS: { title: string; items: { href: string; code: string; label: string }[] }[] = [
  {
    title: "인증 / 가입",
    items: [
      { href: "/login", code: "AU-001", label: "로그인" },
      { href: "/signup/terms", code: "AU-002", label: "약관 동의" },
      { href: "/signup/verify", code: "AU-003", label: "본인인증" },
      { href: "/signup/account", code: "AU-004", label: "계정정보" },
      { href: "/signup/complete", code: "AU-007", label: "가입 완료" },
      { href: "/setup/simple-pin", code: "AU-008", label: "간편 PIN" },
      { href: "/setup/otp", code: "AU-010", label: "OTP 등록 ⭐" },
    ],
  },
  {
    title: "대시보드 / 계좌",
    items: [
      { href: "/dashboard", code: "HM-001", label: "메인 대시보드" },
      { href: "/notifications", code: "HM-004", label: "알림 ⭐" },
      { href: "/accounts", code: "AC-001", label: "계좌 목록" },
    ],
  },
  {
    title: "상품 / 개설",
    items: [
      { href: "/products", code: "OP-001", label: "상품 카탈로그" },
    ],
  },
  {
    title: "이체",
    items: [
      { href: "/transfer", code: "TR-001", label: "즉시이체" },
      { href: "/transfer/favorites", code: "TR-004", label: "자주쓰는계좌 ⭐" },
      { href: "/transfer/auto", code: "TR-006", label: "자동이체 ⭐" },
      { href: "/transfer/scheduled", code: "TR-008", label: "예약이체 ⭐" },
    ],
  },
  {
    title: "대출",
    items: [{ href: "/loans", code: "LN-001", label: "대출 상품" }],
  },
  {
    title: "AI / RAG",
    items: [
      { href: "/asset-analysis", code: "AS-001", label: "자산분석 ⭐" },
      { href: "/chatbot", code: "CB-001", label: "챗봇 ⭐" },
      { href: "/chatbot/faq", code: "CB-002", label: "FAQ ⭐" },
    ],
  },
  {
    title: "기타",
    items: [
      { href: "/security/password", code: "SC-002", label: "비밀번호 변경" },
      { href: "/terms", code: "PL-001", label: "약관 목록" },
    ],
  },
];

export default function Home() {
  return (
    <main className="container max-w-5xl py-10">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">bank-portfolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          은행 도메인 포트폴리오 — FastAPI · Next.js · PostgreSQL(v53 스키마).
          라우트 스캐폴딩 완료, 화면 구현은 다음 세션부터.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROUTE_SECTIONS.map((sec) => (
          <Card key={sec.title}>
            <CardHeader>
              <CardTitle className="text-base">{sec.title}</CardTitle>
              <CardDescription>{sec.items.length}개 진입점</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {sec.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{it.code}</span>
                  <span>{it.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}