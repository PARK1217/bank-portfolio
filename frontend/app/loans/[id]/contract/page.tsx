import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = appToken */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-006"
      title="대출 약정 ⭐"
      priority="Signature"
      summary="약정조건 + 본인서명 → 대출계약 + 대출전용 계좌 + 계약참여자 (v51 계좌-계약 일원화)"
      notes={{ API: "POST /api/loans/{token}/contract", "분리": "약정 ≠ 실행" }}
    />
  );
}