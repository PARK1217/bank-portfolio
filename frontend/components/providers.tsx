"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

/**
 * 클라이언트 사이드 Provider 묶음 — RootLayout 에서 children 을 감싼다.
 * 서버 컴포넌트로 유지하기 위해 layout.tsx 는 자체 "use client" 가 아니고, 이 컴포넌트가 boundary.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" closeButton />
    </AuthProvider>
  );
}