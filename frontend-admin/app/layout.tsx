import type { Metadata } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "DA-ON Admin",
  description: "다온뱅크 운영·감독 콘솔",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}