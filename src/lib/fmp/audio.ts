import type { AlarmSound } from "./types";

// Browser-only sound preview using Web Audio. The real alarm is played by the
// native Android service on the alarm audio stream.
let ctx: AudioContext | null = null;

export function playAlarmPreview(sound: AlarmSound, volume: number, rampUp: boolean) {
  if (typeof window === "undefined") return () => {};
  ctx ??= new AudioContext();
  const ac = ctx;
  void ac.resume();
  const master = ac.createGain();
  const target = Math.max(0.0001, (volume / 100) * 0.35);
  master.gain.setValueAtTime(rampUp ? 0.0001 : target, ac.currentTime);
  if (rampUp) master.gain.exponentialRampToValueAtTime(target, ac.currentTime + 3);
  master.connect(ac.destination);

  const note = (freq: number, len: number, type: OscillatorType, sweepTo?: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (sweepTo) o.frequency.linearRampToValueAtTime(sweepTo, ac.currentTime + len);
    g.gain.setValueAtTime(1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + len);
    o.connect(g).connect(master);
    o.start();
    o.stop(ac.currentTime + len);
  };

  let i = 0;
  const patterns: Record<AlarmSound, [number, () => void]> = {
    beacon: [500, () => note(i++ % 2 ? 0 + 1046 : 880, 0.18, "square")],
    chime: [450, () => note([659, 784, 988][i++ % 3] ?? 659, 0.4, "sine")],
    siren: [900, () => note(i++ % 2 ? 1200 : 600, 0.9, "sawtooth", i % 2 ? 600 : 1200)],
    pulse: [350, () => note(440, 0.12, "triangle")],
  };
  const [interval, fn] = patterns[sound];
  fn();
  const id = window.setInterval(fn, interval);
  return () => {
    window.clearInterval(id);
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
    setTimeout(() => master.disconnect(), 300);
  };
}
