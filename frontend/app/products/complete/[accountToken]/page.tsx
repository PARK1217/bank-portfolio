"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { clearProductOpenSession } from "@/lib/product-open-session";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";


/** SCR-OP-009 상품 개설 완료. */

interface ProductCompleteData {
  account_token: string;
  account_no: string;
  product_name: string;
}


function CompleteContent({ token }: { token: string }) {
  const { data, error, loading } = useFetch<ProductCompleteData>(`/api/products/complete/${token}`);

  // 진입 시 product-open-session 폐기
  useEffect(() => {
    clearProductOpenSession();
  }, []);

  useEffect(() => {
    if (error) showApiError(error, "개설 결과를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="개설 결과 확인 중…" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-OP-009</div>
        <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
          ✓ 가입이 완료되었습니다
        </CardTitle>
        <CardDescription>{data.product_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="rounded-md border bg-muted/30 p-4 text-center">
          <div className="text-xs text-muted-foreground">개설된 계좌</div>
          <div className="mt-1 font-mono text-lg">{data.account_no}</div>
        </section>

        <p className="text-xs text-muted-foreground">
          새 계좌는 [계좌 목록] 또는 [대시보드] 에서 바로 확인할 수 있습니다.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/accounts/${data.account_token}`}
            className={cn(buttonVariants(), "")}
          >
            계좌 보기
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "")}
          >
            대시보드
          </Link>
        </div>
        <Link
          href="/products"
          className="block text-center text-xs text-muted-foreground hover:underline"
        >
          다른 상품 보기
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-12 animate-fade-in">
        <CompleteContent token={params.accountToken} />
      </main>
    </Protected>
  );
}