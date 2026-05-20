import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = productId */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-003"
      title="대출 정식 신청"
      priority="MVP"
      summary="precheck 확인 + 신용조회 동의 + 제출. 신용정보조회이력 INSERT"
      notes={{ API: "POST /api/loans/{id}/apply" }}
    />
  );
}