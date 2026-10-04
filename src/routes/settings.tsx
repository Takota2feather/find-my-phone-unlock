import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, RotateCcw, Smartphone, Upload, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fmp/AppShell";
import { PageHeader, Panel } from "@/components/fmp/ui-bits";
import { StatusBadge } from "@/components/fmp/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { exportState, importState, resetAll, updateSection, useConfig } from "@/lib/fmp/store";
import { bridge } from "@/lib/fmp/native-bridge";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FindMyPhone" },
      { name: "description", content: "Companion connection, backup and reset for your FindMyPhone setup." },
      { property: "og:title", content: "Settings — FindMyPhone" },
      { property: "og:description", content: "Manage your FindMyPhone configuration." },
    ],
  }),
  component: SettingsPage,
});

const CAP_LABELS: Record<string, string> = {
  smsReceiver: "Read incoming texts", backgroundMic: "Background listening", torch: "Flashlight",
  alarmStream: "Alarm over silent", lockScreenAlert: "Lock-screen alert", unlockDetection: "Unlock detection",
};

function SettingsPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const caps = bridge.capabilities();
  const config = useConfig();
  const [name, setName] = useState(config.device.name);
  const saveName = () => {
    const n = name.trim();
    if (n.length < 1 || n.length > 40) { toast.error("Use 1 to 40 characters."); return; }
    updateSection("device", { name: n });
    toast.success("Device name saved.");
  };

  const doExport = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "findmyphone-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    try { importState(await f.text()); toast.success("Configuration imported."); }
    catch { toast.error("That file isn't a valid FindMyPhone backup."); }
  };

  return (
    <AppShell>
      <PageHeader title="Settings" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Device" icon={<Smartphone />} description="Shown on the dashboard and in the Android companion.">
          <Label htmlFor="dname">Device name</Label>
          <div className="mt-1.5 flex gap-2">
            <Input id="dname" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            <Button onClick={saveName}>Save</Button>
          </div>
        </Panel>
        <Panel title="Triggers, security & alert" icon={<Wrench />}>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>SMS trigger</span><span className="text-muted-foreground">{config.sms.enabled ? (config.sms.contextAware ? "Context-aware" : "Exact phrase") : "Off"}</span></li>
            <li className="flex justify-between"><span>Password challenge</span><span className="text-muted-foreground">{config.sms.secureMode ? `On · ${config.sms.maxAttempts} attempts · ${config.sms.timeoutSec}s` : "Off"}</span></li>
            <li className="flex justify-between"><span>Voice trigger</span><span className="text-muted-foreground">{config.voice.enabled ? "On" : "Off"}</span></li>
            <li className="flex justify-between"><span>Alert</span><span className="text-muted-foreground">{[config.alert.alarmEnabled && "Alarm", config.alert.flashlightEnabled && "Flashlight"].filter(Boolean).join(" + ")}</span></li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="soft" size="sm"><Link to="/sms">SMS & security</Link></Button>
            <Button asChild variant="soft" size="sm"><Link to="/voice">Voice</Link></Button>
            <Button asChild variant="soft" size="sm"><Link to="/alerts">Alert</Link></Button>
            <Button asChild variant="soft" size="sm"><Link to="/setup">Permissions</Link></Button>
          </div>
        </Panel>
        <Panel title="Android companion" icon={<Smartphone />} action={<StatusBadge tone={bridge.connected ? "success" : "info"} dot>{bridge.connected ? "Connected" : "Web simulation"}</StatusBadge>}>
          <p className="mb-3 text-sm text-muted-foreground">Device features available right now:</p>
          <ul className="grid grid-cols-2 gap-2">
            {Object.entries(caps).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-xs">
                {CAP_LABELS[k]} <StatusBadge tone={v ? "success" : "muted"}>{v ? "Yes" : "No"}</StatusBadge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">These turn on when this control panel runs inside the installed Android companion.</p>
        </Panel>

        <Panel title="Setup" icon={<Wrench />}>
          <p className="mb-4 text-sm text-muted-foreground">Walk through permissions and owner confirmation again.</p>
          <Button variant="soft" onClick={() => { updateSection("setup", { completed: false }); navigate({ to: "/setup" }); }}>Re-run setup</Button>
        </Panel>

        <Panel title="Backup" icon={<Download />} description="Settings and history are stored in this browser only.">
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={doExport}><Download /> Export</Button>
            <Button variant="soft" onClick={() => fileRef.current?.click()}><Upload /> Import</Button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Exports include your SMS password in plain text — keep the file private.</p>
        </Panel>

        <Panel title="Reset" icon={<RotateCcw />} description="Erase all settings and history from this browser.">
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive">Reset everything</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset FindMyPhone?</AlertDialogTitle>
                <AlertDialogDescription>Triggers, alert settings, voice sample details and history will be erased.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { resetAll(); toast.success("Reset complete."); navigate({ to: "/" }); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Panel>
      </div>
    </AppShell>
  );
}
