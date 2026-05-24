"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  api,
  ApiError,
  type FdsDetailResponse,
} from "@/lib/api";
import { fdsInvestStatusLabel, fdsJudgmentLabel } from "@/lib/labels";
import { decodeId, encodeId, fmtDateTime, fmtKrw } from "@/lib/utils";


const INVEST_ACTIONS: { value: "CONFIRM" | "REPORT" | "CLOSE"; label: string; variant: "success" | "destructive" | "default" }[] = [
  { value: "CONFIRM", label: "본인 확인", variant: "success" },
  { value: "REPORT", label: "신고 접수", variant: "destructive" },
  { value: "CLOSE", label: "종결", variant: "default" },
];


export default function FdsDetailPage() {
  const params = useParams<{ customerNo: string; detectSeq: string }>();
  const router = useRouter();

  const customerNo = parseDecoded(params.customerNo);
  const detectSeq = parseDecoded(params.detectSeq);

  const [data, setData] = useState<FdsDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conclusion, setConclusion] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!customerNo || !detectSeq) return;
    try {
      const res = await api.get<FdsDetailResponse>(
        `/api/admin/fds/${customerNo}/${detectSeq}`,
      );
      setData(res);
      setConclusion(res.detection.investigation_conclusion ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "의심거래 상세를 불러오지 못했습니다.");
    }
  }, [customerNo, detectSeq]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submitAction(statusCd: "CONFIRM" | "REPORT" | "CLOSE") {
    setSubmitting(statusCd);
    setActionMsg(null);
    try {
      await api.patch(`/api/admin/fds/${customerNo}/${detectSeq}/investigation`, {
        investigation_status_cd: statusCd,
        conclusion: conclusion.trim() || null,
      });
      setActionMsg("처리되었습니다.");
      await reload();
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : "조사 액션에 실패했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!customerNo || !detectSeq) return null;

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
                의심거래 #{data.detection.customer_no}-{data.detection.detect_seq}
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {data.detection.detect_datetime ? fmtDateTime(data.detection.detect_datetime) : "-"}
                {" · "}
                <Link
                  href={`/customers/${encodeId(data.detection.customer_no)}`}
                  className="hover:underline"
                >
                  회원 #{data.detection.customer_no} ({data.detection.customer_name ?? "-"})
                </Link>
              </p>
            </div>
            <div className="flex gap-2">
              <JudgmentBadge cd={data.detection.judgment_cd} />
              <InvestBadge cd={data.detection.investigation_status_cd} />
            </div>
          </div>

          {/* 점수 + 메타 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">탐지 정보</CardTitle>
              <CardDescription>FDS 점수 · 접속 컨텍스트 · 비고</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair
                  label="FDS 점수"
                  value={
                    <span
                      className={`text-lg font-bold ${
                        (data.detection.total_score ?? 0) >= 80
                          ? "text-destructive"
                          : (data.detection.total_score ?? 0) >= 60
                          ? "text-warning"
                          : ""
                      }`}
                    >
                      {data.detection.total_score ?? "-"}
                    </span>
                  }
                />
                <Pair label="추가인증" value={data.detection.extra_auth_success ?? "-"} />
                <Pair label="응답 시간" value={data.detection.response_time_ms != null ? `${data.detection.response_time_ms}ms` : "-"} />
                <Pair label="접속 국가" value={
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {data.detection.access_country ?? "-"}
                  </span>
                } />
                <Pair label="접속 IP" value={data.detection.access_ip ?? "-"} />
                <Pair label="대상 계좌" value={data.detection.account_no ?? "-"} />
                <Pair label="조사자" value={data.detection.investigator_emp_no ?? "-"} />
                <Pair label="검토자" value={data.detection.reviewer_emp_no ?? "-"} />
              </dl>
              {data.detection.remark ? (
                <div className="mt-4 rounded-md bg-muted/30 p-3 text-sm">
                  <div className="mb-1 text-xs text-muted-foreground">탐지 사유</div>
                  <p className="whitespace-pre-wrap">{data.detection.remark}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* 거래 컨텍스트 */}
          {data.transaction ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">연관 거래</CardTitle>
                <CardDescription>탐지가 묶인 TRANSACTION 단건</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                  <Pair label="거래 ID" value={`#${data.transaction.transaction_id}`} />
                  <Pair label="거래 일시" value={fmtDateTime(data.transaction.tx_datetime)} />
                  <Pair label="유형" value={data.transaction.tx_type_cd === "WITHDRAW" ? "출금" : data.transaction.tx_type_cd === "DEPOSIT" ? "입금" : data.transaction.tx_type_cd ?? "-"} />
                  <Pair
                    label="금액"
                    value={
                      <span className={data.transaction.tx_amount < 0 ? "text-destructive" : "text-success"}>
                        {data.transaction.tx_amount > 0 ? "+" : ""}
                        {fmtKrw(data.transaction.tx_amount)}
                      </span>
                    }
                  />
                  <Pair label="잔액 후" value={fmtKrw(data.transaction.post_tx_balance)} />
                  <Pair label="상대 계좌" value={data.transaction.counterpart_account_no ?? "-"} />
                  <Pair label="상대 예금주" value={data.transaction.counterpart_holder_name ?? "-"} />
                  <Pair label="당행 여부" value={data.transaction.own_bank_yn === "Y" ? "당행" : "타행"} />
                </dl>
                {data.transaction.tx_memo ? (
                  <div className="mt-3 text-xs text-muted-foreground">
                    메모: {data.transaction.tx_memo}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* 조사 액션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">조사 처리</CardTitle>
              <CardDescription>
                결론을 적고 액션을 선택하면 FDS_DETECTION 에 기록되고 ADMIN_AUDIT_LOG 에 자동 적재됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">조사 결론 (선택)</span>
                <Input
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  maxLength={200}
                  placeholder="예: 본인 확인 통화 완료, 해외 출장 중 정상 거래"
                  disabled={submitting !== null}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {INVEST_ACTIONS.map((a) => (
                  <Button
                    key={a.value}
                    variant={a.variant}
                    onClick={() => submitAction(a.value)}
                    disabled={submitting !== null}
                  >
                    {submitting === a.value ? "처리 중…" : a.label}
                  </Button>
                ))}
              </div>
              {actionMsg ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">{actionMsg}</div>
              ) : null}
              {data.detection.investigation_conclusion ? (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="text-muted-foreground">최근 결론</div>
                  <p className="mt-1">{data.detection.investigation_conclusion}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}


function parseDecoded(raw: string | undefined): number {
  if (!raw) return 0;
  try {
    return parseInt(decodeId(raw), 10) || 0;
  } catch {
    return parseInt(raw, 10) || 0;
  }
}


function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num-tabular text-sm font-medium">{value}</div>
    </div>
  );
}


function JudgmentBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "success" | "warning" | "destructive" | "muted"> = {
    NORMAL: "success",
    WARN: "warning",
    BLOCK: "destructive",
  };
  return <Badge variant={map[cd] ?? "muted"}>{fdsJudgmentLabel(cd)}</Badge>;
}


function InvestBadge({ cd }: { cd?: string | null }) {
  if (!cd) return <Badge variant="muted">-</Badge>;
  const map: Record<string, "muted" | "primary" | "success" | "destructive"> = {
    PENDING: "muted",
    CONFIRM: "success",
    REPORT: "destructive",
    CLOSE: "primary",
  };
  return <Badge variant={map[cd] ?? "muted"}>{fdsInvestStatusLabel(cd)}</Badge>;
}
