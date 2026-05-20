"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { patchProductOpenSession } from "@/lib/product-open-session";
import { showApiError } from "@/lib/toast";
import { TermsAgreementFlow, type TermsConsent } from "@/components/terms-agreement-flow";
import { getTermsBody } from "@/lib/terms-bodies";


/**
 * SCR-OP-010 상품 약관·특약 동의 (가입 진행 전 게이트) — 스크롤-동의 모달 UX 적용.
 *
 * 변경:
 *  - 단순 체크박스 → TermsAgreementFlow 컴포넌트
 *  - 약관 본문 모달 + 스크롤 끝 도달 자동 동의 + 전체 동의 단축
 *  - 계약특약(covenant)도 약관 흐름에 통합 (필수 + 본문 modal)
 */

interface ProductSummary {
  product_id: number;
  product_name: string;
  product_type_cd: string;
}

interface ProductTermsMapping {
  terms_id: number;
  version: number;
  title: string;
  required: boolean;
}

interface ProductDetailData {
  product: ProductSummary;
  terms_mappings: ProductTermsMapping[];
}


function nextOpenUrl(productId: number, type: string): string {
  switch (type) {
    case "SAVING": return `/products/${productId}/open-saving`;
    case "DEPOSIT": return `/products/${productId}/open-deposit`;
    case "INSTALLMENT": return `/products/${productId}/open-installment`;
    case "LOAN": return `/loans/${productId}/precheck`;
    default: return `/products/${productId}`;
  }
}

// 상품 가입 공통 계약특약 — 약관 모달 UX 그대로 사용 (별도 fake terms_id 부여, 9000번대)
const COVENANTS_AS_TERMS = [
  {
    terms_id: 9001,
    version: 1,
    title: "휴면 처리 특약 — 5년 이상 거래 없으면 휴면",
    required: true,
    body:
      "고객의 본 상품 계좌가 최근 5년 이상 거래(입금·출금·이자 지급 외) 없고 잔액이 1만원 미만인 경우 본행은 휴면예금으로 분류하여 별도 관리합니다.\n\n휴면예금으로 분류된 후에도 고객은 본인 확인 절차를 거쳐 언제든 잔액을 인출할 수 있으며, 「예금자보호법」 보호 대상 자격은 그대로 유지됩니다.\n\n휴면 처리 시 우편·전자수단으로 사전 안내가 발송됩니다.",
  },
  {
    terms_id: 9002,
    version: 1,
    title: "이자소득세 원천징수 특약 — 15.4%",
    required: true,
    body:
      "본 상품에서 발생한 이자 소득에는 「소득세법」에 따른 이자소득세(소득세 14% + 지방소득세 1.4%, 총 15.4%)가 지급 시점에 원천징수되어 차감된 금액이 입금됩니다.\n\n비과세 종합저축·세금우대종합저축 등 절세 상품에 해당하는 경우 별도 신청 절차에 따라 다른 세율이 적용될 수 있습니다.\n\n원천징수된 세금에 대한 환급·정정은 「국세기본법」에 따라 처리되며, 본행은 매년 1월 원천징수영수증을 발급합니다.",
  },
];


function TermsContent({ productId }: { productId: number }) {
  const router = useRouter();
  const { data, error, loading } = useFetch<ProductDetailData>(`/api/products/${productId}`);

  useEffect(() => {
    if (error) showApiError(error, "약관 목록을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="약관 불러오는 중…" />;
  if (!data) return null;

  const items = [
    ...(data.terms_mappings ?? []).map((t) => ({
      terms_id: t.terms_id,
      version: t.version,
      title: t.title,
      required: t.required,
      body: getTermsBody(t.terms_id),
    })),
    ...COVENANTS_AS_TERMS,
  ];

  async function onSubmit(consents: TermsConsent[]) {
    try {
      const termsConsents = consents.filter((c) => c.terms_id < 9000);
      const covenantsAgreed = consents.filter((c) => c.terms_id >= 9000 && c.agreed);
      const covenantCodes = covenantsAgreed.map((c) =>
        c.terms_id === 9001 ? "DORMANT_5Y" : c.terms_id === 9002 ? "INTEREST_TAX_15_4" : `COV_${c.terms_id}`,
      );
      await api.post(`/api/products/${productId}/terms`, {
        product_id: productId,
        consents: termsConsents,
        covenant_codes: covenantCodes,
      });
      patchProductOpenSession({
        product_id: productId,
        product_type_cd: data!.product.product_type_cd,
        product_name: data!.product.product_name,
        agreed_terms_at: new Date().toISOString(),
      });
      router.push(nextOpenUrl(productId, data!.product.product_type_cd));
    } catch (err) {
      showApiError(err, "약관 동의 처리에 실패했습니다.");
      throw err;
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-OP-010 · 가입 1/2 단계</div>
        <CardTitle className="mt-1">{data.product.product_name} 약관 동의</CardTitle>
        <CardDescription>
          상품 약관과 계약특약을 모두 확인·동의해야 다음 단계로 진행됩니다. 항목을 눌러 본문을 끝까지 읽으시면 자동으로 동의 처리됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">매핑된 약관이 없습니다.</p>
        ) : (
          <TermsAgreementFlow
            terms={items}
            stepLabel="상품 가입 · 약관 동의"
            submitLabel="동의하고 다음으로"
            onSubmit={onSubmit}
          />
        )}
      </CardContent>
    </Card>
  );
}


export default function Page() {
  const params = useParams<{ productId: string }>();
  const pid = parseInt(params.productId, 10);
  if (!pid) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <TermsContent productId={pid} />
      </main>
    </Protected>
  );
}