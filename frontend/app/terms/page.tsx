import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-PL-001"
      title="약관 전체 목록"
      priority="MVP"
      summary="약관마스터 SELECT (status=ACTIVE)"
      notes={{ API: "GET /api/terms" }}
    />
  );
}