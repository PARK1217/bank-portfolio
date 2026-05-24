"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  ApiError,
  type RepaymentDetailResponse,
  type RepaymentScheduleRow,
  type RepaymentHistoryRow,
  type LoanExecHistoryRow,
} from "@/lib/api";
import { decodeId, encodeId, fmtDateTime, fmtKrw, fmtNumber, fmtPercent } from "@/lib/utils";
import {
  execChannelLabel,
  loanStatusLabel,
  loanTypeLabel,
  overdueStageLabel,
  repayMethodLabel,
  repayStatusLabel,
  repayTypeLabel,
  scheduleStatusLabel,
  txChannelLabel,
} from "@/lib/labels";


export default function RepaymentDetailPage() {
  const params = useParams<{ loanContractNo: string }>();
  const router = useRouter();
  const contractNo = (() => {
    if (!params.loanContractNo) return "";
    try {
      return decodeId(params.loanContractNo);
    } catch {
      return params.loanContractNo;
    }
  })();

  const [data, setData] = useState<RepaymentDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractNo) return;
    (async () => {
      try {
        const res = await api.get<RepaymentDetailResponse>(
          `/api/admin/loans/repayments/${encodeURIComponent(contractNo)}`,
        );
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "상환 상세를 불러오지 못했습니다.");
      }
    })();
  }, [contractNo]);

  if (!contractNo) return null;

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
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.contract.product_name ?? "대출 상환 상세"}
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                계약 #{data.contract.loan_contract_no}
                {data.contract.customer_no != null ? (
                  <>
                    {" · "}
                    <Link
                      href={`/customers/${encodeId(data.contract.customer_no)}`}
                      className="hover:underline"
                    >
                      회원 #{data.contract.customer_no} ({data.contract.customer_name ?? "-"})
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={data.contract.loan_status_cd === "OVERDUE" ? "destructive" : "success"}>
                {loanStatusLabel(data.contract.loan_status_cd)}
              </Badge>
              {data.contract.overdue_stage_cd ? (
                <Badge variant="warning">
                  {overdueStageLabel(data.contract.overdue_stage_cd)}
                </Badge>
              ) : null}
            </div>
          </div>

          {/* 계약 요약 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">계약 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="상품" value={data.contract.product_name ?? "-"} />
                <Pair
                  label="대출 유형"
                  value={loanTypeLabel(data.contract.loan_type_cd)}
                />
                <Pair
                  label="상환 방식"
                  value={repayMethodLabel(data.contract.repay_method_cd)}
                />
                <Pair
                  label="금리"
                  value={
                    <>
                      {fmtPercent((data.contract.contract_rate || 0) / 100, 2)}
                      {data.contract.overdue_spread_rate ? (
                        <span className="ml-1 text-[10px] text-destructive">
                          +{fmtPercent((data.contract.overdue_spread_rate || 0) / 100, 2)}
                        </span>
                      ) : null}
                    </>
                  }
                />
                <Pair label="한도" value={fmtKrw(data.contract.contract_limit)} />
                <Pair label="현재 사용" value={fmtKrw(data.contract.current_usage)} />
                <Pair label="약정일" value={fmtDateTime(data.contract.contract_date)} />
                <Pair label="만기일" value={fmtDateTime(data.contract.maturity_date)} />
                <Pair label="대출 계좌" value={data.contract.loan_account_no ?? "-"} />
                <Pair
                  label="주거래 계좌"
                  value={data.contract.main_deposit_account_no ?? "-"}
                />
              </dl>
            </CardContent>
          </Card>

          {/* 상환 합계 KPI */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi
              label="누적 원금"
              value={fmtKrw(data.summary.paid_principal_krw)}
              color="text-success"
            />
            <Kpi
              label="누적 정상이자"
              value={fmtKrw(data.summary.paid_normal_interest_krw)}
              color="text-foreground"
            />
            <Kpi
              label="누적 연체이자"
              value={fmtKrw(data.summary.paid_overdue_interest_krw)}
              color={data.summary.paid_overdue_interest_krw > 0 ? "text-destructive" : "text-muted-foreground"}
            />
            <Kpi
              label="누적 합계"
              value={fmtKrw(data.summary.paid_total_krw)}
              color="text-primary"
            />
            <Kpi
              label="회차 진행"
              value={`${data.summary.installments_done} / ${data.summary.installments_total}`}
              color="text-foreground"
            />
            <Kpi
              label="잔여 예정 합계"
              value={fmtKrw(data.summary.scheduled_remaining_krw)}
              color="text-foreground"
            />
            <Kpi
              label="연체 회차"
              value={fmtNumber(data.summary.overdue_count)}
              unit="건"
              color={data.summary.overdue_count > 0 ? "text-destructive" : "text-muted-foreground"}
            />
            <Kpi
              label="최장 연체일"
              value={fmtNumber(data.summary.max_overdue_days)}
              unit="일"
              color={data.summary.max_overdue_days > 0 ? "text-warning" : "text-muted-foreground"}
            />
          </div>

          {/* 자금 실행 이력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">자금 실행 이력</CardTitle>
              <CardDescription>
                {data.executions.length}건 — LOAN_EXEC_HISTORY (실행/취소 + 채널·담당자)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.executions.length === 0 ? (
                <p className="text-xs text-muted-foreground">실행 이력이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="text-right">SEQ</TH>
                        <TH>일시</TH>
                        <TH>구분</TH>
                        <TH className="text-right">금액</TH>
                        <TH className="text-right">실행 후 잔액</TH>
                        <TH>입금 계좌</TH>
                        <TH>채널</TH>
                        <TH>담당자</TH>
                        <TH>취소</TH>
                        <TH>비고</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.executions.map((e) => (
                        <ExecRow key={e.exec_seq} e={e} />
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 회차별 통합 — 예정 vs 실제 한 행에 매핑 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">회차별 상환 현황</CardTitle>
              <CardDescription>
                {data.schedules.length}회차 — 좌측 예정(스케줄) · 우측 실제 상환(매칭된 이력)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.schedules.length === 0 ? (
                <p className="text-xs text-muted-foreground">스케줄이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="text-right">회차</TH>
                        <TH>예정일</TH>
                        <TH className="text-right">예정 원금</TH>
                        <TH className="text-right">예정 이자</TH>
                        <TH className="text-right">예정 합계</TH>
                        <TH>상태</TH>
                        <TH className="text-right">연체일</TH>
                        <TH className="border-l">실제 상환일</TH>
                        <TH className="text-right">실제 원금</TH>
                        <TH className="text-right">실제 이자</TH>
                        <TH className="text-right">실제 합계</TH>
                        <TH>채널</TH>
                        <TH>적용</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.schedules.map((s) => {
                        // 1차: SCHEDULE.actual_repay_id ↔ HISTORY.repay_seq (PK) 직접 매핑.
                        // 2차 폴백: HISTORY.schedule_ref ↔ SCHEDULE.installment_no — 시드 데이터처럼
                        // SCHEDULE.actual_repay_id 가 NULL 이지만 HISTORY 쪽이 회차를 가리키는 경우.
                        const h =
                          data.history.find((h) => h.repay_seq === s.actual_repay_id) ??
                          data.history.find(
                            (h) => h.schedule_ref === s.installment_no && h.repay_status_cd === "OK",
                          ) ??
                          null;
                        return <CombinedRow key={s.installment_no} s={s} h={h} />;
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 매칭 안 된 잔여 이력 (취소·중도상환 등 회차 외 처리) */}
          {(() => {
            // 양방향 매칭 — actual_repay_id 또는 schedule_ref 로 회차에 묶인 것 제외.
            const installmentSet = new Set(data.schedules.map((s) => s.installment_no));
            const matchedRepaySeqs = new Set(
              data.schedules.map((s) => s.actual_repay_id).filter((v): v is number => v != null),
            );
            const orphan = data.history.filter(
              (h) =>
                !matchedRepaySeqs.has(h.repay_seq) &&
                !(h.repay_status_cd === "OK" && h.schedule_ref != null && installmentSet.has(h.schedule_ref)),
            );
            if (orphan.length === 0) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">회차 외 상환 / 취소</CardTitle>
                  <CardDescription>
                    {orphan.length}건 — 회차에 매칭되지 않은 중도상환 · 정정 · 취소 거래
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <THead>
                        <TR>
                          <TH className="text-right">SEQ</TH>
                          <TH>일시</TH>
                          <TH>구분</TH>
                          <TH>채널</TH>
                          <TH className="text-right">원금</TH>
                          <TH className="text-right">정상이자</TH>
                          <TH className="text-right">연체이자</TH>
                          <TH>상태</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {orphan.map((h) => (
                          <OrphanHistoryRow key={h.repay_seq} h={h} />
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      ) : null}
    </div>
  );
}


function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num-tabular text-sm font-medium">{value}</div>
    </div>
  );
}


function Kpi({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <Wallet className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`num-tabular text-lg font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-[10px] text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}


function CombinedRow({
  s,
  h,
}: {
  s: RepaymentScheduleRow;
  h: RepaymentHistoryRow | null;
}) {
  const actualTotal = h
    ? h.repay_principal + h.repay_normal_interest + h.repay_overdue_interest
    : 0;
  const actualInterest = h
    ? h.repay_normal_interest + h.repay_overdue_interest
    : 0;

  return (
    <TR>
      {/* 예정 (스케줄) */}
      <TD className="num-tabular text-right font-medium">{s.installment_no}</TD>
      <TD className="text-xs">{fmtDateTime(s.scheduled_date)}</TD>
      <TD className="num-tabular text-right">{fmtKrw(s.scheduled_principal)}</TD>
      <TD className="num-tabular text-right text-muted-foreground">{fmtKrw(s.scheduled_interest)}</TD>
      <TD className="num-tabular text-right font-semibold">{fmtKrw(s.scheduled_total)}</TD>
      <TD>
        <ScheduleStatusBadge cd={s.status_cd} />
      </TD>
      <TD className="num-tabular text-right">
        {s.days_overdue != null && s.days_overdue > 0 ? (
          <span className="font-semibold text-destructive">{s.days_overdue}일</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      {/* 실제 (이력 매칭) — 구분 위해 left border */}
      <TD className="border-l text-xs">
        {h ? fmtDateTime(h.repay_datetime) : <span className="text-muted-foreground">-</span>}
      </TD>
      <TD className="num-tabular text-right">
        {h ? fmtKrw(h.repay_principal) : <span className="text-muted-foreground">-</span>}
      </TD>
      <TD className="num-tabular text-right">
        {h ? (
          <>
            <span className="text-muted-foreground">{fmtKrw(h.repay_normal_interest)}</span>
            {h.repay_overdue_interest > 0 ? (
              <div className="text-[10px] text-destructive">+{fmtKrw(h.repay_overdue_interest)} 연체</div>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD className="num-tabular text-right font-semibold">
        {h ? fmtKrw(actualTotal) : <span className="text-muted-foreground">-</span>}
      </TD>
      <TD className="text-xs">
        {h ? txChannelLabel(h.channel_cd) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD>
        {h ? <HistoryStatusBadge cd={h.repay_status_cd} /> : <Badge variant="muted">미상환</Badge>}
      </TD>
    </TR>
  );
}


function OrphanHistoryRow({ h }: { h: RepaymentHistoryRow }) {
  return (
    <TR>
      <TD className="num-tabular text-right font-medium">{h.repay_seq}</TD>
      <TD className="text-xs">{fmtDateTime(h.repay_datetime)}</TD>
      <TD>
        <RepayTypeBadge cd={h.repay_type_cd} />
      </TD>
      <TD className="text-xs">{txChannelLabel(h.channel_cd)}</TD>
      <TD className="num-tabular text-right">{fmtKrw(h.repay_principal)}</TD>
      <TD className="num-tabular text-right text-muted-foreground">
        {fmtKrw(h.repay_normal_interest)}
      </TD>
      <TD className="num-tabular text-right">
        {h.repay_overdue_interest > 0 ? (
          <span className="text-destructive">{fmtKrw(h.repay_overdue_interest)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TD>
      <TD>
        <HistoryStatusBadge cd={h.repay_status_cd} />
      </TD>
    </TR>
  );
}


function ScheduleStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "primary" | "warning" | "destructive" | "muted"> = {
    PAID: "success",
    WAITING: "muted",
    PENDING: "primary",
    OVERDUE: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{scheduleStatusLabel(cd)}</Badge>;
}


function HistoryStatusBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "destructive" | "muted"> = {
    OK: "success",
    CANCEL: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{repayStatusLabel(cd)}</Badge>;
}


function RepayTypeBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "primary" | "destructive" | "muted"> = {
    SCHEDULE: "success",
    PREPAY: "primary",
    OVERDUE: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{repayTypeLabel(cd)}</Badge>;
}


function ExecRow({ e }: { e: LoanExecHistoryRow }) {
  const cancelled = e.cancel_yn === "Y";
  return (
    <TR>
      <TD className="num-tabular text-right font-medium">{e.exec_seq}</TD>
      <TD className="text-xs">{fmtDateTime(e.exec_datetime)}</TD>
      <TD>
        <Badge variant={e.exec_type_cd === "EXEC" ? "success" : "muted"}>
          {e.exec_type_cd === "EXEC" ? "실행" : e.exec_type_cd === "CANCEL" ? "취소" : "-"}
        </Badge>
      </TD>
      <TD className={`num-tabular text-right font-semibold ${cancelled ? "text-muted-foreground line-through" : ""}`}>
        {fmtKrw(e.exec_amount)}
      </TD>
      <TD className="num-tabular text-right text-xs text-muted-foreground">
        {fmtKrw(e.post_exec_balance)}
      </TD>
      <TD className="font-mono text-[10px] text-muted-foreground">
        {e.deposit_account_no ?? "-"}
      </TD>
      <TD className="text-xs">
        {execChannelLabel(e.channel_cd)}
      </TD>
      <TD className="text-xs text-muted-foreground">{e.emp_no ?? "-"}</TD>
      <TD>
        {cancelled ? (
          <Badge variant="destructive">취소</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TD>
      <TD className="text-xs text-muted-foreground max-w-[200px] truncate" title={e.remark ?? ""}>
        {e.remark ?? "-"}
      </TD>
    </TR>
  );
}
