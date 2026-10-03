import { Radar } from "lucide-react";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Radar className="size-4.5" />
      </span>
      <span className="font-display text-base font-semibold tracking-tight">FindMyPhone</span>
    </span>
  );
}
