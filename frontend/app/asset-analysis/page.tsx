import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AS-001"
      title="자산분석 메인 ⭐"
      priority="Signature"
      summary="계좌 + 거래 통계 + 분석 이력"
      notes={{ API: "GET /api/asset-analysis", ERD: "AI_ASSET_SESSION (🆕 v53)" }}
    />
  );
}