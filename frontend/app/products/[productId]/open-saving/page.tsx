import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-003"
      title="자유입출금 개설"
      priority="MVP"
      summary="별명 + 초기입금. 수신계약 + 계좌 + 계약참여자(본인) INSERT"
      notes={{ API: "POST /api/products/{id}/open-saving" }}
    />
  );
}