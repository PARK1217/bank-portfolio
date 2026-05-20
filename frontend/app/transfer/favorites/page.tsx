import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-004"
      title="자주 쓰는 계좌 관리"
      priority="Signature"
      summary="별칭 / 은행 / 계좌번호 등록·삭제 (use_count 정렬)"
      notes={{ API: "GET·POST·DELETE /api/transfer/favorites", ERD: "FREQUENT_ACCOUNT (🆕 v53)" }}
    />
  );
}