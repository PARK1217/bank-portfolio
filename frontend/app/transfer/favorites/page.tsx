"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/** SCR-TR-004 자주 쓰는 계좌 — FREQUENT_ACCOUNT (v53 신규). 사용 횟수 정렬, UNIQUE(고객+은행+계좌). */

interface FavoriteItem {
  id: number;
  alias: string;
  bank_cd: string;
  masked_account_no: string;
  account_holder_name: string;
  use_count: number;
  last_used_at: string | null;
}

interface FavoriteListResponse {
  items: FavoriteItem[];
}

const BANKS: { code: string; name: string }[] = [
  { code: "020", name: "본행" },
  { code: "004", name: "KB국민" },
  { code: "088", name: "신한" },
  { code: "081", name: "하나" },
  { code: "011", name: "농협" },
  { code: "003", name: "IBK기업" },
  { code: "090", name: "카카오뱅크" },
  { code: "089", name: "케이뱅크" },
  { code: "092", name: "토스뱅크" },
];

function bankName(code: string): string {
  return BANKS.find((b) => b.code === code)?.name ?? code;
}


function FavoritesContent() {
  const router = useRouter();
  const { data, error, loading, refetch } = useFetch<FavoriteListResponse>("/api/transfer/favorites");

  const [alias, setAlias] = useState("");
  const [bank, setBank] = useState("020");
  const [accountNo, setAccountNo] = useState("");
  const [holder, setHolder] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) showApiError(error, "자주 쓰는 계좌를 불러오지 못했습니다.");
  }, [error]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !alias || !accountNo || !holder) return;
    setSubmitting(true);
    try {
      await api.post("/api/transfer/favorites", {
        alias,
        bank_cd: bank,
        account_no: accountNo,
        account_holder_name: holder,
      });
      setAlias("");
      setAccountNo("");
      setHolder("");
      void refetch();
    } catch (err) {
      showApiError(err, "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("이 계좌를 자주 쓰는 계좌에서 삭제할까요?")) return;
    try {
      await api.delete(`/api/transfer/favorites/${id}`);
      void refetch();
    } catch (err) {
      showApiError(err, "삭제에 실패했습니다.");
    }
  }

  function onTransfer(fav: FavoriteItem) {
    const qs = new URLSearchParams({
      to_bank: fav.bank_cd,
      to_account: fav.masked_account_no.replace(/\*/g, ""),
      to_holder: fav.account_holder_name,
    });
    router.push(`/transfer?${qs.toString()}`);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">자주 쓰는 계좌 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="space-y-3">
            <Field label="별칭" required>
              <Input
                placeholder="예: 엄마, 월세"
                maxLength={50}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <Field label="은행" required>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                >
                  {BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="계좌번호" required>
                <Input
                  inputMode="numeric"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value.replace(/[^0-9-]/g, ""))}
                  required
                />
              </Field>
            </div>
            <Field label="예금주" required>
              <Input
                maxLength={20}
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "등록 중…" : "추가"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold">목록</h2>
        {loading && !data ? (
          <Spinner label="불러오는 중…" />
        ) : !data || data.items.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            등록된 자주 쓰는 계좌가 없습니다.
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {data.items.map((f) => (
              <li key={f.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{f.alias}</div>
                  <div className="text-xs text-muted-foreground">
                    {bankName(f.bank_cd)} {f.masked_account_no} · {f.account_holder_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    사용 {f.use_count}회
                  </div>
                </div>
                <Button size="sm" onClick={() => onTransfer(f)}>
                  이체
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(f.id)}>
                  삭제
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export default function Page() {
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">자주 쓰는 계좌</h1>
          <p className="text-xs text-muted-foreground">자주 이체하는 계좌를 등록하여 빠르게 이체합니다.</p>
        </div>
        <FavoritesContent />
      </main>
    </Protected>
  );
}