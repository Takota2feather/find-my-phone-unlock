import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, Square, Trash2, Upload, Waves } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fmp/AppShell";
import { FieldError, InlineHint, NativeNote, PageHeader, Panel, SettingRow } from "@/components/fmp/ui-bits";
import { StatusBadge } from "@/components/fmp/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { updateSection, useConfig } from "@/lib/fmp/store";
import { LIMITS } from "@/lib/fmp/defaults";
import { normalizePhrase, validatePhrase } from "@/lib/fmp/validation";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice trigger — FindMyPhone" },
      { name: "description", content: "Record your custom phrase and voice sample, and tune sensitivity." },
      { property: "og:title", content: "Voice trigger — FindMyPhone" },
      { property: "og:description", content: "Say your own phrase to make your phone ring." },
    ],
  }),
  component: VoicePage,
});

type RecState =
  | { s: "idle" }
  | { s: "requesting" }
  | { s: "recording"; startedAt: number }
  | { s: "ready"; url: string; durationMs: number; source: "recorded" | "uploaded"; name: string }
  | { s: "error"; msg: string };

function VoicePage() {
  const { voice } = useConfig();
  const [phrase, setPhrase] = useState(voice.phrase);
  const [phraseErr, setPhraseErr] = useState<string>();
  const [rec, setRec] = useState<RecState>({ s: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setPhrase(voice.phrase), [voice.phrase]);
  useEffect(() => {
    if (rec.s !== "recording") return;
    const id = setInterval(() => {
      const ms = Date.now() - rec.startedAt;
      setElapsed(ms);
      if (ms >= LIMITS.voiceSample.maxMs) mr.current?.stop();
    }, 100);
    return () => clearInterval(id);
  }, [rec]);
  useEffect(() => () => { if (rec.s === "ready") URL.revokeObjectURL(rec.url); }, [rec]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
      return setRec({ s: "error", msg: "This browser can't record audio. Try uploading a file instead." });
    setRec({ s: "requesting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      const startedAt = Date.now();
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationMs = Date.now() - startedAt;
        if (durationMs < LIMITS.voiceSample.minMs)
          return setRec({ s: "error", msg: `Too short — say your phrase clearly for at least ${LIMITS.voiceSample.minMs / 1000}s.` });
        const blob = new Blob(chunks.current, { type: r.mimeType });
        setRec({ s: "ready", url: URL.createObjectURL(blob), durationMs, source: "recorded", name: "Recorded sample" });
      };
      mr.current = r;
      r.start();
      setElapsed(0);
      setRec({ s: "recording", startedAt });
    } catch (e) {
      setRec({ s: "error", msg: (e as Error).name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser settings." : "Couldn't start the microphone." });
    }
  };

  const onUpload = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("audio/")) return setRec({ s: "error", msg: "Please choose an audio file." });
    if (f.size > LIMITS.voiceSample.maxBytes) return setRec({ s: "error", msg: "File is larger than 5 MB." });
    const url = URL.createObjectURL(f);
    const a = new Audio(url);
    a.onloadedmetadata = () => {
      const ms = Math.round(a.duration * 1000);
      if (!isFinite(ms) || ms < LIMITS.voiceSample.minMs || ms > LIMITS.voiceSample.maxMs + 2000)
        return setRec({ s: "error", msg: "Sample should be between 1.5 and 12 seconds." });
      setRec({ s: "ready", url, durationMs: ms, source: "uploaded", name: f.name });
    };
    a.onerror = () => setRec({ s: "error", msg: "Couldn't read that audio file." });
  };

  const keepSample = () => {
    if (rec.s !== "ready") return;
    updateSection("voice", { sample: { name: rec.name, durationMs: rec.durationMs, source: rec.source, createdAt: new Date().toISOString() } });
    toast.success("Voice sample saved for this prototype.");
  };

  const savePhrase = () => {
    const e = validatePhrase(phrase);
    setPhraseErr(e);
    if (e) return;
    updateSection("voice", { phrase: phrase.trim() });
    toast.success("Phrase saved.");
  };

  return (
    <AppShell>
      <PageHeader title="Voice trigger" subtitle="Say your own phrase near your phone and it rings — only for your voice." />

      <div className="mb-5"><InlineHint tone="warning">
        A web page can't listen in the background or while your screen is off, and it can't verify who is speaking. On your phone,
        the Android companion does this with an on-device wake-phrase model and speaker check. Here you can set it up and try it while this page is open.
      </InlineHint></div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Settings" icon={<Mic />}>
          <SettingRow id="voice-on" label="Voice trigger enabled" checked={voice.enabled}
            onChange={(v) => {
              if (v && !voice.sample) { toast.error("Save a voice sample first."); return; }
              updateSection("voice", { enabled: v });
            }}
            hint={voice.sample ? "Listening happens on your phone, with the Android mic indicator visible." : "Save a voice sample to turn this on."} />
          <div className="pt-2">
            <Label htmlFor="vphrase">Your phrase</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="vphrase" value={phrase} onChange={(e) => { setPhrase(e.target.value); setPhraseErr(undefined); }} aria-invalid={!!phraseErr} />
              <Button variant="soft" onClick={savePhrase} disabled={phrase.trim() === voice.phrase}>Save</Button>
            </div>
            <FieldError msg={phraseErr} />
            <p className="mt-1.5 text-xs text-muted-foreground">Pick 2–4 unusual words. Avoid phrases you say in normal conversation.</p>
          </div>
          <div className="pt-5">
            <div className="flex justify-between"><Label>Sensitivity</Label><span className="text-sm font-semibold">{voice.sensitivity}</span></div>
            <Slider className="mt-3" min={0} max={100} step={5} value={[voice.sensitivity]} onValueChange={([v]) => updateSection("voice", { sensitivity: v ?? voice.sensitivity })} aria-label="Sensitivity" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Fewer false alarms</span><span>Hears you from farther</span></div>
          </div>
          <div className="mt-5"><NativeNote>Background listening needs RECORD_AUDIO plus a microphone-type foreground service with a visible notification.</NativeNote></div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Voice sample" icon={<AudioLines />} description="Say your phrase 1.5–10 seconds, in a quiet room."
            action={voice.sample ? <StatusBadge tone="success" dot>Saved</StatusBadge> : <StatusBadge tone="muted">None</StatusBadge>}>
            {voice.sample && rec.s !== "ready" && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary/60 p-3 text-sm">
                <span>{voice.sample.name} · {(voice.sample.durationMs / 1000).toFixed(1)}s</span>
                <Button variant="ghost" size="icon" aria-label="Delete sample" onClick={() => updateSection("voice", { sample: null, enabled: false })}><Trash2 /></Button>
              </div>
            )}
            {rec.s === "recording" ? (
              <div className="space-y-3 text-center">
                <div className="relative mx-auto flex size-20 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-destructive/30 animate-radar" />
                  <Waves className="relative size-8 text-destructive" />
                </div>
                <p className="font-mono text-sm">{(elapsed / 1000).toFixed(1)}s / {LIMITS.voiceSample.maxMs / 1000}s</p>
                <Button variant="destructive" onClick={() => mr.current?.stop()}><Square /> Stop</Button>
              </div>
            ) : rec.s === "ready" ? (
              <div className="space-y-3">
                <audio controls src={rec.url} className="w-full" />
                <div className="flex gap-2">
                  <Button variant="hero" onClick={keepSample}>Use this sample</Button>
                  <Button variant="soft" onClick={() => setRec({ s: "idle" })}>Discard</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="hero" onClick={start} disabled={rec.s === "requesting"}><Mic /> {rec.s === "requesting" ? "Waiting for mic…" : "Record"}</Button>
                <Button variant="soft" onClick={() => fileRef.current?.click()}><Upload /> Upload audio</Button>
                <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            )}
            {rec.s === "error" && <FieldError msg={rec.msg} />}
            <p className="mt-3 text-xs text-muted-foreground">In this prototype the audio stays in your browser and only its details are saved.</p>
          </Panel>
          <PhraseTester phrase={voice.phrase} />
        </div>
      </div>
    </AppShell>
  );
}

type SR = { start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; lang: string };

function PhraseTester({ phrase }: { phrase: string }) {
  const [state, setState] = useState<"idle" | "listening" | "match" | "nomatch" | "unsupported">("idle");
  const [heard, setHeard] = useState("");
  const test = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return setState("unsupported");
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      setHeard(t);
      setState(normalizePhrase(t).includes(normalizePhrase(phrase)) ? "match" : "nomatch");
    };
    r.onerror = () => setState("nomatch");
    r.onend = () => setState((s) => (s === "listening" ? "nomatch" : s));
    setHeard("");
    setState("listening");
    r.start();
  };
  return (
    <Panel title="Test phrase" icon={<Waves />} description="One-shot check while this page is open. Words only — not a voice match.">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft" onClick={test} disabled={state === "listening"}><Mic /> {state === "listening" ? "Listening…" : `Say “${phrase}”`}</Button>
        {state === "match" && <StatusBadge tone="success">Phrase recognized</StatusBadge>}
        {state === "nomatch" && <StatusBadge tone="danger">Not recognized</StatusBadge>}
        {state === "unsupported" && <StatusBadge tone="muted">Not supported in this browser</StatusBadge>}
      </div>
      {heard && <p className="mt-3 text-sm text-muted-foreground">Heard: “{heard}”</p>}
    </Panel>
  );
}
