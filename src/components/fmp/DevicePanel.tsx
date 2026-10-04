import { useEffect, useState } from "react";
import { BellRing, Flashlight, FlashlightOff, LockOpen, Square, VolumeX } from "lucide-react";
import { bridge, useSimState } from "@/lib/fmp/native-bridge";
import { useConfig, useEvents } from "@/lib/fmp/store";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

const SOS = [1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0];

function useTorch(active: boolean, mode: string, interval: number, enabled: boolean) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active || !enabled) return setOn(false);
    if (mode === "steady") return setOn(true);
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setOn(mode === "sos" ? SOS[i % SOS.length] === 1 : i % 2 === 0);
    }, mode === "sos" ? 180 : interval);
    setOn(true);
    return () => window.clearInterval(id);
  }, [active, mode, interval, enabled]);
  return on;
}

export function DevicePanel({ compact = false }: { compact?: boolean }) {
  const sim = useSimState();
  const { alert, device } = useConfig();
  const last = useEvents()[0];
  const a = sim.alert ?? alert;
  const torch = useTorch(sim.active, a.flashMode, a.blinkIntervalMs, a.flashlightEnabled);
  const alarming = sim.active && a.alarmEnabled;

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{device.name}</p>
          <p className="text-xs text-muted-foreground">Prototype · not linked to your real phone</p>
        </div>
        <StatusBadge tone={sim.active ? "alarm" : "muted"} dot>{sim.active ? "Alerting" : "Idle"}</StatusBadge>
      </div>

      <div className={cn("flex gap-5", compact ? "flex-row items-center" : "flex-col items-center sm:flex-row")}>
        <div className={cn("relative mx-auto h-56 w-28 shrink-0 rounded-[1.6rem] border-4 border-secondary bg-background", alarming && "animate-alarm-shake")}>
          <div className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-secondary" />
          <div className={cn("absolute right-3 top-5 size-3 rounded-full transition-all duration-75",
            torch ? "bg-torch shadow-[0_0_30px_14px_var(--torch)]" : "bg-muted")} />
          <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
            {alarming ? (
              <>
                <span className="relative flex size-12 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-alarm/40 animate-radar" />
                  <BellRing className="relative size-7 text-alarm" />
                </span>
                <span className="text-[10px] font-semibold text-alarm">FindMyPhone</span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">{sim.active ? "Torch only" : "Locked"}</span>
            )}
          </div>
        </div>

        <dl className="grid w-full grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-secondary/60 p-3">
            <dt className="text-xs text-muted-foreground">Flashlight</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-semibold">
              {torch ? <Flashlight className="size-4 text-torch" /> : <FlashlightOff className="size-4 text-muted-foreground" />}
              {!a.flashlightEnabled ? "Disabled" : torch ? "On" : sim.active ? "Blinking" : "Off"}
            </dd>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3">
            <dt className="text-xs text-muted-foreground">Alarm</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-semibold">
              {alarming ? <BellRing className="size-4 text-alarm" /> : <VolumeX className="size-4 text-muted-foreground" />}
              {!a.alarmEnabled ? "Disabled" : alarming ? `${a.sound} · ${a.volume}%` : "Silent"}
            </dd>
          </div>
          <div className="col-span-2 rounded-xl bg-secondary/60 p-3">
            <dt className="text-xs text-muted-foreground">Last trigger</dt>
            <dd className="mt-1 font-semibold">{last ? `${last.source.toUpperCase()} · ${new Date(last.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : "None yet"}</dd>
          </div>
          {sim.active && (
            <div className="col-span-2 flex flex-wrap gap-2">
              {a.manualStop && (
                <Button variant="soft" size="sm" onClick={() => bridge.stopAlert("manual")}><Square /> Stop</Button>
              )}
              {a.stopOnUnlock && (
                <Button variant="soft" size="sm" onClick={() => bridge.stopAlert("unlock")}><LockOpen /> Simulate unlock</Button>
              )}
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
