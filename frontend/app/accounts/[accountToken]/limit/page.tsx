"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Spinner } from "@/components/ui/spinner";

/**
 * SCR-AC-008 계좌 한도 변경 — 부 진입점.
 *
 * 한도 변경 백엔드(`/api/accounts/{no}/limit-change*`)는 7일 cooling-off 정책과 함께
 * 보안 메뉴의 통합 화면(`/security/transfer-limit`)에서 1일 출금·이체 한도를 함께
 * 관리한다. 계좌 상세에서 들어오는 부 진입점은 통합 화면으로 즉시 redirect.
 */

function Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/security/transfer-limit");
  }, [router]);
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Spinner />
      <span>이체 한도 관리로 이동…</span>
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <Redirect />
      </main>
    </Protected>
  );
}