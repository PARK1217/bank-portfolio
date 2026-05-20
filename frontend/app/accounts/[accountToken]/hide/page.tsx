"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-AC-007 계좌 숨김 설정. */

interface AccountDetail {
  account: { hidden: boolean; alias: string | null; account_no: string };
}


export default function Page() {
  const params = useParams<{ accountToken: string }>();
  const router = useRouter();
  const { data, loading, refetch } = useFetch<AccountDetail>(`/api/accounts/${params.accountToken}`);
  const [submitting, setSubmitting] = useState(false);

  async function toggle(hidden: boolean) {
    setSubmitting(true);
    try {
      await api.patch(`/api/accounts/${params.accountToken}/hide`, { hidden });
      toast.success(hidden ? "계좌가 숨김 처리되었습니다." : "계좌 숨김이 해제되었습니다.");
      void refetch();
    } catch (err) {
      showApiError(err, "설정 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href={`/accounts/${params.accountToken}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← 계좌 상세
          </Link>
        </div>
        <Card>
          <CardHeader>
            <div className="font-mono text-xs text-muted-foreground">SCR-AC-007</div>
            <CardTitle className="mt-1">계좌 숨김 설정</CardTitle>
            <CardDescription>
              숨김 처리된 계좌는 목록·대시보드에서 보이지 않습니다. 거래 이력은 그대로 유지되며 언제든 다시 표시할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Spinner label="상태 확인 중…" />
            ) : !data ? null : (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="font-medium">{data.account.alias ?? "(별명 없음)"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{data.account.account_no}</div>
                  <div className="mt-2 text-xs">
                    현재 상태:{" "}
                    {data.account.hidden ? (
                      <span className="font-semibold text-warning">숨김</span>
                    ) : (
                      <span className="font-semibold text-success">표시 중</span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant={data.account.hidden ? "default" : "destructive"}
                  className="w-full"
                  onClick={() => toggle(!data.account.hidden)}
                  disabled={submitting}
                >
                  {submitting ? "처리 중…" : data.account.hidden ? "숨김 해제" : "이 계좌 숨기기"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Protected>
  );
}