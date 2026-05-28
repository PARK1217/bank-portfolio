"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Sparkles, AlertTriangle, RefreshCw, Search, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  type LlmCallDetail,
  type LlmCallListItem,
  type LlmCallListResponse,
  type LlmCallStats,
  type LlmRetrievedChunk,
  type RagEvalScores,
  type RagEvalStats,
} from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/utils";


// 환경별 Phoenix host. 로컬 docker-compose 가 6006 포트로 노출.
const PHOENIX_URL = process.env.NEXT_PUBLIC_PHOENIX_URL ?? "http://localhost:6006";


export default function ObservabilityPage() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // LLM 호출 추적 — DB 직접 적재 (Phoenix iframe 과 별개)
  const [stats, setStats] = useState<LlmCallStats | null>(null);
  const [ragStats, setRagStats] = useState<RagEvalStats | null>(null);
  const [audienceCd, setAudienceCd] = useState("");
  const [cacheHitYn, setCacheHitYn] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<LlmCallListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (audienceCd) params.set("audience_cd", audienceCd);
      if (cacheHitYn) params.set("cache_hit_yn", cacheHitYn);
      if (q) params.set("q", q);
      params.set("limit", "100");
      const res = await api.get<LlmCallListResponse>(`/api/admin/observability/llm-calls?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "LLM 호출 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [audienceCd, cacheHitYn, q]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get<LlmCallStats>("/api/admin/observability/stats");
        setStats(s);
      } catch {
        // stats 실패해도 화면은 동작
      }
    })();
    (async () => {
      try {
        const rs = await api.get<RagEvalStats>("/api/admin/observability/rag-eval-stats");
        setRagStats(rs);
      } catch {
        // rag-eval-stats 실패해도 화면은 동작
      }
    })();
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 호출 추적
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI_LLM_CALL_LOG · 챗봇 RAG 호출 전문 추적 (system / user prompt · retrieval · 응답 · 캐시 hit)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* KPI — 최근 24h */}
      {stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard label="24h 누적" value={fmtNumber(stats.total)} unit="건" color="text-foreground" />
          <KpiCard label="캐시 hit" value={fmtNumber(stats.cache_hits)} unit="건" color="text-success" />
          <KpiCard label="캐시 miss" value={fmtNumber(stats.cache_misses)} unit="건" color="text-primary" />
          <KpiCard
            label="hit률"
            value={(stats.cache_hit_rate * 100).toFixed(1)}
            unit="%"
            color="text-success"
          />
          <KpiCard
            label="평균 LLM 지연"
            value={stats.avg_miss_latency_ms ? fmtNumber(stats.avg_miss_latency_ms) : "-"}
            unit="ms"
            color="text-warning"
          />
        </div>
      ) : null}

      {/* RAG 응답 품질 — LLM-as-judge 4지표 평균 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            RAG 응답 신뢰도
            {ragStats ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                평가 {fmtNumber(ragStats.total)}건 평균
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            Faithfulness(충실도) · Answer Relevancy(답변 적합도) · Context Precision(검색 정밀도) ·
            Context Recall(검색 재현율) — 0~100%
            <span className="mt-1 block text-[11px] text-warning">
              ※ 응답 생성 모델이 자기 답을 채점하는 LLM-as-judge 값입니다. 절대 신뢰도가 아니라 상대 추이 지표로 보세요.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ragStats && ragStats.total > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <ScoreCard label="충실도 (Faithfulness)" score={ragStats.faithfulness} />
              <ScoreCard label="답변 적합도 (Answer Relevancy)" score={ragStats.answer_relevancy} />
              <ScoreCard label="검색 정밀도 (Context Precision)" score={ragStats.context_precision} />
              <ScoreCard label="검색 재현율 (Context Recall)" score={ragStats.context_recall} />
            </div>
          ) : (
            <p className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              아직 평가된 RAG 응답이 없습니다. 챗봇에 질문하면(캐시 miss 시) 백그라운드 채점 후 집계됩니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[11px] font-medium text-muted-foreground">질문 검색 (RAW_QUESTION 부분 일치)</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="예: 이체 한도, 의심거래"
                  className="pl-8"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">audience</span>
              <select
                value={audienceCd}
                onChange={(e) => setAudienceCd(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">전체</option>
                <option value="USER">USER (고객)</option>
                <option value="ADMIN">ADMIN (직원)</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">캐시</span>
              <select
                value={cacheHitYn}
                onChange={(e) => setCacheHitYn(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">전체</option>
                <option value="Y">hit (캐시 적중)</option>
                <option value="N">miss (LLM 호출)</option>
              </select>
            </label>

            <div className="md:col-span-4 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "조회 중…" : "조회"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* LLM 호출 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            LLM 호출 로그
            {data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.items.length} / 총 {fmtNumber(data.total)}건
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            행 클릭 → system prompt · user prompt · retrieval context · response 전문 펼침
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : loading && !data ? (
            <Spinner label="불러오는 중…" />
          ) : !data || data.items.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              결과가 없습니다.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">#</TH>
                  <TH>일시</TH>
                  <TH>audience</TH>
                  <TH>캐시</TH>
                  <TH>모델</TH>
                  <TH className="text-right">지연</TH>
                  <TH className="text-right">토큰 (입/출)</TH>
                  <TH>질문</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <LlmCallRow
                    key={row.llm_call_id}
                    row={row}
                    expanded={expanded === row.llm_call_id}
                    onToggle={() =>
                      setExpanded(expanded === row.llm_call_id ? null : row.llm_call_id)
                    }
                  />
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Phoenix iframe — 기존 카드 보존 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Arize Phoenix — 분산 트레이스
            </span>
            <a
              href={PHOENIX_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-accent"
            >
              <ExternalLink className="h-3 w-3" />새 탭으로 열기
            </a>
          </CardTitle>
          <CardDescription>
            챗봇 RAG · LLM 호출 트레이스 · Faithfulness · Latency · Token 사용량
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {failed ? (
            <div className="p-4">
              <div className="flex items-center gap-2 text-warning text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                임베드 차단 감지
              </div>
              <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-muted-foreground">
                <li>
                  <span className="font-mono">docker compose ps</span> 에서{" "}
                  <span className="font-mono">bank-portfolio-phoenix</span> 컨테이너 살아있는지
                </li>
                <li>
                  <a href={PHOENIX_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {PHOENIX_URL}
                  </a>{" "}
                  새 탭에서 직접 접근
                </li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setFailed(false);
                  setLoaded(false);
                }}
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <div className="relative h-[calc(100vh-260px)] min-h-[480px] w-full overflow-hidden bg-muted/30">
              {!loaded ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-primary/60" />
                    Phoenix 로딩 중…
                  </div>
                </div>
              ) : null}
              <iframe
                src={PHOENIX_URL}
                className="h-full w-full"
                title="Arize Phoenix"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function LlmCallRow({
  row,
  expanded,
  onToggle,
}: {
  row: LlmCallListItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [detail, setDetail] = useState<LlmCallDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (expanded && !detail && !loadingDetail) {
      setLoadingDetail(true);
      setDetailError(null);
      api
        .get<LlmCallDetail>(`/api/admin/observability/llm-calls/${row.llm_call_id}`)
        .then((d) => setDetail(d))
        .catch((err) =>
          setDetailError(err instanceof Error ? err.message : "상세를 불러오지 못했습니다."),
        )
        .finally(() => setLoadingDetail(false));
    }
  }, [expanded, detail, loadingDetail, row.llm_call_id]);

  return (
    <>
      <TR onClick={onToggle} className="cursor-pointer">
        <TD className="num-tabular font-mono text-[10px] text-muted-foreground">{row.llm_call_id}</TD>
        <TD className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(row.called_at)}</TD>
        <TD>
          <AudienceBadge audience={row.audience_cd} />
        </TD>
        <TD>
          <CacheBadge hit={row.cache_hit_yn} />
        </TD>
        <TD className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">{row.model_name ?? "-"}</TD>
        <TD className="num-tabular text-right text-xs whitespace-nowrap">
          {row.latency_ms != null ? `${fmtNumber(row.latency_ms)} ms` : "-"}
        </TD>
        <TD className="num-tabular text-right text-xs text-muted-foreground whitespace-nowrap">
          {row.prompt_tokens != null
            ? `${fmtNumber(row.prompt_tokens)} / ${fmtNumber(row.completion_tokens ?? 0)}`
            : "-"}
        </TD>
        <TD className="text-xs max-w-[300px] truncate">{row.raw_question_head ?? "-"}</TD>
      </TR>
      {expanded ? (
        <tr>
          <td colSpan={8} className="border-b bg-muted/20 px-3 py-3">
            {loadingDetail && !detail ? (
              <Spinner label="전문 불러오는 중…" />
            ) : detailError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {detailError}
              </div>
            ) : detail ? (
              <LlmCallDetailView detail={detail} />
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}


function LlmCallDetailView({ detail }: { detail: LlmCallDetail }) {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span>
          trace_id: <span className="font-mono">{detail.trace_id}</span>
        </span>
        {detail.purpose_cd ? <span>purpose: {detail.purpose_cd}</span> : null}
        {detail.status_cd ? <span>status: {detail.status_cd}</span> : null}
      </div>

      {detail.raw_question ? (
        <TextBlock label="RAW_QUESTION (사용자 원문)" text={detail.raw_question} mono={false} />
      ) : null}

      {detail.rewritten_query ? (
        <TextBlock label="REWRITTEN_QUERY (리라이트)" text={detail.rewritten_query} mono={false} />
      ) : null}

      {detail.system_prompt ? (
        <TextBlock label="SYSTEM_PROMPT" text={detail.system_prompt} mono={false} />
      ) : null}

      {detail.user_prompt ? (
        <TextBlock label="USER_PROMPT (질문 + retrieval context 합성)" text={detail.user_prompt} mono={false} />
      ) : null}

      {detail.retrieved_context && Array.isArray(detail.retrieved_context) && detail.retrieved_context.length > 0 ? (
        <RetrievedContextBlock chunks={detail.retrieved_context} />
      ) : null}

      {detail.response_text ? (
        <TextBlock label="RESPONSE_TEXT (LLM 응답)" text={detail.response_text} mono={false} />
      ) : null}

      {detail.evaluation ? <EvalScoresBlock evaluation={detail.evaluation} /> : null}

      {detail.error_message ? (
        <TextBlock label="ERROR_MESSAGE" text={detail.error_message} mono={true} />
      ) : null}
    </div>
  );
}


function TextBlock({ label, text, mono }: { label: string; text: string; mono: boolean }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}{" "}
        <span className="font-normal normal-case text-muted-foreground/70">({text.length}자)</span>
      </div>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap rounded border bg-card p-2 text-[11px] leading-snug ${mono ? "font-mono" : ""}`}
      >
        {text}
      </pre>
    </div>
  );
}


function RetrievedContextBlock({ chunks }: { chunks: LlmRetrievedChunk[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        RETRIEVED_CONTEXT{" "}
        <span className="font-normal normal-case text-muted-foreground/70">({chunks.length} chunks)</span>
      </div>
      <div className="space-y-1.5">
        {chunks.map((c) => (
          <div key={c.rank} className="rounded border bg-card p-2">
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-1">
              <Badge variant="muted" className="font-mono">
                #{c.rank}
              </Badge>
              <span>faq_id: {c.faq_id}</span>
              {c.source_tag ? (
                <Badge variant={c.source_tag === "SYNTH_SOP" ? "success" : "muted"}>
                  {c.source_tag}
                </Badge>
              ) : null}
              {c.audience_cd ? <span>aud: {c.audience_cd}</span> : null}
              {c.category ? <span>cat: {c.category}</span> : null}
              <span className="num-tabular">distance: {c.distance.toFixed(4)}</span>
            </div>
            {c.question ? <div className="text-[11px] font-medium">{c.question}</div> : null}
            {c.snippet ? (
              <div className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
                {c.snippet}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}


// 0~1 점수 → 색상 (낮으면 위험, 높으면 안전)
function scoreColor(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 0.8) return "text-success";
  if (score >= 0.5) return "text-warning";
  return "text-destructive";
}

function fmtScore(score: number | null): string {
  return score == null ? "-" : (score * 100).toFixed(1);
}


function ScoreCard({ label, score }: { label: string; score: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`num-tabular text-xl font-semibold ${scoreColor(score)}`}>{fmtScore(score)}</span>
          {score != null ? <span className="text-[10px] text-muted-foreground">%</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}


function EvalScoresBlock({ evaluation }: { evaluation: RagEvalScores }) {
  const items: { label: string; score: number | null }[] = [
    { label: "충실도", score: evaluation.faithfulness },
    { label: "답변 적합도", score: evaluation.answer_relevancy },
    { label: "검색 정밀도", score: evaluation.context_precision },
    { label: "검색 재현율", score: evaluation.context_recall },
  ];
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        RAG 품질 평가{" "}
        <span className="font-normal normal-case text-muted-foreground/70">(LLM-as-judge · 자가 채점)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-baseline gap-1.5 rounded border bg-card px-2.5 py-1.5 text-[11px]"
          >
            <span className="text-muted-foreground">{it.label}</span>
            <span className={`num-tabular font-semibold ${scoreColor(it.score)}`}>{fmtScore(it.score)}</span>
            {it.score != null ? <span className="text-[10px] text-muted-foreground">%</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}


function AudienceBadge({ audience }: { audience: string | null }) {
  if (!audience) return <span className="text-[10px] text-muted-foreground">-</span>;
  if (audience === "ADMIN") return <Badge variant="warning">ADMIN</Badge>;
  if (audience === "USER") return <Badge variant="primary">USER</Badge>;
  return <Badge variant="muted">{audience}</Badge>;
}


function CacheBadge({ hit }: { hit: string | null }) {
  if (hit === "Y") return <Badge variant="success">hit</Badge>;
  if (hit === "N") return <Badge variant="muted">miss</Badge>;
  return <span className="text-[10px] text-muted-foreground">-</span>;
}


function KpiCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`num-tabular text-xl font-semibold ${color}`}>{value}</span>
          {unit ? <span className="text-[10px] text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
