"use client";

/**
 * 인증 상태 hook + Provider + JWT-exp 기반 자동 로그아웃.
 *
 * 저장 책임 : JWT 토큰은 lib/api.ts 의 localStorage('bank.jwt') 에 보관.
 *             이 모듈은 React 상태 미러링 + 만료 시각 추적.
 * customerNo : JWT payload 에서 추출 (백엔드가 sub=customer_no 또는 `customer_no` 클레임 사용).
 *
 * 자동 로그아웃 (은행 도메인 표준)
 * ---
 *   A. **JWT-exp 절대 카운트다운**
 *      - 토큰 payload 의 `exp` 클레임 기준 절대 시각 (활동 무관)
 *      - 1초 tick 으로 남은 시간(`idleRemainingSec`) 갱신 — UI 카운트다운 = 백엔드 토큰 만료까지
 *      - 만료 60초 전: 토스트 경고 1회 ("곧 자동 로그아웃됩니다")
 *      - 만료 도래: signOut + /auto-logout?reason=expired (사용자 활동 무관)
 *   B. **서버 401 인터셉트** (lib/api.ts onAuthExpired)
 *      - 응답 코드 E_TOKEN_EXPIRED / E_TOKEN_INVALID 시 자동 signOut + /auto-logout?reason=expired|invalid
 *      - A 가 먼저 트리거되면 B 는 중복 진입 방지 (현재 path 가 /auto-logout 이면 skip)
 *   C. **활동 기반 silent refresh**
 *      - 명시적 사용자 액션만 활동으로 인정 — `keydown` / `click` / `touchstart` + 라우트 변경(`usePathname` 변동)
 *        마우스 호버(`mousemove`)와 스크롤은 의도 없는 신호로 보고 제외. 페이지 새로고침은 Provider remount 로 자동 카운트.
 *      - 만료 임박(`SILENT_REFRESH_THRESHOLD_SEC`) 시점에 최근 활동(`SILENT_REFRESH_ACTIVITY_WINDOW_MS`)
 *        이 있으면 자동으로 `/api/auth/refresh` 호출 → 토큰 교체 + 카운트다운 재시작 (silent, 토스트 없음)
 *      - 이 갱신이 성공하면 만료 60초 전 경고도 새 토큰의 exp 기준으로 다시 계산
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
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  clearLastRequestId,
  getStoredToken,
  onAuthExpired,
  setStoredToken,
} from "./api";


// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const TICK_MS = 1000;                  // 1초 tick
const WARN_BEFORE_SEC = 60;            // 만료 60초 전 토스트 경고
const SILENT_REFRESH_THRESHOLD_SEC = 120;        // 만료 2분 남으면 활동 체크 시작
const SILENT_REFRESH_ACTIVITY_WINDOW_MS = 60_000; // 최근 60초 내 활동 있어야 자동 갱신


// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface AuthState {
  token: string | null;
  customerNo: number | null;
  isAuthenticated: boolean;
  /** localStorage 초기 동기화 끝났는가. SSR/CSR 교차 깜빡임 방지용. */
  isReady: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, customerNo?: number | null) => void;
  signOut: () => void;
  /** JWT 만료까지 남은 초. 비인증 / exp 없음 시 null. (변수명 호환 — 의미는 토큰 남은 시간) */
  idleRemainingSec: number | null;
  /** 사용자가 수동 연장 액션 — `/api/auth/refresh` 호출 후 토스트로 결과 안내. */
  refreshIdle: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);


// ---------------------------------------------------------------------------
// JWT payload 디코드 (검증 X — 표시용)
// ---------------------------------------------------------------------------

interface DecodedJwt {
  customerNo: number | null;
  expMs: number | null;  // exp 클레임 → epoch ms
}

function decodeJwt(token: string): DecodedJwt {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return { customerNo: null, expMs: null };
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));

    let customerNo: number | null = null;
    if (typeof decoded.customer_no === "number") customerNo = decoded.customer_no;
    else if (typeof decoded.customer_no === "string") {
      const n = Number(decoded.customer_no);
      customerNo = Number.isFinite(n) ? n : null;
    } else if (typeof decoded.sub === "string") {
      const n = Number(decoded.sub);
      customerNo = Number.isFinite(n) ? n : null;
    }

    const expMs = typeof decoded.exp === "number" ? decoded.exp * 1000 : null;

    return { customerNo, expMs };
  } catch {
    return { customerNo: null, expMs: null };
  }
}


// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({
    token: null,
    customerNo: null,
    isAuthenticated: false,
    isReady: false,
  });
  const [idleRemainingSec, setIdleRemainingSec] = useState<number | null>(null);
  // 1회 경고 토스트 발화 여부 (token 단위로 reset 됨)
  const warnedRef = useRef<boolean>(false);
  // 활동 기반 silent refresh — 최근 활동 시각 + 중복 호출 방지
  const lastActivityRef = useRef<number>(Date.now());
  const refreshingRef = useRef<boolean>(false);

  // ---- 초기 localStorage 동기화 -----------------------------------------
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      const { customerNo } = decodeJwt(stored);
      setState({
        token: stored,
        customerNo,
        isAuthenticated: true,
        isReady: true,
      });
    } else {
      setState((s) => ({ ...s, isReady: true }));
    }
  }, []);

  // ---- signIn / signOut --------------------------------------------------
  const signIn = useCallback((token: string, customerNo?: number | null) => {
    setStoredToken(token);
    warnedRef.current = false;  // 새 토큰 → 경고 재시작
    setState({
      token,
      customerNo: customerNo ?? decodeJwt(token).customerNo,
      isAuthenticated: true,
      isReady: true,
    });
  }, []);

  const signOut = useCallback(() => {
    setStoredToken(null);
    clearLastRequestId();
    setIdleRemainingSec(null);
    warnedRef.current = false;
    setState({ token: null, customerNo: null, isAuthenticated: false, isReady: true });
  }, []);

  const performRefresh = useCallback(async (opts: { silent: boolean }) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const res = await api.post<{ access_token: string; expires_in: number }>(
        "/api/auth/refresh",
        null,
      );
      setStoredToken(res.access_token);
      warnedRef.current = false;  // 새 토큰 → 경고 재시작
      setState((s) => ({
        ...s,
        token: res.access_token,
        customerNo: decodeJwt(res.access_token).customerNo ?? s.customerNo,
      }));
      if (!opts.silent) {
        toast.success("세션이 연장되었습니다.", { duration: 2500 });
      }
    } catch {
      // 401 인터셉트가 별도로 동작하므로 별도 토스트 불필요
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const refreshIdle = useCallback(() => {
    void performRefresh({ silent: false });
  }, [performRefresh]);

  // ---- Layer B : 서버 인증 만료 응답 자동 처리 -----------------------------
  useEffect(() => {
    return onAuthExpired((reason) => {
      if (typeof window !== "undefined" && window.location.pathname === "/auto-logout") {
        return;
      }
      signOut();
      router.push(`/auto-logout?reason=${reason}`);
    });
  }, [signOut, router]);

  // ---- Layer A : JWT-exp 절대 카운트다운 ---------------------------------
  useEffect(() => {
    if (!state.isAuthenticated || !state.token) {
      setIdleRemainingSec(null);
      return;
    }

    const { expMs } = decodeJwt(state.token);
    if (!expMs) {
      // exp 클레임이 없는 토큰 (이상 케이스) — 카운트다운 비활성
      setIdleRemainingSec(null);
      return;
    }

    let firedLogout = false;

    const tick = () => {
      const remainingMs = expMs - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setIdleRemainingSec(remainingSec);

      // 활동 기반 silent refresh — 만료 2분 전 + 최근 60초 내 활동 있으면 자동 갱신
      if (
        remainingSec > 0 &&
        remainingSec <= SILENT_REFRESH_THRESHOLD_SEC &&
        Date.now() - lastActivityRef.current <= SILENT_REFRESH_ACTIVITY_WINDOW_MS &&
        !refreshingRef.current
      ) {
        void performRefresh({ silent: true });
      }

      // 만료 60초 전 — 1회만 경고
      if (remainingSec <= WARN_BEFORE_SEC && remainingSec > 0 && !warnedRef.current) {
        warnedRef.current = true;
        toast.warning(`${remainingSec}초 후 세션이 만료됩니다.`, {
          description: "활성 작업이 있다면 지금 저장해 주세요. 만료 후 다시 로그인이 필요합니다.",
          duration: Math.min(remainingSec * 1000, 10_000),
        });
      }

      // 만료 도래 — 강제 로그아웃 (사용자 활동 무관, 다른 탭이어도 동작)
      if (remainingMs <= 0 && !firedLogout) {
        firedLogout = true;
        toast.error("세션이 만료되어 자동 로그아웃됩니다.", { duration: 5000 });
        void api.post("/api/auth/logout", null).catch(() => {});
        signOut();
        // 약간의 지연으로 토스트가 보이도록
        window.setTimeout(() => {
          router.push("/auto-logout?reason=expired");
        }, 300);
      }
    };
    tick();
    const intervalId = window.setInterval(tick, TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.isAuthenticated, state.token, signOut, router, performRefresh]);

  // ---- Layer C : 사용자 활동 시각 기록 (활동 기반 silent refresh 입력) ------
  // mousemove(호버)·scroll 같은 의도 없는 신호는 제외. 명시적 입력만 카운트.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const evts: (keyof WindowEventMap)[] = ["keydown", "click", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));
    return () => {
      evts.forEach((e) => window.removeEventListener(e, markActivity));
    };
  }, [state.isAuthenticated]);

  // ---- Layer C-2 : 라우트 변경(클라이언트 네비) 시에도 활동으로 인정 ---------
  // 새로고침은 Provider 가 remount 되며 lastActivityRef 초기값(Date.now())이 이 역할.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    lastActivityRef.current = Date.now();
  }, [pathname, state.isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{ ...state, idleRemainingSec, signIn, signOut, refreshIdle }}
    >
      {children}
    </AuthContext.Provider>
  );
}


// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

/** UI 안내용 — 백엔드 JWT_EXPIRE_MINUTES 와 일치해야 함 (`backend/app/config.py`). */
export const IDLE_TIMEOUT_MINUTES = 30;