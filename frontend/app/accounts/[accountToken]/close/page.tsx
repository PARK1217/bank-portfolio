"use client";

import { useEffect, useMemo, useState } from "react";
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
import { accountTypeLabel } from "@/lib/labels";


/** SCR-AC-009 계좌 해지. 잔액 이체 대상 선택 + 본인 인증. */

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
interface AccountDetail {
  account: AccountSummary;
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function CloseForm({ token }: { token: string }) {
  const router = useRouter();
  const { data: detail } = useFetch<AccountDetail>(`/api/accounts/${token}`);
  const { data: accounts } = useFetch<AccountListData>("/api/accounts");

  const candidates = useMemo(
    () =>
      (accounts?.accounts ?? []).filter(
        (a) => a.account_token !== token && !a.hidden && a.currency === (detail?.account.currency ?? "KRW"),
      ),
    [accounts, detail, token],
  );

  const [targetToken, setTargetToken] = useState("");
  const [password, setPassword] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (candidates.length && !targetToken) setTargetToken(candidates[0].account_token);
  }, [candidates, targetToken]);

  if (!detail) return <Spinner label="계좌 정보 불러오는 중…" />;

  const balance = detail.account.balance;
  const needsTransfer = balance > 0;
  const canSubmit =
    !submitting &&
    acknowledge &&
    /^\d{4}$/.test(password) &&
    (!needsTransfer || !!targetToken);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post(
        `/api/accounts/${token}/close`,
        {
          transfer_target_account_token: needsTransfer ? targetToken : null,
          password,
        },
        { idempotent: true },
      );
      toast.success("계좌가 해지되었습니다.");
      router.push("/accounts");
    } catch (err) {
      showApiError(err, "계좌 해지에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-AC-009</div>
        <CardTitle className="mt-1">계좌 해지</CardTitle>
        <CardDescription>
          해지 후 잔액과 거래 이력은 법령에 따라 일정 기간 보관됩니다. 자동이체가 등록된 경우 먼저 해지하거나 출금계좌를 변경하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">{detail.account.alias ?? accountTypeLabel(detail.account.account_type_cd)}</div>
          <div className="font-mono text-xs text-muted-foreground">{detail.account.account_no}</div>
          <div className="num-tabular mt-1 text-base">잔액 {fmt(balance)}</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {needsTransfer ? (
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">잔액 이체 대상 계좌 *</span>
              {candidates.length === 0 ? (
                <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                  이체 가능한 다른 계좌가 없습니다. 다른 계좌를 먼저 개설하거나 영업점에서 현금 수령하세요.
                </p>
              ) : (
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={targetToken}
                  onChange={(e) => setTargetToken(e.target.value)}
                  required
                >
                  {candidates.map((c) => (
                    <option key={c.account_token} value={c.account_token}>
                      {(c.alias ?? accountTypeLabel(c.account_type_cd)) + " · " + c.account_no}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : (
            <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              잔액이 0원이므로 이체 단계 없이 해지됩니다.
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">계좌 비밀번호 (4자리) *</span>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </label>

          <label className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
            />
            <span>
              본인은 본 계좌의 해지를 신청하며, 해지 후에는 이 계좌로 입금·출금이 불가함을 이해합니다.
            </span>
          </label>

          <Button type="submit" variant="destructive" className="w-full" disabled={!canSubmit}>
            {submitting ? "해지 처리 중…" : "계좌 해지"}
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
        <CloseForm token={params.accountToken} />
      </main>
    </Protected>
  );
}
