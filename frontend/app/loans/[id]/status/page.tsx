import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = appToken */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-005"
      title="심사 진행 상황"
      priority="MVP"
      summary="대출신청 + 대출신청심사 (Long-Polling / SSE)"
      notes={{ API: "GET /api/loans/{token}/status" }}
    />
  );
}