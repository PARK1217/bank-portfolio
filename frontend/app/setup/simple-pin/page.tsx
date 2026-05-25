"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PinInput } from "@/components/ui/pin-input";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";

/**
 * SCR-AU-008 간편 비밀번호(SIMPLE_PIN) 설정.
 *
 * 정책 (backend service.set_simple_pin 와 동일):
 *  - 6자리 숫자, 같은 숫자 반복(111111) 거부
 *  - 1씩 증가/감소 연속(123456, 654321) 거부
 *  - 2자리 반복 패턴(121212) 거부
 *  - 입력 PIN 과 확인 PIN 일치 필요
 */

function isWeakPin(pin: string): boolean {
  if (pin.length < 2) return false;
  const chars: string[] = pin.split("");
  const unique = new Set(chars);
  if (unique.size === 1) return true;
  const codes = chars.map((c) => c.charCodeAt(0) - 48);
  const allInc = codes.every((c, i) => i === 0 || c - codes[i - 1] === 1);
  if (allInc) return true;
  const allDec = codes.every((c, i) => i === 0 || codes[i - 1] - c === 1);
  if (allDec) return true;
  if (pin.length >= 4 && pin[0] !== pin[1]) {
    const even = chars.filter((_, i) => i % 2 === 0).every((c) => c === pin[0]);
    const odd = chars.filter((_, i) => i % 2 === 1).every((c) => c === pin[1]);
    if (even && odd) return true;
  }
  return false;
}


function SetupPinContent() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pinReady = pin.length === 6;
  const confirmReady = confirm.length === 6;
  const weak = pinReady && isWeakPin(pin);
  const mismatch = pinReady && confirmReady && pin !== confirm;
  const canSubmit = pinReady && confirmReady && !weak && !mismatch && !submitting;

  const guideTone = useMemo(() => {
    if (!pinReady) return "muted";
    if (weak) return "destructive";
    return "success";
  }, [pinReady, weak]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post("/api/signup/pin", { pin, pin_confirm: confirm });
      toast.success("계좌 비밀번호가 등록되었어요.");
      router.push("/dashboard");
    } catch (err) {
      showApiError(err, "PIN 설정에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="text-xs text-muted-foreground">SCR-AU-008</div>
        <CardTitle className="mt-1">간편 비밀번호 설정</CardTitle>
        <CardDescription>
          이체·해지 등 계좌 거래에 사용하는 6자리 숫자 PIN 입니다. 연속·반복
          숫자는 사용할 수 없어요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <section className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">새 PIN (6자리)</span>
            <PinInput value={pin} onChange={setPin} disabled={submitting} required />
            <p
              className={
                guideTone === "destructive"
                  ? "text-[11px] text-destructive"
                  : guideTone === "success"
                    ? "text-[11px] text-success"
                    : "text-[11px] text-muted-foreground"
              }
            >
              {!pinReady
                ? "6자리 숫자를 입력해 주세요."
                : weak
                  ? "쉽게 추측되는 PIN 입니다. 다른 숫자를 사용해 주세요."
                  : "사용 가능한 PIN 이에요."}
            </p>
          </section>

          <section className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">PIN 확인</span>
            <PinInput value={confirm} onChange={setConfirm} disabled={submitting} required />
            {confirmReady && pinReady ? (
              <p
                className={
                  mismatch
                    ? "text-[11px] text-destructive"
                    : "text-[11px] text-success"
                }
              >
                {mismatch ? "PIN 이 일치하지 않습니다." : "두 PIN 이 일치합니다."}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                같은 PIN 을 한 번 더 입력해 주세요.
              </p>
            )}
          </section>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "등록 중…" : "PIN 등록 완료"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            PIN 은 5회 잘못 입력하면 계좌가 잠겨요. 잊으셨다면 보안 설정에서
            재설정할 수 있습니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <SetupPinContent />
      </main>
    </Protected>
  );
}
