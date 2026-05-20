import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-HM-004"
      title="알림 센터"
      priority="Signature"
      summary="미읽음 우선 정렬 / 타입별 필터"
      notes={{ API: "GET /api/notifications", ERD: "NOTIFICATION (🆕 v53)" }}
    />
  );
}