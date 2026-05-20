import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ScaffoldPlaceholderProps {
  /** 명세서 화면 ID — 예: "SCR-TR-002" */
  code: string;
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
  code,
  title,
  summary,
  priority,
  notes,
}: ScaffoldPlaceholderProps) {
  return (
    <main className="container max-w-3xl py-10 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">{code}</span>
            {priority ? (
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${priorityClass[priority]}`}
              >
                {priority}
              </span>
            ) : null}
          </div>
          <CardTitle className="mt-1">{title}</CardTitle>
          {summary ? <CardDescription>{summary}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            스캐폴딩 완료 — 화면 구현은 다음 세션에서 진행합니다.
          </p>
          {notes ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-muted/40 p-3 text-xs">
              {Object.entries(notes).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
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