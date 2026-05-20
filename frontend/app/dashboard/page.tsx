import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-HM-001"
      title="메인 대시보드"
      priority="MVP"
      summary="총자산 / 계좌 카드 / 대출 / 최근거래 5건 / 미읽음 알림"
      notes={{ API: "GET /api/dashboard", ERD: "고객 / 계좌 / 대출계약 / 거래" }}
    />
  );
}