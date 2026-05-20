import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-SC-002"
      title="비밀번호 변경"
      priority="MVP"
      summary="현재PW + 신규PW + 확인. 변경 시 단기 토큰 일괄 폐기"
      notes={{ API: "PATCH /api/security/password" }}
    />
  );
}