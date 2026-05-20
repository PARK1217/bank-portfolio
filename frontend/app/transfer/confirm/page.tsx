import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-002"
      title="이체 확인 ⭐"
      priority="MVP"
      summary="비밀번호/OTP → 이체 INSERT(idempotency_key) + 거래 2건 + 잔액 atomic UPDATE"
      notes={{ API: "POST /api/transfer", "헤더": "Idempotency-Key (필수)", "결제망": "당행/소액/거액 분기" }}
    />
  );
}