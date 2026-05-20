import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AC-004"
      title="거래 내역 조회"
      priority="MVP"
      summary="기간 / 거래유형 필터 + 페이징"
      notes={{ API: "GET /api/accounts/{token}/transactions", ERD: "거래" }}
    />
  );
}