import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-PL-002"
      title="약관 상세"
      priority="MVP"
      summary="약관마스터 본문 (조항별)"
      notes={{ API: "GET /api/terms/{id}" }}
    />
  );
}