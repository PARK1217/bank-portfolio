"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-SC-006 이체 한도 관리 — 계좌별 1일·1회 한도 변경 (OTP 필수). */

interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  hidden: boolean;
  account_no: string;
  status_cd: string;
}
interface AccountListData {
  accounts: AccountSummary[];
  total_balance_krw: number;
}

interface LimitData {
  daily_limit_krw: number | null;
  once_limit_krw: number | null;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function LimitForm({ accountToken }: { accountToken: string }) {
  const { data, refetch } = useFetch<LimitData>(`/api/security/transfer-limit/${accountToken}`);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !/^\d{6}$/.test(otp)) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/security/transfer-limit/${accountToken}`, {
        daily_limit_krw: dailyN,
        once_limit_krw: onceN,
        otp_code: otp,
      });
      setOtp("");
      void refetch();
    } catch (err) {
      showApiError(err, "한도 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">1일 한도 (원)</span>
          <Input
            inputMode="numeric"
            value={daily && dailyN > 0 ? krw.format(dailyN) : daily}
            onChange={(e) => setDaily(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">1회 한도 (원)</span>
          <Input
            inputMode="numeric"
            value={once && onceN > 0 ? krw.format(onceN) : once}
            onChange={(e) => setOnce(e.target.value)}
          />
        </label>
      </div>
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
      <Button type="submit" size="sm" className="w-full" disabled={submitting || !/^\d{6}$/.test(otp)}>
        {submitting ? "변경 중…" : "한도 변경"}
      </Button>
    </form>
  );
}


function LimitsList() {
  const { data, loading, error } = useFetch<AccountListData>("/api/accounts");

  useEffect(() => {
    if (error) showApiError(error, "계좌 목록을 불러오지 못했습니다.");
  }, [error]);

  const krwAccounts = useMemo(
    () => (data?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [data],
  );

  if (loading && !data) return <Spinner label="계좌 불러오는 중…" />;
  if (!krwAccounts.length) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        한도 관리 가능한 계좌가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {krwAccounts.map((a) => (
        <li key={a.account_token}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {a.alias ?? a.account_type_cd}
              </CardTitle>
              <div className="font-mono text-xs text-muted-foreground">{a.account_no}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <LimitForm accountToken={a.account_token} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
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
          <h1 className="mt-1 text-xl font-semibold">이체 한도 관리</h1>
          <p className="text-xs text-muted-foreground">계좌별 1일·1회 한도. 변경 시 OTP 인증 필수.</p>
        </div>
        <LimitsList />
      </main>
    </Protected>
  );
}