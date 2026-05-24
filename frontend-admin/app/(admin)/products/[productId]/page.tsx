"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { fmtKrw, fmtNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/product-status-badge";
import {
  bonusTypeLabel,
  interestCycleLabel,
  maturityPolicyLabel,
  targetCustomerLabel,
} from "@/lib/labels";


interface ProductDetail {
  product: {
    product_id: number;
    product_name: string;
    product_type_cd: string;
    product_status_cd: string;
    special_yn: boolean;
    prepay_defer_yn: boolean;
    early_close_yn: boolean;
    extend_yn: boolean;
    min_age: number | null;
    max_age: number | null;
    maturity_policy_cd: string | null;
    target_customer_cd: string | null;
    min_amount: number | null;
    max_amount: number | null;
    min_monthly_amt: number | null;
    max_monthly_amt: number | null;
    interest_cycle_cd: string | null;
    launch_date: string | null;
    sale_start_date: string | null;
    sale_end_date: string | null;
    product_desc: string | null;
    product_features: string | null;
    owner_dept: string | null;
    remark: string | null;
    penalty_rate: number | null;
  };
  live_subscriber_count: number;
  live_total_balance_krw: number;
  periods: { period_seq: number; min_months: number; max_months: number; apply_rate: number | null }[];
  rates: { rate_seq: number; tier_min_amount: number; apply_rate: number | null }[];
  bonuses: { bonus_seq: number; bonus_type_cd: string; condition_desc: string; bonus_rate: number | null }[];
  terms: { terms_id: number; version: number; terms_name: string; agree_required_yn: boolean }[];
}


const TYPE_LABEL: Record<string, string> = {
  SAVING: "자유입출금",
  DEPOSIT: "정기예금",
  INSTALL: "정기적금",
  FOREIGN: "외화",
  LOAN: "대출",
};


export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const productId = parseInt(params.productId, 10);
  const [data, setData] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function refetch() {
    setData(null);
    setError(null);
    try {
      const res = await api.get<ProductDetail>(`/api/admin/products/${productId}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "상품을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setError("잘못된 상품 코드입니다.");
      return;
    }
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function changeStatus(newStatus: string) {
    if (updating || !data) return;
    if (data.product.product_status_cd === newStatus) return;
    if (!window.confirm(`판매 상태를 [${labelOf(newStatus)}]로 변경할까요?`)) return;
    setUpdating(true);
    setActionMsg(null);
    try {
      await api.patch(`/api/admin/products/${productId}/status`, { new_status: newStatus });
      setActionMsg({ kind: "ok", text: `판매 상태가 [${labelOf(newStatus)}]로 변경되었습니다.` });
      await refetch();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "상태 변경에 실패했습니다.";
      setActionMsg({ kind: "err", text: msg });
    } finally {
      setUpdating(false);
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

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : !data ? (
        <Spinner label="불러오는 중…" />
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-xs text-muted-foreground">#{data.product.product_id}</div>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
                {data.product.product_name}
                {data.product.special_yn ? (
                  <Badge variant="primary" className="ml-2 align-middle">특판</Badge>
                ) : null}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{TYPE_LABEL[data.product.product_type_cd] ?? data.product.product_type_cd}</span>
                <span>·</span>
                <span>담당 {data.product.owner_dept ?? "-"}</span>
              </div>
            </div>
            <StatusBadge status={data.product.product_status_cd} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard label="가입자 (실시간)" value={fmtNumber(data.live_subscriber_count)} unit="명" />
            <KpiCard label="잔액 (실시간)" value={fmtKrw(data.live_total_balance_krw)} unit="" />
            <KpiCard
              label="기본금리"
              value={data.rates[0]?.apply_rate != null ? `${(data.rates[0].apply_rate * 100).toFixed(2)}` : "-"}
              unit={data.rates[0]?.apply_rate != null ? "%" : ""}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">판매 상태 변경</CardTitle>
              <CardDescription>
                상태 변경은 ADMIN_AUDIT_LOG 에 자동 기록됩니다 ·{" "}
                {data.product.product_status_cd === "SALE"
                  ? "현재 판매중이라 SUSPEND/CLOSED 로 전환 가능"
                  : "현재 비활성 — SALE 로 재개하거나 CLOSED 처리"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <StatusActionButton
                  current={data.product.product_status_cd}
                  target="SALE"
                  disabled={updating}
                  onClick={() => void changeStatus("SALE")}
                />
                <StatusActionButton
                  current={data.product.product_status_cd}
                  target="SUSPEND"
                  disabled={updating}
                  onClick={() => void changeStatus("SUSPEND")}
                />
                <StatusActionButton
                  current={data.product.product_status_cd}
                  target="CLOSED"
                  disabled={updating}
                  onClick={() => void changeStatus("CLOSED")}
                />
              </div>
              {actionMsg ? (
                <div
                  className={
                    actionMsg.kind === "ok"
                      ? "mt-3 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-sm text-success"
                      : "mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  }
                >
                  {actionMsg.text}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기본 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DescPair label="출시일" value={fmtYyyymmdd(data.product.launch_date)} />
                  <DescPair label="판매 시작" value={fmtYyyymmdd(data.product.sale_start_date)} />
                  <DescPair label="판매 종료" value={fmtYyyymmdd(data.product.sale_end_date)} />
                  <DescPair label="이자 주기" value={interestCycleLabel(data.product.interest_cycle_cd)} />
                  <DescPair label="대상 고객" value={targetCustomerLabel(data.product.target_customer_cd)} />
                  <DescPair label="만기 정책" value={maturityPolicyLabel(data.product.maturity_policy_cd)} />
                  <DescPair
                    label="가입 가능 연령"
                    value={
                      data.product.min_age != null || data.product.max_age != null
                        ? `${data.product.min_age ?? 0} ~ ${data.product.max_age ?? "-"}세`
                        : "-"
                    }
                  />
                  <DescPair
                    label="금액 한도"
                    value={
                      data.product.min_amount != null || data.product.max_amount != null
                        ? `${fmtKrw(data.product.min_amount ?? 0)} ~ ${fmtKrw(data.product.max_amount ?? 0)}`
                        : "-"
                    }
                  />
                  <DescPair label="중도해지 가능" value={data.product.early_close_yn ? "가능" : "불가"} />
                  <DescPair
                    label="중도 해지 수수료율"
                    value={
                      data.product.penalty_rate != null
                        ? `${(data.product.penalty_rate * 100).toFixed(2)}%`
                        : "-"
                    }
                  />
                </dl>
                {data.product.product_desc ? (
                  <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                    {data.product.product_desc}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">기간별 금리 ({data.periods.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.periods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">등록된 기간이 없습니다.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>구간</TH>
                        <TH className="text-right">최소 (월)</TH>
                        <TH className="text-right">최대 (월)</TH>
                        <TH className="text-right">금리</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.periods.map((p) => (
                        <TR key={p.period_seq}>
                          <TD className="num-tabular text-xs text-muted-foreground">{p.period_seq}</TD>
                          <TD className="num-tabular text-right">{p.min_months}</TD>
                          <TD className="num-tabular text-right">{p.max_months || "-"}</TD>
                          <TD className="num-tabular text-right">
                            {p.apply_rate != null ? `${(p.apply_rate * 100).toFixed(2)}%` : "-"}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">금액별 금리 ({data.rates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.rates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">등록된 금액 구간이 없습니다.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>구간</TH>
                        <TH className="text-right">최소 금액</TH>
                        <TH className="text-right">적용 금리</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.rates.map((r) => (
                        <TR key={r.rate_seq}>
                          <TD className="num-tabular text-xs text-muted-foreground">{r.rate_seq}</TD>
                          <TD className="num-tabular text-right">{fmtKrw(r.tier_min_amount)}</TD>
                          <TD className="num-tabular text-right">
                            {r.apply_rate != null ? `${(r.apply_rate * 100).toFixed(2)}%` : "-"}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">우대조건 ({data.bonuses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.bonuses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">등록된 우대조건이 없습니다.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.bonuses.map((b) => (
                      <li key={b.bonus_seq} className="rounded-md border bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{bonusTypeLabel(b.bonus_type_cd)}</span>
                          <span className="num-tabular text-xs font-medium text-success">
                            +{b.bonus_rate != null ? `${(b.bonus_rate * 100).toFixed(2)}%` : "-"}
                          </span>
                        </div>
                        <p className="mt-0.5">{b.condition_desc}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">연관 약관 ({data.terms.length})</CardTitle>
                <CardDescription>가입 시 동의가 필요한 약관 목록</CardDescription>
              </CardHeader>
              <CardContent>
                {data.terms.length === 0 ? (
                  <p className="text-xs text-muted-foreground">매핑된 약관이 없습니다.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>약관</TH>
                        <TH>버전</TH>
                        <TH>필수</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.terms.map((t) => (
                        <TR key={t.terms_id}>
                          <TD className="font-medium">{t.terms_name}</TD>
                          <TD className="num-tabular text-xs text-muted-foreground">v{t.version}</TD>
                          <TD>
                            {t.agree_required_yn ? (
                              <Badge variant="primary">필수</Badge>
                            ) : (
                              <Badge variant="muted">선택</Badge>
                            )}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}


function labelOf(status: string): string {
  if (status === "SALE") return "판매중";
  if (status === "SUSPEND") return "판매중지";
  if (status === "CLOSED") return "판매종료";
  return status;
}


function StatusActionButton({
  current,
  target,
  disabled,
  onClick,
}: {
  current: string;
  target: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const isCurrent = current === target;
  return (
    <Button
      variant={isCurrent ? "outline" : "default"}
      disabled={disabled || isCurrent}
      onClick={onClick}
      className="min-w-[100px]"
    >
      {isCurrent ? `${labelOf(target)} (현재)` : `→ ${labelOf(target)}`}
    </Button>
  );
}


function KpiCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="num-tabular text-2xl font-semibold">{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}


function DescPair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </>
  );
}


function fmtYyyymmdd(s: string | null): string {
  if (!s || s.length < 8) return "-";
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}
