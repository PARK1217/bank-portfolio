import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-CB-001"
      title="챗봇 / 대화창 ⭐"
      priority="Signature"
      summary="3-tier RAG: KEYWORD → FAQ → VECTOR(약관). 출처 표시 + 피드백"
      notes={{ API: "POST /api/chatbot/message", ERD: "AI_CHATBOT_SESSION / AI_CHATBOT_MESSAGE" }}
    />
  );
}