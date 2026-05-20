import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AC-001"
      title="계좌 목록"
      priority="MVP"
      summary="본인 계좌 + 잔액 합계 (외화 별도 표기)"
      notes={{ API: "GET /api/accounts", ERD: "계좌" }}
    />
  );
}