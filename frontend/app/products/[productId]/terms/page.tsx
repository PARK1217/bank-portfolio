import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-010"
      title="약관/특약 동의"
      priority="MVP"
      summary="약관 체크박스 N개 → 고객약관동의 + 계약특약 INSERT"
      notes={{ API: "POST /api/products/{id}/terms" }}
    />
  );
}