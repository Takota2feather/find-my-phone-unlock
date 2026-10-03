import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MessageSquareText, Mic, Radar, Siren, Smartphone } from "lucide-react";
import { AppShell } from "@/components/fmp/AppShell";
import { DevicePanel } from "@/components/fmp/DevicePanel";
import { TestAlertButton } from "@/components/fmp/TestAlertButton";
import { StatusBadge } from "@/components/fmp/StatusBadge";
import { Panel } from "@/components/fmp/ui-bits";
import { SetupProgress } from "@/components/fmp/SetupProgress";
import { EventList } from "@/components/fmp/EventList";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateSection, useConfig, useEvents } from "@/lib/fmp/store";
import { bridge, useSimState } from "@/lib/fmp/native-bridge";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FindMyPhone" },
      { name: "description", content: "Phone status, trigger controls and a safe test alert preview." },
      { property: "og:title", content: "FindMyPhone dashboard" },
      { property: "og:description", content: "See your phone finder status and triggers at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const config = useConfig();
  const events = useEvents();
  const sim = useSimState();
  const active = [config.sms.enabled, config.voice.enabled].filter(Boolean).length;

  const toggleVoice = (v: boolean) => {
    if (v && !config.voice.sample) {
      toast.error("Record a voice sample first.", { action: { label: "Open", onClick: () => (window.location.href = "/voice") } });
      return;
    }
    updateSection("voice", { enabled: v });
  };

  return (
    <AppShell>
      {!config.setup.completed && (
        <Link to="/setup" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <span><span className="font-semibold text-warning">Finish setup</span> — install the companion and confirm permissions.</span>
          <ChevronRight className="size-4 shrink-0" />
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <section className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone status</p>
                <h1 className="mt-1 text-3xl font-semibold md:text-4xl">
                  {sim.active ? "Alerting (preview)" : active ? "Ready to be found" : "All triggers off"}
                </h1>
              </div>
              <span className="relative flex size-14 shrink-0 items-center justify-center">
                {active > 0 && <span className="absolute inset-0 rounded-full bg-primary/30 animate-radar" />}
                <span className="relative flex size-12 items-center justify-center rounded-full bg-secondary text-primary"><Radar className="size-6" /></span>
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge tone={active ? "success" : "muted"} dot>{active} of 2 triggers on</StatusBadge>
              <StatusBadge tone="info"><Smartphone className="size-3" /> Companion: {bridge.connected ? "connected" : "not linked (web preview)"}</StatusBadge>
              {config.sms.secureMode && config.sms.enabled && <StatusBadge tone="warning">Password challenge</StatusBadge>}
            </div>
            <div className="mt-6"><SetupProgress setup={config.setup} /></div>
          </section>

          <Panel title="Triggers" description="What can make your phone ring. Each one can be switched off.">
            <div className="divide-y">
              <TriggerRow icon={<MessageSquareText />} title="SMS trigger" sub={`“${config.sms.phrase}”${config.sms.secureMode ? " · password" : ""}`} to="/sms"
                checked={config.sms.enabled} onChange={(v) => updateSection("sms", { enabled: v })} />
              <TriggerRow icon={<Mic />} title="Voice trigger" sub={config.voice.sample ? `“${config.voice.phrase}”` : "No voice sample yet"} to="/voice"
                checked={config.voice.enabled} onChange={toggleVoice} />
              <TriggerRow icon={<Siren />} title="Alert style" to="/alerts"
                sub={[config.alert.alarmEnabled && `${config.alert.sound} alarm`, config.alert.flashlightEnabled && `${config.alert.flashMode} light`].filter(Boolean).join(" + ")} />
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <TestAlertButton />
          <DevicePanel />
          <Panel title="Recent activity" action={<Button asChild variant="ghost" size="sm"><Link to="/history">All</Link></Button>}>
            <EventList events={events.slice(0, 4)} compact />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function TriggerRow({ icon, title, sub, to, checked, onChange }: {
  icon: React.ReactNode; title: string; sub: string; to: "/sms" | "/voice" | "/alerts"; checked?: boolean; onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="rounded-xl bg-secondary p-2.5 text-primary [&_svg]:size-5">{icon}</div>
      <Link to={to} className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="truncate text-xs capitalize-first text-muted-foreground">{sub}</p>
      </Link>
      {onChange ? <Switch checked={!!checked} onCheckedChange={onChange} aria-label={`Toggle ${title}`} /> : <ChevronRight className="size-4 text-muted-foreground" />}
    </div>
  );
}
