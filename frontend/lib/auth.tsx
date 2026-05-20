"use client";

/**
 * 인증 상태 hook + Provider + idle 자동 로그아웃.
 *
 * 저장 책임 : JWT 토큰은 lib/api.ts 의 localStorage('bank.jwt') 에 보관.
 *             이 모듈은 React 상태 미러링 + idle 추적.
 * customerNo : JWT payload 에서 추출 (백엔드가 sub=customer_no 또는 `customer_no` 클레임 사용).
 *
 * 자동 로그아웃 (은행 도메인 표준)
 * ---
 *   A. **클라이언트 idle 타이머**
 *      - 활동 이벤트(mousemove/keydown/click/scroll/touchstart) 감지 → `lastActivityRef` 갱신
 *      - 1초 tick 으로 남은 시간(`idleRemainingSec`) 갱신 — UI 카운트다운에 노출
 *      - 0초 → `POST /api/auth/logout` (fire-and-forget) + signOut() + /auto-logout?reason=idle
 *   B. **서버 401 인터셉트** (lib/api.ts onAuthExpired)
 *      - 응답 코드 E_TOKEN_EXPIRED / E_TOKEN_INVALID 시 자동 signOut + /auto-logout?reason=expired|invalid
 *
 * 타임아웃 값
 * ---
 *   `IDLE_TIMEOUT_MS = 30 * 60 * 1000` — 30분. 명세서엔 명시 X (은행 도메인 표준).
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
import { useRouter } from "next/navigation";
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

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;          // 30분
const TICK_MS = 1000;                            // 1초 단위 카운트다운
const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;


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
  /** Idle 자동 로그아웃까지 남은 초. 비인증 / 비활성 상태면 null. */
  idleRemainingSec: number | null;
  /** 사용자가 "연장" 액션 — 활동 시각을 강제로 now 로 리셋. */
  refreshIdle: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);


// ---------------------------------------------------------------------------
// JWT payload 디코드 (검증 X — 표시용)
// ---------------------------------------------------------------------------

function parseJwtCustomerNo(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    if (typeof decoded.customer_no === "number") return decoded.customer_no;
    if (typeof decoded.customer_no === "string") {
      const n = Number(decoded.customer_no);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof decoded.sub === "string") {
      const n = Number(decoded.sub);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}


// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    customerNo: null,
    isAuthenticated: false,
    isReady: false,
  });
  const [idleRemainingSec, setIdleRemainingSec] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ---- 초기 localStorage 동기화 -----------------------------------------
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      setState({
        token: stored,
        customerNo: parseJwtCustomerNo(stored),
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
    lastActivityRef.current = Date.now();
    setState({
      token,
      customerNo: customerNo ?? parseJwtCustomerNo(token),
      isAuthenticated: true,
      isReady: true,
    });
  }, []);

  const signOut = useCallback(() => {
    setStoredToken(null);
    clearLastRequestId();
    setIdleRemainingSec(null);
    setState({ token: null, customerNo: null, isAuthenticated: false, isReady: true });
  }, []);

  const refreshIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ---- Layer B : 서버 인증 만료 응답 자동 처리 -----------------------------
  useEffect(() => {
    return onAuthExpired((reason) => {
      // 이미 비인증이면 추가 처리 X (중복 navigate 방지)
      if (typeof window !== "undefined" && window.location.pathname === "/auto-logout") {
        return;
      }
      signOut();
      router.push(`/auto-logout?reason=${reason}`);
    });
  }, [signOut, router]);

  // ---- Layer A : 클라이언트 idle 타이머 -----------------------------------
  useEffect(() => {
    if (!state.isAuthenticated) {
      setIdleRemainingSec(null);
      return;
    }

    // 활동 이벤트 → 시각 갱신만 (passive, throttle 불필요 — ref 만 갱신)
    lastActivityRef.current = Date.now();
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true }),
    );

    // 1초 tick — 표시 갱신 + 만료 체크
    let firedLogout = false;
    const tick = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = Math.max(0, IDLE_TIMEOUT_MS - elapsed);
      setIdleRemainingSec(Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0 && !firedLogout) {
        firedLogout = true;
        // 서버 로그아웃 — fire-and-forget. JWT 가 아직 storage 에 있을 때 호출해야 헤더 부착됨.
        void api.post("/api/auth/logout", null).catch(() => {});
        signOut();
        router.push("/auto-logout?reason=idle");
      }
    };
    tick();
    const intervalId = window.setInterval(tick, TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, onActivity),
      );
      window.clearInterval(intervalId);
    };
  }, [state.isAuthenticated, signOut, router]);

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

/** Idle 타임아웃 상수 — UI 에서 "30분 무활동 시 자동 로그아웃" 안내 시 사용. */
export const IDLE_TIMEOUT_MINUTES = IDLE_TIMEOUT_MS / 60_000;