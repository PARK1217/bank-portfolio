"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * SIMPLE_PIN 입력 — 6자리(가변) 숫자 PIN.
 *
 * - 진행도 dot(●●●○○○) 시각화 + 가상 키패드(1-9 + 0 + ⌫ + 셔플).
 * - 키패드 셔플 → 어깨 스나이핑 완화(실제 시중은행 키패드 패턴).
 * - 표시(👁) 토글 시 dot 가 실제 숫자로 바뀜.
 * - 물리 키보드 입력도 지원 — 숨겨진 input 으로 form submit 동반.
 */
interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  required?: boolean;
  shuffle?: boolean;
  autoComplete?: string;
  name?: string;
}

function shuffled<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function PinInput({
  value,
  onChange,
  length = 6,
  disabled,
  required,
  shuffle = true,
  autoComplete,
  name,
}: PinInputProps) {
  const [show, setShow] = useState(false);
  const [keys, setKeys] = useState<string[]>(() =>
    shuffle ? shuffled("0123456789".split("")) : "0123456789".split(""),
  );
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  // 마운트 후 셔플(SSR-CSR 텍스트 mismatch 회피).
  useEffect(() => {
    if (shuffle) setKeys(shuffled("0123456789".split("")));
  }, [shuffle]);

  function append(d: string) {
    if (disabled) return;
    if (value.length >= length) return;
    onChange(value + d);
  }
  function backspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }
  function reshuffle() {
    if (disabled) return;
    setKeys(shuffled("0123456789".split("")));
  }

  const dots = useMemo(() => {
    const arr: { ch: string; filled: boolean }[] = [];
    for (let i = 0; i < length; i++) {
      arr.push({ ch: value[i] ?? "", filled: i < value.length });
    }
    return arr;
  }, [value, length]);

  // 키패드 배치: 1~9 3x3 → 마지막 줄 [셔플, 0, ⌫].
  const top9 = keys.filter((k) => k !== "0").slice(0, 9);

  return (
    <div>
      {/* 숨겨진 input — required·name·autoComplete 등 form 동반. */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        value={value}
        autoComplete={autoComplete}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" aria-label="PIN 진행도">
          {dots.map((d, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium",
                d.filled
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-input bg-background text-muted-foreground",
              )}
            >
              {d.filled ? (show ? d.ch : "●") : ""}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="rounded border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
          aria-label={show ? "PIN 숨기기" : "PIN 표시"}
          tabIndex={-1}
        >
          {show ? "숨기기" : "표시"}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {top9.map((k) => (
          <KeyBtn key={k} onClick={() => append(k)} disabled={disabled || value.length >= length}>
            {k}
          </KeyBtn>
        ))}
        <KeyBtn
          onClick={reshuffle}
          disabled={disabled}
          aria-label="키패드 다시 섞기"
          variant="ghost"
        >
          ↺
        </KeyBtn>
        <KeyBtn onClick={() => append("0")} disabled={disabled || value.length >= length}>
          0
        </KeyBtn>
        <KeyBtn
          onClick={backspace}
          disabled={disabled || value.length === 0}
          aria-label="지우기"
          variant="ghost"
        >
          ⌫
        </KeyBtn>
      </div>
      {required && value.length < length ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {length}자리 PIN 을 입력해 주세요.
        </p>
      ) : null}
    </div>
  );
}


function KeyBtn({
  children,
  onClick,
  disabled,
  variant = "default",
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "ghost";
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-11 rounded-md border text-base font-medium transition-colors",
        variant === "ghost"
          ? "border-input bg-background text-muted-foreground hover:bg-accent"
          : "border-input bg-card text-foreground hover:bg-accent",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
