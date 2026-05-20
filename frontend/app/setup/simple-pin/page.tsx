import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AU-008"
      title="간편비밀번호 설정"
      priority="MVP"
      summary="6자리 PIN x 2 (연속/반복 숫자 거부)"
      notes={{ API: "POST /api/setup/pin", ERD: "인증수단마스터 (KIND=PIN)" }}
    />
  );
}