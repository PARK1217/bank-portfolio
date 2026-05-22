"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, type CustomerDetail, type CustomerDelegation, ApiError } from "@/lib/api";
import { decodeId, encodeId, fmtDateTime, fmtKrw, fmtPercent, fmtNumber } from "@/lib/utils";


export default function CustomerDetailPage() {
  const params = useParams<{ custNo: string }>();
  const router = useRouter();
  // URL 의 :custNo 는 base64 인코딩된 customer_no — 디코딩해서 정수 복원.
  const custNo = (() => {
    if (!params.custNo) return 0;
    try {
      return parseInt(decodeId(params.custNo), 10) || 0;
    } catch {
      return parseInt(params.custNo, 10) || 0;
    }
  })();

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!custNo) return;
    (async () => {
      try {
        const res = await api.get<CustomerDetail>(`/api/admin/customers/${custNo}`);
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "회원 상세를 불러오지 못했습니다.");
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
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{data.customer.name ?? "회원"}</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                #{data.customer.customer_no} · PARTY #{data.customer.party_id ?? "-"} · {data.customer.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="primary">{data.customer.grade_cd ?? "-"}</Badge>
              <Badge variant={data.customer.status_cd === "5050" ? "success" : "warning"}>
                {data.customer.status_cd ?? "-"}
              </Badge>
            </div>
          </div>

          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Pair label="회원번호" value={`#${data.customer.customer_no}`} />
                <Pair label="이름" value={data.customer.name ?? "-"} />
                <Pair label="이메일" value={data.customer.email ?? "-"} />
                <Pair label="가입일" value={fmtDateTime(data.customer.join_datetime)} />
                <Pair label="생년월일" value={fmtDateTime(data.customer.birth_date)} />
                <Pair label="성별" value={data.customer.gender ?? "-"} />
                <Pair label="직장" value={data.customer.current_employer ?? "-"} />
                <Pair label="연소득" value={fmtKrw(data.customer.annual_income ?? 0)} />
                <Pair
                  label="개인정보 동의"
                  value={data.customer.privacy_agree_yn === "Y" ? "Y" : "-"}
                />
                <Pair
                  label="마케팅 동의"
                  value={data.customer.marketing_agree_yn === "Y" ? "Y" : "N"}
                />
              </dl>
            </CardContent>
          </Card>

          {/* 연락처·주소 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">연락처</CardTitle>
                <CardDescription>{data.contacts.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                {data.contacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">등록된 연락처가 없습니다.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {data.contacts.map((c, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{c.contact_type_cd}</span>
                        <span className="num-tabular">{c.value}</span>
                        {c.primary_yn === "Y" ? <Badge variant="primary">대표</Badge> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">주소</CardTitle>
                <CardDescription>{data.addresses.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                {data.addresses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">등록된 주소가 없습니다.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {data.addresses.map((a, i) => (
                      <li key={i}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{a.addr_type_cd}</span>
                          {a.primary_yn === "Y" ? <Badge variant="primary">대표</Badge> : null}
                        </div>
                        <div className="text-sm">
                          [{a.postal_code ?? "-----"}] {a.line1 ?? ""} {a.line2 ?? ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 계좌 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">보유 계좌</CardTitle>
              <CardDescription>{data.accounts.length}건</CardDescription>
            </CardHeader>
            <CardContent>
              {data.accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">보유 계좌가 없습니다.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>계좌번호</TH>
                      <TH>유형</TH>
                      <TH>상태</TH>
                      <TH className="text-right">잔액</TH>
                      <TH className="text-right">출금 한도</TH>
                      <TH className="text-right">이체 한도</TH>
                      <TH>별명</TH>
                      <TH>주거래</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.accounts.map((a) => (
                      <TR key={a.account_no}>
                        <TD>
                          <Link href={`/accounts/${encodeId(a.account_no)}`} className="font-mono text-xs hover:underline">
                            {a.account_no}
                          </Link>
                        </TD>
                        <TD>{a.account_type_cd}</TD>
                        <TD>
                          <Badge variant={a.status_cd === "5050" || a.status_cd === "NORMAL" ? "success" : "warning"}>
                            {a.status_cd}
                          </Badge>
                        </TD>
                        <TD className="num-tabular text-right font-medium">{fmtKrw(a.balance)}</TD>
                        <TD className="num-tabular text-right text-xs text-muted-foreground">
                          {fmtKrw(a.daily_withdraw_limit)}
                        </TD>
                        <TD className="num-tabular text-right text-xs text-muted-foreground">
                          {fmtKrw(a.daily_transfer_limit)}
                        </TD>
                        <TD className="text-xs">{a.alias ?? "-"}</TD>
                        <TD>{a.primary_yn === "Y" ? <Badge variant="primary">●</Badge> : null}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 대출 */}
          {data.loans.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">대출 계약</CardTitle>
                <CardDescription>{data.loans.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH>계약번호</TH>
                      <TH>상품</TH>
                      <TH className="text-right">한도</TH>
                      <TH className="text-right">사용</TH>
                      <TH className="text-right">금리</TH>
                      <TH>상태</TH>
                      <TH>약정일</TH>
                      <TH>만기일</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.loans.map((l) => (
                      <TR key={l.loan_contract_no}>
                        <TD className="font-mono text-xs">{l.loan_contract_no}</TD>
                        <TD>{l.product_name ?? "-"}</TD>
                        <TD className="num-tabular text-right">{fmtKrw(l.contract_limit)}</TD>
                        <TD className="num-tabular text-right">{fmtKrw(l.current_usage)}</TD>
                        <TD className="num-tabular text-right">
                          {fmtPercent(l.contract_rate / 100, 2)}
                          {l.overdue_spread_rate && l.overdue_spread_rate > 0 ? (
                            <span className="ml-1 text-[10px] text-destructive">
                              +{fmtPercent(l.overdue_spread_rate / 100, 2)}
                            </span>
                          ) : null}
                        </TD>
                        <TD>
                          <Badge variant={l.loan_status_cd === "OVERDUE" ? "destructive" : "success"}>
                            {l.loan_status_cd ?? "-"}
                          </Badge>
                        </TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(l.contract_date)}</TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(l.maturity_date)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {/* 위임 */}
          {data.delegations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">위임 관계</CardTitle>
                <CardDescription>본인이 위임자/대리인인 관계 {fmtNumber(data.delegations.length)}건</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH>방향</TH>
                      <TH>역할</TH>
                      <TH>위임자 (TARGET)</TH>
                      <TH>대리인 (AGENT)</TH>
                      <TH>활성 권한</TH>
                      <TH>시작</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.delegations.map((d) => (
                      <TR key={d.delegation_id}>
                        <TD>
                          <Badge variant={d.direction === "AS_TARGET" ? "warning" : "primary"}>
                            {d.direction === "AS_TARGET" ? "수임" : "위임"}
                          </Badge>
                        </TD>
                        <TD>{d.role_type_cd ?? "-"}</TD>
                        <TD>
                          <PartyRef name={d.target_name} custNo={d.target_cust_no} />
                        </TD>
                        <TD>
                          <PartyRef name={d.agent_name} custNo={d.agent_cust_no} />
                        </TD>
                        <TD>
                          <ActivePerms d={d} />
                        </TD>
                        <TD className="text-xs text-muted-foreground">{fmtDateTime(d.start_date)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
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


function PartyRef({ name, custNo }: { name?: string | null; custNo?: number | null }) {
  if (custNo == null) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="leading-tight">
      <div className="text-sm font-medium">{name ?? "(이름 없음)"}</div>
      <div className="font-mono text-[10px] text-muted-foreground">#{custNo}</div>
    </div>
  );
}


// DELEGATION 의 8개 권한 컬럼 → 라벨 매핑.
const DELEG_PERMS: { key: keyof CustomerDelegation; label: string }[] = [
  { key: "inquiry_perm",      label: "조회" },
  { key: "withdraw_perm",     label: "출금" },
  { key: "transfer_perm",     label: "이체" },
  { key: "close_perm",        label: "해지" },
  { key: "open_product_perm", label: "상품개설" },
  { key: "loan_apply_perm",   label: "대출신청" },
  { key: "limit_change_perm", label: "한도변경" },
  { key: "pwd_change_perm",   label: "비번변경" },
];


function ActivePerms({ d }: { d: CustomerDelegation }) {
  const active = DELEG_PERMS.filter((p) => d[p.key] === "Y");
  if (active.length === 0) {
    return <span className="text-xs text-muted-foreground">권한 없음</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((p) => (
        <span
          key={p.key}
          className="inline-block rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}