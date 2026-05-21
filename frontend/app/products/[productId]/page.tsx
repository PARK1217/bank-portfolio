"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { buttonVariants } from "@/components/ui/button";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


interface ProductSummary {
  product_id: number;
  product_name: string;
  product_type_cd: string;
  base_rate: number;
  min_amount: number | null;
  max_amount: number | null;
  special_yn: boolean;
  sale_start_date: string | null;
  sale_end_date: string | null;
}

interface ProductPeriodEntry {
  period_months: number;
  rate: number;
}
interface ProductRatePolicyEntry {
  tier_min_amount: number;
  base_rate: number;
  bonus_rate_max: number;
}
interface ProductBonusConditionEntry {
  condition_cd: string;
  description: string;
  bonus_rate: number;
}
interface ProductTermsMapping {
  terms_id: number;
  version: number;
  title: string;
  required: boolean;
}

interface ProductDetailData {
  product: ProductSummary;
  periods: ProductPeriodEntry[];
  rate_policies: ProductRatePolicyEntry[];
  bonus_conditions: ProductBonusConditionEntry[];
  terms_mappings: ProductTermsMapping[];
}


const TYPE_LABEL: Record<string, string> = {
  SAVING: "입출금",
  DEPOSIT: "정기예금",
  INSTALL: "적금",     // DB PRODUCT_TYPE_CD varchar(8) 한도
  LOAN: "대출",
};

const krw = new Intl.NumberFormat("ko-KR");

function openCtaTarget(productId: number, type: string): { href: string; label: string } | null {
  switch (type) {
    case "SAVING":
    case "DEPOSIT":
    case "INSTALL":      // DB varchar(8) 한도 — URL 슬러그는 그대로 /open-installment
      // 약관 동의를 거쳐 type-specific open 페이지로
      return { href: `/products/${productId}/terms`, label: "가입하기" };
    case "LOAN":
      return { href: `/loans/${productId}/precheck`, label: "한도 조회 (가신청)" };
    default:
      return null;
  }
}


function DetailContent({ productId }: { productId: string }) {
  const { data, error, loading } = useFetch<ProductDetailData>(`/api/products/${productId}`);

  useEffect(() => {
    if (error) showApiError(error, "상품 정보를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="상품 정보 불러오는 중…" />;
  if (error?.httpStatus === 404) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">해당 상품을 찾을 수 없습니다.</p>
        <Link href="/products" className="mt-2 inline-block text-xs text-primary hover:underline">
          상품 카탈로그 →
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { product, periods, rate_policies, bonus_conditions, terms_mappings } = data;
  const cta = openCtaTarget(product.product_id, product.product_type_cd);
  const maxBonusRate = bonus_conditions.reduce((sum, b) => sum + b.bonus_rate, 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{TYPE_LABEL[product.product_type_cd] ?? product.product_type_cd}</span>
          {product.special_yn ? (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">특판</span>
          ) : null}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">{product.product_name}</h1>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="num-tabular text-3xl font-bold">{product.base_rate.toFixed(2)}%</div>
          <div className="text-xs text-muted-foreground">기본 금리</div>
          {maxBonusRate > 0 ? (
            <div className="text-xs text-success">
              + 우대 최대 {maxBonusRate.toFixed(2)}%p
            </div>
          ) : null}
        </div>
      </section>

      {periods.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">가입 기간별 금리</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {periods.map((p) => (
                <li key={p.period_months} className="flex justify-between py-2">
                  <span>{p.period_months}개월</span>
                  <span className="num-tabular font-medium">{p.rate.toFixed(2)}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {rate_policies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">금액 구간별 금리</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {rate_policies.map((r, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>{krw.format(r.tier_min_amount)}원 이상</span>
                  <span className="num-tabular">
                    {r.base_rate.toFixed(2)}%
                    {r.bonus_rate_max > 0 ? (
                      <span className="ml-1 text-xs text-success">+{r.bonus_rate_max.toFixed(2)}%p</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {bonus_conditions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">우대 조건</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {bonus_conditions.map((b) => (
                <li key={b.condition_cd} className="flex justify-between gap-3 py-2">
                  <span className="flex-1">{b.description}</span>
                  <span className="num-tabular whitespace-nowrap text-success">
                    +{b.bonus_rate.toFixed(2)}%p
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {(product.min_amount != null || product.max_amount != null) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">가입 한도</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {product.min_amount != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">최소 가입금액</span>
                <span className="num-tabular">{krw.format(product.min_amount)}원</span>
              </div>
            ) : null}
            {product.max_amount != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">최대 가입금액</span>
                <span className="num-tabular">{krw.format(product.max_amount)}원</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {terms_mappings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">관련 약관</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {terms_mappings.map((t) => (
                <li key={t.terms_id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    [{t.required ? "필수" : "선택"}]
                  </span>
                  <Link href={`/terms/${t.terms_id}`} className="hover:underline">
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {cta ? (
        <div className="space-y-2">
          <Link href={cta.href} className={cn(buttonVariants(), "w-full")}>
            {cta.label} →
          </Link>
          {product.product_type_cd === "SAVING" ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/products/${product.product_id}/open-joint`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "")}
              >
                공동명의로 개설 ⭐
              </Link>
              <Link
                href={`/products/${product.product_id}/open-minor`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "")}
              >
                미성년 자녀 명의 ⭐
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  // 비로그인 공개 (가입 흐름은 open-* 별도 라우트에서 인증 강제).
  const params = useParams<{ productId: string }>();
  return (
    <main className="container max-w-3xl py-8 animate-fade-in">
      <div className="mb-4">
        <Link href="/products" className="text-xs text-muted-foreground hover:text-foreground">
          ← 상품 카탈로그
        </Link>
      </div>
      <DetailContent productId={params.productId} />
    </main>
  );
}