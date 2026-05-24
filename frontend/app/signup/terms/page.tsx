"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { patchSignupSession } from "@/lib/signup-session";
import { showApiError } from "@/lib/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TermsAgreementFlow, type TermsConsent } from "@/components/terms-agreement-flow";
import { getTermsBody } from "@/lib/terms-bodies";


/**
 * SCR-AU-002 회원가입 약관 동의 — 스크롤-동의 모달 UX 적용.
 *
 * 변경:
 *  - 단순 체크박스 → TermsAgreementFlow 컴포넌트
 *  - 약관별 본문 모달 + 스크롤 끝 도달 자동 동의
 *  - 전체 동의 단축 옵션
 */

const SIGNUP_TERMS = [
  { terms_id: 1, version: 1, title: "여신·수신 거래 기본약관", required: true },
  { terms_id: 7, version: 1, title: "개인(신용)정보 수집·이용 동의 (필수)", required: true },
  { terms_id: 6, version: 2, title: "전자금융거래 이용약관", required: true },
  { terms_id: 5, version: 1, title: "자유입출금예금 약관", required: true },
  { terms_id: 8, version: 1, title: "개인(신용)정보 마케팅 활용 동의 (선택)", required: false },
  { terms_id: 9, version: 1, title: "이벤트 및 상품 안내 수신 동의 (선택)", required: false },
].map((t) => ({ ...t, body: getTermsBody(t.terms_id) }));


export default function Page() {
  const router = useRouter();

  async function onSubmit(consents: TermsConsent[]) {
    try {
      await api.post(
        "/api/signup/terms",
        { agreements: consents },
        { token: null },
      );
      patchSignupSession({ agreedTermsAt: new Date().toISOString() });
      router.push("/signup/verify");
    } catch (err) {
      showApiError(err, "약관 동의 처리에 실패했습니다.");
      throw err; // 컴포넌트가 spinner 해제하도록
    }
  }

  return (
    <main className="container max-w-md py-12 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="text-xs text-muted-foreground">가입 1/4 단계</div>
          <CardTitle className="mt-1">약관 동의</CardTitle>
          <CardDescription>
            아래 약관 항목을 눌러 본문을 끝까지 확인하시면 자동으로 동의 처리됩니다. 필수 항목 모두 동의해야 다음 단계로 진행됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TermsAgreementFlow
            terms={SIGNUP_TERMS}
            stepLabel="회원가입 · 약관 동의"
            submitLabel="동의하고 본인인증으로 →"
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>
    </main>
  );
}