import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = loanToken */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-007"
      title="대출 실행 ⭐"
      priority="Signature"
      summary="입금계좌 + 본인인증 → 대출실행이력(idempotency_key) + 거래 + 대출상환스케줄 INSERT"
      notes={{ API: "POST /api/loans/{token}/execute", "헤더": "Idempotency-Key (필수)" }}
    />
  );
}