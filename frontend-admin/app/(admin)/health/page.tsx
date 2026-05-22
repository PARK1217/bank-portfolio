import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HealthPlaceholder() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">외부망 헬스</h1>
        <p className="mt-1 text-sm text-muted-foreground">Phase B 작업 예정</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">준비 중</CardTitle>
          <CardDescription>
            KFTC · BOK-Wire+ · 마이데이터 · 신용평가사 4종 헬스 카드 표시 예정.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            백엔드 <span className="font-mono">GET /api/admin/health/external</span> 는 준비됨.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}