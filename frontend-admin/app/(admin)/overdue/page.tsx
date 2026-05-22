import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OverduePlaceholder() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">연체 회원 추적</h1>
        <p className="mt-1 text-sm text-muted-foreground">Phase B 작업 예정</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">준비 중</CardTitle>
          <CardDescription>
            백엔드 <span className="font-mono">GET /api/admin/customers/overdue</span> 는 준비됨. 화면은 다음 단계에서 추가됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            등급별 연체액·연체일수·상환 스케줄 등을 표시 예정.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}