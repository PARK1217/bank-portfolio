import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AC-005"
      title="거래 상세"
      priority="MVP"
      summary="거래 + 이체(있으면) JOIN. 본인 아님 → 404"
      notes={{ API: "GET /api/transactions/{token}", "토큰": "🔒 txToken" }}
    />
  );
}