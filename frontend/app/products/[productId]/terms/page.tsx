"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { patchProductOpenSession } from "@/lib/product-open-session";
import { showApiError } from "@/lib/toast";


/** SCR-OP-010 약관·특약 동의 (가입 진행 전 게이트). */

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


/** 상품 유형별 다음 단계 URL */
function nextOpenUrl(productId: number, type: string): string {
  switch (type) {
    case "SAVING": return `/products/${productId}/open-saving`;
    case "DEPOSIT": return `/products/${productId}/open-deposit`;
    case "INSTALLMENT": return `/products/${productId}/open-installment`;
    case "LOAN": return `/loans/${productId}/precheck`;
    default: return `/products/${productId}`;
  }
}

/** 상품에서 자주 적용되는 계약특약 — 데모 */
const COVENANTS: { code: string; label: string }[] = [
  { code: "DORMANT_5Y", label: "5년 이상 거래 없으면 휴면 처리" },
  { code: "INTEREST_TAX_15_4", label: "이자소득세 15.4% 원천징수" },
];


function TermsPage({ productId }: { productId: number }) {
  const router = useRouter();
  const { data, error, loading } = useFetch<ProductDetailData>(`/api/products/${productId}`);

  const [agreed, setAgreed] = useState<Record<number, boolean>>({});
  const [covenants, setCovenants] = useState<Record<string, boolean>>(() =>
    COVENANTS.reduce((m, c) => ({ ...m, [c.code]: false }), {}),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) showApiError(error, "약관 목록을 불러오지 못했습니다.");
  }, [error]);

  const requiredOk = useMemo(
    () => (data?.terms_mappings ?? []).filter((t) => t.required).every((t) => agreed[t.terms_id]),
    [data, agreed],
  );
  const covenantsOk = useMemo(() => COVENANTS.every((c) => covenants[c.code]), [covenants]);
  const canProceed = requiredOk && covenantsOk && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canProceed || !data) return;
    setSubmitting(true);
    try {
      await api.post(`/api/products/${productId}/terms`, {
        product_id: productId,
        consents: (data.terms_mappings ?? []).map((t) => ({
          terms_id: t.terms_id,
          version: t.version,
          agreed: !!agreed[t.terms_id],
        })),
        covenant_codes: COVENANTS.filter((c) => covenants[c.code]).map((c) => c.code),
      });
      patchProductOpenSession({
        product_id: productId,
        product_type_cd: data.product.product_type_cd,
        product_name: data.product.product_name,
        agreed_terms_at: new Date().toISOString(),
      });
      router.push(nextOpenUrl(productId, data.product.product_type_cd));
    } catch (err) {
      showApiError(err, "약관 동의 처리에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <Spinner label="약관 불러오는 중…" />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs text-muted-foreground">{data.product.product_type_cd} · 가입 1/2 단계</div>
        <h1 className="mt-1 text-xl font-semibold">{data.product.product_name} 약관 동의</h1>
        <p className="text-xs text-muted-foreground">
          필수 약관 · 계약특약 모두 동의해야 다음 단계로 진행됩니다.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">상품 약관</CardTitle>
          <CardDescription>약관명을 클릭하면 본문을 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {(data.terms_mappings ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">매핑된 약관이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {data.terms_mappings.map((t) => (
                <li key={t.terms_id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!agreed[t.terms_id]}
                    onChange={(e) => setAgreed((cur) => ({ ...cur, [t.terms_id]: e.target.checked }))}
                  />
                  <span>
                    <span className="mr-1 text-xs font-medium">[{t.required ? "필수" : "선택"}]</span>
                    <Link href={`/terms/${t.terms_id}`} target="_blank" className="hover:underline">
                      {t.title}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계약 특약</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {COVENANTS.map((c) => (
              <li key={c.code} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!covenants[c.code]}
                  onChange={(e) => setCovenants((cur) => ({ ...cur, [c.code]: e.target.checked }))}
                />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <form onSubmit={onSubmit}>
        <Button type="submit" className="w-full" disabled={!canProceed}>
          {submitting ? "처리 중…" : "동의하고 다음으로"}
        </Button>
      </form>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ productId: string }>();
  const pid = parseInt(params.productId, 10);
  if (!pid) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <TermsPage productId={pid} />
      </main>
    </Protected>
  );
}