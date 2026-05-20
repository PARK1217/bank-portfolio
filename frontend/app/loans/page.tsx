import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-001"
      title="대출 상품 목록"
      priority="MVP"
      summary="카테고리 필터. 상품(유형=LOAN) SELECT"
      notes={{ API: "GET /api/loans" }}
    />
  );
}