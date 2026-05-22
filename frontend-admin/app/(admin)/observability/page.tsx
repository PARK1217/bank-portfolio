"use client";

import { useState } from "react";
import { ExternalLink, Sparkles, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


// 환경별 Phoenix host. 로컬 docker-compose 가 6006 포트로 노출.
const PHOENIX_URL = process.env.NEXT_PUBLIC_PHOENIX_URL ?? "http://localhost:6006";


export default function ObservabilityPage() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 관측 (Arize Phoenix)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            챗봇 RAG · LLM 호출 트레이스 · Faithfulness · Latency · Token 사용량
          </p>
        </div>
        <a
          href={PHOENIX_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent"
        >
          <ExternalLink className="h-3 w-3" />새 탭으로 열기
        </a>
      </div>

      {failed ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="h-4 w-4" />
              임베드 차단 감지
            </CardTitle>
            <CardDescription>
              브라우저가 iframe 임베드를 차단했거나 Phoenix 가 응답하지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>확인 사항:</p>
              <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                <li>
                  <span className="font-mono">docker compose ps</span> 에서{" "}
                  <span className="font-mono">bank-portfolio-phoenix</span> 컨테이너 살아있는지
                </li>
                <li>
                  <a
                    href={PHOENIX_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {PHOENIX_URL}
                  </a>{" "}
                  새 탭에서 직접 접근
                </li>
                <li>
                  Phoenix 가 <span className="font-mono">X-Frame-Options: DENY</span> 또는 CSP{" "}
                  <span className="font-mono">frame-ancestors</span> 로 임베드를 막은 경우는 새 탭 이용
                </li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFailed(false);
                  setLoaded(false);
                }}
              >
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="relative h-[calc(100vh-200px)] min-h-[600px] w-full bg-muted/30">
            {!loaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-primary/60" />
                  Phoenix 로딩 중… ({PHOENIX_URL})
                </div>
              </div>
            ) : null}
            <iframe
              src={PHOENIX_URL}
              className="h-full w-full"
              title="Arize Phoenix"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </div>
        </Card>
      )}
    </div>
  );
}