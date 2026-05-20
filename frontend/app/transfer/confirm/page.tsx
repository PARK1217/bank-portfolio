"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  clearTransferDraft,
  getTransferDraft,
  type TransferDraft,
} from "@/lib/transfer-session";
import { showApiError } from "@/lib/toast";


interface TransferConfirmResponse {
  tx_token: string;
  settlement_type: string;
  settlement_status: string;
  requested_at: string;
  completed_at: string | null;
  idempotent_replay: boolean;
}

const SETTLEMENT_TYPE_LABEL: Record<string, string> = {
  INTRA_BANK: "당행 즉시 처리",
  KFTC_SMALL: "타행 (금융결제원)",
  BOK_LARGE: "거액 (한국은행 BOK-Wire+)",
};

const LARGE_AMOUNT_THRESHOLD = 1_000_000_000; // 10억

function predictSettlementType(draft: TransferDraft): string {
  if (draft.to_bank_cd === "020") return "INTRA_BANK";
  if (draft.amount_krw >= LARGE_AMOUNT_THRESHOLD) return "BOK_LARGE";
  return "KFTC_SMALL";
}

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function ConfirmContent() {
  const router = useRouter();
  const [draft, setDraft] = useState<TransferDraft | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = getTransferDraft();
    if (!d) {
      router.replace("/transfer");
      return;
    }
    setDraft(d);
  }, [router]);

  if (!draft) return null;

  const predictedSettlement = predictSettlementType(draft);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !draft) return;
    setLoading(true);
    try {
      const res = await api.post<TransferConfirmResponse>(
        "/api/transfer",
        {
          from_account_token: draft.from_account_token,
          to_bank_cd: draft.to_bank_cd,
          to_account_no: draft.to_account_no,
          to_holder_name: draft.to_holder_name,
          amount_krw: draft.amount_krw,
          memo: draft.memo,
          password_or_otp: password,
        },
        { idempotent: true },
      );
      clearTransferDraft();
      router.push(`/transfer/complete/${res.tx_token}`);
    } catch (err) {
      showApiError(err, "이체에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-TR-002</div>
        <CardTitle className="mt-1">이체 확인</CardTitle>
        <CardDescription>비밀번호 또는 OTP 를 입력하면 즉시 실행됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="divide-y rounded-md border bg-card text-sm">
          <Row k="출금 계좌" v={`${draft.from_account_label ?? ""} ${draft.from_account_masked ?? ""}`.trim()} />
          <Row k="입금 은행" v={draft.to_bank_name ?? draft.to_bank_cd} />
          <Row k="입금 계좌" v={draft.to_account_no} />
          {draft.to_holder_name ? <Row k="예금주" v={draft.to_holder_name} /> : null}
          <Row k="이체 금액" v={fmt(draft.amount_krw)} highlight />
          {draft.memo ? <Row k="메모" v={draft.memo} /> : null}
          <Row k="결제 채널 (예상)" v={SETTLEMENT_TYPE_LABEL[predictedSettlement] ?? predictedSettlement} muted />
        </dl>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              비밀번호 / OTP <span className="text-destructive">*</span>
            </span>
            <Input
              type="password"
              autoComplete="one-time-code"
              required
              minLength={4}
              maxLength={32}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/transfer")}
              disabled={loading}
            >
              이전
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "이체 중…" : `${fmt(draft.amount_krw)} 이체`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Row({
  k,
  v,
  highlight,
  muted,
}: {
  k: string;
  v: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 p-3">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={`num-tabular text-right ${
          highlight ? "text-base font-semibold" : muted ? "text-xs text-muted-foreground" : ""
        }`}
      >
        {v}
      </span>
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <ConfirmContent />
      </main>
    </Protected>
  );
}