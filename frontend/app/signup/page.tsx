"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";


/**
 * 회원가입 사전 게이트 — 약관동의 화면 진입 전 자격·분기 확인.
 *
 * 처리 항목:
 *  - 만 14세 이상 확인 (14세 미만은 친권자 통한 자녀 통장 개설 흐름 안내)
 *  - 본행 기존 거래 안내 (창구 개설 후 비대면 첫 가입 케이스 안내)
 *  - 외국인·법인은 별도 라우트로 분기
 *  - 본인 명의 가입 확인 (3-bind 자가 점검)
 */


export default function Page() {
  const router = useRouter();
  const [age14plus, setAge14plus] = useState<boolean | null>(null);
  const [selfApplyingMe, setSelfApplyingMe] = useState(false);
  const [acknowledgeNewMember, setAcknowledgeNewMember] = useState(false);

  const canProceed = age14plus === true && selfApplyingMe && acknowledgeNewMember;

  function proceed() {
    if (!canProceed) return;
    router.push("/signup/terms");
  }

  return (
    <main className="container max-w-md py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
          ← 로그인으로 돌아가기
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">회원가입 안내 · 사전 확인</div>
          <CardTitle className="mt-1">가입 자격 확인</CardTitle>
          <CardDescription>
            가입을 진행하기 전 몇 가지 사항을 확인합니다. 이미 본행 회원이시라면 로그인을, 외국인·법인 가입자는 아래 별도 안내를 따라 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 1. 연령 확인 */}
          <section className="space-y-2">
            <div className="text-sm font-medium">1. 만 14세 이상이신가요?</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAge14plus(true)}
                className={cn(
                  "rounded-md border py-2 text-sm transition-colors",
                  age14plus === true
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent",
                )}
              >
                예 (만 14세 이상)
              </button>
              <button
                type="button"
                onClick={() => setAge14plus(false)}
                className={cn(
                  "rounded-md border py-2 text-sm transition-colors",
                  age14plus === false
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent",
                )}
              >
                아니오 (14세 미만)
              </button>
            </div>
            {age14plus === false ? (
              <div className="rounded-md bg-warning/10 p-3 text-xs">
                만 14세 미만은 본인 가입이 불가합니다. 부모님(친권자)의 본행 회원가입 후{" "}
                <Link href="/products" className="font-medium text-primary hover:underline">
                  미성년 자녀 통장 개설
                </Link>{" "}
                흐름으로 자녀 명의 통장을 만들 수 있습니다.
              </div>
            ) : null}
          </section>

          {/* 2. 기존 회원 안내 */}
          <section className="space-y-2">
            <div className="text-sm font-medium">2. 본행 거래 경험</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>· 본행 첫 거래라면 — 그대로 진행하세요.</li>
              <li>· 영업점에서 계좌만 개설한 적이 있다면 — 본인 인증 단계에서 자동으로 기존 계좌와 연결됩니다.</li>
              <li>
                · 이미 가입된 회원이신가요? →{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  로그인
                </Link>{" "}
                또는{" "}
                <Link href="/password/reset" className="font-medium text-primary hover:underline">
                  비밀번호 재설정
                </Link>
              </li>
            </ul>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-card p-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={acknowledgeNewMember}
                onChange={(e) => setAcknowledgeNewMember(e.target.checked)}
              />
              <span>위 내용을 확인했으며, 본행에 가입된 회원이 아닙니다.</span>
            </label>
          </section>

          {/* 3. 본인 명의 확인 */}
          <section className="space-y-2">
            <div className="text-sm font-medium">3. 본인 명의 가입 확인</div>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-card p-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selfApplyingMe}
                onChange={(e) => setSelfApplyingMe(e.target.checked)}
              />
              <span>
                본인은 직접 본인 명의로 가입합니다. (대리·도용 가입은 「전자금융거래법」 위반으로 처벌받을 수 있습니다)
              </span>
            </label>
          </section>

          <Button type="button" className="w-full" disabled={!canProceed} onClick={proceed}>
            다음 — 약관 동의로 진행
          </Button>

          {/* 분기 안내 */}
          <section className="border-t pt-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">다른 가입 흐름</div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/signup/foreigner"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "")}
              >
                외국인 가입
              </Link>
              <Link
                href="/signup/corporation"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "")}
              >
                사업자·법인 가입
              </Link>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}