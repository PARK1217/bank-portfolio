import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-CB-003"
      title="약관 검색"
      priority="Signature"
      summary="약관마스터 FAISS / pgvector 벡터 검색"
      notes={{ API: "GET /api/chatbot/terms-search" }}
    />
  );
}