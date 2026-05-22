"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Protected } from "@/components/protected";
import { StagedLoader } from "@/components/staged-loader";


/**
 * SCR-AS-003 자산분석 진행 중 ⭐
 *
 * 백엔드 라우트(`GET /api/asset-analysis/{sessionId}/status`)는 아직 미구현
 * (deferred-features 정책상 자산분석 RAG 풀체인은 후순위). 화면만 먼저 살려
 * 단계별 로딩 메시지로 사용자에게 진행 단서를 제공.
 *
 * 백엔드 구현 시 useEffect 폴링 + completed → /asset-analysis/result/{sessionId}
 * 자동 라우팅으로 확장.
 */

const ANALYSIS_MESSAGES = [
  "지출·소득 패턴 정리하는 중…",
  "보유 상품과 거래 이력 분석 중…",
  "비슷한 페르소나 매칭하고 있어요",
  "이건 좀 깊게 들어가야 할 것 같네요",
  "맞춤 상품 후보 추리는 중…",
  "리포트 다듬는 중… 곧 결과가 나옵니다",
];


function ProcessingContent({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  // 백엔드 라우트 생기면 여기서 폴링 + 완료 시 router.replace 로 result 이동.
  // 지금은 단계 메시지만 회전하며 무한 진행 — 사용자가 직접 결과 페이지로 이동.
  useEffect(() => {
    void router; // 미사용 경고 회피 (백엔드 구현 시 사용 예정)
  }, [router]);

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-AS-003 · 세션 #{sessionId}</div>
        <CardTitle className="mt-1">자산 분석 진행 중</CardTitle>
        <CardDescription>
          LLM 으로 거래 패턴과 페르소나를 매칭하고 있어요. 30초~1분 정도 소요됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-6 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <StagedLoader
            messages={ANALYSIS_MESSAGES}
            intervalMs={3000}
            size="md"
            className="text-sm"
          />
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            창을 닫지 마세요. 분석이 끝나면 자동으로 결과 페이지로 이동합니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


export default function Page() {
  const params = useParams<{ sessionId: string }>();
  return (
    <Protected>
      <main className="container max-w-xl py-10 animate-fade-in">
        <ProcessingContent sessionId={params.sessionId} />
      </main>
    </Protected>
  );
}
