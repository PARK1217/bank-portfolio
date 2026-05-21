import { NextResponse, type NextRequest } from "next/server";

/**
 * 인증 게이트 — 미인증 사용자가 보호 라우트 접근 시 /login 으로 리다이렉트.
 *
 * 한계
 *  - JWT 는 클라이언트의 localStorage 에 보관 → Edge middleware 에서 직접 읽을 수 없음.
 *    middleware 는 *경로 화이트리스트* 만 책임지고, 실제 JWT 검증은
 *    1) 클라이언트 측 AuthProvider 가 mount 시 토큰 부재 → /login (UX 폴백)
 *    2) 서버 API 가 비-2xx + E_TOKEN_INVALID/EXPIRED 응답 → lib/api 가 /auto-logout (Layer B)
 *    의 2중 안전망에 의존.
 *
 *  - 즉, middleware 는 "정적 / 공개 경로" 와 "최소한의 SEO 노출 방어" 정도. localStorage 기반인
 *    이상 진짜 게이팅은 클라이언트에서 수행됨. HttpOnly 쿠키로 옮기면 여기서 토큰 존재 여부도 검증 가능.
 *
 * 화이트리스트 (인증 없이 접근 가능)
 *  - /                  (랜딩)
 *  - /login
 *  - /signup/*          (회원가입 4단계)
 *  - /auto-logout       (만료 안내)
 *  - /terms             (약관 — 공개 페이지)
 *  - /terms/*
 *  - /favicon.ico, /_next/*, /api/* (Next 내부 / 정적 자원)
 */

const PUBLIC_PATHS: (string | RegExp)[] = [
  "/",
  "/login",
  "/auto-logout",
  /^\/signup(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/products(\/|$)/,
  /^\/notices(\/|$)/,
  /^\/events(\/|$)/,
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    typeof p === "string" ? pathname === p : p.test(pathname),
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // localStorage 의 JWT 는 서버에서 직접 확인 불가 — 클라이언트 가드와 페어.
  // 다만 *경로* 가 보호 라우트에 들어왔다는 사실 자체는 통과 (실제 차단은 클라이언트 + API 401 인터셉트).
  //
  // 향후 JWT 를 HttpOnly 쿠키로 옮기면 아래에 쿠키 존재 검증 + 미존재 시 /login 리다이렉트 로직 활성.
  //
  // const hasAuthCookie = req.cookies.get("bank.jwt")?.value;
  // if (!hasAuthCookie) {
  //   const url = req.nextUrl.clone();
  //   url.pathname = "/login";
  //   url.searchParams.set("next", pathname);
  //   return NextResponse.redirect(url);
  // }

  return NextResponse.next();
}

/**
 * matcher — middleware 가 동작할 경로.
 * Next 내부(_next, _next/image), favicon, public 정적 자원, API 라우트 제외.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|txt)$).*)",
  ],
};