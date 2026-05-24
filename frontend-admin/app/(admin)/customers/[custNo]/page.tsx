"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  api,
  ApiError,
  type CustomerDelegation,
  type CustomerDetail,
  type CustomerGradeHistoryRow,
  type CustomerStatusHistoryRow,
} from "@/lib/api";
import { decodeId, encodeId, fmtDateTime, fmtKrw, fmtNumber, fmtPercent } from "@/lib/utils";
import {
  accountStatusLabel,
  accountTypeLabel,
  addrTypeLabel,
  contactTypeLabel,
  customerStatusLabel,
  gradeLabel,
  loanStatusLabel,
  reasonCdLabel,
  roleTypeLabel,
} from "@/lib/labels";


const CUST_STATUSES = ["5050", "LIMITED", "LOCKED", "DORMANT"];
const CUST_STATUS_LABEL: Record<string, string> = {
  "5050": "정상",
  LIMITED: "거래제한",
  LOCKED: "잠금",
  DORMANT: "휴면",
};
const CUST_GRADES = ["VIP", "GENERAL", "MINOR", "SENIOR", "STUDENT"];
const CUST_GRADE_LABEL: Record<string, string> = {
  VIP: "VIP",
  GENERAL: "일반",
  MINOR: "미성년",
  SENIOR: "시니어",
  STUDENT: "학생",
};


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
  const [statusHistory, setStatusHistory] = useState<CustomerStatusHistoryRow[]>([]);
  const [gradeHistory, setGradeHistory] = useState<CustomerGradeHistoryRow[]>([]);

  const reload = useCallback(async () => {
    if (!custNo) return;
    try {
      const [detail, sh, gh] = await Promise.all([
        api.get<CustomerDetail>(`/api/admin/customers/${custNo}`),
        api.get<{ items: CustomerStatusHistoryRow[] }>(`/api/admin/customers/${custNo}/status-history`),
        api.get<{ items: CustomerGradeHistoryRow[] }>(`/api/admin/customers/${custNo}/grade-history`),
      ]);
      setData(detail);
      setStatusHistory(sh.items);
      setGradeHistory(gh.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원 상세를 불러오지 못했습니다.");
    }
  }, [custNo]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
                회원 #{data.customer.customer_no} · 당사자 #{data.customer.party_id ?? "-"} · {data.customer.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="primary">{gradeLabel(data.customer.grade_cd)}</Badge>
              <Badge variant={data.customer.status_cd === "5050" ? "success" : "warning"}>
                {customerStatusLabel(data.customer.status_cd)}
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
                        <span className="text-xs text-muted-foreground">{contactTypeLabel(c.contact_type_cd)}</span>
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
                          <span className="text-xs text-muted-foreground">{addrTypeLabel(a.addr_type_cd)}</span>
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
                        <TD>{accountTypeLabel(a.account_type_cd)}</TD>
                        <TD>
                          <Badge variant={a.status_cd === "5050" || a.status_cd === "NORMAL" ? "success" : "warning"}>
                            {accountStatusLabel(a.status_cd)}
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
                            {loanStatusLabel(l.loan_status_cd)}
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
                        <TD>{roleTypeLabel(d.role_type_cd)}</TD>
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

          {/* 관리자 액션 */}
          <ActionPanel
            customer={data.customer}
            reload={reload}
          />

          {/* 변경 이력 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusHistoryCard items={statusHistory} />
            <GradeHistoryCard items={gradeHistory} />
          </div>
        </>
      ) : null}
    </div>
  );
}


function ActionPanel({
  customer,
  reload,
}: {
  customer: CustomerDetail["customer"];
  reload: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">관리자 액션</CardTitle>
        <CardDescription>회원 상태·등급 강제 변경 — 변경 시 도메인 이력 + 감사 로그 자동 적재</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusActionForm
            customerNo={customer.customer_no}
            currentStatus={customer.status_cd ?? ""}
            reload={reload}
          />
          <GradeActionForm
            customerNo={customer.customer_no}
            currentGrade={customer.grade_cd ?? ""}
            reload={reload}
          />
        </div>
      </CardContent>
    </Card>
  );
}


function StatusActionForm({
  customerNo,
  currentStatus,
  reload,
}: {
  customerNo: number;
  currentStatus: string;
  reload: () => Promise<void>;
}) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setNewStatus(currentStatus);
  }, [currentStatus]);

  const disabled = submitting || !newStatus || newStatus === currentStatus;

  async function submit() {
    if (disabled) return;
    if (!window.confirm(`상태를 [${CUST_STATUS_LABEL[currentStatus] ?? currentStatus}] → [${CUST_STATUS_LABEL[newStatus] ?? newStatus}] 로 변경할까요?`)) {
      return;
    }
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      await api.post(`/api/admin/customers/${customerNo}/status`, {
        new_status_cd: newStatus,
        reason_cd: reason || null,
        remark: remark || null,
      });
      setOk("상태가 변경되었어요.");
      setReason("");
      setRemark("");
      await reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "변경에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-3.5 w-3.5 text-warning" />
        상태 변경
        <span className="text-[10px] text-muted-foreground">현재 {CUST_STATUS_LABEL[currentStatus] ?? currentStatus ?? "-"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {CUST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CUST_STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 코드 (FRAUD_LOCK)" />
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="비고" />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={() => void submit()}>
          {submitting ? "처리 중…" : "변경 적용"}
        </Button>
        {ok ? <span className="text-xs text-success">{ok}</span> : null}
        {err ? <span className="text-xs text-destructive">{err}</span> : null}
      </div>
    </div>
  );
}


function GradeActionForm({
  customerNo,
  currentGrade,
  reload,
}: {
  customerNo: number;
  currentGrade: string;
  reload: () => Promise<void>;
}) {
  const [newGrade, setNewGrade] = useState(currentGrade);
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setNewGrade(currentGrade);
  }, [currentGrade]);

  const disabled = submitting || !newGrade || newGrade === currentGrade;

  async function submit() {
    if (disabled) return;
    if (!window.confirm(`등급을 [${CUST_GRADE_LABEL[currentGrade] ?? currentGrade}] → [${CUST_GRADE_LABEL[newGrade] ?? newGrade}] 로 변경할까요?`)) return;
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      await api.post(`/api/admin/customers/${customerNo}/grade`, {
        new_grade_cd: newGrade,
        reason_cd: reason || null,
        remark: remark || null,
      });
      setOk("등급이 변경되었어요.");
      setReason("");
      setRemark("");
      await reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "변경에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Award className="h-3.5 w-3.5 text-primary" />
        등급 변경
        <span className="text-[10px] text-muted-foreground">현재 {CUST_GRADE_LABEL[currentGrade] ?? currentGrade ?? "-"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={newGrade}
          onChange={(e) => setNewGrade(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {CUST_GRADES.map((g) => (
            <option key={g} value={g}>
              {CUST_GRADE_LABEL[g] ?? g}
            </option>
          ))}
        </select>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 코드" />
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="비고" />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={() => void submit()}>
          {submitting ? "처리 중…" : "변경 적용"}
        </Button>
        {ok ? <span className="text-xs text-success">{ok}</span> : null}
        {err ? <span className="text-xs text-destructive">{err}</span> : null}
      </div>
    </div>
  );
}


function StatusHistoryCard({ items }: { items: CustomerStatusHistoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">상태 변경 이력</CardTitle>
        <CardDescription>{items.length}건 — 최근 순</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">변경 이력이 없습니다.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>일시</TH>
                <TH>변화</TH>
                <TH>사유</TH>
                <TH>처리자</TH>
                <TH>비고</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((h) => (
                <TR key={h.history_id}>
                  <TD className="text-xs">{fmtDateTime(h.event_datetime)}</TD>
                  <TD className="text-xs">
                    <span className="text-muted-foreground">{CUST_STATUS_LABEL[h.old_status_cd ?? ""] ?? h.old_status_cd ?? "-"}</span>
                    {" → "}
                    <span className="font-medium">{CUST_STATUS_LABEL[h.new_status_cd] ?? h.new_status_cd}</span>
                  </TD>
                  <TD className="text-xs">{reasonCdLabel(h.reason_cd)}</TD>
                  <TD className="font-mono text-[10px] text-muted-foreground">{h.employee_no ?? "-"}</TD>
                  <TD className="text-xs text-muted-foreground max-w-[160px] truncate" title={h.remark ?? ""}>
                    {h.remark ?? "-"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


function GradeHistoryCard({ items }: { items: CustomerGradeHistoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">등급 변경 이력</CardTitle>
        <CardDescription>{items.length}건 — 최근 순</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">변경 이력이 없습니다.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>시작</TH>
                <TH>종료</TH>
                <TH>등급</TH>
                <TH>사유</TH>
                <TH>처리자</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((h, i) => (
                <TR key={`${h.grade_start_date}-${i}`}>
                  <TD className="text-xs">{fmtDateTime(h.grade_start_date)}</TD>
                  <TD className="text-xs text-muted-foreground">
                    {h.grade_end_date ? fmtDateTime(h.grade_end_date) : <Badge variant="primary">현재</Badge>}
                  </TD>
                  <TD className="text-xs font-medium">{gradeLabel(h.grade_cd)}</TD>
                  <TD className="text-xs">{reasonCdLabel(h.reason_cd)}</TD>
                  <TD className="font-mono text-[10px] text-muted-foreground">{h.created_by ?? "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
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