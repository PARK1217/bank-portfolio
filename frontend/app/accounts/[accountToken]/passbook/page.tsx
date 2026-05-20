"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/lib/use-fetch";
import { showApiError } from "@/lib/toast";


/**
 * SCR-AC-003 통장 페이지 출력 ⭐.
 *
 * 종이 통장 디자인을 SVG로 렌더링. 서버가 `rendered_svg` 를 동봉하면 그대로 주입,
 * 없으면 거래 데이터로 클라이언트가 SVG를 직접 그림.
 */

interface MaskedAccount {
  masked: string;
  bank_cd?: string | null;
  bank_name?: string | null;
  holder_name?: string | null;
}

interface TransactionItem {
  tx_token: string;
  tx_at: string;
  tx_type_cd: string;
  amount: number;
  balance_after: number;
  memo: string | null;
  counterpart: MaskedAccount | null;
}

interface PassbookPageResponse {
  account_token: string;
  page: number;
  rows: TransactionItem[];
  rendered_svg: string | null;
}


// SVG 캔버스 치수 — 종이 통장 비율
const PAGE_W = 600;
const ROW_H = 26;
const HEADER_H = 78;
const FOOTER_H = 28;
const ROWS_PER_PAGE = 20;
const PAGE_H = HEADER_H + ROW_H * ROWS_PER_PAGE + FOOTER_H;
const COL = {
  no:    { x: 20,  w: 30,  label: "No" },
  date:  { x: 50,  w: 90,  label: "거래일시" },
  type:  { x: 140, w: 70,  label: "구분" },
  out:   { x: 210, w: 110, label: "지급(원)" },
  in:    { x: 320, w: 110, label: "입금(원)" },
  bal:   { x: 430, w: 130, label: "잔액(원)" },
} as const;

const krw = new Intl.NumberFormat("ko-KR");
const fmt = (n: number) => krw.format(n);
const dtFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function txKindLabel(cd: string): string {
  switch (cd) {
    case "DEPOSIT": return "입금";
    case "WITHDRAW": return "출금";
    case "TRANSFER_IN": return "이체입금";
    case "TRANSFER_OUT": return "이체출금";
    case "INTEREST": return "이자";
    case "FEE": return "수수료";
    default: return cd;
  }
}


function PassbookSvg({
  bankName,
  maskedAccountNo,
  holderName,
  page,
  rows,
}: {
  bankName: string;
  maskedAccountNo: string;
  holderName: string;
  page: number;
  rows: TransactionItem[];
}) {
  const startNo = (page - 1) * ROWS_PER_PAGE + 1;

  return (
    <svg
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      width="100%"
      role="img"
      aria-label={`통장 ${page}페이지`}
      style={{
        background: "#f7f3e8",
        fontFamily: "'Pretendard', system-ui, sans-serif",
      }}
    >
      {/* 종이 질감 — 가로 줄무늬 */}
      <defs>
        <pattern id="lines" width={PAGE_W} height={ROW_H} patternUnits="userSpaceOnUse">
          <line x1={0} y1={ROW_H} x2={PAGE_W} y2={ROW_H} stroke="#cbb88a" strokeWidth={0.4} />
        </pattern>
      </defs>

      {/* 헤더 */}
      <rect x={0} y={0} width={PAGE_W} height={HEADER_H} fill="#1d4ed8" />
      <text x={20} y={28} fontSize={16} fontWeight={700} fill="#fff">
        {bankName}
      </text>
      <text x={20} y={50} fontSize={11} fill="#dbeafe">
        예금주 {holderName}
      </text>
      <text x={20} y={66} fontSize={11} fontFamily="ui-monospace, monospace" fill="#dbeafe">
        계좌 {maskedAccountNo}
      </text>
      <text x={PAGE_W - 20} y={28} fontSize={11} textAnchor="end" fill="#dbeafe">
        Page {String(page).padStart(2, "0")}
      </text>

      {/* 컬럼 헤더 */}
      <rect x={0} y={HEADER_H} width={PAGE_W} height={20} fill="#e0e7ff" />
      {Object.entries(COL).map(([key, c]) => (
        <text
          key={key}
          x={c.x + c.w / 2}
          y={HEADER_H + 14}
          fontSize={10}
          fontWeight={600}
          fill="#1e3a8a"
          textAnchor={key === "no" ? "middle" : key === "date" || key === "type" ? "middle" : "end"}
        >
          {c.label}
        </text>
      ))}

      {/* 줄무늬 배경 */}
      <rect x={0} y={HEADER_H + 20} width={PAGE_W} height={ROW_H * ROWS_PER_PAGE} fill="url(#lines)" />

      {/* 데이터 행 */}
      {Array.from({ length: ROWS_PER_PAGE }).map((_, i) => {
        const r = rows[i];
        const y = HEADER_H + 20 + i * ROW_H + 16;
        const no = startNo + i;
        if (!r) {
          return (
            <text key={i} x={COL.no.x + COL.no.w / 2} y={y} fontSize={10} fill="#9ca3af" textAnchor="middle">
              {no}
            </text>
          );
        }
        const isOut = r.amount < 0;
        return (
          <g key={r.tx_token}>
            <text x={COL.no.x + COL.no.w / 2} y={y} fontSize={10} fill="#475569" textAnchor="middle">
              {no}
            </text>
            <text x={COL.date.x + 6} y={y} fontSize={10} fill="#1f2937">
              {dtFmt.format(new Date(r.tx_at))}
            </text>
            <text x={COL.type.x + COL.type.w / 2} y={y} fontSize={10} fill="#1f2937" textAnchor="middle">
              {txKindLabel(r.tx_type_cd)}
            </text>
            <text
              x={COL.out.x + COL.out.w - 6}
              y={y}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
              fill={isOut ? "#b91c1c" : "#cbd5e1"}
              textAnchor="end"
            >
              {isOut ? fmt(-r.amount) : ""}
            </text>
            <text
              x={COL.in.x + COL.in.w - 6}
              y={y}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
              fill={!isOut ? "#15803d" : "#cbd5e1"}
              textAnchor="end"
            >
              {!isOut ? fmt(r.amount) : ""}
            </text>
            <text
              x={COL.bal.x + COL.bal.w - 6}
              y={y}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
              fontWeight={600}
              fill="#1e3a8a"
              textAnchor="end"
            >
              {fmt(r.balance_after)}
            </text>
            {r.memo ? (
              <text
                x={COL.date.x + 6}
                y={y + 11}
                fontSize={9}
                fill="#64748b"
                fontStyle="italic"
              >
                {r.memo}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* 컬럼 구분선 */}
      {Object.values(COL).map((c, i) => (
        <line
          key={i}
          x1={c.x}
          y1={HEADER_H}
          x2={c.x}
          y2={HEADER_H + 20 + ROW_H * ROWS_PER_PAGE}
          stroke="#cbb88a"
          strokeWidth={0.5}
        />
      ))}
      <line
        x1={COL.bal.x + COL.bal.w}
        y1={HEADER_H}
        x2={COL.bal.x + COL.bal.w}
        y2={HEADER_H + 20 + ROW_H * ROWS_PER_PAGE}
        stroke="#cbb88a"
        strokeWidth={0.5}
      />

      {/* 푸터 */}
      <rect x={0} y={PAGE_H - FOOTER_H} width={PAGE_W} height={FOOTER_H} fill="#fef9e7" />
      <text x={20} y={PAGE_H - 10} fontSize={9} fill="#78716c">
        ※ 본 통장은 디지털 형태로 제공됩니다. 발급일 기준 최근 거래만 표시될 수 있습니다.
      </text>
    </svg>
  );
}


function PassbookContent({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useFetch<PassbookPageResponse>(
    `/api/accounts/${token}/passbook?page=${page}&rows_per_page=${ROWS_PER_PAGE}`,
  );

  useEffect(() => {
    if (error) showApiError(error, "통장 페이지를 불러오지 못했습니다.");
  }, [error]);

  if (loading && !data) return <Spinner label="통장 페이지 렌더링…" />;
  if (!data) return null;

  const hasNext = data.rows.length === ROWS_PER_PAGE;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">계좌 {data.account_token.slice(0, 8)}…</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {data.rendered_svg ? (
            <div
              className="overflow-hidden rounded-md border"
              // 서버 사이드 렌더 SVG 주입 (있을 때)
              dangerouslySetInnerHTML={{ __html: data.rendered_svg }}
            />
          ) : (
            <div className="overflow-hidden rounded-md border">
              <PassbookSvg
                bankName="본행 통장"
                maskedAccountNo={data.account_token.slice(0, 12).toUpperCase()}
                holderName="고객"
                page={data.page}
                rows={data.rows}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ← 이전 페이지
        </Button>
        <span className="text-muted-foreground">통장 {data.page}페이지</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext}
        >
          다음 페이지 →
        </Button>
      </div>
    </div>
  );
}


export default function Page() {
  const params = useParams<{ accountToken: string }>();
  return (
    <Protected>
      <main className="container max-w-3xl py-8 animate-fade-in">
        <div className="mb-4">
          <Link
            href={`/accounts/${params.accountToken}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 계좌 상세
          </Link>
          <h1 className="mt-1 text-xl font-semibold">통장 페이지 ⭐</h1>
          <p className="text-xs text-muted-foreground">
            종이 통장 디자인을 SVG로 렌더링합니다. 인쇄 시 실물 통장 양식으로 출력 가능.
          </p>
        </div>
        <PassbookContent token={params.accountToken} />
      </main>
    </Protected>
  );
}