import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AS-004"
      title="분석 결과 ⭐"
      priority="Signature"
      summary="LLM 추천 상위 3개 + Faithfulness 점수 (< 0.6 = 신중 표시)"
      notes={{ API: "GET /api/asset-analysis/{sessionId}", ERD: "AI_ASSET_RESULT" }}
    />
  );
}