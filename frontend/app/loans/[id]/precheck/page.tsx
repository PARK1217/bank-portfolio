import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = productId */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-002"
      title="대출 한도 조회 (가신청)"
      priority="MVP"
      summary="소득·부채 → DSR 시뮬 → 한도/금리. 신용조회 동의 X"
      notes={{ API: "POST /api/loans/{id}/precheck", "rule": "BR-LOAN-01 DSR ≤ 40%" }}
    />
  );
}