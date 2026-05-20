import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

/** id = appToken */
export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-LN-004"
      title="대출 서류 제출"
      priority="MVP"
      summary="첨부파일 N개 → 첨부서류 + 서류요구 UPDATE"
      notes={{ API: "POST /api/loans/{token}/documents", "토큰": "🔒 appToken" }}
    />
  );
}