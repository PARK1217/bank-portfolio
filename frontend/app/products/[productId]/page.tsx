import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-002"
      title="상품 상세"
      priority="MVP"
      summary="상품 + 기간 + 금리정책 + 우대조건 + 약관매핑"
      notes={{ API: "GET /api/products/{id}" }}
    />
  );
}