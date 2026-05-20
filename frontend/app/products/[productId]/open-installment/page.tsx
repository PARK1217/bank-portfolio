import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-OP-005"
      title="적금 개설 ⭐"
      priority="Signature"
      summary="월납입액·기간·이체일·출금계좌. 1 트랜잭션 4테이블 (수신계약+계좌+적금납입약정+AUTO_TRANSFER)"
      notes={{ API: "POST /api/products/{id}/open-installment" }}
    />
  );
}