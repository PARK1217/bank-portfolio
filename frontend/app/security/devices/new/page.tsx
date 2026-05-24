"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-SC-004 기기 등록 — 현재 기기 정보 + OTP 인증 후 신뢰 기기 추가. */


function NewDeviceForm() {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fingerprint = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${navigator.userAgent.slice(0, 100)}|${navigator.language}|${screen.width}x${screen.height}`;
  }, []);

  useEffect(() => {
    if (!alias && typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      const guess = /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android 폰" : /Mac/.test(ua) ? "Mac" : "내 PC";
      setAlias(guess);
    }
  }, [alias]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !/^\d{6}$/.test(otp)) return;
    setSubmitting(true);
    try {
      await api.post(
        "/api/security/devices",
        {
          alias,
          device_fingerprint: fingerprint,
          otp_code: otp,
        },
        { idempotent: true },
      );
      router.push("/security/devices");
    } catch (err) {
      showApiError(err, "기기 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>        <CardTitle className="mt-1">현재 기기 등록</CardTitle>
        <CardDescription>
          이 기기를 신뢰 기기로 등록하면 다음부터는 OTP 추가 인증 없이 로그인할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">기기 별칭</span>
            <Input
              maxLength={30}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={submitting}
              required
            />
          </label>
          <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">기기 정보</div>
            <div className="mt-0.5 break-all">{fingerprint || "정보 없음"}</div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              OTP 코드 6자리 <span className="text-destructive">*</span>
            </span>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              required
              pattern="\d{6}"
            />
          </label>
          <Button type="submit" className="w-full" disabled={submitting || !/^\d{6}$/.test(otp)}>
            {submitting ? "등록 중…" : "기기 등록"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/security/devices" className="text-xs text-muted-foreground hover:text-foreground">
            ← 기기 관리
          </Link>
        </div>
        <NewDeviceForm />
      </main>
    </Protected>
  );
}