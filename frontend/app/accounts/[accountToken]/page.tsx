import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AC-002"
      title="계좌 상세 조회"
      priority="MVP"
      summary="계좌 + 수신계약 + 최근거래. 본인 아님 → 404 (sheet 02)"
      notes={{ API: "GET /api/accounts/{token}", "토큰": "🔒 accountToken" }}
    />
  );
}