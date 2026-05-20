"use client";

/**
 * 선언적 GET 훅 — SWR-lite.
 *
 * 의도적 미포함 기능 (필요해지면 SWR/TanStack Query 도입 검토)
 *  - 캐시 / 중복 요청 합치기 / focus 재검증 / mutation
 *  - 백그라운드 revalidate
 *
 * 포함
 *  - path 변경 시 자동 refetch
 *  - `enabled: false` 옵션으로 트리거 미루기
 *  - 명시 `refetch()` 호출
 *  - `ApiError` 분기 (인프라 핸들러 형식 그대로 노출)
 *  - 인증/Idempotency/X-Request-ID echo 는 `apiFetch` 가 처리
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "./api";

export interface UseFetchResult<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface UseFetchOptions {
  /** false 면 자동 trigger 미실행. refetch() 로만 호출. */
  enabled?: boolean;
}

export function useFetch<T = unknown>(
  path: string | null,
  opts?: UseFetchOptions,
): UseFetchResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 마지막 요청의 path — 응답 도착 시 stale 검증용
  const lastPathRef = useRef<string | null>(null);
  const enabled = opts?.enabled !== false;

  const fetcher = useCallback(async () => {
    if (!path) return;
    lastPathRef.current = path;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(path, { method: "GET" });
      // path 가 그 사이 바뀌었으면 stale — 무시
      if (lastPathRef.current === path) {
        setData(result);
      }
    } catch (err) {
      if (lastPathRef.current !== path) return;
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new ApiError("E_INTERNAL_ERROR", String(err), null, 0));
      }
    } finally {
      if (lastPathRef.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!enabled) return;
    if (!path) return;
    void fetcher();
  }, [path, enabled, fetcher]);

  return { data, error, loading, refetch: fetcher };
}