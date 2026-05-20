"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-AC-008 계좌 한도 변경 (SC-006 와 같은 백엔드, 다른 진입점). */

interface AccountLimitData {
  daily_limit_krw: number | null;
  once_limit_krw: number | null;
}

const krw = new Intl.NumberFormat("ko-KR");


function LimitForm({ token }: { token: string }) {
  const router = useRouter();
  const { data, loading } = useFetch<AccountLimitData>(`/api/security/transfer-limit/${token}`);
  const [daily, setDaily] = useState("");
  const [once, setOnce] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      setDaily(data.daily_limit_krw != null ? String(data.daily_limit_krw) : "");
      setOnce(data.once_limit_krw != null ? String(data.once_limit_krw) : "");
    }
  }, [data]);

  const dailyN = parseInt(daily.replace(/[^0-9]/g, ""), 10) || 0;
  const onceN = parseInt(once.replace(/[^0-9]/g, ""), 10) || 0;
  const canSubmit = !submitting && /^\d{6}$/.test(otp) && dailyN > 0 && onceN > 0 && onceN <= dailyN;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/security/transfer-limit/${token}`, {
        daily_limit_krw: dailyN,
        once_limit_krw: onceN,
        otp_code: otp,
      });
      toast.success("이체 한도가 변경되었습니다.");
      router.push(`/accounts/${token}`);
    } catch (err) {
      showApiError(err, "한도 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <Spinner label="현재 한도 불러오는 중…" />;

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-AC-008</div>
        <CardTitle className="mt-1">이체 한도 변경</CardTitle>
        <CardDescription>1일·1회 한도를 조정합니다. OTP 인증이 필요합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">1일 한도 (원) *</span>
              <Input
                inputMode="numeric"
                value={daily && dailyN > 0 ? krw.format(dailyN) : daily}
                onChange={(e) => setDaily(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">1회 한도 (원) *</span>
              <Input
                inputMode="numeric"
                value={once && onceN > 0 ? krw.format(onceN) : once}
                onChange={(e) => setOnce(e.target.value)}
                required
              />
            </label>
          </div>
          {onceN > dailyN ? (
            <p className="text-xs text-destructive">1회 한도는 1일 한도를 초과할 수 없습니다.</p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">OTP 코드 6자리 *</span>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              pattern="\d{6}"
              required
            />
          </label>
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "변경 중…" : "한도 변경"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href={`/accounts/${params.accountToken}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← 계좌 상세
          </Link>
        </div>
        <LimitForm token={params.accountToken} />
      </main>
    </Protected>
  );
}