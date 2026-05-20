import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AS-005"
      title="추천 상품 상세"
      priority="Signature"
      summary="상품 + LLM 추천 이유 (reason_details JSONB)"
      notes={{ API: "GET /api/asset-analysis/product/{id}" }}
    />
  );
}