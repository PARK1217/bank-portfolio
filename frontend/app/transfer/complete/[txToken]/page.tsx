import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-003"
      title="이체 완료"
      priority="MVP"
      summary="txToken 으로 이체 결과 조회. settlement_type / settlement_status 표시"
      notes={{ API: "GET /api/transfer/{txToken}" }}
    />
  );
}