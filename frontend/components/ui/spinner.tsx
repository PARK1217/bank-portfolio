import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  /** sm | md | lg — 기본 md */
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Spinner({ className, size = "md", label }: SpinnerProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-muted-foreground", className)} role="status" aria-live="polite">
      <Loader2 className={cn("animate-spin", sizeMap[size])} />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}