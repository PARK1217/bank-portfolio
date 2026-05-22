"use client";

import { useEffect, useMemo, useState } from "react";
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
 * SCR-OP-006 공동명의 통장 개설 ⭐.
 *
 * 어필: **Party-Role 패턴** — 계약참여자 N행 (본인 OWNER + 공동명의자 JOINT_OWNER) + 위임관계.
 *
 * 단순화 (포트폴리오):
 *  - 공동명의자 lookup UI 없이 customer_no 직접 입력 (DB 세션이 시드로 매칭)
 *  - 첨부 서류 업로드 mock (가족관계증명서·신분증 등)
 */

interface OpenAccountResponse {
  account_token: string;
}

const DELEGATION_POWERS: { code: string; label: string }[] = [
  { code: "INQUIRY", label: "조회" },
  { code: "WITHDRAW", label: "출금" },
  { code: "TRANSFER", label: "이체" },
  { code: "CLOSE", label: "해지" },
  { code: "LIMIT_CHANGE", label: "한도 변경" },
];


function JointForm({ productId }: { productId: number }) {
  const router = useRouter();
  const { customerNo } = useAuth();

  // 약관 미동의 시 /terms?as=joint 로 가드 (SCR-OP-010 게이트, 변형 정보 보존).
  useEffect(() => {
    const s = getProductOpenSession();
    if (!s || s.product_id !== productId || !s.agreed_terms_at) {
      router.replace(`/products/${productId}/terms?as=joint`);
    }
  }, [productId, router]);

  const [alias, setAlias] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("0");
  const [coOwners, setCoOwners] = useState<{ customer_no: string; powers: Record<string, boolean> }[]>([
    { customer_no: "", powers: { INQUIRY: true, WITHDRAW: true } },
  ]);
  const [attached, setAttached] = useState<Record<string, number>>({});
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const krw = useMemo(() => new Intl.NumberFormat("ko-KR"), []);
  const initialN = parseInt(initialDeposit.replace(/[^0-9]/g, ""), 10) || 0;

  function addOwner() {
    setCoOwners((cur) => [...cur, { customer_no: "", powers: { INQUIRY: true } }]);
  }
  function removeOwner(i: number) {
    setCoOwners((cur) => cur.filter((_, idx) => idx !== i));
  }
  function patchOwner(i: number, key: "customer_no" | "powers", value: unknown) {
    setCoOwners((cur) =>
      cur.map((o, idx) =>
        idx === i ? { ...o, [key]: value as never } : o,
      ),
    );
  }

  const requiredDocs = ["FAMILY_RELATION", "ID_FRONT_OWNER", "ID_FRONT_JOINT"];
  const allDocsUploaded = requiredDocs.every((d) => attached[d]);
  const validOwners = coOwners.every((o) => /^\d+$/.test(o.customer_no));
  const canSubmit =
    !submitting &&
    validOwners &&
    coOwners.length > 0 &&
    allDocsUploaded &&
    /^\d{4}$/.test(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<OpenAccountResponse>(
        `/api/products/${productId}/open-joint`,
        {
          alias: alias || null,
          initial_deposit_krw: initialN,
          co_owners: coOwners.map((o) => ({
            customer_no: parseInt(o.customer_no, 10),
            role_cd: "JOINT_OWNER",
            delegation_power_codes: Object.keys(o.powers).filter((k) => o.powers[k]),
          })),
          attachment_ids: Object.values(attached),
        },
        { idempotent: true },
      );
      router.push(`/products/complete/${res.account_token}`);
    } catch (err) {
      showApiError(err, "공동명의 개설에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="font-mono text-xs text-muted-foreground">SCR-OP-006 ⭐ Party-Role</div>
        <CardTitle className="mt-1">공동명의 통장 개설</CardTitle>
        <CardDescription>
          본인(<span className="font-mono">#{customerNo ?? "-"}</span>, OWNER) + 공동명의자 N명 (JOINT_OWNER). 위임 권한도 명의자별로 설정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="통장 별명 (선택)">
            <Input
              maxLength={50}
              placeholder="예: 부부 공동 통장"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </Field>
          <Field label="초기 입금 금액 (선택)">
            <Input
              inputMode="numeric"
              value={initialDeposit && initialN > 0 ? krw.format(initialN) : initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
            />
          </Field>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                공동명의자 추가 <span className="text-destructive">*</span>
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addOwner}>
                + 명의자
              </Button>
            </div>
            <ul className="space-y-3">
              {coOwners.map((o, i) => (
                <li key={i} className="rounded-md border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">고객 #</span>
                    <Input
                      inputMode="numeric"
                      placeholder="공동명의자 고객번호"
                      value={o.customer_no}
                      onChange={(e) => patchOwner(i, "customer_no", e.target.value.replace(/[^0-9]/g, ""))}
                      className="h-8 flex-1"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeOwner(i)}>
                      삭제
                    </Button>
                  </div>
                  <div className="mt-2">
                    <div className="text-[10px] text-muted-foreground">위임 권한</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {DELEGATION_POWERS.map((p) => {
                        const on = !!o.powers[p.code];
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() =>
                              patchOwner(i, "powers", { ...o.powers, [p.code]: !on })
                            }
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-background hover:bg-accent"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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

          <Field label="계좌 비밀번호 (4자리)" required>
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
            {submitting ? "개설 중…" : "공동명의 통장 개설"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function docLabel(code: string): string {
  switch (code) {
    case "FAMILY_RELATION": return "가족관계증명서";
    case "ID_FRONT_OWNER": return "본인 신분증";
    case "ID_FRONT_JOINT": return "공동명의자 신분증";
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
        <JointForm productId={pid} />
      </main>
    </Protected>
  );
}