import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPlaceholder() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">감사 로그</h1>
        <p className="mt-1 text-sm text-muted-foreground">Phase C 작업 예정</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">백엔드 조회 라우트 신설 필요</CardTitle>
          <CardDescription>
            ADMIN_AUDIT_LOG 는 미들웨어가 자동 INSERT 만 하고 조회 라우트(GET) 가 없습니다.
            <br />
            <span className="font-mono">GET /api/admin/audit/logs</span> 신설 후 이 화면 구현 예정.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            필터(직원·ACTION_CD·기간·결과 OK/DENIED/ERROR) + 페이지네이션.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}