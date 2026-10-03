import { Progress } from "@/components/ui/progress";
import type { SetupConfig } from "@/lib/fmp/types";

export function setupPercent(s: SetupConfig) {
  const v = Object.values(s.steps);
  return Math.round((v.filter(Boolean).length / v.length) * 100);
}

export function SetupProgress({ setup }: { setup: SetupConfig }) {
  const pct = setupPercent(setup);
  const v = Object.values(setup.steps);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Setup progress</span>
        <span className="font-semibold">{v.filter(Boolean).length}/{v.length} steps</span>
      </div>
      <Progress value={pct} aria-label={`Setup ${pct}% complete`} />
    </div>
  );
}
