import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-001"
      title="즉시이체"
      priority="MVP"
      summary="출금계좌 + 입금은행 + 입금계좌 + 금액. 잔액 미리 검증"
      notes={{ API: "GET /api/transfer/init" }}
    />
  );
}