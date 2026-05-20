import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


/**
 * 개발자용 전체 화면 인덱스 — 모든 구현된 라우트 진입점 모음.
 * 시중은행 메인 페이지와 분리하여 데모/포트폴리오 검토용으로만 노출.
 * 푸터 링크에서 접근.
 */

const ROUTE_SECTIONS: { title: string; items: { href: string; code: string; label: string }[] }[] = [
  {
    title: "인증 / 가입",
    items: [
      { href: "/login", code: "AU-001", label: "로그인" },
      { href: "/signup", code: "AU-pre", label: "가입 사전 게이트" },
      { href: "/signup/terms", code: "AU-002", label: "약관 동의" },
      { href: "/signup/verify", code: "AU-003", label: "본인인증" },
      { href: "/signup/account", code: "AU-004", label: "계정정보" },
      { href: "/signup/corporation", code: "AU-005", label: "법인 가입" },
      { href: "/signup/foreigner", code: "AU-006", label: "외국인 가입" },
      { href: "/signup/complete", code: "AU-007", label: "가입 완료" },
      { href: "/setup/simple-pin", code: "AU-008", label: "간편 PIN" },
      { href: "/setup/biometric", code: "AU-009", label: "생체인증 등록" },
      { href: "/setup/otp", code: "AU-010", label: "OTP 등록 ⭐" },
      { href: "/password/reset", code: "AU-011", label: "비밀번호 재설정" },
      { href: "/logout", code: "AU-012", label: "로그아웃" },
    ],
  },
  {
    title: "대시보드 / 알림",
    items: [
      { href: "/dashboard", code: "HM-001", label: "메인 대시보드" },
      { href: "/notifications", code: "HM-004", label: "알림 ⭐" },
      { href: "/auto-logout", code: "—", label: "자동 로그아웃 안내" },
    ],
  },
  {
    title: "계좌",
    items: [
      { href: "/accounts", code: "AC-001", label: "계좌 목록" },
      { href: "/accounts/SAMPLE_TOKEN", code: "AC-002", label: "계좌 상세" },
      { href: "/accounts/SAMPLE_TOKEN/passbook", code: "AC-003", label: "통장 SVG ⭐" },
      { href: "/accounts/SAMPLE_TOKEN/transactions", code: "AC-004", label: "거래 내역" },
      { href: "/transactions/SAMPLE_TX", code: "AC-005", label: "거래 상세" },
      { href: "/accounts/SAMPLE_TOKEN/edit", code: "AC-006", label: "별명 변경" },
      { href: "/accounts/SAMPLE_TOKEN/hide", code: "AC-007", label: "숨김 설정" },
      { href: "/accounts/SAMPLE_TOKEN/limit", code: "AC-008", label: "한도 변경" },
      { href: "/accounts/SAMPLE_TOKEN/close", code: "AC-009", label: "계좌 해지" },
      { href: "/accounts/SAMPLE_TOKEN/lost", code: "AC-010", label: "분실 신고" },
    ],
  },
  {
    title: "상품 / 개설",
    items: [
      { href: "/products", code: "OP-001", label: "상품 카탈로그" },
      { href: "/products/1", code: "OP-002", label: "상품 상세" },
      { href: "/products/1/open-saving", code: "OP-003", label: "자유입출금 개설" },
      { href: "/products/1/open-deposit", code: "OP-004", label: "정기예금 개설" },
      { href: "/products/1/open-installment", code: "OP-005", label: "적금 개설 ⭐" },
      { href: "/products/1/open-joint", code: "OP-006", label: "공동명의 ⭐" },
      { href: "/products/1/open-foreign", code: "OP-007", label: "외화계좌 개설" },
      { href: "/products/1/open-minor", code: "OP-008", label: "미성년 자녀 ⭐" },
      { href: "/products/complete/SAMPLE_TOKEN", code: "OP-009", label: "개설 완료" },
      { href: "/products/1/terms", code: "OP-010", label: "약관 동의" },
    ],
  },
  {
    title: "이체",
    items: [
      { href: "/transfer", code: "TR-001", label: "즉시이체" },
      { href: "/transfer/confirm", code: "TR-002", label: "이체 확인" },
      { href: "/transfer/complete/SAMPLE_TX", code: "TR-003", label: "이체 완료" },
      { href: "/transfer/favorites", code: "TR-004", label: "자주쓰는계좌 ⭐" },
      { href: "/transfer/auto/new", code: "TR-005", label: "자동이체 등록 ⭐" },
      { href: "/transfer/auto", code: "TR-006", label: "자동이체 목록 ⭐" },
      { href: "/transfer/auto/SAMPLE/history", code: "TR-007", label: "자동이체 이력 ⭐" },
      { href: "/transfer/scheduled", code: "TR-008", label: "예약 이체 ⭐" },
      { href: "/transfer/recall", code: "TR-009", label: "오송금 회수" },
    ],
  },
  {
    title: "대출",
    items: [
      { href: "/loans", code: "LN-001", label: "대출 상품" },
      { href: "/loans/1/precheck", code: "LN-002", label: "한도 조회" },
      { href: "/loans/1/apply", code: "LN-003", label: "정식 신청" },
      { href: "/loans/SAMPLE_APP/documents", code: "LN-004", label: "서류 제출" },
      { href: "/loans/SAMPLE_APP/status", code: "LN-005", label: "심사 진행" },
      { href: "/loans/SAMPLE_APP/contract", code: "LN-006", label: "약정 ⭐" },
      { href: "/loans/SAMPLE_LOAN/execute", code: "LN-007", label: "실행 ⭐ (멱등성)" },
      { href: "/loans/SAMPLE_LOAN", code: "LN-008", label: "대출 상세" },
      { href: "/loans/SAMPLE_LOAN/schedule", code: "LN-009", label: "상환 스케줄" },
      { href: "/loans/SAMPLE_LOAN/prepay", code: "LN-010", label: "중도상환" },
    ],
  },
  {
    title: "자산분석 (자산분석 deferred, stub)",
    items: [
      { href: "/asset-analysis", code: "AS-001", label: "메인" },
      { href: "/asset-analysis/survey", code: "AS-002", label: "설문" },
      { href: "/asset-analysis/processing/SAMPLE", code: "AS-003", label: "분석 중" },
      { href: "/asset-analysis/result/SAMPLE", code: "AS-004", label: "결과" },
      { href: "/asset-analysis/product/1", code: "AS-005", label: "추천 상품" },
    ],
  },
  {
    title: "챗봇",
    items: [
      { href: "/chatbot", code: "CB-001", label: "대화창 ⭐" },
      { href: "/chatbot/faq", code: "CB-002", label: "FAQ ⭐" },
      { href: "/chatbot/terms-search", code: "CB-003", label: "약관 검색 ⭐" },
      { href: "/chatbot/history", code: "CB-004", label: "대화 이력" },
      { href: "/chatbot/source/SAMPLE", code: "CB-005", label: "답변 출처 ⭐" },
      { href: "/chatbot/handoff", code: "CB-006", label: "상담원 연결" },
    ],
  },
  {
    title: "보안 설정",
    items: [
      { href: "/security", code: "SC-001", label: "보안 메인" },
      { href: "/security/password", code: "SC-002", label: "비밀번호 변경" },
      { href: "/security/devices", code: "SC-003", label: "기기 관리" },
      { href: "/security/devices/new", code: "SC-004", label: "기기 등록" },
      { href: "/security/otp", code: "SC-005", label: "OTP 재발급" },
      { href: "/security/transfer-limit", code: "SC-006", label: "이체 한도" },
      { href: "/security/fds-alerts", code: "SC-007", label: "FDS 알림" },
    ],
  },
  {
    title: "약관 · 민원",
    items: [
      { href: "/terms", code: "PL-001", label: "약관 목록" },
      { href: "/terms/1", code: "PL-002", label: "약관 상세" },
      { href: "/terms/1/history", code: "PL-003", label: "약관 변경 이력" },
      { href: "/terms/my-agreements", code: "PL-004", label: "내 동의 이력" },
      { href: "/complaints/new", code: "CM-001", label: "민원 접수" },
      { href: "/complaints", code: "CM-002", label: "민원 목록" },
      { href: "/complaints/SAMPLE_TOKEN", code: "CM-003", label: "민원 상세" },
    ],
  },
];

const STATS = {
  total: ROUTE_SECTIONS.reduce((s, sec) => s + sec.items.length, 0),
  signature: 23,
  mvp: 31,
};


export default function Page() {
  return (
    <main className="container max-w-5xl py-10 animate-fade-in">
      <section>
        <div className="font-mono text-xs text-muted-foreground">/dev-testpage</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">개발자 전체 화면 인덱스</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          명세서 v53 의 모든 화면 진입점. 시중은행 메인은{" "}
          <Link href="/" className="text-primary hover:underline">/</Link> 에 있습니다. 본 페이지는 데모·포트폴리오 검토 편의용.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>총 <span className="font-semibold text-foreground">{STATS.total}</span>개 라우트</span>
          <span>MVP {STATS.mvp}</span>
          <span>Signature {STATS.signature}</span>
          <span>자산분석·마이데이터는 deferred</span>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROUTE_SECTIONS.map((sec) => (
          <Card key={sec.title}>
            <CardHeader>
              <CardTitle className="text-base">{sec.title}</CardTitle>
              <CardDescription>{sec.items.length}개 진입점</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {sec.items.map((it) => (
                <Link
                  key={it.href + it.code}
                  href={it.href}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{it.code}</span>
                  <span>{it.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}