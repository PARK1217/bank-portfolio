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


/** SCR-TR-005 자동이체 등록. AUTO_TRANSFER 신규 + SCHEDULE_RULE jsonb (격주/N요일). */

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

interface AutoTransferResponse {
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

const DAYS_OF_WEEK = [
  { code: "MON", label: "월" },
  { code: "TUE", label: "화" },
  { code: "WED", label: "수" },
  { code: "THU", label: "목" },
  { code: "FRI", label: "금" },
  { code: "SAT", label: "토" },
  { code: "SUN", label: "일" },
];

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function NewAutoTransferForm() {
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
  const [cycle, setCycle] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  const [monthlyDay, setMonthlyDay] = useState("25");
  const [dayOfWeek, setDayOfWeek] = useState("MON");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [memo, setMemo] = useState("");
  const [linkedTo, setLinkedTo] = useState<"USER" | "INSTALLMENT" | "LOAN" | "UTILITY">("USER");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accounts.length && !fromToken) setFromToken(accounts[0].account_token);
  }, [accounts, fromToken]);

  // 시작일 기본 = 오늘
  useEffect(() => {
    if (!startDate) setStartDate(new Date().toISOString().slice(0, 10));
  }, [startDate]);

  const amountN = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !fromToken || !toAccount || amountN <= 0) return;

    let monthly_exec_day: number | null = null;
    let schedule_rule: Record<string, unknown> | null = null;
    if (cycle === "MONTHLY") monthly_exec_day = parseInt(monthlyDay, 10);
    if (cycle === "WEEKLY") schedule_rule = { day_of_week: dayOfWeek };

    setSubmitting(true);
    try {
      const res = await api.post<AutoTransferResponse>(
        "/api/transfer/auto",
        {
          from_account_token: fromToken,
          to_bank_cd: toBank,
          to_account_no: toAccount,
          to_holder_name: toHolder || null,
          amount_krw: amountN,
          cycle_type_cd: cycle,
          monthly_exec_day,
          schedule_rule,
          valid_start_date: startDate,
          valid_end_date: endDate || null,
          memo: memo || null,
          linked_to: linkedTo,
          linked_id: null,
        },
        { idempotent: true },
      );
      router.push(`/transfer/auto/${res.auto_token}/history`);
    } catch (err) {
      showApiError(err, "자동이체 등록에 실패했습니다.");
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
        <div className="font-mono text-xs text-muted-foreground">SCR-TR-005</div>
        <CardTitle className="mt-1">자동이체 등록</CardTitle>
        <CardDescription>주기와 시작일을 지정하면 다음 실행 일정이 자동 계산됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="출금 계좌" required>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              required
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

          <Field label="주기" required>
            <div className="flex gap-2">
              {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`flex-1 rounded-md border py-2 text-sm ${
                    cycle === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  {c === "DAILY" ? "매일" : c === "WEEKLY" ? "매주" : "매월"}
                </button>
              ))}
            </div>
          </Field>

          {cycle === "WEEKLY" ? (
            <Field label="요일" required>
              <div className="flex flex-wrap gap-1">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => setDayOfWeek(d.code)}
                    className={`h-9 w-9 rounded-md border text-sm ${
                      dayOfWeek === d.code
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}

          {cycle === "MONTHLY" ? (
            <Field label="매월 실행일 (1~31)" required>
              <Input
                type="number"
                min={1}
                max={31}
                value={monthlyDay}
                onChange={(e) => setMonthlyDay(e.target.value)}
                required
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Field label="시작일" required>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Field>
            <Field label="종료일 (선택)">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>

          <Field label="용도 분류">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={linkedTo}
              onChange={(e) => setLinkedTo(e.target.value as typeof linkedTo)}
            >
              <option value="USER">일반 이체</option>
              <option value="UTILITY">공과금</option>
              <option value="INSTALLMENT">적금 납입</option>
              <option value="LOAN">대출 상환</option>
            </select>
          </Field>

          <Field label="메모 (선택)">
            <Input maxLength={30} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "등록 중…" : "자동이체 등록"}
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
        <NewAutoTransferForm />
      </main>
    </Protected>
  );
}