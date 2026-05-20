import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = loanToken */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-009"
      title="대출 상환 스케줄"
      priority="MVP"
      summary="대출상환스케줄 + 상환이력 JOIN"
      notes={{ API: "GET /api/loans/{token}/schedule" }}
    />
  );
}