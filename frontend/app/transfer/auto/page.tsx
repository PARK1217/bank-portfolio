import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-006"
      title="자동이체 목록/관리"
      priority="Signature"
      summary="목록 + 수정·일시정지·취소. linked_to(INSTALLMENT/LOAN/USER) 그룹"
      notes={{ API: "GET·PATCH /api/transfer/auto", ERD: "AUTO_TRANSFER (linked_* 확장)" }}
    />
  );
}