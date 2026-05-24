"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * SCR-SC-006 계좌 비밀번호(SIMPLE_PIN, 6자리) 재설정.
 *
 * 3분기 (백엔드 GET /api/security/simple-pin/status 응답 기반)
 *   1) otp_active=false                 → 영업점 방문 안내 + [OTP 먼저 설정]
 *   2) otp_active=true, pin_locked=true → 잠금 안내 + 현재 PIN 단계 생략 (OTP + new_pin)
 *   3) otp_active=true, pin_locked=false → 정상 (current_pin + OTP + new_pin)
 */

interface StatusResponse {
  otp_active: boolean;
  pin_locked: boolean;
  locked_accounts: number;
}

interface ResetResponse {
  success: boolean;
  unlocked_accounts: number;
}

function ResetContent() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<StatusResponse>("/api/security/simple-pin/status");
        if (!cancelled) setStatus(res);
      } catch (err) {
        if (!cancelled) showApiError(err, "재설정 상태를 확인하지 못했어요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !status) return;
    if (!/^\d{6}$/.test(newPin)) {
      toast.error("새 PIN은 6자리 숫자로 입력해 주세요.");
      return;
    }
    if (newPin !== newPinConfirm) {
      toast.error("새 PIN 확인이 일치하지 않습니다.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      toast.error("OTP 6자리를 입력해 주세요.");
      return;
    }
    if (!status.pin_locked && !/^\d{6}$/.test(currentPin)) {
      toast.error("현재 PIN 6자리를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, string> = { new_pin: newPin, otp_code: otp };
      if (!status.pin_locked) body.current_pin = currentPin;
      const res = await api.post<ResetResponse>("/api/security/simple-pin/reset", body);
      toast.success(
        res.unlocked_accounts > 0
          ? `계좌 비밀번호를 재설정했어요. 잠긴 계좌 ${res.unlocked_accounts}건이 함께 해제되었습니다.`
          : "계좌 비밀번호를 재설정했어요.",
      );
      router.push("/security");
    } catch (err) {
      showApiError(err, "재설정에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>상태 확인 중…</span>
      </div>
    );
  }

  if (!status) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  // 분기 1) OTP 미등록 — 영업점 안내
  if (!status.otp_active) {
    return (
      <Card>
        <CardHeader>          <CardTitle className="mt-1">계좌 비밀번호 재설정</CardTitle>
          <CardDescription>
            비대면 재설정에는 OTP 등록이 필요해요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-warning/5 px-4 py-3 text-sm">
            <div className="font-medium">OTP가 아직 등록되어 있지 않아요.</div>
            <p className="mt-1 text-muted-foreground">
              OTP를 먼저 등록하면 비대면으로 계좌 비밀번호를 재설정할 수 있어요.
              OTP 없이 재설정하려면 신분증을 지참하고 가까운 영업점을 방문해 주세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/setup/otp" className={cn(buttonVariants(), "flex-1")}>
              OTP 등록하러 가기
            </Link>
            <Link
              href="/security"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              나중에 하기
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 분기 2/3) OTP 등록됨 — 폼 (잠금 여부에 따라 현재 PIN 필드 노출)
  const showCurrentPin = !status.pin_locked;
  return (
    <Card>
      <CardHeader>        <CardTitle className="mt-1">
          {status.pin_locked ? "계좌 잠금 해제 + 비밀번호 재설정" : "계좌 비밀번호 재설정"}
        </CardTitle>
        <CardDescription>
          {status.pin_locked
            ? `5회 오류로 잠긴 계좌 ${status.locked_accounts}건이 있어요. OTP 인증 후 새 비밀번호를 설정하면 잠금도 함께 해제돼요.`
            : "현재 계좌 비밀번호 확인 후 OTP 인증으로 새 비밀번호를 설정해요."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {showCurrentPin ? (
            <Field label="현재 계좌 비밀번호 (6자리)" required>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                disabled={submitting}
                required
              />
            </Field>
          ) : null}
          <Field label="새 계좌 비밀번호 (6자리)" required>
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              disabled={submitting}
              required
            />
          </Field>
          <Field label="새 계좌 비밀번호 확인" required>
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={newPinConfirm}
              onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ""))}
              disabled={submitting}
              required
            />
          </Field>
          <Field label="OTP 6자리" required>
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Authenticator 앱의 6자리 코드"
              disabled={submitting}
              required
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "처리 중…" : "재설정"}
            </Button>
            <Link
              href="/security"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              취소
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <ResetContent />
      </main>
    </Protected>
  );
}