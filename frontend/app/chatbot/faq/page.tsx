import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-CB-002"
      title="카테고리별 FAQ"
      priority="Signature"
      summary="ai_faq SELECT WHERE category=? (hit_count 내림차순)"
      notes={{ API: "GET /api/chatbot/faq" }}
    />
  );
}