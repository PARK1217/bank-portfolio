import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = loanToken (LN-008 대출 상세). 동일 [id] 슬롯에서 하위 라우트(precheck/apply/documents/status/contract/execute/schedule)는 별도 파일. */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-008"
      title="대출 상세 조회"
      priority="MVP"
      summary="대출계약 + 실행이력 + 상환이력 JOIN. 본인 아님 → 404"
      notes={{ API: "GET /api/loans/{token}", "토큰": "🔒 loanToken" }}
    />
  );
}