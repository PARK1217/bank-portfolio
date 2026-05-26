"use client";

/**
 * 관리자 인증 상태 hook + Provider + JWT-exp 기반 자동 로그아웃.
 *
 * 사용자(3001) 측 lib/auth.tsx 와 동일한 3-layer 정책:
 *   A. JWT-exp 절대 카운트다운 — 1초 tick, 60초 전 경고, 만료 시 강제 로그아웃
 *   B. 서버 401 인터셉트 — lib/api.ts 에서 hard-redirect 처리 (기존 동작 유지)
 *   C. 사용자 활동(keydown/click/touchstart + 라우트 변경) 즉시 silent refresh,
 *      마지막 갱신 후 30초 throttle. 마우스 호버·스크롤은 제외.
 *
 * 토스트는 admin 측에 sonner 가 없어 IdleCountdown 컴포넌트 자체 시각 변화(색·flash)
 * 와 console.warn 으로 안내. 수동 "연장" 버튼은 lastRefreshedAt 갱신으로 chip 이 잠깐
 * 강조됨.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, getAdminToken, setAdminToken, type AdminMe } from "./api";


const TICK_MS = 1000;
const WARN_BEFORE_SEC = 60;
const ACTIVITY_REFRESH_THROTTLE_MS = 30_000;


interface AdminAuthState {
  admin: AdminMe | null;
  loading: boolean;
  /** JWT 만료까지 남은 초. 비인증 / exp 없음 시 null. */
  idleRemainingSec: number | null;
  /** 마지막 refresh 성공 시각(ms). 컴포넌트가 "연장됨" 강조 효과에 사용. */
  lastRefreshedAt: number | null;
  /** 로그인 시도. 성공 시 토큰 저장 + /dashboard 로 이동. */
  login: (employeeNo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 사용자 수동 연장. POST /api/admin/auth/refresh. */
  refreshIdle: () => void;
}

const Ctx = createContext<AdminAuthState | null>(null);


function decodeExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}


export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [idleRemainingSec, setIdleRemainingSec] = useState<number | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const warnedRef = useRef<boolean>(false);
  const lastRefreshAtRef = useRef<number>(0);
  const refreshingRef = useRef<boolean>(false);

  // 마운트 시 토큰이 있으면 /me 로 검증.
  useEffect(() => {
    const stored = getAdminToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setTokenState(stored);
    (async () => {
      try {
        const me = await api.get<AdminMe>("/api/admin/auth/me");
        setAdmin(me);
      } catch {
        setAdminToken(null);
        setAdmin(null);
        setTokenState(null);
        if (pathname && !pathname.startsWith("/login") && !pathname.startsWith("/auto-logout")) {
          router.replace("/auto-logout?reason=expired");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 비인증 상태에서 보호 경로 접근 → /login
  useEffect(() => {
    if (loading) return;
    if (
      !admin &&
      pathname &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/auto-logout")
    ) {
      router.replace("/login");
    }
    if (admin && (pathname === "/login" || pathname?.startsWith("/auto-logout"))) {
      router.replace("/dashboard");
    }
  }, [admin, loading, pathname, router]);

  const doLogin = useCallback(async (employeeNo: string, password: string) => {
    const res = await api.post<{ access_token: string } & AdminMe>(
      "/api/admin/auth/login",
      { employee_no: employeeNo, password },
      { token: null },
    );
    setAdminToken(res.access_token);
    setTokenState(res.access_token);
    warnedRef.current = false;
    setAdmin({
      employee_no: res.employee_no,
      name: res.name,
      auth_level_cd: res.auth_level_cd,
      session_id: res.session_id,
    });
    router.replace("/dashboard");
  }, [router]);

  const doLogout = useCallback(async () => {
    try {
      await api.post("/api/admin/auth/logout");
    } catch {
      // 백엔드 호출 실패해도 로컬 토큰은 비우고 진행
    }
    setAdminToken(null);
    setAdmin(null);
    setTokenState(null);
    setIdleRemainingSec(null);
    warnedRef.current = false;
    router.replace("/login");
  }, [router]);

  const performRefresh = useCallback(async (opts: { silent: boolean }) => {
    if (refreshingRef.current) return;
    if (opts.silent && Date.now() - lastRefreshAtRef.current < ACTIVITY_REFRESH_THROTTLE_MS) {
      return;
    }
    refreshingRef.current = true;
    try {
      const res = await api.post<{ access_token: string; expires_in: number }>(
        "/api/admin/auth/refresh",
      );
      setAdminToken(res.access_token);
      setTokenState(res.access_token);
      warnedRef.current = false;
      lastRefreshAtRef.current = Date.now();
      setLastRefreshedAt(Date.now());
    } catch {
      // 401 인터셉트는 lib/api.ts 가 별도 처리
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const refreshIdle = useCallback(() => {
    void performRefresh({ silent: false });
  }, [performRefresh]);

  // JWT-exp 카운트다운
  useEffect(() => {
    if (!admin || !token) {
      setIdleRemainingSec(null);
      return;
    }
    const expMs = decodeExpMs(token);
    if (!expMs) {
      setIdleRemainingSec(null);
      return;
    }
    let firedLogout = false;

    const tick = () => {
      const remainingMs = expMs - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setIdleRemainingSec(remainingSec);

      if (remainingSec <= WARN_BEFORE_SEC && remainingSec > 0 && !warnedRef.current) {
        warnedRef.current = true;
        console.warn(`[admin-auth] ${remainingSec}초 후 세션이 만료됩니다.`);
      }

      if (remainingMs <= 0 && !firedLogout) {
        firedLogout = true;
        setAdminToken(null);
        setAdmin(null);
        setTokenState(null);
        void api.post("/api/admin/auth/logout").catch(() => {});
        router.replace("/auto-logout?reason=expired");
      }
    };
    tick();
    const intervalId = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [admin, token, router]);

  // 사용자 활동 즉시 silent refresh
  useEffect(() => {
    if (!admin) return;
    const onActivity = () => {
      void performRefresh({ silent: true });
    };
    const evts: (keyof WindowEventMap)[] = ["keydown", "click", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => evts.forEach((e) => window.removeEventListener(e, onActivity));
  }, [admin, performRefresh]);

  // 라우트 변경 시 즉시 silent refresh
  useEffect(() => {
    if (!admin) return;
    void performRefresh({ silent: true });
  }, [pathname, admin, performRefresh]);

  return (
    <Ctx.Provider
      value={{
        admin,
        loading,
        idleRemainingSec,
        lastRefreshedAt,
        login: doLogin,
        logout: doLogout,
        refreshIdle,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return v;
}

/** UI 안내용 — 백엔드 JWT_EXPIRE_MINUTES 와 일치해야 함. */
export const IDLE_TIMEOUT_MINUTES = 30;