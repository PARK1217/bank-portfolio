import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-TR-005"
      title="자동이체 등록"
      priority="Signature"
      summary="출금계좌·입금·주기(monthly/weekly)·시작일/종료일·금액. 첫 next_execute 계산"
      notes={{ API: "POST /api/transfer/auto", ERD: "AUTO_TRANSFER (+SCHEDULE_RULE jsonb)" }}
    />
  );
}