"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, getAdminToken, setAdminToken, type AdminMe } from "./api";


interface AdminAuthState {
  admin: AdminMe | null;
  loading: boolean;
  /** 로그인 시도. 성공 시 토큰 저장 + /dashboard 로 이동. */
  login: (employeeNo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AdminAuthState | null>(null);


export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  // 마운트 시 토큰이 있으면 /me 로 검증.
  // 토큰이 있었는데 검증 실패한 경우는 "자동 로그아웃" — `/auto-logout?reason=expired` 로.
  // 처음부터 토큰이 없으면 "직접 진입" — 보호 경로 가드에서 `/login` 으로.
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const me = await api.get<AdminMe>("/api/admin/auth/me");
        setAdmin(me);
      } catch {
        setAdminToken(null);
        setAdmin(null);
        // api.ts 의 401 hard-redirect 가 우선 적용되지만, 그 외 네트워크 오류 등도 안전망으로 처리.
        if (pathname && !pathname.startsWith("/login") && !pathname.startsWith("/auto-logout")) {
          router.replace("/auto-logout?reason=expired");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 비인증 상태에서 보호 경로 접근 → /login (자동 로그아웃 안내 페이지는 예외)
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
    router.replace("/login");
  }, [router]);

  return (
    <Ctx.Provider value={{ admin, loading, login: doLogin, logout: doLogout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return v;
}