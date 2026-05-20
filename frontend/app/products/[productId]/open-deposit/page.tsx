import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-004"
      title="정기예금 개설"
      priority="MVP"
      summary="금액 + 기간 + 이자지급주기. 출금계좌 → 정기예금 입금 거래"
      notes={{ API: "POST /api/products/{id}/open-deposit" }}
    />
  );
}