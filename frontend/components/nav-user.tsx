"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { IdleCountdown } from "@/components/idle-countdown";

/**
 * 우측 상단 사용자 메뉴 — 드롭다운.
 *   미로그인 → "로그인" 링크
 *   로그인   → "고객 #N ▾" 클릭 시 드롭다운 (보안설정 / 상품 / 알림 / 공지·이벤트 / 로그아웃)
 *
 * 의존성 최소화: radix/headless ui 없이 useState + outside-click + Escape 닫힘.
 */
export function NavUser() {
  const { isAuthenticated, customerNo, signOut, isReady } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // 인증 상태가 켜지면 /api/auth/me 로 이름 조회. 토큰 바뀔 때마다 재호출.
  useEffect(() => {
    if (!isAuthenticated) {
      setName(null);
      return;
    }
    let alive = true;
    void api
      .get<{ name?: string | null }>("/api/auth/me")
      .then((res) => {
        if (alive) setName(res.name ?? null);
      })
      .catch(() => {
        // 401 은 AuthProvider 의 onAuthExpired 가 처리 — 여기선 표시만 비워둔다.
        if (alive) setName(null);
      });
    return () => {
      alive = false;
    };
  }, [isAuthenticated, customerNo]);

  // 외부 클릭/포커스/Escape 시 닫기.
  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!isReady) {
    return <div className="h-7 w-20" aria-hidden />;
  }

  if (!isAuthenticated) {
    return (
      <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
        로그인
      </Link>
    );
  }

  async function onLogout() {
    setOpen(false);
    try {
      await api.post("/api/auth/logout", null);
    } catch (err) {
      if (err instanceof ApiError) {
        console.warn("logout endpoint failed:", err.code, err.requestId);
      }
    }
    signOut();
    router.push("/login");
    toast.success("로그아웃되었습니다.");
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <IdleCountdown />
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <span>
            {name ? (
              <>
                {name} <span className="text-muted-foreground/60">님</span>
              </>
            ) : (
              <>
                고객 <span className="font-mono">#{customerNo ?? "-"}</span>
              </>
            )}
          </span>
          <span aria-hidden className="text-[0.65rem]">▾</span>
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            <MenuLink href="/transfer/auto" onClick={() => setOpen(false)}>
              자동이체
            </MenuLink>
            <MenuLink href="/security" onClick={() => setOpen(false)}>
              보안 설정
            </MenuLink>
            <MenuLink href="/notifications" onClick={() => setOpen(false)}>
              알림 센터
            </MenuLink>
            <MenuLink href="/notices" onClick={() => setOpen(false)}>
              공지·이벤트
            </MenuLink>
            <MenuLink href="/faqs" onClick={() => setOpen(false)}>
              자주 묻는 질문
            </MenuLink>
            <div className="my-1 border-t" />
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
            >
              로그아웃
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-3 py-2 text-sm hover:bg-accent"
    >
      {children}
    </Link>
  );
}