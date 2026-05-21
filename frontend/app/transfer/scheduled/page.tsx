"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-TR-008 1회 예약 이체 — AUTO_TRANSFER(cycle=ONCE) 1회성.
 * 사용자는 날짜만 선택. 백엔드 전송 시 현재 시각을 더해 datetime 으로 보낸다
 * (오늘 선택 = 즉시 실행 의도, 미래 선택 = 그 날짜의 같은 시각).
 */

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
  { code: "098", name: "다온뱅크" },
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
  const [toBank, setToBank] = useState("098");
  const [toAccount, setToAccount] = useState("");
  const [toHolder, setToHolder] = useState("");
  const [amount, setAmount] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  type VerifyStatus = "idle" | "loading" | "ok" | "not_found" | "error";
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifiedAccountNo, setVerifiedAccountNo] = useState("");
  const verifySeqRef = useRef(0);

  useEffect(() => {
    if (accounts.length && !fromToken) setFromToken(accounts[0].account_token);
  }, [accounts, fromToken]);

  // 기본 예약 날짜 = 오늘
  useEffect(() => {
    if (!scheduledAt) setScheduledAt(new Date().toISOString().slice(0, 10));
  }, [scheduledAt]);

  const amountN = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  // 날짜 기반 비교 — 선택 날짜가 오늘 이전이면 과거.
  const isPast = useMemo(() => {
    if (!scheduledAt) return false;
    const today = new Date().toISOString().slice(0, 10);
    return scheduledAt < today;
  }, [scheduledAt]);

  // 입금 계좌 verify — 즉시이체와 동일한 흐름. ok 외엔 등록 차단.
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

  const verifyBlocks = verifyStatus !== "ok";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !fromToken || !toAccount || amountN <= 0 || isPast || verifyBlocks) return;
    setSubmitting(true);
    try {
      // 사용자 입력: "YYYY-MM-DD". 백엔드는 datetime 요구 →
      // 선택 날짜에 현재 시각을 합쳐 ISO8601 로 변환.
      // 오늘 선택 → 거의 즉시 실행 (워커 다음 tick 1분 내).
      // 미래 선택 → 그 날짜의 현재 시각 (예: 3일 뒤 오후 2:30).
      const [y, m, d] = scheduledAt.split("-").map(Number);
      const now = new Date();
      const dt = new Date(
        y,
        m - 1,
        d,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds() + 30,
      );
      await api.post<ScheduledTransferResponse>(
        "/api/transfer/scheduled",
        {
          from_account_token: fromToken,
          to_bank_cd: toBank,
          to_account_no: verifiedAccountNo || toAccount,
          to_holder_name: toHolder || null,
          amount_krw: amountN,
          scheduled_at: dt.toISOString(),
          memo: memo || null,
        },
        { idempotent: true },
      );
      toast.success("1회 예약 이체가 등록되었습니다.");
      router.push("/transfer/auto");
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
        <CardTitle className="mt-1">1회 예약 이체</CardTitle>
        <CardDescription>지정한 날짜에 1회 실행됩니다. 자동이체 목록에서 함께 관리됩니다.</CardDescription>
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
                placeholder="숫자만 입력 (- 자동 제거)"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value.replace(/[^0-9]/g, ""))}
                required
              />
            </Field>
          </div>

          <Field label="예금주">
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

          <Field label="이체 금액 (원)" required>
            <Input
              inputMode="numeric"
              value={amount ? krw.format(amountN) : ""}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>

          <Field label="실행 날짜" required>
            <Input
              type="date"
              value={scheduledAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            {isPast ? (
              <p className="mt-1 text-xs text-destructive">과거 날짜는 예약할 수 없습니다.</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                선택한 날짜에 1회 실행됩니다. 오늘 선택 시 곧바로 실행됩니다.
              </p>
            )}
          </Field>

          <Field label="메모 (선택)">
            <Input maxLength={100} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !fromToken || !toAccount || amountN <= 0 || isPast || verifyBlocks}
          >
            {submitting
              ? "등록 중…"
              : verifyStatus === "loading"
              ? "예금주 확인 중…"
              : "1회 예약 등록"}
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
          <Link href="/transfer" className="hover:text-foreground">
            즉시이체
          </Link>
          <Link href="/transfer/auto" className="font-medium text-foreground">
            자동이체
          </Link>
          <Link href="/transfer/favorites" className="hover:text-foreground">
            자주 쓰는 계좌
          </Link>
        </nav>
        <Link
          href="/transfer/auto"
          className="mb-2 inline-block text-xs text-muted-foreground hover:text-foreground"
        >
          ← 자동이체 목록
        </Link>
        <ScheduledForm />
      </main>
    </Protected>
  );
}