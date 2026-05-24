"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";
import { accountTypeLabel } from "@/lib/labels";


/** SCR-AC-006 계좌 별명 변경. */

interface AccountDetail {
  account: {
    account_token: string;
    alias: string | null;
    account_type_cd: string;
    account_no: string;
  };
}


function EditForm({ token }: { token: string }) {
  const router = useRouter();
  const { data, loading } = useFetch<AccountDetail>(`/api/accounts/${token}`);
  const [alias, setAlias] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data?.account) setAlias(data.account.alias ?? "");
  }, [data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/accounts/${token}`, { alias: alias.trim() || null });
      toast.success("별명이 변경되었습니다.");
      router.push(`/accounts/${token}`);
    } catch (err) {
      showApiError(err, "별명 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <Spinner label="계좌 정보 불러오는 중…" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mt-1">별명 변경</CardTitle>
        <CardDescription>
          {accountTypeLabel(data.account.account_type_cd)} · <span className="font-mono">{data.account.account_no}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">새 별명 (비워두면 기본 표시)</span>
            <Input
              maxLength={50}
              placeholder="예: 비상금, 월급통장"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={submitting}
            />
            <p className="text-[10px] text-muted-foreground">최대 50자. 본인에게만 표시됩니다.</p>
          </label>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "변경 중…" : "별명 저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <Link href={`/accounts/${params.accountToken}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← 계좌 상세
          </Link>
        </div>
        <EditForm token={params.accountToken} />
      </main>
    </Protected>
  );
}