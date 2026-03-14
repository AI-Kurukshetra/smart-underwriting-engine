import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "info" | "success" | "warning" | "danger" | "neutral";

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  info: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  neutral: "badge-neutral",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
