"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";


const TYPES = [
  { code: "SAVING", label: "자유입출금 (1xx)" },
  { code: "FOREIGN", label: "외화 (1xx)" },
  { code: "DEPOSIT", label: "정기예금 (2xx)" },
  { code: "INSTALL", label: "정기적금 (3xx)" },
  { code: "LOAN", label: "대출 (4xx)" },
] as const;

const STATUSES = [
  { code: "SALE", label: "판매중" },
  { code: "SUSPEND", label: "판매중지" },
  { code: "CLOSED", label: "판매종료" },
] as const;


export default function NewProductPage() {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productTypeCd, setProductTypeCd] = useState("DEPOSIT");
  const [productStatusCd, setProductStatusCd] = useState("SALE");
  const [specialYn, setSpecialYn] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [saleStartDate, setSaleStartDate] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");
  const [ownerDept, setOwnerDept] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productFeatures, setProductFeatures] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !submitting && productName.trim().length > 0 && productTypeCd && productStatusCd,
    [submitting, productName, productTypeCd, productStatusCd],
  );

  function parseAmount(v: string): number | null {
    const s = v.replace(/[^0-9]/g, "");
    if (!s) return null;
    return parseInt(s, 10);
  }

  function parseDate(v: string): string | null {
    if (!v) return null;
    return v.replace(/-/g, "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      const body: Record<string, unknown> = {
        product_name: productName.trim(),
        product_type_cd: productTypeCd,
        product_status_cd: productStatusCd,
        special_yn: specialYn,
        min_amount: parseAmount(minAmount),
        max_amount: parseAmount(maxAmount),
        sale_start_date: parseDate(saleStartDate),
        sale_end_date: parseDate(saleEndDate),
        owner_dept: ownerDept.trim() || null,
        product_desc: productDesc.trim() || null,
        product_features: productFeatures.trim() || null,
      };
      const pidNum = productId.trim() ? parseInt(productId.trim(), 10) : null;
      if (pidNum !== null) body.product_id = pidNum;

      const res = await api.post<{ product_id: number }>("/api/admin/products", body);
      router.push(`/products/${res.product_id}`);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "등록에 실패했어요.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> 상품 목록
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">새 상품 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          상품 코드는 비워두면 같은 종류의 다음 번호로 자동 발급됩니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
            <CardDescription>
              필수: 상품명 · 상품 종류 · 판매 상태. 상품 코드 자동 발급 규칙은 시드 컨벤션(1xx/2xx/3xx/4xx).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="상품 코드 (선택)">
              <Input
                inputMode="numeric"
                placeholder="비우면 자동 발급"
                maxLength={5}
                value={productId}
                onChange={(e) => setProductId(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>
            <Field label="담당 부서">
              <Input
                placeholder="예: 여신정책팀"
                maxLength={50}
                value={ownerDept}
                onChange={(e) => setOwnerDept(e.target.value)}
              />
            </Field>
            <Field label="상품명 *" className="md:col-span-2">
              <Input
                placeholder="예: 다온뱅크 자유적립식 적금"
                maxLength={80}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </Field>
            <Field label="상품 종류 *">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={productTypeCd}
                onChange={(e) => setProductTypeCd(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="판매 상태 *">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={productStatusCd}
                onChange={(e) => setProductStatusCd(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="특판 상품" className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={specialYn}
                  onChange={(e) => setSpecialYn(e.target.checked)}
                />
                특판 배지 노출
              </label>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">금액 한도</CardTitle>
            <CardDescription>비우면 한도 없음으로 등록됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="최소 금액 (원)">
              <Input
                inputMode="numeric"
                placeholder="예: 1,000,000"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </Field>
            <Field label="최대 금액 (원)">
              <Input
                inputMode="numeric"
                placeholder="예: 50,000,000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">판매 기간</CardTitle>
            <CardDescription>비우면 무기한 판매로 처리됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="판매 시작일">
              <Input
                type="date"
                value={saleStartDate}
                onChange={(e) => setSaleStartDate(e.target.value)}
              />
            </Field>
            <Field label="판매 종료일">
              <Input
                type="date"
                value={saleEndDate}
                onChange={(e) => setSaleEndDate(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">상품 설명</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="대표 특징 (한 줄)">
              <Input
                placeholder="예: 자유 적립 · 최대 4% 우대 · 가입 후 30일 내 해지 수수료 면제"
                maxLength={500}
                value={productFeatures}
                onChange={(e) => setProductFeatures(e.target.value)}
              />
            </Field>
            <Field label="상품 상세 설명">
              <textarea
                className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="가입 대상·금리 구조·우대조건·중도해지 정책 등"
                maxLength={4000}
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            등록 후 기간별 금리·우대조건·약관 매핑은 별도 운영 도구에서 보강하세요.
          </div>
          <div className="flex items-center gap-3">
            {errMsg ? (
              <span className="text-sm text-destructive">{errMsg}</span>
            ) : null}
            <Link href="/products">
              <Button type="button" variant="outline" disabled={submitting}>
                취소
              </Button>
            </Link>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "등록 중…" : "상품 등록"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}


function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
