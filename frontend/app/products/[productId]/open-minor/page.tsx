"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getProductOpenSession } from "@/lib/product-open-session";
import { showApiError } from "@/lib/toast";


/**
 * SCR-OP-008 미성년 자녀 통장 개설 ⭐.
 *
 * 어필: **친권자 위임 8권한** — 미성년 자녀(자녀 PARTY) 명의로 개설하되 친권자(현재 사용자)가
 *  조회·출금·이체·해지·한도변경·비밀번호변경·분실신고·상품개설 8개 권한을 모두 위임받음.
 *
 * 단순화 (포트폴리오):
 *  - 자녀 party_id 직접 입력 (실제는 등록 절차 별도)
 *  - 첨부 서류 mock (가족관계증명서, 자녀 기본증명서)
 */

interface OpenAccountResponse {
  account_token: string;
}

const POWERS_8: { code: string; label: string; defaultOn: boolean }[] = [
  { code: "INQUIRY",         label: "조회",            defaultOn: true },
  { code: "WITHDRAW",        label: "출금",            defaultOn: true },
  { code: "TRANSFER",        label: "이체",            defaultOn: true },
  { code: "CLOSE",           label: "해지",            defaultOn: true },
  { code: "LIMIT_CHANGE",    label: "한도 변경",       defaultOn: true },
  { code: "PASSWORD_CHANGE", label: "비밀번호 변경",   defaultOn: true },
  { code: "LOST_REPORT",     label: "분실신고",        defaultOn: true },
  { code: "PRODUCT_OPEN",    label: "추가 상품 개설",  defaultOn: true },
];


function MinorForm({ productId }: { productId: number }) {
  const router = useRouter();
  const { customerNo } = useAuth();

  // 약관 미동의 시 /terms?as=minor 로 가드 (SCR-OP-010 게이트, 변형 정보 보존).
  useEffect(() => {
    const s = getProductOpenSession();
    if (!s || s.product_id !== productId || !s.agreed_terms_at) {
      router.replace(`/products/${productId}/terms?as=minor`);
    }
  }, [productId, router]);

  const [childPartyId, setChildPartyId] = useState("");
  const [powers, setPowers] = useState<Record<string, boolean>>(() =>
    POWERS_8.reduce((m, p) => ({ ...m, [p.code]: p.defaultOn }), {}),
  );
  const [attached, setAttached] = useState<Record<string, number>>({});
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requiredDocs = ["FAMILY_RELATION_CHILD", "BIRTH_CERT", "GUARDIAN_ID"];
  const allDocsUploaded = requiredDocs.every((d) => attached[d]);

  const grantedPowers = POWERS_8.filter((p) => powers[p.code]);
  const canSubmit =
    !submitting &&
    /^\d+$/.test(childPartyId) &&
    grantedPowers.length >= 1 &&
    allDocsUploaded &&
    /^\d{4}$/.test(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || customerNo == null) return;
    setSubmitting(true);
    try {
      const res = await api.post<OpenAccountResponse>(
        `/api/products/${productId}/open-minor`,
        {
          child_party_id: parseInt(childPartyId, 10),
          guardian_customer_no: customerNo,
          delegation_power_codes: grantedPowers.map((p) => p.code),
          attachment_ids: Object.values(attached),
          consents: getProductOpenSession()?.consents ?? [],
        },
        { idempotent: true },
      );
      router.push(`/products/complete/${res.account_token}`);
    } catch (err) {
      showApiError(err, "미성년 자녀 통장 개설에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="text-xs text-muted-foreground">⭐ 친권자 위임 8권한</div>
        <CardTitle className="mt-1">미성년 자녀 통장 개설</CardTitle>
        <CardDescription>
          자녀 명의로 개설되며, 친권자(<span className="font-mono">#{customerNo ?? "-"}</span>)가 위임 권한 8종을 모두 받습니다 (선택 해제 가능).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="자녀 식별번호" required>
            <Input
              inputMode="numeric"
              placeholder="자녀의 식별번호 (숫자)"
              value={childPartyId}
              onChange={(e) => setChildPartyId(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              가족관계 사전 등록이 되어 있어야 합니다.
            </p>
          </Field>

          <section>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              친권자 위임 권한 (8종)
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {POWERS_8.map((p) => {
                const on = !!powers[p.code];
                return (
                  <li key={p.code}>
                    <button
                      type="button"
                      onClick={() => setPowers((cur) => ({ ...cur, [p.code]: !on }))}
                      className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${
                        on
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      <span className="text-[10px]">{on ? "✓" : "○"}</span>
                      <span>{p.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              위임 권한은 자녀가 성년이 되면 자동 해제됩니다.
            </p>
          </section>

          <section>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              필수 첨부 서류 <span className="text-destructive">*</span>
            </div>
            <ul className="space-y-1.5">
              {requiredDocs.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                  <span>{docLabel(d)}</span>
                  {attached[d] ? (
                    <span className="text-xs text-success">✓ 업로드</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAttached((cur) => ({ ...cur, [d]: Date.now() }))}
                    >
                      업로드
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <Field label="계좌 비밀번호 (4자리, 친권자 관리)" required>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "개설 중…" : "자녀 통장 개설"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function docLabel(code: string): string {
  switch (code) {
    case "FAMILY_RELATION_CHILD": return "가족관계증명서 (자녀 포함)";
    case "BIRTH_CERT": return "자녀 기본증명서";
    case "GUARDIAN_ID": return "친권자 신분증";
    default: return code;
  }
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
  const params = useParams<{ productId: string }>();
  const pid = parseInt(params.productId, 10);
  if (!pid) return null;
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <MinorForm productId={pid} />
      </main>
    </Protected>
  );
}