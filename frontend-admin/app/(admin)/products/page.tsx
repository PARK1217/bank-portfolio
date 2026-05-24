"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtKrw, fmtNumber } from "@/lib/utils";


interface ProductListItem {
  product_id: number;
  product_name: string;
  product_type_cd: string;
  product_status_cd: string;
  special_yn: boolean;
  min_amount: number | null;
  max_amount: number | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  owner_dept: string | null;
  subscriber_count: number;
  total_balance_krw: number;
  base_rate: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  SAVING: "자유입출금",
  DEPOSIT: "정기예금",
  INSTALL: "정기적금",
  FOREIGN: "외화",
  LOAN: "대출",
};

const TYPES: { code: string; label: string }[] = [
  { code: "", label: "전체" },
  { code: "SAVING", label: "자유입출금" },
  { code: "DEPOSIT", label: "정기예금" },
  { code: "INSTALL", label: "정기적금" },
  { code: "FOREIGN", label: "외화" },
  { code: "LOAN", label: "대출" },
];

const STATUSES: { code: string; label: string }[] = [
  { code: "", label: "전체" },
  { code: "SALE", label: "판매중" },
  { code: "SUSPEND", label: "판매중지" },
  { code: "CLOSED", label: "판매종료" },
];


export default function ProductsPage() {
  const [items, setItems] = useState<ProductListItem[] | null>(null);
  const [typeCd, setTypeCd] = useState("");
  const [statusCd, setStatusCd] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    const qs = new URLSearchParams();
    if (typeCd) qs.set("type_cd", typeCd);
    if (statusCd) qs.set("status_cd", statusCd);
    const url = `/api/admin/products${qs.toString() ? `?${qs}` : ""}`;
    (async () => {
      try {
        const res = await api.get<{ items: ProductListItem[]; count: number }>(url);
        if (alive) setItems(res.items);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "상품 목록을 불러오지 못했습니다.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [typeCd, statusCd]);

  const totalSubscribers = useMemo(
    () => items?.reduce((s, x) => s + x.subscriber_count, 0) ?? 0,
    [items],
  );
  const totalBalance = useMemo(
    () => items?.reduce((s, x) => s + x.total_balance_krw, 0) ?? 0,
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">상품 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            판매 상품 카탈로그 · 가입자 · 잔액 · 판매 상태 토글
          </p>
        </div>
        {items ? (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">총 {items.length}건</div>
            <div className="num-tabular text-xl font-semibold">{fmtKrw(totalBalance)}</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="상품 수" value={fmtNumber(items?.length ?? 0)} unit="건" />
        <KpiCard label="가입자 합계" value={fmtNumber(totalSubscribers)} unit="명" />
        <KpiCard label="잔액 합계" value={fmtKrw(totalBalance)} unit="" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">상품 목록</CardTitle>
              <CardDescription>행 클릭 → 상품 상세 · 판매 상태 변경</CardDescription>
            </div>
            <div className="flex gap-2">
              <FilterSelect label="상품 종류" value={typeCd} onChange={setTypeCd} options={TYPES} />
              <FilterSelect label="판매 상태" value={statusCd} onChange={setStatusCd} options={STATUSES} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : !items ? (
            <Spinner label="불러오는 중…" />
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              해당 조건의 상품이 없습니다.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">코드</TH>
                  <TH>상품명</TH>
                  <TH>종류</TH>
                  <TH>상태</TH>
                  <TH className="text-right">기본금리</TH>
                  <TH className="text-right">가입자</TH>
                  <TH className="text-right">잔액</TH>
                  <TH>담당</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.product_id}>
                    <TD className="num-tabular font-mono text-xs text-muted-foreground">
                      {row.product_id}
                    </TD>
                    <TD>
                      <Link
                        href={`/products/${row.product_id}`}
                        className="font-medium hover:underline"
                      >
                        {row.product_name}
                      </Link>
                      {row.special_yn ? (
                        <Badge variant="primary" className="ml-2">특판</Badge>
                      ) : null}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {TYPE_LABEL[row.product_type_cd] ?? row.product_type_cd}
                    </TD>
                    <TD>
                      <StatusBadge status={row.product_status_cd} />
                    </TD>
                    <TD className="num-tabular text-right">
                      {row.base_rate != null ? `${(row.base_rate * 100).toFixed(2)}%` : "-"}
                    </TD>
                    <TD className="num-tabular text-right">
                      {fmtNumber(row.subscriber_count)}
                      <span className="text-[10px] text-muted-foreground"> 명</span>
                    </TD>
                    <TD className="num-tabular text-right">{fmtKrw(row.total_balance_krw)}</TD>
                    <TD className="text-xs text-muted-foreground">{row.owner_dept ?? "-"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function KpiCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="num-tabular text-2xl font-semibold">{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}


function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { code: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
      {label}
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}


export function StatusBadge({ status }: { status: string }) {
  if (status === "SALE") return <Badge variant="success">판매중</Badge>;
  if (status === "SUSPEND") return <Badge variant="warning">판매중지</Badge>;
  if (status === "CLOSED") return <Badge variant="muted">판매종료</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
