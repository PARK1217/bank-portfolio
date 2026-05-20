import { ScaffoldPlaceholder } from "@/components/scaffold-placeholder";

export default function Page() {
  return (
    <ScaffoldPlaceholder
      code="SCR-AU-010"
      title="OTP 등록"
      priority="Signature"
      summary="TOTP 시크릿 + QR + 6자리 검증코드 (TOTP 표준)"
      notes={{ API: "POST /api/setup/otp", ERD: "인증수단마스터 (KIND=OTP, secret=암호화)" }}
    />
  );
}