import { BellRing, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bridge, useSimState } from "@/lib/fmp/native-bridge";
import { cn } from "@/lib/utils";

export function TestAlertButton({ className }: { className?: string }) {
  const sim = useSimState();
  return (
    <div className={cn("space-y-2", className)}>
      <Button
        variant={sim.active ? "soft" : "alarm"}
        size="xl"
        className="w-full"
        onClick={() =>
          sim.active
            ? bridge.stopAlert("manual")
            : bridge.startAlert("manual", { detail: "Test alert from dashboard (web simulation)." })
        }
      >
        {sim.active ? <><Square /> Stop test</> : <><BellRing /> Test alert</>}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Plays a preview in this browser only. It does not ring or light up your real phone.
      </p>
    </div>
  );
}
