"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Protected } from "@/components/protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


interface LoanProductItem {
  product_id: number;
  product_name: string;
  base_rate: number;
  min_amount: number;
  max_amount: number;
  max_period_months: number;
  target_customer_cd: string | null;
}

interface LoanProductListResponse {
  items: LoanProductItem[];
}

const krw = new Intl.NumberFormat("ko-KR");


function LoansContent() {
  const { data, error, loading, refetch } = useFetch<LoanProductListResponse>("/api/loans");

  useEffect(() => {
    if (error) showApiError(error, "대출 상품을 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="대출 상품 불러오는 중…" />;
  if (!data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">대출 상품을 불러오지 못했습니다.</p>
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

  if (data.items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        판매 중인 대출 상품이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.items.map((p) => (
        <li key={p.product_id}>
          <Link href={`/loans/${p.product_id}/precheck`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="pb-2">
                <div className="text-xs text-muted-foreground">대출</div>
                <CardTitle className="text-base">{p.product_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 text-sm">
                <div>
                  <span className="text-muted-foreground">기본 금리 </span>
                  <span className="num-tabular font-semibold">{p.base_rate.toFixed(2)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  한도 {krw.format(p.min_amount)} ~ {krw.format(p.max_amount)}원 · 최대 {p.max_period_months}개월
                </div>
                <div className="pt-1 text-xs text-primary">한도 조회 →</div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-4xl py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">대출 상품</h1>
          <p className="text-xs text-muted-foreground">한도 조회는 신용조회 없이 시뮬레이션으로 진행됩니다.</p>
        </div>
        <LoansContent />
      </main>
    </Protected>
  );
}