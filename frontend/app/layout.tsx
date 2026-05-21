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
              <nav className="flex items-center gap-4 text-xs text-muted-foreground">
                <Link href="/dashboard" className="hover:text-foreground">대시보드</Link>
                <Link href="/accounts" className="hover:text-foreground">계좌</Link>
                <Link href="/transfer" className="hover:text-foreground">이체</Link>
                <Link href="/loans" className="hover:text-foreground">대출</Link>
                <Link href="/chatbot" className="hover:text-foreground">챗봇</Link>
                <Link href="/notices" className="hover:text-foreground">공지·이벤트</Link>
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