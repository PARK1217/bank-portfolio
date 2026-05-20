import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-008"
      title="미성년 자녀 통장 개설 ⭐"
      priority="Signature"
      summary="미성년자녀 + 친권자 + 위임 권한 8종"
      notes={{ API: "POST /api/products/{id}/open-minor", ERD: "관계자(자녀) + 계약참여자 + 위임관계" }}
    />
  );
}