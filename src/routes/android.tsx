import { createFileRoute } from "@tanstack/react-router";
import { Check, Globe, Smartphone, X } from "lucide-react";
import { AppShell } from "@/components/fmp/AppShell";
import { PageHeader, Panel } from "@/components/fmp/ui-bits";
import { StatusBadge } from "@/components/fmp/StatusBadge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/android")({
  head: () => ({
    meta: [
      { title: "Android implementation guide — FindMyPhone" },
      { name: "description", content: "What the browser can and can't do, and the Android APIs the native companion needs." },
      { property: "og:title", content: "Android implementation guide — FindMyPhone" },
      { property: "og:description", content: "The browser/native boundary and a concrete Android API checklist." },
    ],
  }),
  component: AndroidGuide,
});

const BOUNDARY: [string, boolean, string][] = [
  ["Edit and save settings, history", true, "Yes — this web app (local storage now, cloud sync later)"],
  ["Preview alarm sound & flashlight animation", true, "Yes — simulation only"],
  ["One-shot phrase test while page is open", true, "Partially — Web Speech API, foreground only, browser-dependent"],
  ["Read incoming SMS", false, "Native BroadcastReceiver"],
  ["Send the “Password?” reply", false, "Native SmsManager"],
  ["Listen for a wake phrase in the background", false, "Native foreground service + on-device model"],
  ["Verify it's your voice", false, "Native on-device speaker verification"],
  ["Turn on the torch", false, "Native CameraManager"],
  ["Ring over silent / on lock screen", false, "Native alarm stream + full-screen intent"],
  ["Detect unlock to stop", false, "Native ACTION_USER_PRESENT receiver"],
  ["Keep running after reboot", false, "Native BOOT_COMPLETED receiver"],
];

type Item = { title: string; badge: string; tone: "info" | "warning" | "alarm"; points: string[] };

const CHECKLIST: Item[] = [
  { title: "SMS receiver & default-SMS limits", badge: "Play policy", tone: "alarm", points: [
    "Register a BroadcastReceiver for android.provider.Telephony.SMS_RECEIVED with RECEIVE_SMS (runtime permission, Android 6+).",
    "Non-default SMS apps receive this broadcast but cannot block or delete messages; only the default SMS app gets SMS_DELIVER.",
    "Google Play restricts SMS/Call Log permissions to approved use cases — a permissions declaration is required; sideloaded or enterprise builds avoid this.",
    "Send the challenge reply with SmsManager (SEND_SMS). Rate-limit replies and never reply to short codes.",
    "Run the same conservative matcher used in this prototype, entirely on-device.",
  ]},
  { title: "Foreground service", badge: "Android 8+ / 14+", tone: "warning", points: [
    "Use a foreground service with a persistent, user-visible notification for voice listening and active alerts.",
    "Android 14+ requires a declared foregroundServiceType (microphone, mediaPlayback, etc.) and the matching FOREGROUND_SERVICE_* permission.",
    "Android 12+ restricts starting foreground services from the background; start alert playback from the SMS receiver via an allowed exemption or a high-priority notification.",
    "No hidden or stealth services — the notification must explain what's running and offer a way to turn it off.",
  ]},
  { title: "Notifications & full-screen alert", badge: "Android 13+ / 14+", tone: "warning", points: [
    "Create dedicated notification channels (e.g. “Ready” low-importance, “Alert” high-importance).",
    "Android 13+: request POST_NOTIFICATIONS at runtime.",
    "Use a full-screen intent to show the Stop screen over the lock screen; Android 14+ limits USE_FULL_SCREEN_INTENT to calling/alarm apps and users can revoke it — fall back to a heads-up notification.",
  ]},
  { title: "Audio focus & alarm stream", badge: "All versions", tone: "info", points: [
    "Play via MediaPlayer/ExoPlayer with AudioAttributes USAGE_ALARM so the alarm volume applies.",
    "Request AudioManager audio focus (AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE).",
    "Ringing through Do Not Disturb needs Notification Policy access (ACCESS_NOTIFICATION_POLICY), granted by the user in settings.",
    "Restore the user's previous volume when the alert ends.",
  ]},
  { title: "Camera flashlight / torch", badge: "Android 6+", tone: "info", points: [
    "Use CameraManager.setTorchMode(cameraId, on) — no CAMERA permission needed for torch-only.",
    "Android 13+ supports torch strength levels on some devices (turnOnTorchWithStrengthLevel).",
    "Handle the torch being unavailable when another app holds the camera (TorchCallback).",
  ]},
  { title: "Microphone & wake phrase", badge: "Device-dependent", tone: "warning", points: [
    "Request RECORD_AUDIO at runtime; Android 12+ shows a mic privacy indicator while listening, which is expected.",
    "Use an on-device wake-word engine (e.g. a small keyword-spotting model) — never stream audio to a server.",
    "Add on-device speaker verification against the enrolled sample to reduce false triggers by other people.",
    "Battery and OEM background limits vary; offer “listen only while charging” or scheduled windows.",
  ]},
  { title: "Boot re-registration", badge: "Where appropriate", tone: "info", points: [
    "RECEIVE_BOOT_COMPLETED to restore the ready notification and voice service only if the user had them enabled.",
    "Android 15 restricts launching some foreground service types from BOOT_COMPLETED (incl. microphone) — show a notification asking the user to resume instead.",
  ]},
  { title: "Unlock-state detection", badge: "All versions", tone: "info", points: [
    "Register for Intent.ACTION_USER_PRESENT (dynamic receiver while the alert runs) to stop on unlock.",
    "KeyguardManager.isDeviceLocked() to decide whether to show the full-screen Stop UI.",
    "Device-admin APIs are not needed and should not be used for this feature.",
  ]},
  { title: "Bridge to this UI", badge: "Architecture", tone: "info", points: [
    "Implement the NativeBridge interface (capabilities, syncConfig, startAlert, stopAlert) via a Capacitor plugin or WebView JavaScript interface.",
    "The web build ships a simulation bridge; the Android build swaps it in at startup.",
    "Config & event shapes are flat JSON so they can sync to a cloud database per device later.",
  ]},
];

function AndroidGuide() {
  return (
    <AppShell>
      <PageHeader title="Android implementation notes" subtitle="This web app is the control panel and a safe simulation. Everything that touches the phone's hardware lives in the native Android companion." />

      <Panel title="Browser vs. native boundary" className="mb-5">
        <ul className="divide-y">
          {BOUNDARY.map(([what, web, how]) => (
            <li key={what} className="flex items-start gap-3 py-3 text-sm">
              {web ? <Globe className="mt-0.5 size-4 shrink-0 text-primary" /> : <Smartphone className="mt-0.5 size-4 shrink-0 text-info" />}
              <div className="flex-1"><p className="font-medium">{what}</p><p className="text-xs text-muted-foreground">{how}</p></div>
              {web ? <StatusBadge tone="success"><Check className="size-3" /> Web</StatusBadge> : <StatusBadge tone="info"><X className="size-3" /> Native only</StatusBadge>}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Native checklist" description="Badges mark items that depend on Android version, device, or Play Store policy.">
        <Accordion type="multiple" className="w-full">
          {CHECKLIST.map((c) => (
            <AccordionItem key={c.title} value={c.title}>
              <AccordionTrigger className="gap-3 text-left">
                <span className="flex flex-1 flex-wrap items-center gap-2">{c.title} <StatusBadge tone={c.tone}>{c.badge}</StatusBadge></span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pl-1">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{p}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Panel>

      <p className="mt-6 text-xs text-muted-foreground">
        Out of scope by design: covert tracking, location sharing, remote control of other people's devices, and hidden or self-reinstalling persistence.
      </p>
    </AppShell>
  );
}
