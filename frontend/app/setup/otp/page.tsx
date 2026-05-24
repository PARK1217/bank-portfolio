"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/**
 * SCR-AU-010 OTP 등록 (TOTP 표준) ⭐.
 *
 * 흐름:
 *  1) [시작] → POST /api/setup/otp/init  → { secret, otpauth_uri } 반환
 *  2) QR 스캔 또는 시크릿 직접 입력으로 사용자 OTP 앱(예: Google Authenticator)에 추가
 *  3) 앱이 생성한 6자리 코드 입력 → POST /api/setup/otp { otp_code } → 등록 확정
 *
 * QR 렌더: 공개 QR 서비스(qrserver.com) `<img>`. 운영 환경에선 서버 사이드 SVG 생성 또는 qrcode 라이브러리 권장.
 */

interface OtpInitResponse {
  secret: string;
  otpauth_uri: string;
}

const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/";


interface MeResponse {
  customer_no: number;
  email: string;
  otp_active?: boolean;
}

function OtpSetupContent() {
  const router = useRouter();
  const [stage, setStage] = useState<"INIT" | "VERIFY" | "DONE">("INIT");
  const [secret, setSecret] = useState<string>("");
  const [otpauthUri, setOtpauthUri] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 이미 OTP 가 등록된 사용자가 진입하면 기존 secret 이 무효화되지 않도록
  // 즉시 보안(OTP 재발급) 화면으로 보낸다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<MeResponse>("/api/auth/me");
        if (cancelled) return;
        if (me.otp_active) {
          toast.info("이미 OTP가 등록되어 있어요. 재발급 화면으로 이동할게요.");
          router.replace("/security/otp");
          return;
        }
      } catch {
        // me 조회 실패 시 화면은 그대로 두고 시작 버튼 단계로 진행 — start() 호출 시 백엔드 가드가 한 번 더 막는다.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function start() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post<OtpInitResponse>("/api/setup/otp/init", null);
      setSecret(res.secret);
      setOtpauthUri(res.otpauth_uri);
      setStage("VERIFY");
    } catch (err) {
      showApiError(err, "OTP 초기화에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !/^\d{6}$/.test(otpCode)) return;
    setLoading(true);
    try {
      await api.post("/api/setup/otp", { otp_code: otpCode });
      setStage("DONE");
      toast.success("OTP가 등록되었습니다.");
      // 잠시 후 보안 메뉴로
      window.setTimeout(() => router.push("/security/password"), 1500);
    } catch (err) {
      showApiError(err, "OTP 코드 검증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("시크릿이 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  return (
    <Card>
      <CardHeader>        <CardTitle className="mt-1">OTP 등록</CardTitle>
        <CardDescription>
          Google Authenticator, Authy 등 TOTP 표준 앱과 연결하여 6자리 일회용 비밀번호로 본인 인증을 강화합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {checking ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner />
            <span>등록 상태 확인 중…</span>
          </div>
        ) : null}
        {!checking && stage === "INIT" ? (
          <>
            <ol className="space-y-1 text-sm text-muted-foreground">
              <li>1. 스마트폰에 TOTP 앱(Authenticator) 을 설치합니다.</li>
              <li>2. [OTP 설정 시작] 을 누르면 QR 코드와 시크릿이 표시됩니다.</li>
              <li>3. 앱에서 QR을 스캔하거나 시크릿을 수동 입력합니다.</li>
              <li>4. 앱이 보여주는 6자리 코드를 입력해 등록을 완료합니다.</li>
            </ol>
            <Button onClick={start} className="w-full" disabled={loading}>
              {loading ? "준비 중…" : "OTP 설정 시작"}
            </Button>
          </>
        ) : null}

        {stage === "VERIFY" ? (
          <>
            <section className="flex flex-col items-center gap-3 rounded-md border bg-muted/30 p-4">
              <img
                src={`${QR_BASE}?data=${encodeURIComponent(otpauthUri)}&size=220x220&margin=8`}
                alt="OTP 등록 QR 코드"
                width={220}
                height={220}
                className="rounded-md border bg-white"
              />
              <div className="w-full">
                <div className="text-xs text-muted-foreground">시크릿 (앱에 직접 입력 시)</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="block flex-1 break-all rounded-md bg-background px-2 py-1.5 font-mono text-xs">
                    {secret}
                  </code>
                  <Button type="button" size="sm" variant="outline" onClick={copySecret}>
                    복사
                  </Button>
                </div>
              </div>
            </section>

            <form onSubmit={verify} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  앱에 표시된 6자리 코드 <span className="text-destructive">*</span>
                </span>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  pattern="\d{6}"
                  required
                  disabled={loading}
                />
                <p className="text-[10px] text-muted-foreground">
                  코드는 30초마다 갱신됩니다. 직전 코드로 인증되지 않으면 새 코드로 재시도하세요.
                </p>
              </label>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !/^\d{6}$/.test(otpCode)}
              >
                {loading ? "확인 중…" : "OTP 등록 완료"}
              </Button>
            </form>
          </>
        ) : null}

        {stage === "DONE" ? (
          <div className="space-y-3 rounded-md bg-success/10 p-4 text-center text-sm">
            <p className="text-base font-semibold text-success">✓ OTP 등록 완료</p>
            <p className="text-xs text-muted-foreground">
              앞으로 거액 이체·한도 변경·기기 등록 등 주요 거래에서 OTP가 추가 인증 수단으로 사용됩니다.
            </p>
            <Spinner size="sm" label="이동 중…" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <OtpSetupContent />
      </main>
    </Protected>
  );
}