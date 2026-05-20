import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-009"
      title="상품 개설 완료"
      priority="MVP"
      summary="accountToken 으로 계좌·상품명 안내"
      notes={{ API: "GET /api/products/complete/{token}" }}
    />
  );
}