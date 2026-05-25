import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/providers";
import { NavUser } from "@/components/nav-user";
import "./globals.css";

export const metadata: Metadata = {
  title: "다온뱅크",
  description: "은행 도메인 포트폴리오 — FastAPI · Next.js · PostgreSQL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Providers>
          <header className="border-b bg-card">
            <div className="container flex h-14 items-center justify-between">
              <Link href="/" className="text-sm font-semibold tracking-tight">
                다온뱅크
              </Link>
              <nav className="flex items-center gap-3 text-xs text-muted-foreground sm:gap-4">
                {/* 메인 메뉴 — 모바일에서는 NavUser 드롭다운으로 접근 */}
                <Link href="/dashboard" className="hidden hover:text-foreground md:inline">대시보드</Link>
                <Link href="/accounts" className="hidden hover:text-foreground md:inline">계좌</Link>
                <Link href="/transfer" className="hidden hover:text-foreground md:inline">이체</Link>
                <Link href="/loans" className="hidden hover:text-foreground md:inline">대출</Link>
                <Link href="/chatbot" className="hidden hover:text-foreground md:inline">챗봇</Link>
                <Link href="/notices" className="hidden hover:text-foreground md:inline">공지·이벤트</Link>
                <NavUser />
              </nav>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}