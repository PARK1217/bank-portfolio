"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { loanApplyStatusLabel } from "@/lib/labels";
import { showApiError } from "@/lib/toast";


/**
 * SCR-LN-006 대출 약정 ⭐.
 *
 * 어필 포인트: **약정 ≠ 실행** 분리.
 *   약정(이 화면) = 대출계약 + 대출전용계좌 + 계약참여자 INSERT (자금 이동 X)
 *   실행(다음 화면 LN-007) = 거래 INSERT + 상환스케줄 INSERT (자금 이동)
 *
 * 입력 = 약관·특약 동의 + 본인서명(데모 캔버스) + 비밀번호.
 * 응답 loan_token 받자마자 /loans/{loanToken}/execute 로 이동.
 */

interface ApprovedTerms {
  amount_krw: number;
  rate_applied: number;
  period_months: number;
  monthly_payment_krw: number;
}

interface LoanStatusData {
  app_token: string;
  status_cd: string;
  review_steps: { step_cd: string; status_cd: string }[];
  missing_documents: string[];
  current_step_cd: string | null;
  approved_terms?: ApprovedTerms | null;
}

interface LoanContractResponse {
  loan_token: string;
  loan_contract_no_masked: string;
  masked_loan_account_no: string;
  rate_applied: number;
  monthly_payment_krw: number;
}


const TERMS_CHECKLIST: { id: number; version: number; title: string; required: boolean }[] = [
  { id: 101, version: 1, title: "여신거래기본약관", required: true },
  { id: 102, version: 1, title: "가계대출 표준약관", required: true },
  { id: 103, version: 1, title: "개인(신용)정보 수집·이용 동의 (필수)", required: true },
  { id: 104, version: 1, title: "자동이체 등록 동의 (자동상환 사용 시)", required: false },
];

const COVENANTS: { code: string; label: string }[] = [
  { code: "INCOME_REPORT", label: "소득 변동 시 통보 의무" },
  { code: "DEFAULT_PENALTY", label: "연체 시 기한이익 상실 및 가산금리 +3%p" },
];

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => `${krw.format(n)}원`;


function SignaturePad({
  onChange,
}: {
  onChange: (signed: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [signed, setSigned] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    lastRef.current = pos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = ref.current!.getContext("2d");
    if (!ctx || !lastRef.current) return;
    const p = pos(e);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (!signed) {
      setSigned(true);
      onChange(true);
    }
  }
  function end() {
    drawingRef.current = false;
    lastRef.current = null;
  }
  function clear() {
    const ctx = ref.current?.getContext("2d");
    if (ctx && ref.current) ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    setSigned(false);
    onChange(false);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={500}
        height={140}
        className="block h-[140px] w-full touch-none rounded-md border bg-background"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between text-xs">
        <span className={signed ? "text-success" : "text-muted-foreground"}>
          {signed ? "✓ 서명됨" : "이 영역에 서명하세요"}
        </span>
        <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground">
          지우기
        </button>
      </div>
    </div>
  );
}


function ContractContent({ appToken }: { appToken: string }) {
  const router = useRouter();
  const { data, error, loading } = useFetch<LoanStatusData>(`/api/loans/${appToken}/status`);

  const [agreed, setAgreed] = useState<Record<number, boolean>>({});
  const [covenants, setCovenants] = useState<Record<string, boolean>>(() =>
    COVENANTS.reduce((m, c) => ({ ...m, [c.code]: false }), {}),
  );
  const [signed, setSigned] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) showApiError(error, "약정 정보를 불러오지 못했습니다.");
  }, [error]);

  const requiredOk = useMemo(
    () => TERMS_CHECKLIST.filter((t) => t.required).every((t) => agreed[t.id]),
    [agreed],
  );
  const covenantsOk = useMemo(() => COVENANTS.every((c) => covenants[c.code]), [covenants]);
  const approved = data?.status_cd === "APPROVED";
  const terms = data?.approved_terms ?? null;
  const canSubmit =
    !submitting && approved && requiredOk && covenantsOk && signed && password.length >= 4;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<LoanContractResponse>(
        `/api/loans/${appToken}/contract`,
        {
          agreed_terms: TERMS_CHECKLIST.map((t) => ({
            terms_id: t.id,
            version: t.version,
            agreed: !!agreed[t.id],
          })),
          covenant_codes: COVENANTS.filter((c) => covenants[c.code]).map((c) => c.code),
          signature_blob_id: 1, // 데모 — 실제로는 캔버스 이미지 업로드 후 attachment_id
          password,
        },
        { idempotent: true },
      );
      toast.success("약정이 완료되었습니다. 실행 단계로 이동합니다.");
      router.push(`/loans/${res.loan_token}/execute`);
    } catch (err) {
      showApiError(err, "약정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <Spinner label="약정 정보 불러오는 중…" />;
  if (!data) return null;

  if (!approved) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">
          심사 상태가 <span className="font-medium">{loanApplyStatusLabel(data.status_cd)}</span> 이라 약정을 진행할 수 없습니다.
        </p>
        <Link
          href={`/loans/${appToken}/status`}
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          심사 상황 보기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="mt-1">대출 약정</CardTitle>
          <CardDescription>
            <strong className="text-foreground">약정 ≠ 실행.</strong> 이 단계는 계약·계좌 생성만 진행하며, 자금은 다음 실행 단계에서 입금됩니다.
          </CardDescription>
        </CardHeader>
        {terms ? (
          <CardContent>
            <dl className="divide-y rounded-md border bg-card text-sm">
              <Row k="신청 금액" v={fmt(terms.amount_krw)} highlight />
              <Row k="적용 금리" v={`${terms.rate_applied.toFixed(2)}%`} />
              <Row k="기간" v={`${terms.period_months}개월`} />
              <Row k="월 상환액" v={fmt(terms.monthly_payment_krw)} />
            </dl>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">약관 동의</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {TERMS_CHECKLIST.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!agreed[t.id]}
                  onChange={(e) => setAgreed((cur) => ({ ...cur, [t.id]: e.target.checked }))}
                />
                <span>
                  <span className="mr-1 text-xs font-medium">
                    [{t.required ? "필수" : "선택"}]
                  </span>
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계약 특약</CardTitle>
          <CardDescription>아래 사항을 인지하고 동의합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {COVENANTS.map((c) => (
              <li key={c.code} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!covenants[c.code]}
                  onChange={(e) => setCovenants((cur) => ({ ...cur, [c.code]: e.target.checked }))}
                />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">본인 서명</CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad onChange={setSigned} />
        </CardContent>
      </Card>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">비밀번호 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              autoComplete="current-password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "약정 중…" : "약정하기 (자금 이동 없음)"}
            </Button>
            {!canSubmit && !submitting ? (
              <p className="text-xs text-muted-foreground">
                필수 약관·특약·서명·비밀번호가 모두 입력되어야 진행됩니다.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Row({
  k,
  v,
  highlight,
}: {
  k: string;
  v: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between p-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={`num-tabular ${highlight ? "text-base font-semibold" : ""}`}>{v}</span>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <Protected>
      <main className="container max-w-md py-8 animate-fade-in">
        <ContractContent appToken={params.id} />
      </main>
    </Protected>
  );
}