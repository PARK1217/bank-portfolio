"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { setTransferDraft } from "@/lib/transfer-session";
import { showApiError } from "@/lib/toast";


// ---------------------------------------------------------------------------
// 은행 마스터 — 추후 GET /api/banks 로 대체. 098 = 다온뱅크(당행).
// ---------------------------------------------------------------------------

const BANKS: { code: string; name: string }[] = [
  { code: "098", name: "다온뱅크" },
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
  const [toBank, setToBank] = useState<string>(prefillToBank || "098");
  const [toAccount, setToAccount] = useState<string>(prefillToAccount.replace(/-/g, ""));
  const [toHolder, setToHolder] = useState<string>(prefillToHolder);
  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  // 입금 계좌 verify — 당행 즉시 DB / 타행 Kafka request-reply 3s.
  // 응답에 따라 예금주 자동 표시 + 미존재 시 "다음" 버튼 차단.
  type VerifyStatus = "idle" | "loading" | "ok" | "not_found" | "error";
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyMessage, setVerifyMessage] = useState<string>("");
  // verify ok 시 백엔드가 돌려준 정규형 account_no (예: "110-001-999992").
  // confirm/execute_transfer 호출 시 이걸로 보내야 DB ACCOUNT_NO 와 매치된다.
  const [verifiedAccountNo, setVerifiedAccountNo] = useState<string>("");
  const verifySeqRef = useRef(0);

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

  // toBank / toAccount 가 충분히 채워지면 디바운스 600ms 후 verify.
  // 입력 도중 toAccount 가 바뀌면 verifySeqRef 로 stale 응답 무시.
  useEffect(() => {
    setToHolder("");
    setVerifyMessage("");
    setVerifiedAccountNo("");
    if (toAccount.length < 6) {
      setVerifyStatus("idle");
      return;
    }
    setVerifyStatus("loading");
    const seq = ++verifySeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await api.post<{
          exists: boolean;
          holder_name: string | null;
          account_no: string;
          error: string | null;
        }>("/api/transfer/verify-account", {
          to_bank_cd: toBank,
          to_account_no: toAccount,
        });
        if (seq !== verifySeqRef.current) return;
        if (res.exists) {
          setToHolder(res.holder_name ?? "");
          setVerifyStatus("ok");
          setVerifyMessage(res.holder_name ?? "확인됨");
          setVerifiedAccountNo(res.account_no);
        } else if (res.error === "VERIFY_TIMEOUT" || res.error === "VERIFY_BROKER_DOWN") {
          setVerifyStatus("error");
          setVerifyMessage("타행 응답이 늦어 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setVerifyStatus("not_found");
          setVerifyMessage("실존하지 않는 계좌입니다. 은행과 계좌번호를 다시 확인해 주세요.");
        }
      } catch {
        if (seq !== verifySeqRef.current) return;
        setVerifyStatus("error");
        setVerifyMessage("계좌 확인 중 오류가 발생했습니다.");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [toBank, toAccount]);

  const fromAccount = accounts.find((a) => a.account_token === fromToken) ?? null;
  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const overBalance = fromAccount != null && amountNum > fromAccount.balance;
  // 계좌 검증은 무조건 선행. ok 외에는(loading/not_found/error/idle) 모두 차단.
  // 엉뚱한 계좌로 이체되는 사고를 막기 위해 사용자 직접 우회도 허용하지 않는다.
  const verifyBlocks = verifyStatus !== "ok";

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
      to_account_no: verifiedAccountNo || toAccount,
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
                placeholder="숫자만 입력 (- 자동 제거)"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value.replace(/[^0-9]/g, ""))}
                required
              />
            </Field>
          </div>

          <Field label="예금주명">
            <Input
              placeholder={
                verifyStatus === "loading"
                  ? "예금주 확인 중…"
                  : "은행과 계좌번호를 입력하면 자동으로 표시됩니다"
              }
              maxLength={20}
              value={toHolder}
              onChange={(e) => setToHolder(e.target.value)}
              readOnly
            />
            {verifyMessage ? (
              <p
                className={`mt-1 text-xs ${
                  verifyStatus === "ok"
                    ? "text-success"
                    : verifyStatus === "not_found"
                    ? "text-destructive"
                    : verifyStatus === "error"
                    ? "text-warning"
                    : "text-muted-foreground"
                }`}
              >
                {verifyStatus === "ok" ? "확인됨 · 예금주 " : ""}
                {verifyMessage}
              </p>
            ) : null}
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

          <Button
            type="submit"
            className="w-full"
            disabled={
              !fromAccount ||
              amountNum <= 0 ||
              overBalance ||
              !toAccount ||
              verifyBlocks
            }
          >
            {verifyStatus === "loading" ? "예금주 확인 중…" : "다음"}
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
        <nav className="mb-3 flex gap-3 text-xs text-muted-foreground">
          <Link href="/transfer" className="font-medium text-foreground">
            즉시이체
          </Link>
          <Link href="/transfer/auto" className="hover:text-foreground">
            자동이체
          </Link>
          <Link href="/transfer/scheduled" className="hover:text-foreground">
            예약이체
          </Link>
          <Link href="/transfer/favorites" className="hover:text-foreground">
            자주 쓰는 계좌
          </Link>
        </nav>
        <Suspense fallback={<Spinner label="로딩 중…" />}>
          <TransferForm />
        </Suspense>
      </main>
    </Protected>
  );
}