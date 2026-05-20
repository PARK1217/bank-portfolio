"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


interface ProductCatalogItem {
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

interface ProductCatalogResponse {
  items: ProductCatalogItem[];
}


const TYPE_FILTERS: { code: string; label: string }[] = [
  { code: "ALL", label: "전체" },
  { code: "SAVING", label: "입출금" },
  { code: "DEPOSIT", label: "정기예금" },
  { code: "INSTALL", label: "적금" },     // DB PRODUCT_TYPE_CD varchar(8) 한도
  { code: "LOAN", label: "대출" },
];

const TYPE_LABEL: Record<string, string> = {
  SAVING: "입출금",
  DEPOSIT: "정기예금",
  INSTALL: "적금",
  LOAN: "대출",
};

const krw = new Intl.NumberFormat("ko-KR");


function ProductsContent() {
  const [filter, setFilter] = useState("ALL");
  const { data, error, loading, refetch } = useFetch<ProductCatalogResponse>("/api/products");

  useEffect(() => {
    if (error) showApiError(error, "상품 목록을 불러오지 못했습니다.");
  }, [error]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (filter === "ALL") return all;
    return all.filter((p) => p.product_type_cd === filter);
  }, [data, filter]);

  if (loading && !data) return <Spinner label="상품 불러오는 중…" />;
  if (!data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">상품 정보를 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs text-primary hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.code}
            type="button"
            onClick={() => setFilter(f.code)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === f.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          해당 카테고리에 판매 중인 상품이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.product_id}>
              <Link href={`/products/${p.product_id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{TYPE_LABEL[p.product_type_cd] ?? p.product_type_cd}</span>
                      {p.special_yn ? (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">특판</span>
                      ) : null}
                    </div>
                    <CardTitle className="text-base">{p.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0 text-sm">
                    <div>
                      <span className="text-muted-foreground">기본 금리 </span>
                      <span className="num-tabular font-semibold">{p.base_rate.toFixed(2)}%</span>
                    </div>
                    {p.min_amount != null || p.max_amount != null ? (
                      <div className="text-xs text-muted-foreground">
                        {p.min_amount != null ? `최소 ${krw.format(p.min_amount)}원` : "최소 제한 없음"}
                        {p.max_amount != null ? ` · 최대 ${krw.format(p.max_amount)}원` : ""}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-4xl py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">상품 카탈로그</h1>
          <p className="text-xs text-muted-foreground">판매 중인 상품을 모아 보여드립니다.</p>
        </div>
        <ProductsContent />
      </main>
    </Protected>
  );
}