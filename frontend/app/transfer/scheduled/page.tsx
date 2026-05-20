"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-TR-008 예약 이체 — AUTO_TRANSFER(cycle=ONCE) 1회성. 예약일=과거 거부. */

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

interface ScheduledTransferResponse {
  auto_token: string;
  next_execute_at: string | null;
}

const BANKS: { code: string; name: string }[] = [
  { code: "020", name: "다온뱅크" },
  { code: "004", name: "KB국민" },
  { code: "088", name: "신한" },
  { code: "081", name: "하나" },
  { code: "011", name: "농협" },
  { code: "003", name: "IBK기업" },
  { code: "090", name: "카카오뱅크" },
  { code: "089", name: "케이뱅크" },
  { code: "092", name: "토스뱅크" },
];

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function ScheduledForm() {
  const router = useRouter();
  const { data: accountsData, loading: accountsLoading } = useFetch<AccountListData>("/api/accounts");
  const accounts = useMemo(
    () => (accountsData?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [accountsData],
  );

  const [fromToken, setFromToken] = useState("");
  const [toBank, setToBank] = useState("020");
  const [toAccount, setToAccount] = useState("");
  const [toHolder, setToHolder] = useState("");
  const [amount, setAmount] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accounts.length && !fromToken) setFromToken(accounts[0].account_token);
  }, [accounts, fromToken]);

  // 기본 예약 시각 = 1시간 후
  useEffect(() => {
    if (!scheduledAt) {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      d.setSeconds(0, 0);
      // datetime-local 입력은 로컬 시간 (YYYY-MM-DDTHH:mm)
      const pad = (n: number) => String(n).padStart(2, "0");
      const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}`;
      setScheduledAt(value);
    }
  }, [scheduledAt]);

  const amountN = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const isPast = useMemo(() => {
    if (!scheduledAt) return false;
    return new Date(scheduledAt).getTime() <= Date.now();
  }, [scheduledAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !fromToken || !toAccount || amountN <= 0 || isPast) return;
    setSubmitting(true);
    try {
      const res = await api.post<ScheduledTransferResponse>(
        "/api/transfer/scheduled",
        {
          from_account_token: fromToken,
          to_bank_cd: toBank,
          to_account_no: toAccount,
          to_holder_name: toHolder || null,
          amount_krw: amountN,
          scheduled_at: new Date(scheduledAt).toISOString(),
          memo: memo || null,
        },
        { idempotent: true },
      );
      router.push(`/transfer/auto/${res.auto_token}/history`);
    } catch (err) {
      showApiError(err, "예약 이체 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accountsLoading && !accountsData) return <Spinner label="계좌 불러오는 중…" />;
  if (!accounts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이체 가능한 계좌가 없습니다</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-TR-008</div>
        <CardTitle className="mt-1">예약 이체</CardTitle>
        <CardDescription>지정한 일시에 1회 실행됩니다. 자동이체 목록에서 함께 관리됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="출금 계좌" required>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.account_token} value={a.account_token}>
                  {(a.alias ?? a.account_type_cd) + " · " + a.account_no + " · " + fmt(a.balance)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <Field label="입금 은행" required>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={toBank}
                onChange={(e) => setToBank(e.target.value)}
              >
                {BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="입금 계좌번호" required>
              <Input
                inputMode="numeric"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value.replace(/[^0-9-]/g, ""))}
                required
              />
            </Field>
          </div>

          <Field label="예금주 (선택)">
            <Input maxLength={20} value={toHolder} onChange={(e) => setToHolder(e.target.value)} />
          </Field>

          <Field label="이체 금액 (원)" required>
            <Input
              inputMode="numeric"
              value={amount ? krw.format(amountN) : ""}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>

          <Field label="실행 일시" required>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            {isPast ? (
              <p className="mt-1 text-xs text-destructive">과거 시각은 예약할 수 없습니다.</p>
            ) : null}
          </Field>

          <Field label="메모 (선택)">
            <Input maxLength={30} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !fromToken || !toAccount || amountN <= 0 || isPast}
          >
            {submitting ? "등록 중…" : "예약 등록"}
          </Button>
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
        <ScheduledForm />
      </main>
    </Protected>
  );
}