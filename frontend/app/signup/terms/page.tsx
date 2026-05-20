"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { patchSignupSession } from "@/lib/signup-session";
import { showApiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * SCR-AU-002 — 약관 동의.
 *
 * NOTE: 실제 약관 목록은 추후 GET /api/terms?signup=true 로 받아와 동적 구성.
 *       현재는 MVP 검증용 정적 목록 (필수 4 + 선택 3).
 */
const TERMS = [
  { id: 1, version: 1, title: "여신·수신 거래 기본약관", required: true },
  { id: 2, version: 1, title: "개인(신용)정보 수집·이용 동의 (필수)", required: true },
  { id: 3, version: 1, title: "전자금융거래 이용약관", required: true },
  { id: 4, version: 1, title: "본인확인서비스 이용약관", required: true },
  { id: 5, version: 1, title: "개인(신용)정보 마케팅 활용 동의 (선택)", required: false },
  { id: 6, version: 1, title: "이벤트 및 상품 안내 수신 동의 (선택)", required: false },
  { id: 7, version: 1, title: "제3자 정보제공 동의 (선택)", required: false },
];

export default function SignupTermsPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  const allChecked = useMemo(() => TERMS.every((t) => agreed[t.id]), [agreed]);
  const requiredOk = useMemo(
    () => TERMS.filter((t) => t.required).every((t) => agreed[t.id]),
    [agreed],
  );

  function toggleAll(checked: boolean) {
    const next: Record<number, boolean> = {};
    TERMS.forEach((t) => (next[t.id] = checked));
    setAgreed(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredOk || loading) return;
    setLoading(true);
    try {
      await api.post(
        "/api/signup/terms",
        {
          agreements: TERMS.map((t) => ({
            terms_id: t.id,
            version: t.version,
            agreed: !!agreed[t.id],
          })),
        },
        { token: null },
      );
      patchSignupSession({ agreedTermsAt: new Date().toISOString() });
      router.push("/signup/verify");
    } catch (err) {
      showApiError(err, "약관 동의 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-12 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="font-mono text-xs text-muted-foreground">SCR-AU-002 · 1/4</div>
          <CardTitle className="mt-1">약관 동의</CardTitle>
          <CardDescription>필수 약관 4종에 동의해야 진행됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                disabled={loading}
              />
              전체 동의
            </label>
            <ul className="space-y-2">
              {TERMS.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!agreed[t.id]}
                    onChange={(e) =>
                      setAgreed((cur) => ({ ...cur, [t.id]: e.target.checked }))
                    }
                    disabled={loading}
                  />
                  <span className={t.required ? "" : "text-muted-foreground"}>
                    <span className="mr-1 text-xs font-medium">
                      [{t.required ? "필수" : "선택"}]
                    </span>
                    {t.title}
                  </span>
                </li>
              ))}
            </ul>
            <Button type="submit" className="w-full" disabled={!requiredOk || loading}>
              {loading ? "처리 중…" : "다음"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}