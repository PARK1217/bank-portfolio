import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bank-portfolio",
  description: "은행 도메인 포트폴리오 — FastAPI + Next.js + PostgreSQL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
