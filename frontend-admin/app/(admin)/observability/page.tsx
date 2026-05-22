import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ObservabilityPlaceholder() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 관측 (Phoenix)</h1>
        <p className="mt-1 text-sm text-muted-foreground">Phase B 작업 예정</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">준비 중</CardTitle>
          <CardDescription>
            Arize Phoenix iframe 임베드 (다른 세션이 docker-compose 통합 작업 중).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            LLM 트레이스 · Faithfulness · Latency · Token 사용량 모니터링.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}