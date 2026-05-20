import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AC-003"
      title="통장 페이지 출력 ⭐"
      priority="Signature"
      summary="SVG 렌더링 + 통장 디자인 (거래 페이지별)"
      notes={{ API: "GET /api/accounts/{token}/passbook" }}
    />
  );
}