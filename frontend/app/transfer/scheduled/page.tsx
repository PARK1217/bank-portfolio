import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-008"
      title="예약 이체"
      priority="Signature"
      summary="1회성 — AUTO_TRANSFER(cycle=ONCE). 예약일=과거 거부"
      notes={{ API: "POST /api/transfer/scheduled" }}
    />
  );
}