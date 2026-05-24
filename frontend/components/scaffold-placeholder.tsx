import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ScaffoldPlaceholderProps {
  /** 명세서 화면 ID — 예: "SCR-TR-002" (개발자용 식별자, 화면 비노출) */
  code?: string;
  /** 화면 명칭 — 예: "이체 확인" */
  title: string;
  /** 한 줄 설명 (선택). 입력/액션 요약. */
  summary?: string;
  /** MVP | Signature | Later — 우선순위 배지 */
  priority?: "MVP" | "Signature" | "Later";
  /** 핵심 ERD / API 정보 등 (선택). 키-값 표로 렌더. */
  notes?: Record<string, string>;
}

const priorityClass: Record<NonNullable<ScaffoldPlaceholderProps["priority"]>, string> = {
  MVP: "bg-primary/10 text-primary",
  Signature: "bg-warning/10 text-warning",
  Later: "bg-muted text-muted-foreground",
};

/**
 * 모든 라우트 스텁이 공유하는 "준비 중" 컴포넌트.
 *
 * 다음 세션에서 실제 화면 로직으로 교체. 본 컴포넌트는 라우트 트리·layout·인증 가드 등
 * *주변 인프라* 가 동작하는지 확인하는 용도.
 */
export function ScaffoldPlaceholder({
  title,
  summary,
}: ScaffoldPlaceholderProps) {
  return (
    <main className="container max-w-3xl py-10 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {summary ? <CardDescription>{summary}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">준비 중인 화면입니다.</p>
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              ← 홈으로
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}