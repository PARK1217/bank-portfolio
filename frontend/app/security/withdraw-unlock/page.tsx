"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Protected } from "@/components/protected";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * SCR-SC-008 출금 제한 해제 안내.
 *
 * 디폴트 정책 (안내 문구 기준):
 *   - 신규 가입자: 일일 출금 한도 30만원 (보안상 기본 제한)
 *   - OTP 등록 완료 시: 한도 자동 상향 (예: 5천만원)
 *
 * 화면 분기 — `/api/auth/me` 의 `otp_active`:
 *   false → 안내 + [OTP 등록하러 가기] → `/setup/otp`
 *   true  → 이미 한도 상향 안내 + [이체 한도 관리] → `/security/transfer-limit`
 *
 * 실제 ACCOUNT.DAILY_WITHDRAW_LIMIT UPDATE 로직은 백엔드(인프라) 영역으로 인계.
 */

const DEFAULT_LIMIT_KRW = 300_000;
const RAISED_LIMIT_KRW = 50_000_000;

interface MeResponse {
  customer_no: number;
  email: string;
  otp_active?: boolean;
}

function krw(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

function WithdrawUnlockContent() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<MeResponse>("/api/auth/me");
        if (!cancelled) setMe(res);
      } catch {
        // me 실패 시 로딩만 해제, 안내는 미등록 가정으로 표시
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>상태 확인 중…</span>
      </div>
    );
  }

  const otpActive = !!me?.otp_active;

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-SC-008</div>
        <CardTitle className="mt-1">출금 제한 해제</CardTitle>
        <CardDescription>
          안전한 거래를 위해 신규 가입자는 일일 출금 한도가 기본 {krw(DEFAULT_LIMIT_KRW)}로 제한됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {otpActive ? (
          <>
            <div className="rounded-md border bg-success/5 px-4 py-3 text-sm">
              <div className="font-medium text-success">OTP가 등록되어 있어요.</div>
              <p className="mt-1 text-muted-foreground">
                일일 출금 한도가 최대 {krw(RAISED_LIMIT_KRW)}까지 상향되어 있습니다.
                개별 계좌별 세부 한도는 이체 한도 관리에서 조정할 수 있어요.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/security/transfer-limit"
                className={cn(buttonVariants(), "flex-1")}
              >
                이체 한도 관리
              </Link>
              <Link
                href="/security"
                className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
              >
                보안 설정으로
              </Link>
            </div>
          </>
        ) : (
          <>
            <ol className="space-y-2 rounded-md bg-muted/40 p-4 text-sm">
              <li>1. 일일 출금 한도가 현재 <strong>{krw(DEFAULT_LIMIT_KRW)}</strong>로 제한되어 있습니다.</li>
              <li>2. OTP(일회용 비밀번호)를 등록하시면 한도가 자동으로 <strong>{krw(RAISED_LIMIT_KRW)}</strong>까지 상향됩니다.</li>
              <li>3. Google Authenticator 등 Authenticator 앱 한 번만 연결하면 됩니다.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              OTP를 만들지 않고 한도를 풀려면 신분증을 지참해 영업점에 방문해 주세요.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/setup/otp")} className="flex-1">
                OTP 등록하러 가기
              </Button>
              <Link
                href="/security"
                className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
              >
                나중에 하기
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <WithdrawUnlockContent />
      </main>
    </Protected>
  );
}