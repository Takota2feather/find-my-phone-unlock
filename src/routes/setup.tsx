import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Check, Download, MessageSquareText, Mic, ShieldCheck, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fmp/AppShell";
import { PageHeader } from "@/components/fmp/ui-bits";
import { SetupProgress } from "@/components/fmp/SetupProgress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { setSetupStep, updateSection, useConfig } from "@/lib/fmp/store";
import type { SetupStepId } from "@/lib/fmp/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Set up FindMyPhone" },
      { name: "description", content: "Install the Android companion, grant the permissions you need, and confirm you own the device." },
      { property: "og:title", content: "Set up FindMyPhone" },
      { property: "og:description", content: "A short checklist to get your phone finder ready." },
    ],
  }),
  component: SetupPage,
});

const STEPS: { id: SetupStepId; icon: typeof Bell; title: string; body: string; optional?: string }[] = [
  { id: "companionInstalled", icon: Download, title: "Install the Android companion", body: "The companion app runs a small, visible service on your phone. This web page cannot ring or flash your phone by itself." },
  { id: "notificationPermission", icon: Bell, title: "Allow notifications", body: "Needed to show the always-visible “FindMyPhone is ready” notice and the full-screen alert when your phone rings." },
  { id: "smsPermission", icon: MessageSquareText, title: "Allow reading incoming texts", body: "Only for the SMS trigger. Messages are checked on the phone for your phrase; nothing is uploaded.", optional: "Skip if you won't use SMS" },
  { id: "micPermission", icon: Mic, title: "Allow the microphone", body: "Only for the voice trigger. Listening happens on-device and Android shows a mic indicator while active.", optional: "Skip if you won't use voice" },
  { id: "audioPermission", icon: Volume2, title: "Allow alarm sound & Do Not Disturb access", body: "Lets the alarm play loudly even when the phone is on silent." },
  { id: "ownerAcknowledged", icon: ShieldCheck, title: "Confirm you own this phone", body: "I'm the owner or authorized user of this device. I won't use FindMyPhone to track or activate anyone else's phone." },
];

function SetupPage() {
  const { setup } = useConfig();
  const navigate = useNavigate();
  const required = setup.steps.companionInstalled && setup.steps.notificationPermission && setup.steps.ownerAcknowledged;

  const finish = () => {
    updateSection("setup", { completed: true });
    toast.success("Setup saved. You can change any of this later.");
    navigate({ to: "/dashboard" });
  };

  return (
    <AppShell>
      <PageHeader title="Get set up" subtitle="Tick each step once it's done on your phone. You can turn any trigger off later — nothing is forced on.">
        <div className="w-full sm:w-64"><SetupProgress setup={setup} /></div>
      </PageHeader>

      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const done = setup.steps[s.id];
          return (
            <li key={s.id}>
              <label htmlFor={s.id} className={cn("flex cursor-pointer gap-4 rounded-2xl border bg-card p-4 transition-colors md:p-5", done && "border-primary/40")}>
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {done ? <Check className="size-5" /> : <s.icon className="size-5" />}
                </div>
                <div className="flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="text-muted-foreground">{i + 1}.</span> {s.title}
                    {s.optional && <span className="text-xs font-normal text-muted-foreground">({s.optional})</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
                <Checkbox id={s.id} checked={done} onCheckedChange={(v) => setSetupStep(s.id, v === true)} className="mt-1 size-5" />
              </label>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button variant="hero" size="xl" disabled={!required} onClick={finish}>Finish setup</Button>
        {!required && <p className="text-xs text-muted-foreground">Steps 1, 2 and 6 are required to finish.</p>}
      </div>
    </AppShell>
  );
}
