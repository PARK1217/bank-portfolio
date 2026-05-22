"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type OverdueDetail, type OverdueContract, type OverdueScheduleItem, ApiError } from "@/lib/api";
import { fmtDateTime, fmtKrw, fmtPercent } from "@/lib/utils";


export default function OverdueDetailPage() {
  const params = useParams<{ custNo: string }>();
  const router = useRouter();
  const custNo = parseInt(params.custNo, 10);

  const [data, setData] = useState<OverdueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!custNo) return;
    (async () => {
      try {
        const res = await api.get<OverdueDetail>(`/api/admin/customers/${custNo}/overdue`);
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "회원 연체 상세를 불러오지 못했습니다.");
      }
    })();
  }, [custNo]);

  if (!custNo) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        뒤로
      </button>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!data && !error ? <Spinner label="불러오는 중…" /> : null}

      {data ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.customer.name ?? "회원"}</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              #{data.customer.customer_no} · {data.customer.grade_cd ?? "-"} · {data.customer.status_cd ?? "-"} · {data.customer.email ?? ""}
            </p>
          </div>

          {data.contracts.map((c) => (
            <ContractCard key={c.loan_contract_no} contract={c} />
          ))}

          {data.contracts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                연체 계약이 없습니다.
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}


function ContractCard({ contract }: { contract: OverdueContract }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{contract.product_name ?? "대출"}</CardTitle>
            <CardDescription className="font-mono">
              {contract.loan_contract_no} · {contract.loan_type_cd ?? ""} · {contract.loan_status_cd ?? ""}
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge variant={contract.loan_status_cd === "OVERDUE" ? "destructive" : "muted"}>
              {contract.overdue_stage_cd ?? contract.loan_status_cd ?? "-"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
          <Pair label="계약 한도" value={fmtKrw(contract.contract_limit)} />
          <Pair label="현재 사용" value={fmtKrw(contract.current_usage)} />
          <Pair label="기본 금리" value={fmtPercent(contract.contract_rate / 100, 2)} />
          {contract.overdue_spread_rate != null ? (
            <Pair
              label="가산 금리"
              value={`+${fmtPercent(contract.overdue_spread_rate / 100, 2)}`}
              accent="destructive"
            />
          ) : null}
          <Pair label="연체 금액" value={fmtKrw(contract.overdue_amount_krw)} accent="destructive" />
          <Pair label="최장 연체일" value={`${contract.max_overdue_days}일`} accent="warning" />
          <Pair label="약정일" value={fmtDateTime(contract.contract_date)} />
          <Pair label="만기일" value={fmtDateTime(contract.maturity_date)} />
        </div>

        {contract.schedules && contract.schedules.length > 0 ? (
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">상환 스케줄</div>
            <Table>
              <THead>
                <TR>
                  <TH className="w-12">회차</TH>
                  <TH>예정일</TH>
                  <TH className="text-right">원금</TH>
                  <TH className="text-right">이자</TH>
                  <TH className="text-right">합계</TH>
                  <TH className="text-right">미납</TH>
                  <TH>상태</TH>
                </TR>
              </THead>
              <TBody>
                {contract.schedules.map((s) => (
                  <TR key={s.installment_no}>
                    <TD className="num-tabular">{s.installment_no}</TD>
                    <TD className="text-xs">{fmtDateTime(s.scheduled_date)}</TD>
                    <TD className="num-tabular text-right text-muted-foreground">{fmtKrw(s.principal_amount)}</TD>
                    <TD className="num-tabular text-right text-muted-foreground">{fmtKrw(s.interest_amount)}</TD>
                    <TD className="num-tabular text-right">{fmtKrw(s.total_amount)}</TD>
                    <TD className="num-tabular text-right">
                      {s.unpaid_amount && s.unpaid_amount > 0 ? (
                        <span className="text-destructive font-medium">{fmtKrw(s.unpaid_amount)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TD>
                    <TD>
                      <ScheduleStatusBadge status={s.status_cd} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


function Pair({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "destructive" | "warning";
}) {
  const color = accent === "destructive" ? "text-destructive" : accent === "warning" ? "text-warning" : "";
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`num-tabular text-sm font-medium ${color}`}>{value}</div>
    </div>
  );
}


function ScheduleStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">상환</Badge>;
    case "OVERDUE":
      return <Badge variant="destructive">연체</Badge>;
    case "PENDING":
      return <Badge variant="muted">예정</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}