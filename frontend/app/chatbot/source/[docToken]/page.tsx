import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-CB-005"
      title="답변 출처 (약관 원문) ⭐"
      priority="Signature"
      summary="docToken → 약관 조항 원문. 답변과 원문 1:1 비교 가능"
      notes={{ API: "GET /api/chatbot/source/{token}", "토큰": "🔒 docToken" }}
    />
  );
}