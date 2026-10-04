import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BellRing, Flashlight, Play, ShieldAlert, Square, StopCircle } from "lucide-react";
import { AppShell } from "@/components/fmp/AppShell";
import { DevicePanel } from "@/components/fmp/DevicePanel";
import { TestAlertButton } from "@/components/fmp/TestAlertButton";
import { FieldError, NativeNote, PageHeader, Panel, SettingRow } from "@/components/fmp/ui-bits";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { updateSection, useConfig } from "@/lib/fmp/store";
import { playAlarmPreview } from "@/lib/fmp/audio";
import { validateAlert } from "@/lib/fmp/validation";
import { LIMITS } from "@/lib/fmp/defaults";
import type { AlarmSound, AlertConfig, FlashMode } from "@/lib/fmp/types";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alert settings — FindMyPhone" },
      { name: "description", content: "Pick the alarm sound, flashlight pattern and how the alert stops." },
      { property: "og:title", content: "Alert settings — FindMyPhone" },
      { property: "og:description", content: "Alarm, flashlight and stop conditions for your phone finder." },
    ],
  }),
  component: AlertsPage,
});

const SOUNDS: { v: AlarmSound; label: string }[] = [
  { v: "beacon", label: "Beacon — sharp beeps" },
  { v: "chime", label: "Chime — friendly melody" },
  { v: "siren", label: "Siren — rising wail" },
  { v: "pulse", label: "Pulse — quick ticks" },
];

function AlertsPage() {
  const { alert } = useConfig();
  const [preview, setPreview] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  // Apply a change only if the resulting config stays valid.
  const set = (patch: Partial<AlertConfig>) => {
    const next = { ...alert, ...patch };
    if (patch.combined) { next.alarmEnabled = true; next.flashlightEnabled = true; }
    if (patch.alarmEnabled === false || patch.flashlightEnabled === false) next.combined = false;
    const e = validateAlert(next);
    if (e.outputs || e.stop) { toast.error(e.outputs ?? e.stop!); return; }
    updateSection("alert", next);
  };

  const togglePreview = () => {
    if (preview) { stop.current?.(); setPreview(false); return; }
    stop.current = playAlarmPreview(alert.sound, alert.volume, alert.rampUp);
    setPreview(true);
    setTimeout(() => { stop.current?.(); setPreview(false); }, 4000);
  };

  const errs = validateAlert(alert);

  return (
    <AppShell>
      <PageHeader title="Alert" subtitle="What your phone does when a trigger fires. Changes save automatically." />

      <div className="mb-5 flex gap-3 rounded-2xl border border-alarm/30 bg-alarm/10 p-4 text-sm">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-alarm" />
        <p className="text-foreground/85">
          Use FindMyPhone only on a phone you own or are authorized to use. It always makes noise and light — it never runs silently,
          never shares location, and can't be used to activate someone else's device.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Panel title="Alarm sound" icon={<BellRing />}>
            <SettingRow id="alarm-on" label="Play alarm" checked={alert.alarmEnabled} onChange={(v) => set({ alarmEnabled: v })} />
            <div className="flex gap-2 pt-2">
              <Select value={alert.sound} onValueChange={(v) => set({ sound: v as AlarmSound })} disabled={!alert.alarmEnabled}>
                <SelectTrigger aria-label="Alarm sound" className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{SOUNDS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="soft" onClick={togglePreview} disabled={!alert.alarmEnabled}>{preview ? <><Square /> Stop</> : <><Play /> Preview</>}</Button>
            </div>
            <div className="pt-5">
              <div className="flex justify-between"><Label>Volume</Label><span className="text-sm font-semibold">{alert.volume}%</span></div>
              <Slider className="mt-3" min={10} max={100} step={5} value={[alert.volume]} onValueChange={([v]) => set({ volume: v ?? alert.volume })} disabled={!alert.alarmEnabled} aria-label="Volume" />
            </div>
            <SettingRow id="ramp" label="Gradually get louder" checked={alert.rampUp} onChange={(v) => set({ rampUp: v })} disabled={!alert.alarmEnabled}
              hint="Starts quiet and reaches full volume over a few seconds." />
            <SettingRow id="override" label="Ring even on silent / Do Not Disturb" checked={alert.maxVolumeOverride} onChange={(v) => set({ maxVolumeOverride: v })} disabled={!alert.alarmEnabled}
              hint="Uses the alarm volume channel. Needs Do Not Disturb access on the phone." />
          </Panel>

          <Panel title="Flashlight" icon={<Flashlight />}>
            <SettingRow id="torch-on" label="Use flashlight" checked={alert.flashlightEnabled} onChange={(v) => set({ flashlightEnabled: v })} />
            <div className="pt-2">
              <Label className="mb-2 block">Pattern</Label>
              <ToggleGroup type="single" variant="outline" value={alert.flashMode} onValueChange={(v) => v && set({ flashMode: v as FlashMode })} disabled={!alert.flashlightEnabled} className="justify-start">
                <ToggleGroupItem value="steady">Steady</ToggleGroupItem>
                <ToggleGroupItem value="blink">Blink</ToggleGroupItem>
                <ToggleGroupItem value="sos">SOS</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {alert.flashMode === "blink" && (
              <div className="pt-5">
                <div className="flex justify-between"><Label>Blink interval</Label><span className="text-sm font-semibold">{alert.blinkIntervalMs} ms</span></div>
                <Slider className="mt-3" min={LIMITS.blinkIntervalMs.min} max={LIMITS.blinkIntervalMs.max} step={50} value={[alert.blinkIntervalMs]}
                  onValueChange={([v]) => set({ blinkIntervalMs: v ?? alert.blinkIntervalMs })} disabled={!alert.flashlightEnabled} aria-label="Blink interval" />
              </div>
            )}
            <SettingRow id="combined" label="Alarm + flashlight together" checked={alert.combined} onChange={(v) => set({ combined: v })}
              hint="Turns on both outputs so you can hear and see your phone." />
            <FieldError msg={errs.outputs} />
          </Panel>

          <Panel title="Stopping the alert" icon={<StopCircle />}>
            <SettingRow id="unlock" label="Stop when phone is unlocked" checked={alert.stopOnUnlock} onChange={(v) => set({ stopOnUnlock: v })}
              hint="The simplest way to silence it: just unlock your phone." />
            <SettingRow id="manual" label="Show a Stop button" checked={alert.manualStop} onChange={(v) => set({ manualStop: v })}
              hint="A full-screen Stop action appears over the lock screen." />
            <div className="pt-3">
              <div className="flex justify-between"><Label>Stop automatically after</Label><span className="text-sm font-semibold">{Math.round(alert.maxDurationSec / 60 * 10) / 10} min</span></div>
              <Slider className="mt-3" min={LIMITS.maxDurationSec.min} max={LIMITS.maxDurationSec.max} step={15} value={[alert.maxDurationSec]}
                onValueChange={([v]) => set({ maxDurationSec: v ?? alert.maxDurationSec })} aria-label="Maximum duration" />
            </div>
            <FieldError msg={errs.stop} />
          </Panel>

          <NativeNote>Torch control uses the Camera torch API; lock-screen alerts need a full-screen notification permission that varies by Android version.</NativeNote>
        </div>

        <div className="space-y-5 lg:col-span-2 lg:sticky lg:top-20 lg:h-fit">
          <TestAlertButton />
          <DevicePanel />
        </div>
      </div>
    </AppShell>
  );
}
