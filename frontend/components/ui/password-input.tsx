"use client";

import { forwardRef, useState } from "react";
import { Input, type InputProps } from "./input";
import { cn } from "@/lib/utils";

/**
 * 비밀번호 input — "표시"/"숨기기" 토글 + Caps Lock 안내 내장.
 *
 * - 로그인/비밀번호 변경/비밀번호 재설정 등 모든 비밀번호 필드 공통.
 * - 토글 버튼은 tabIndex={-1} 로 Tab 흐름에서 제외 (스크린리더 보조).
 * - Caps Lock 감지: keydown/keyup 마다 getModifierState 조회, blur 시 해제.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  function PasswordInput(
    { className, onKeyDown, onKeyUp, onBlur, ...props },
    ref,
  ) {
    const [show, setShow] = useState(false);
    const [caps, setCaps] = useState(false);

    return (
      <div>
        <div className="relative">
          <Input
            ref={ref}
            {...props}
            type={show ? "text" : "password"}
            onKeyDown={(e) => {
              if (typeof e.getModifierState === "function") {
                setCaps(e.getModifierState("CapsLock"));
              }
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              if (typeof e.getModifierState === "function") {
                setCaps(e.getModifierState("CapsLock"));
              }
              onKeyUp?.(e);
            }}
            onBlur={(e) => {
              setCaps(false);
              onBlur?.(e);
            }}
            className={cn("pr-14", className)}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
            aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
            tabIndex={-1}
          >
            {show ? "숨기기" : "표시"}
          </button>
        </div>
        {caps ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-warning">
            ⚠️ Caps Lock 이 켜져 있어요.
          </p>
        ) : null}
      </div>
    );
  },
);
