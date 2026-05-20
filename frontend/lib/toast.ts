"use client";

import { toast } from "sonner";
import { ApiError } from "./api";

/**
 * ApiError 를 일관된 형식으로 toast 노출.
 * description 에 코드 + 짧은 request_id 표시 (문의 시 사용자가 복사해서 보낼 수 있도록).
 */
export function showApiError(err: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): void {
  if (err instanceof ApiError) {
    const reqPart = err.requestId ? ` · req:${err.requestId.slice(0, 8)}` : "";
    toast.error(err.message || fallback, {
      description: `${err.code}${reqPart}`,
    });
    return;
  }
  toast.error(fallback);
}