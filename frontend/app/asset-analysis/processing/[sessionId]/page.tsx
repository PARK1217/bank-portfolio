import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AS-003"
      title="분석 진행 중 ⭐"
      priority="Signature"
      summary="LLM 호출 중 폴링/SSE. 타임아웃 = E_LLM_TIMEOUT"
      notes={{ API: "GET /api/asset-analysis/{sessionId}/status" }}
    />
  );
}