import { cn } from "@/lib/utils";
import type { TriggerResult } from "@/lib/fmp/types";

const TONES = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  alarm: "bg-alarm/15 text-alarm border-alarm/30",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

export type Tone = keyof typeof TONES;

export function StatusBadge({
  tone = "muted",
  children,
  dot,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const RESULT_META: Record<TriggerResult, { label: string; tone: Tone }> = {
  activated: { label: "Activated", tone: "success" },
  simulated: { label: "Test", tone: "info" },
  challenge_sent: { label: "Challenge sent", tone: "warning" },
  rejected: { label: "Failed password", tone: "danger" },
  ignored: { label: "Blocked", tone: "muted" },
  expired: { label: "Expired", tone: "warning" },
  stopped: { label: "Stopped", tone: "muted" },
};
