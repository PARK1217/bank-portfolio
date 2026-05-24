"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/toast";


/** SCR-AU-009 생체인증 등록. WebAuthn 기반 — 미지원 기기는 거부. */

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}


export default function Page() {
  const router = useRouter();
  const [stage, setStage] = useState<"INIT" | "BUSY" | "DONE">("INIT");

  const supported =
    typeof window !== "undefined" &&
    "credentials" in navigator &&
    typeof window.PublicKeyCredential !== "undefined";

  async function register() {
    if (!supported) return;
    setStage("BUSY");
    try {
      // 1) 서버에서 challenge 받음
      const challenge = await api.post<{ challenge: string; user_id: string }>(
        "/api/setup/biometric/init",
        null,
      );

      // 2) WebAuthn 등록 (브라우저 OS 생체 prompt)
      const challengeBytes = Uint8Array.from(atob(challenge.challenge), (c) => c.charCodeAt(0));
      const userIdBytes = new TextEncoder().encode(challenge.user_id);
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: { name: "다온뱅크" },
          user: {
            id: userIdBytes,
            name: challenge.user_id,
            displayName: "본인",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            userVerification: "required",
            authenticatorAttachment: "platform",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!cred) {
        throw new Error("등록이 취소되었습니다.");
      }

      // 3) 서버에 등록 결과 제출 — ArrayBuffer → base64 (스프레드 회피)
      const attestation = cred.response as AuthenticatorAttestationResponse;
      const credentialId = bufferToBase64(cred.rawId);
      const clientDataJSON = bufferToBase64(attestation.clientDataJSON);
      const attestationObject = bufferToBase64(attestation.attestationObject);

      await api.post("/api/setup/biometric", {
        credential_id: credentialId,
        client_data_json: clientDataJSON,
        attestation_object: attestationObject,
      });

      setStage("DONE");
      toast.success("생체인증이 등록되었습니다.");
      window.setTimeout(() => router.push("/security"), 1500);
    } catch (err) {
      setStage("INIT");
      if (err instanceof DOMException) {
        toast.error("생체인증 등록이 취소되었습니다.");
      } else {
        showApiError(err, "생체인증 등록에 실패했습니다.");
      }
    }
  }

  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href="/security" className="text-xs text-muted-foreground hover:text-foreground">
            ← 보안 설정
          </Link>
        </div>
        <Card>
          <CardHeader>            <CardTitle className="mt-1">생체인증 등록</CardTitle>
            <CardDescription>
              지문·얼굴 인식(WebAuthn) 으로 더 빠르고 안전하게 로그인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!supported ? (
              <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                현재 기기·브라우저가 생체인증을 지원하지 않습니다. iPhone Safari / Android Chrome / Mac Safari·Chrome 등에서 시도해 주세요.
              </div>
            ) : stage === "DONE" ? (
              <div className="rounded-md bg-success/10 p-3 text-sm">
                <p className="font-medium text-success">✓ 생체인증 등록 완료</p>
                <p className="text-xs text-muted-foreground">다음 로그인부터 지문·얼굴로 인증할 수 있습니다.</p>
              </div>
            ) : (
              <>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>· 이 기기·브라우저에만 등록되며 다른 기기로 전송되지 않습니다.</li>
                  <li>· 생체 정보 자체는 다온뱅크 서버에 저장되지 않습니다 (FIDO 표준).</li>
                  <li>· 분실·기기 변경 시엔 본인 인증 후 재등록이 필요합니다.</li>
                </ul>
                <Button type="button" className="w-full" onClick={register} disabled={stage === "BUSY"}>
                  {stage === "BUSY" ? "기기 생체인증 진행 중…" : "생체인증 등록 시작"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </Protected>
  );
}