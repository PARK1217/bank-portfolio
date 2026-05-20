import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-001"
      title="상품 카탈로그"
      priority="MVP"
      summary="카테고리 필터 (SAVING/DEPOSIT/INSTALLMENT/LOAN)"
      notes={{ API: "GET /api/products", ERD: "상품 / 상품금리정책" }}
    />
  );
}