"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/** SCR-SC-005 OTP 재발급·변경 — 기존 OTP 해제 + 새 OTP 등록(/setup/otp 리다이렉트). */

interface OtpStatusResponse {
  enrolled: boolean;
  enrolled_at: string | null;
}


function OtpManageContent() {
  const router = useRouter();
  const [revoking, setRevoking] = useState(false);

  async function revoke() {
    if (!confirm("기존 OTP를 해제하시겠습니까? 새 OTP는 별도로 등록해야 합니다.")) return;
    setRevoking(true);
    try {
      await api.delete("/api/security/otp");
      toast.success("OTP가 해제되었습니다. 새 OTP를 등록하세요.");
      router.push("/setup/otp");
    } catch (err) {
      showApiError(err, "OTP 해제에 실패했습니다.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Card>
      <CardHeader>        <CardTitle className="mt-1">OTP 재발급·변경</CardTitle>
        <CardDescription>
          기존 OTP를 해제하고 새 OTP를 등록합니다. 해제와 등록 사이에는 일시적으로 OTP 인증이 불가합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md bg-warning/10 p-3 text-xs text-warning">
          ⚠️ 변경 절차: 해제 → 새 등록. 분실한 경우엔 OTP 해제만 진행하고 본인 인증으로 임시 로그인하세요.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/setup/otp"
            className={cn(buttonVariants({ variant: "outline" }), "")}
          >
            새 OTP 등록
          </Link>
          <Button variant="destructive" onClick={revoke} disabled={revoking}>
            {revoking ? "해제 중…" : "OTP 해제"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground">
            ← 보안 설정
          </Link>
        </div>
        <OtpManageContent />
      </main>
    </Protected>
  );
}