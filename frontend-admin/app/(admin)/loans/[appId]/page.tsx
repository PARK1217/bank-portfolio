"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { api, type PredictResponse, ApiError } from "@/lib/api";
import { fmtKrw } from "@/lib/utils";


// ML XGBoost 입력 피처(loan_decision.py) → 한글 라벨 매핑.
// 백엔드 신규 피처가 추가되면 여기에 항목을 늘리면 됨 (없으면 키 그대로 표시).
const FEATURE_LABELS: Record<string, string> = {
  credit_score: "신용점수",
  overdue_days_24m: "최근 24개월 연체일수",
  overdue_ratio: "연체 비율",
  deposit_balance: "예치 잔액",
  annual_income: "연 소득",
  request_ratio: "희망액 / 권장한도",
};


export default function LoanApplicationDetailPage() {
  const params = useParams<{ appId: string }>();
  const router = useRouter();
  const appId = parseInt(params.appId, 10);

  const [predict, setPredict] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<"APPROVE" | "REJECT" | null>(null);
  const [memo, setMemo] = useState("");
  const [reviewed, setReviewed] = useState<{ cd: "APPROVE" | "REJECT"; at: string } | null>(null);

  useEffect(() => {
    if (!appId) return;
    setError(null);
    (async () => {
      try {
        const res = await api.post<PredictResponse>(`/api/admin/loans/${appId}/predict`);
        setPredict(res);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "추론 결과를 불러오지 못했습니다.";
        setError(msg);
      }
    })();
  }, [appId]);

  async function submitReview(cd: "APPROVE" | "REJECT") {
    if (!predict) return;
    setReviewing(cd);
    try {
      await api.post(`/api/admin/loans/decisions/${predict.decision_id}/review`, {
        human_decision_cd: cd,
        memo: memo || null,
      });
      setReviewed({ cd, at: new Date().toISOString() });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "라벨 등록에 실패했습니다.";
      setError(msg);
    } finally {
      setReviewing(null);
    }
  }

  if (!appId) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        뒤로
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대출 신청 #{appId}</h1>
          <p className="mt-1 text-sm text-muted-foreground">ML 추론 + 사람 라벨링</p>
        </div>
        <Link
          href={`/loans/${appId}/attachments`}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent"
        >
          <Paperclip className="h-3 w-3" />
          첨부서류 일치성
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!predict && !error ? (
        <Spinner label="ML 추론 중…" />
      ) : null}

      {predict ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">고객 정보</CardTitle>
                <CardDescription>ML 입력 피처</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <FeatureRow label="고객 번호" value={`#${predict.customer_no}`} />
                  {Object.entries(predict.features).map(([k, v]) => (
                    <FeatureRow key={k} label={FEATURE_LABELS[k] ?? k} value={formatFeatureValue(k, v)} />
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">ML 추론 결과</CardTitle>
                <CardDescription>모델: {predict.model_version}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScoreVisualization
                  score={predict.score}
                  high={predict.threshold_high}
                  low={predict.threshold_low}
                  decision={predict.decision_cd}
                />
                <dl className="mt-4 space-y-1.5 text-xs">
                  <FeatureRow label="결정ID" value={`#${predict.decision_id}`} />
                  <FeatureRow label="자동 승인 임계" value={predict.threshold_high.toFixed(3)} />
                  <FeatureRow label="자동 반려 임계" value={predict.threshold_low.toFixed(3)} />
                </dl>
              </CardContent>
            </Card>
          </div>

          {predict.decision_cd === "HUMAN_REVIEW" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">사람 검토 라벨링</CardTitle>
                <CardDescription>
                  점수가 임계 회색지대에 있어 직원 판단이 필요합니다. 결과는 AI_LOAN_DECISION 에 기록됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">메모 (선택)</span>
                  <Input
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    maxLength={1000}
                    placeholder="예: 직장 재직 확인서 누락, 추가 자료 요청 후 재심"
                    disabled={!!reviewed}
                  />
                </label>
                {reviewed ? (
                  <div className="rounded-md border border-success/50 bg-success/5 px-3 py-2 text-sm">
                    <span className="font-medium text-success">
                      {reviewed.cd === "APPROVE" ? "승인" : "반려"}으로 라벨링 완료
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      onClick={() => submitReview("APPROVE")}
                      disabled={reviewing !== null}
                    >
                      {reviewing === "APPROVE" ? "처리 중…" : "승인"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => submitReview("REJECT")}
                      disabled={reviewing !== null}
                    >
                      {reviewing === "REJECT" ? "처리 중…" : "반려"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">자동 결정 완료</CardTitle>
                <CardDescription>이 신청은 ML 임계값으로 자동 처리되어 사람 검토 불필요.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}


function FeatureRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed last:border-0 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num-tabular text-sm font-medium">{value}</dd>
    </div>
  );
}


function formatFeatureValue(key: string, v: unknown): string {
  if (v == null) return "-";
  if (typeof v === "number") {
    if (key.toLowerCase().includes("amount") || key.toLowerCase().includes("balance") || key.toLowerCase().includes("income")) {
      return fmtKrw(v);
    }
    if (key.toLowerCase().includes("ratio") || key.toLowerCase().includes("rate")) {
      return v.toFixed(3);
    }
    return v.toLocaleString("ko-KR");
  }
  return String(v);
}


function ScoreVisualization({
  score,
  high,
  low,
  decision,
}: {
  score: number;
  high: number;
  low: number;
  decision: string;
}) {
  const pct = Math.max(0, Math.min(1, score)) * 100;
  const lowPct = low * 100;
  const highPct = high * 100;

  const decisionColor =
    decision === "AUTO_APPROVE" ? "text-success"
      : decision === "AUTO_REJECT" ? "text-destructive"
      : "text-warning";

  const decisionLabel =
    decision === "AUTO_APPROVE" ? "자동 승인"
      : decision === "AUTO_REJECT" ? "자동 반려"
      : decision === "HUMAN_REVIEW" ? "사람 검토 필요"
      : decision;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-bold ${decisionColor}`}>{score.toFixed(3)}</span>
        <span className={`text-sm font-medium ${decisionColor}`}>{decisionLabel}</span>
      </div>
      <div className="relative mt-3 h-6 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-destructive/30"
          style={{ width: `${lowPct}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-r-full bg-success/30"
          style={{ left: `${highPct}%`, right: 0 }}
        />
        <div
          className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0.0</span>
        <span className="ml-auto" style={{ marginRight: `${100 - lowPct}%` }}>
          반려 ≤ {low.toFixed(2)}
        </span>
        <span style={{ marginRight: `${100 - highPct}%` }}>
          {high.toFixed(2)} ≤ 승인
        </span>
        <span>1.0</span>
      </div>
    </div>
  );
}