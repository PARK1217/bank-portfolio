import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-006"
      title="공동명의 통장 개설 ⭐"
      priority="Signature"
      summary="공동명의자 2~N + 위임권한 + 첨부 (Party-Role 패턴)"
      notes={{ API: "POST /api/products/{id}/open-joint", ERD: "계약참여자 N행 + 위임관계" }}
    />
  );
}