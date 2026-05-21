"use client";

import { toast } from "sonner";
import { ApiError } from "./api";

/**
 * 사용자 친화 메시지 매핑.
 *
 * 우선순위
 *  1) 백엔드 BankingException 의 한국어 message (이미 도메인 친화적) → 그대로 노출
 *  2) raw FastAPI detail / 빈 message / 영문 statusText → code 또는 http status 로 매핑한 한국어 메시지
 *  3) 매핑에 없으면 fallback
 *
 * 기술 정보(code · req_id)는 토스트 기본 영역에서 제거하고,
 * "정보 복사" 액션 버튼으로 사용자가 필요할 때만 펼쳐서 클립보드에 담는다.
 */

const FRIENDLY_BY_CODE: Record<string, string> = {
  E_NOT_FOUND: "요청하신 정보를 찾을 수 없어요.",
  E_INTERNAL_ERROR: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.",
  E_UNAUTHORIZED: "로그인이 필요한 작업이에요.",
  E_TOKEN_INVALID: "인증 정보가 유효하지 않아요. 다시 로그인해 주세요.",
  E_TOKEN_EXPIRED: "세션이 만료되었어요. 다시 로그인해 주세요.",
  E_IDEMPOTENCY_CONFLICT: "이미 처리된 요청이에요.",
  E_VALIDATION: "입력하신 정보를 다시 확인해 주세요.",
};

const FRIENDLY_BY_STATUS: Record<number, string> = {
  400: "요청 형식을 다시 확인해 주세요.",
  401: "로그인이 필요한 작업이에요.",
  403: "이 작업을 수행할 권한이 없어요.",
  404: "요청하신 정보를 찾을 수 없어요.",
  408: "응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.",
  409: "충돌이 발생했어요. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  422: "입력하신 정보를 다시 확인해 주세요.",
  429: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
  500: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.",
  502: "서비스에 일시적으로 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
  503: "서비스에 일시적으로 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
  504: "응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
};

/** 백엔드가 내려준 한국어 메시지인지 (한글 포함) 판별. 영문 statusText("Not Found" 등) 와 구분. */
function hasKoreanContent(s: string | null | undefined): boolean {
  return !!s && /[가-힣]/.test(s);
}

function friendlyMessage(err: ApiError, fallback: string): string {
  if (hasKoreanContent(err.message)) return err.message;
  return (
    FRIENDLY_BY_CODE[err.code] ??
    FRIENDLY_BY_STATUS[err.httpStatus] ??
    fallback
  );
}

function buildDebugDetail(err: ApiError): string {
  const parts = [err.code];
  if (err.requestId) parts.push(`req:${err.requestId}`);
  return parts.join(" · ");
}

/**
 * ApiError 를 일관된 형식으로 toast 노출.
 *
 * - 기본 노출: 친화 메시지만
 * - "정보 복사" 액션: 클립보드에 `<code> req:<request_id>` 담고, 세부를 description 으로 한 번 더 안내
 */
export function showApiError(err: unknown, fallback = "요청 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."): void {
  if (!(err instanceof ApiError)) {
    toast.error(fallback);
    return;
  }

  const message = friendlyMessage(err, fallback);
  const detail = buildDebugDetail(err);

  toast.error(message, {
    action: {
      label: "정보 복사",
      onClick: () => {
        const payload = err.requestId ? `${err.code} req:${err.requestId}` : err.code;
        navigator.clipboard
          .writeText(payload)
          .then(() => {
            toast.success("오류 정보를 복사했어요.", { description: detail });
          })
          .catch(() => {
            toast.info(detail);
          });
      },
    },
  });
}