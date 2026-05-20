import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AU-012"
      title="로그아웃"
      priority="MVP"
      summary="JWT 폐기 + 단기 토큰 일괄 폐기 + 기기접속이력 UPDATE(logout_at)"
      notes={{ API: "POST /api/auth/logout" }}
    />
  );
}