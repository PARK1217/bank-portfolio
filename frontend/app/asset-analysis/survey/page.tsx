import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AS-002"
      title="자산분석 설문조사 ⭐"
      priority="Signature"
      summary="설문 N문항 (목표/위험성향/기간/금액) → 답변→Prompt 동적 생성"
      notes={{ API: "POST /api/asset-analysis/survey", ERD: "AI_ASSET_SURVEY_RESPONSE" }}
    />
  );
}