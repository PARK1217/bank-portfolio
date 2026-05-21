"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { setTransferDraft } from "@/lib/transfer-session";
import { showApiError } from "@/lib/toast";


// ---------------------------------------------------------------------------
// 은행 마스터 — 추후 GET /api/banks 로 대체. 020 = 당행(우리은행 가정).
// ---------------------------------------------------------------------------

const BANKS: { code: string; name: string }[] = [
  { code: "020", name: "다온뱅크" },
  { code: "004", name: "KB국민" },
  { code: "088", name: "신한" },
  { code: "081", name: "하나" },
  { code: "011", name: "농협" },
  { code: "003", name: "IBK기업" },
  { code: "032", name: "BNK부산" },
  { code: "027", name: "씨티" },
  { code: "023", name: "SC제일" },
  { code: "031", name: "DGB대구" },
  { code: "090", name: "카카오뱅크" },
  { code: "089", name: "케이뱅크" },
  { code: "092", name: "토스뱅크" },
  { code: "071", name: "우체국" },
];


interface AccountSummary {
  account_token: string;
  alias: string | null;
  account_type_cd: string;
  currency: string;
  balance: number;
  status_cd: string;
  hidden: boolean;
  account_no: string;
}

interface AccountListData {
  accounts: AccountSummary[];
  total_balance_krw: number;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function TransferForm() {
  const router = useRouter();
  const search = useSearchParams();
  const prefillToken = search.get("from") ?? "";
  const prefillFromNo = search.get("from_no") ?? "";
  const prefillToBank = search.get("to_bank") ?? "";
  const prefillToAccount = search.get("to_account") ?? "";
  const prefillToHolder = search.get("to_holder") ?? "";

  const { data: accountsData, error: accountsError, loading: accountsLoading } =
    useFetch<AccountListData>("/api/accounts");

  const accounts = useMemo(
    () => (accountsData?.accounts ?? []).filter((a) => !a.hidden && a.currency === "KRW"),
    [accountsData],
  );

  const [fromToken, setFromToken] = useState<string>("");
  const [toBank, setToBank] = useState<string>(prefillToBank || "020");
  const [toAccount, setToAccount] = useState<string>(prefillToAccount);
  const [toHolder, setToHolder] = useState<string>(prefillToHolder);
  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  // accounts 로딩 후 prefill 적용.
  // account_token 은 매번 새로 발급되는 in-memory 토큰이라 계좌 상세에서 받아온
  // prefill token 이 목록 토큰과 다를 수 있음 → from_no(account_no, 안정) 폴백.
  // 또한 fromToken 이 목록에 없는 invalid 상태라면 항상 재설정해서 select 와
  // fromAccount 가 어긋나는(잔액 미표시·다음 비활성) 상태를 막는다.
  useEffect(() => {
    if (!accounts.length) return;
    if (accounts.some((a) => a.account_token === fromToken)) return;
    const byToken = prefillToken
      ? accounts.find((a) => a.account_token === prefillToken)
      : null;
    const byNo = prefillFromNo
      ? accounts.find((a) => a.account_no === prefillFromNo)
      : null;
    setFromToken((byToken ?? byNo ?? accounts[0]).account_token);
  }, [accounts, fromToken, prefillToken, prefillFromNo]);

  useEffect(() => {
    if (accountsError) showApiError(accountsError, "계좌 목록을 불러오지 못했습니다.");
  }, [accountsError]);

  const fromAccount = accounts.find((a) => a.account_token === fromToken) ?? null;
  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const overBalance = fromAccount != null && amountNum > fromAccount.balance;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAccount) return;
    if (!toBank || !toAccount || amountNum <= 0) return;
    if (overBalance) {
      showApiError(new Error("balance"), "잔액이 부족합니다.");
      return;
    }
    const bank = BANKS.find((b) => b.code === toBank);
    setTransferDraft({
      from_account_token: fromAccount.account_token,
      from_account_label: fromAccount.alias ?? fromAccount.account_no,
      from_account_no: fromAccount.account_no,
      to_bank_cd: toBank,
      to_bank_name: bank?.name,
      to_account_no: toAccount,
      to_holder_name: toHolder || null,
      amount_krw: amountNum,
      memo: memo || null,
    });
    router.push("/transfer/confirm");
  }

  if (accountsLoading && !accountsData) {
    return <Spinner label="계좌 불러오는 중…" />;
  }
  if (!accounts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이체 가능한 계좌가 없습니다</CardTitle>
          <CardDescription>먼저 입출금 계좌를 개설해주세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-TR-001</div>
        <CardTitle className="mt-1">즉시이체</CardTitle>
        <CardDescription>
          출금 계좌, 입금 은행·계좌, 금액을 입력하세요. 다음 단계에서 비밀번호 확인 후 실행됩니다.
        </CardDescription>
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
                required
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
                placeholder="숫자만"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value.replace(/[^0-9-]/g, ""))}
                required
              />
            </Field>
          </div>

          <Field label="예금주명 (선택)">
            <Input
              placeholder="예: 홍길동"
              maxLength={20}
              value={toHolder}
              onChange={(e) => setToHolder(e.target.value)}
            />
          </Field>

          <Field label="금액 (원)" required>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={amount ? krw.format(amountNum) : ""}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {fromAccount ? (
              <p
                className={`mt-1 text-xs ${
                  overBalance ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                출금 가능 잔액 {fmt(fromAccount.balance)}
              </p>
            ) : null}
          </Field>

          <Field label="메모 (선택)">
            <Input
              maxLength={30}
              placeholder="입금 받는 분이 보는 메모"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={!fromAccount || amountNum <= 0 || overBalance}>
            다음
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
        <Suspense fallback={<Spinner label="로딩 중…" />}>
          <TransferForm />
        </Suspense>
      </main>
    </Protected>
  );
}