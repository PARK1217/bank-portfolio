"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";


/**
 * 약관 동의 UX 컴포넌트 — 시중 은행 모바일 앱 표준 패턴.
 *
 * 동작:
 *  1) 약관 목록에 체크박스 + "보기" 링크. 체크박스만으론 동의 불가 (반드시 본문 노출 후).
 *  2) 항목 클릭 → 본문 모달 오픈. 본문은 prop `body` 우선, 없으면 `fetch_url` 로 fetch.
 *  3) 모달 본문 영역 스크롤이 끝까지 도달 → "동의" 버튼 활성. (또는 자동 동의 옵션)
 *  4) 동의 → 다음 미동의 필수 항목 모달 자동 오픈. 모두 동의되면 제출 활성.
 *  5) 전체 동의 체크박스 — 모든 항목을 한번에 처리(모달 없이) 시 사용.
 *
 * 의존: Button, Spinner, cn util.
 */

export interface TermsItem {
  terms_id: number;
  version: number;
  title: string;
  required: boolean;
  /** 본문 markdown/plain text. 우선 사용 */
  body?: string;
  /** body 없을 때 fetch 시도 URL (e.g. /api/terms/{id}/body) — 백엔드가 본문을 반환해야 함 */
  fetch_url?: string;
  /** 본문 전체 외부 페이지 링크 (모달 대신 새 창으로 열고 싶을 때) */
  external_href?: string;
}

export interface TermsConsent {
  terms_id: number;
  version: number;
  agreed: boolean;
}

interface Props {
  terms: TermsItem[];
  submitLabel?: string;
  /** 모든 필수 동의 완료 후 호출. 비동기 처리 동안 spinner 표시. */
  onSubmit: (consents: TermsConsent[]) => Promise<void>;
  /** 진행률 안내 (예: "가입 1/4 단계") */
  stepLabel?: string;
  /** 스크롤 끝까지 → 자동 체크 (요즘 모바일 은행앱 표준). 기본 true. */
  autoAgreeOnScroll?: boolean;
}


export function TermsAgreementFlow({
  terms,
  submitLabel = "동의하고 다음으로",
  onSubmit,
  stepLabel,
  autoAgreeOnScroll = true,
}: Props) {
  const [agreed, setAgreed] = useState<Record<number, boolean>>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requiredTerms = useMemo(() => terms.filter((t) => t.required), [terms]);
  const requiredOk = requiredTerms.every((t) => agreed[t.terms_id]);
  const allChecked = terms.every((t) => agreed[t.terms_id]);

  function findNextUnagreed(afterId?: number): number | null {
    const startIdx = afterId == null ? 0 : terms.findIndex((t) => t.terms_id === afterId) + 1;
    for (let i = startIdx; i < terms.length; i++) {
      const t = terms[i];
      if (!agreed[t.terms_id] && t.required) return t.terms_id;
    }
    return null;
  }

  function onAgreeOne(id: number) {
    setAgreed((cur) => ({ ...cur, [id]: true }));
    const next = findNextUnagreed(id);
    setOpenId(next); // null이면 모달 닫힘
  }

  function toggleOne(id: number, checked: boolean) {
    if (checked) {
      // 체크 시도 → 본문 모달 열기 (직접 체크 차단)
      setOpenId(id);
    } else {
      setAgreed((cur) => ({ ...cur, [id]: false }));
    }
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      // "전체 동의" — 모든 항목 즉시 동의 (모달 없이) — 사용자 편의 단축
      const next: Record<number, boolean> = {};
      terms.forEach((t) => (next[t.terms_id] = true));
      setAgreed(next);
    } else {
      setAgreed({});
    }
  }

  async function submit() {
    if (!requiredOk || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(
        terms.map((t) => ({
          terms_id: t.terms_id,
          version: t.version,
          agreed: !!agreed[t.terms_id],
        })),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const openTerm = openId != null ? terms.find((t) => t.terms_id === openId) ?? null : null;

  return (
    <div className="space-y-4">
      {stepLabel ? (
        <div className="font-mono text-xs text-muted-foreground">{stepLabel}</div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-primary/5 px-3 py-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
        />
        <span>아래 약관에 모두 동의합니다 (전체 동의)</span>
      </label>

      <ul className="space-y-1.5">
        {terms.map((t) => {
          const isAgreed = !!agreed[t.terms_id];
          return (
            <li
              key={t.terms_id}
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-2.5 text-sm"
            >
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => toggleOne(t.terms_id, e.target.checked)}
                aria-label={`${t.title} 동의`}
              />
              <span className="min-w-0 flex-1">
                <span className="mr-1 text-xs text-muted-foreground">
                  [{t.required ? "필수" : "선택"}]
                </span>
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => setOpenId(t.terms_id)}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                보기 →
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        className="w-full"
        onClick={submit}
        disabled={!requiredOk || submitting}
      >
        {submitting ? <Spinner size="sm" label="처리 중…" /> : submitLabel}
      </Button>
      {!requiredOk ? (
        <p className="text-center text-xs text-muted-foreground">
          필수 약관을 모두 동의해야 진행됩니다. 항목을 눌러 본문을 확인하고 동의해 주세요.
        </p>
      ) : null}

      {openTerm ? (
        <TermsModal
          term={openTerm}
          autoAgreeOnScroll={autoAgreeOnScroll}
          onAgree={() => onAgreeOne(openTerm.terms_id)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}


function TermsModal({
  term,
  autoAgreeOnScroll,
  onAgree,
  onClose,
}: {
  term: TermsItem;
  autoAgreeOnScroll: boolean;
  onAgree: () => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState<string | null>(term.body ?? null);
  const [loading, setLoading] = useState(!term.body && !!term.fetch_url);
  const [reachedBottom, setReachedBottom] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const autoClickedRef = useRef(false);

  useEffect(() => {
    if (term.body) {
      setBody(term.body);
      setLoading(false);
      return;
    }
    if (!term.fetch_url) {
      setBody("약관 본문이 제공되지 않았습니다. (구현 안내: TermsAgreementFlow 의 `body` 또는 `fetch_url` prop 으로 본문 전달)");
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    fetch(term.fetch_url)
      .then((res) => res.text())
      .then((txt) => {
        if (!canceled) {
          setBody(txt);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!canceled) {
          setBody("본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setLoading(false);
        }
      });
    return () => {
      canceled = true;
    };
  }, [term.body, term.fetch_url]);

  function onScroll() {
    const el = bodyRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (remaining <= 24) {
      if (!reachedBottom) setReachedBottom(true);
      // 스크롤 끝 도달 시 자동 동의 (옵션). 한 번만.
      if (autoAgreeOnScroll && !autoClickedRef.current) {
        autoClickedRef.current = true;
        // 짧은 지연으로 사용자에게 도달 인지 시각 줌
        window.setTimeout(() => onAgree(), 250);
      }
    }
  }

  // 마운트 시 스크롤 가능 여부 체크 — 본문이 짧으면 즉시 reachedBottom = true
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || loading) return;
    const overflow = el.scrollHeight > el.clientHeight + 8;
    if (!overflow) {
      setReachedBottom(true);
    }
  }, [body, loading]);

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`term-modal-title-${term.terms_id}`}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl bg-card shadow-2xl animate-fade-in sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              [{term.required ? "필수" : "선택"}] v{term.version}
            </div>
            <h2 id={`term-modal-title-${term.terms_id}`} className="truncate text-base font-semibold">
              {term.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        <div
          ref={bodyRef}
          onScroll={onScroll}
          className="min-h-[40vh] flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed"
        >
          {loading ? (
            <Spinner label="약관 본문 불러오는 중…" />
          ) : (
            <article className="whitespace-pre-wrap">{body}</article>
          )}
        </div>

        <footer className="border-t bg-muted/30 px-4 py-3">
          {autoAgreeOnScroll ? (
            <p
              className={cn(
                "mb-2 text-center text-[11px]",
                reachedBottom ? "text-success" : "text-muted-foreground",
              )}
            >
              {reachedBottom
                ? "✓ 본문을 끝까지 확인했습니다 — 자동 동의 처리합니다"
                : "끝까지 스크롤하면 자동으로 동의 처리됩니다"}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              닫기
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => onAgree()}
              disabled={!reachedBottom && term.required}
            >
              {term.required ? "이 약관에 동의" : "확인"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}