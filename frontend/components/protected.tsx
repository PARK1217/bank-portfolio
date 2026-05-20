"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";

/**
 * 인증이 필요한 화면을 감싸는 래퍼.
 *  - localStorage 초기 동기화 (`isReady`) 대기 → 깜빡임 방지
 *  - 미인증 → `/login?next=<원래경로>` 로 replace (history 오염 X)
 *  - 인증됨 → 자식 렌더
 *
 * middleware.ts 는 localStorage 를 못 읽으므로 *실제 게이팅* 은 이 컴포넌트 + lib/api 의 401 인터셉트가 담당.
 *
 * 사용 예
 *  ```tsx
 *  export default function Page() {
 *    return <Protected><Dashboard /></Protected>;
 *  }
 *  ```
 */
export function Protected({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated) return;
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [isAuthenticated, isReady, router, pathname]);

  if (!isReady) {
    return (
      fallback ?? (
        <div className="container py-16">
          <Spinner label="확인 중…" />
        </div>
      )
    );
  }
  if (!isAuthenticated) {
    // 리다이렉트 중 — 빈 렌더 (router.replace 대기)
    return null;
  }
  return <>{children}</>;
}