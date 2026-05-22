"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type AccountDetail, ApiError } from "@/lib/api";
import { decodeId, encodeId, fmtDateTime, fmtKrw, fmtTxType } from "@/lib/utils";


export default function AccountDetailPage() {
  const params = useParams<{ accountNo: string }>();
  const router = useRouter();
  // URL 의 :accountNo 는 base64 인코딩된 식별자 — 디코딩해서 raw account_no 복원.
  const accountNo = (() => {
    try {
      return params.accountNo ? decodeId(params.accountNo) : "";
    } catch {
      return params.accountNo ?? "";
    }
  })();

  const [data, setData] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountNo) return;
    (async () => {
      try {
        const res = await api.get<AccountDetail>(`/api/admin/accounts/${accountNo}`);
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "계좌 상세를 불러오지 못했습니다.");
      }
    })();
  }, [accountNo]);

  if (!accountNo) return null;

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
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight font-mono">{data.account.account_no}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.account.account_type_cd} · {data.account.holder_name ?? "-"}
                {data.account.alias ? ` · ${data.account.alias}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={data.account.status_cd === "NORMAL" || data.account.status_cd === "5050" ? "success" : "warning"}>
                {data.account.status_cd}
              </Badge>
              {data.account.primary_yn === "Y" ? <Badge variant="primary">주거래</Badge> : null}
              {data.account.limited_yn === "Y" ? <Badge variant="warning">제한</Badge> : null}
              {data.account.hidden_yn === "Y" ? <Badge variant="muted">숨김</Badge> : null}
            </div>
          </div>

          {/* 잔액 + 한도 카드 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">잔액</div>
                <div
                  className={`mt-1 num-tabular text-2xl font-semibold ${
                    data.account.balance < 0 ? "text-destructive" : ""
                  }`}
                >
                  {fmtKrw(data.account.balance)}
                </div>
                {data.account.pending_withdraw > 0 ? (
                  <div className="mt-1 text-[11px] text-warning">
                    출금 대기 {fmtKrw(data.account.pending_withdraw)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">일일 출금 한도</div>
                <div className="mt-1 num-tabular text-2xl font-semibold">
                  {fmtKrw(data.account.daily_withdraw_limit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">일일 이체 한도</div>
                <div className="mt-1 num-tabular text-2xl font-semibold">
                  {fmtKrw(data.account.daily_transfer_limit)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메타 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">계좌 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="유형" value={data.account.account_type_cd} />
                <Pair label="상태" value={data.account.status_cd} />
                <Pair label="개설일" value={fmtDateTime(data.account.open_date)} />
                <Pair label="해지일" value={fmtDateTime(data.account.close_date)} />
                <Pair label="마지막 거래" value={fmtDateTime(data.account.last_tx_datetime)} />
                <Pair label="비번 오류" value={`${data.account.pwd_error_count}회`} />
                <Pair label="누적 이자" value={fmtKrw(data.account.cumulative_interest)} />
                <Pair label="별명" value={data.account.alias ?? "-"} />
              </dl>
            </CardContent>
          </Card>

          {/* 보유 고객 */}
          {data.account.customer_no ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">보유 고객</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                  <Pair
                    label="고객"
                    value={
                      <Link
                        href={`/customers/${encodeId(data.account.customer_no)}`}
                        className="hover:underline"
                      >
                        {data.account.customer_name ?? "-"} (#{data.account.customer_no})
                      </Link>
                    }
                  />
                  <Pair label="이메일" value={data.account.customer_email ?? "-"} />
                  <Pair label="등급" value={data.account.customer_grade_cd ?? "-"} />
                  <Pair label="회원 상태" value={data.account.customer_status_cd ?? "-"} />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {/* 최근 거래 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 거래</CardTitle>
              <CardDescription>최신 20건</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent_transactions.length === 0 ? (
                <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  거래 내역이 없습니다.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>일시</TH>
                      <TH>유형</TH>
                      <TH className="text-right">금액</TH>
                      <TH className="text-right">잔액 후</TH>
                      <TH>상대</TH>
                      <TH>메모</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.recent_transactions.map((t) => (
                      <TR key={t.transaction_id}>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(t.tx_datetime)}</TD>
                        <TD>
                          <Badge variant={t.amount >= 0 ? "success" : "muted"}>
                            {fmtTxType(t.tx_type_cd)}
                          </Badge>
                        </TD>
                        <TD
                          className={`num-tabular text-right font-semibold ${
                            t.amount < 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {t.amount > 0 ? "+" : ""}
                          {fmtKrw(t.amount)}
                        </TD>
                        <TD className="num-tabular text-right">{fmtKrw(t.balance_after)}</TD>
                        <TD className="text-xs">
                          {t.counterpart_holder_name ? (
                            <>
                              {t.counterpart_holder_name}
                              {t.counterpart_bank_name ? (
                                <span className="text-muted-foreground"> ({t.counterpart_bank_name})</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TD>
                        <TD className="text-xs text-muted-foreground">{t.memo ?? "-"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}


function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}