import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fmp/AppShell";
import { FieldError, InlineHint, NativeNote, PageHeader, Panel, SettingRow } from "@/components/fmp/ui-bits";
import { StatusBadge } from "@/components/fmp/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addEvent, updateSection, useConfig } from "@/lib/fmp/store";
import { bridge } from "@/lib/fmp/native-bridge";
import { matchSms } from "@/lib/fmp/sms-matcher";
import { hasErrors, validateSms, type Errors } from "@/lib/fmp/validation";
import { LIMITS } from "@/lib/fmp/defaults";
import type { SmsConfig } from "@/lib/fmp/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sms")({
  head: () => ({
    meta: [
      { title: "SMS trigger — FindMyPhone" },
      { name: "description", content: "Choose your text phrase, conservative matching and an optional password challenge." },
      { property: "og:title", content: "SMS trigger — FindMyPhone" },
      { property: "og:description", content: "Text a phrase to make your own phone ring, with optional password protection." },
    ],
  }),
  component: SmsPage,
});

function SmsPage() {
  const saved = useConfig().sms;
  const [draft, setDraft] = useState<SmsConfig>(saved);
  const [errors, setErrors] = useState<Errors>({});
  const [showPw, setShowPw] = useState(false);
  useEffect(() => setDraft(saved), [saved]);

  const set = <K extends keyof SmsConfig>(k: K, v: SmsConfig[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = () => {
    const e = validateSms(draft);
    setErrors(e);
    if (hasErrors(e)) return toast.error("Please fix the highlighted fields.");
    updateSection("sms", { ...draft, phrase: draft.phrase.trim(), challengeReply: draft.challengeReply.trim() });
    toast.success("SMS trigger saved.");
  };

  return (
    <AppShell>
      <PageHeader title="SMS trigger" subtitle="Text your phrase from any phone and yours will ring. Matching runs on your phone only.">
        <Button variant="hero" onClick={save} disabled={!dirty}>Save changes</Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Panel title="Trigger" icon={<MessageSquareText />}>
            <SettingRow id="sms-enabled" label="SMS trigger enabled" checked={draft.enabled} onChange={(v) => set("enabled", v)}
              hint="When off, incoming texts are never checked." />
            <div className="pt-2">
              <Label htmlFor="phrase">Trigger phrase</Label>
              <Input id="phrase" className="mt-1.5" value={draft.phrase} maxLength={LIMITS.phrase.max}
                onChange={(e) => set("phrase", e.target.value)} aria-invalid={!!errors.phrase} />
              <FieldError msg={errors.phrase} />
            </div>
            <SettingRow id="ctx" label="Context-aware matching" checked={draft.contextAware} onChange={(v) => set("contextAware", v)}
              hint="Finds the phrase inside a short request like “please find my phone now”." />
            <InlineHint>
              Matching is deliberately conservative. Messages that <em>talk about</em> the phrase — questions, quotes, or longer
              sentences like “did you try the find my phone app?” — are ignored. When context-aware is off, only a message that is
              exactly the phrase counts.
            </InlineHint>
          </Panel>

          <Panel title="Secure challenge" icon={<KeyRound />} description="Ask for a password before ringing.">
            <SettingRow id="secure" label="Require password" checked={draft.secureMode} onChange={(v) => set("secureMode", v)}
              hint={draft.secureMode ? "Your phone replies and waits for the correct password." : "Off — a matching text rings the phone straight away."} />
            {draft.secureMode && (
              <div className="mt-2 space-y-4">
                <div>
                  <Label htmlFor="reply">Reply sent to the requester</Label>
                  <Input id="reply" className="mt-1.5" value={draft.challengeReply} onChange={(e) => set("challengeReply", e.target.value)} aria-invalid={!!errors.challengeReply} />
                  <FieldError msg={errors.challengeReply} />
                </div>
                <div>
                  <Label htmlFor="pw">Password</Label>
                  <div className="relative mt-1.5">
                    <Input id="pw" type={showPw ? "text" : "password"} autoComplete="new-password" value={draft.password}
                      onChange={(e) => set("password", e.target.value)} aria-invalid={!!errors.password} className="pr-10" />
                    <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FieldError msg={errors.password} />
                  <p className="mt-1.5 text-xs text-muted-foreground">{LIMITS.password.min}–{LIMITS.password.max} characters, no spaces, different from your phrase.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="timeout">Wait for reply (sec)</Label>
                    <Input id="timeout" type="number" inputMode="numeric" min={LIMITS.timeoutSec.min} max={LIMITS.timeoutSec.max} className="mt-1.5"
                      value={draft.timeoutSec} onChange={(e) => set("timeoutSec", Number(e.target.value))} aria-invalid={!!errors.timeoutSec} />
                    <FieldError msg={errors.timeoutSec} />
                  </div>
                  <div>
                    <Label htmlFor="attempts">Attempts allowed</Label>
                    <Input id="attempts" type="number" inputMode="numeric" min={LIMITS.maxAttempts.min} max={LIMITS.maxAttempts.max} className="mt-1.5"
                      value={draft.maxAttempts} onChange={(e) => set("maxAttempts", Number(e.target.value))} aria-invalid={!!errors.maxAttempts} />
                    <FieldError msg={errors.maxAttempts} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Safe default: 120 seconds and 3 attempts. After that the request expires and is logged.</p>
              </div>
            )}
          </Panel>

          <NativeNote>
            Reading incoming texts needs the RECEIVE_SMS permission on your phone, and sending the password reply needs SEND_SMS.
            Google Play restricts these permissions; see the Android guide.
          </NativeNote>
        </div>

        <SmsSimulator config={saved} dirty={dirty} />
      </div>
    </AppShell>
  );
}

type Msg = { from: "them" | "phone" | "system"; text: string };

function SmsSimulator({ config, dirty }: { config: SmsConfig; dirty: boolean }) {
  const [text, setText] = useState("find my phone");
  const [thread, setThread] = useState<Msg[]>([]);
  const [challenge, setChallenge] = useState<{ attempts: number; expires: number } | null>(null);

  const push = (...m: Msg[]) => setThread((t) => [...t, ...m]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    push({ from: "them", text: body });

    if (challenge) {
      if (Date.now() > challenge.expires) {
        setChallenge(null);
        addEvent({ source: "sms", result: "expired", secureChallenge: true, detail: "Password reply arrived after the timeout." });
        return push({ from: "system", text: "Challenge expired — nothing happened." });
      }
      if (body === config.password) {
        setChallenge(null);
        push({ from: "system", text: "Correct password → alert starts (simulated)." });
        return void bridge.startAlert("sms", { secureChallenge: true, detail: "Correct password received (simulated SMS)." });
      }
      const attempts = challenge.attempts + 1;
      if (attempts >= config.maxAttempts) {
        setChallenge(null);
        addEvent({ source: "sms", result: "rejected", secureChallenge: true, detail: `Wrong password ${attempts}× — locked out.` });
        return push({ from: "system", text: "Too many wrong attempts — request rejected." });
      }
      setChallenge({ ...challenge, attempts });
      return push({ from: "system", text: `Wrong password (${config.maxAttempts - attempts} left). No reply is sent.` });
    }

    if (!config.enabled) return push({ from: "system", text: "SMS trigger is off — message not checked." });
    const m = matchSms(body, config.phrase, config.contextAware);
    if (!m.actionable) {
      addEvent({ source: "sms", result: "ignored", secureChallenge: false, detail: m.reason });
      return push({ from: "system", text: `Ignored: ${m.reason}` });
    }
    if (config.secureMode) {
      setChallenge({ attempts: 0, expires: Date.now() + config.timeoutSec * 1000 });
      addEvent({ source: "sms", result: "challenge_sent", secureChallenge: true, detail: "Actionable request; password requested." });
      return push({ from: "phone", text: config.challengeReply }, { from: "system", text: `Waiting ${config.timeoutSec}s for the password…` });
    }
    push({ from: "system", text: `${m.reason} → alert starts (simulated).` });
    void bridge.startAlert("sms", { detail: `Matched “${body}” (simulated SMS).` });
  };

  return (
    <Panel title="Try it" icon={<ShieldCheck />} description="Simulate a text arriving on your phone. Uses your saved settings."
      className="h-fit lg:sticky lg:top-20"
      action={challenge ? <StatusBadge tone="warning" dot>Awaiting password</StatusBadge> : undefined}>
      {dirty && <div className="mb-3"><InlineHint tone="warning">You have unsaved changes — the simulator uses saved settings.</InlineHint></div>}
      <div className="min-h-48 space-y-2 rounded-xl bg-background/60 p-3" aria-live="polite">
        {thread.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground">Type a message below, like “please find my phone” or “did you see the find my phone app?”</p>}
        {thread.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "them" ? "justify-start" : m.from === "phone" ? "justify-end" : "justify-center")}>
            <span className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              m.from === "them" && "bg-secondary",
              m.from === "phone" && "bg-primary text-primary-foreground",
              m.from === "system" && "bg-transparent text-xs text-muted-foreground")}>{m.text}</span>
          </div>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={challenge ? "Reply with password…" : "Incoming text…"}
          className="min-h-10 resize-none" aria-label="Simulated incoming message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button type="submit" size="icon" className="size-10 shrink-0" aria-label="Send"><Send /></Button>
      </form>
      {thread.length > 0 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setThread([]); setChallenge(null); }}>Clear conversation</Button>}
    </Panel>
  );
}
