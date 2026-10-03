import { useSyncExternalStore } from "react";
import { playAlarmPreview } from "./audio";
import { addEvent, getConfig } from "./store";
import type { AlertConfig, FmpConfig, TriggerSource } from "./types";

/**
 * Contract between the UI and a device. The web build ships a simulation only.
 * A future Android build can inject an implementation backed by a WebView
 * JavaScript interface or a Capacitor plugin that talks to the native
 * foreground service. Nothing here can control a real phone from a browser.
 */
export interface NativeCapabilities {
  smsReceiver: boolean;
  backgroundMic: boolean;
  torch: boolean;
  alarmStream: boolean;
  lockScreenAlert: boolean;
  unlockDetection: boolean;
}

export interface SimState {
  active: boolean;
  source: TriggerSource | null;
  startedAt: number | null;
  alert: AlertConfig | null;
}

export interface NativeBridge {
  readonly kind: "web-simulation" | "android";
  readonly connected: boolean;
  capabilities(): NativeCapabilities;
  syncConfig(config: FmpConfig): Promise<void>;
  startAlert(source: TriggerSource, opts?: { secureChallenge?: boolean; detail?: string }): Promise<void>;
  stopAlert(reason: "manual" | "unlock" | "timeout"): Promise<void>;
}

// ---- Web simulation ----
let sim: SimState = { active: false, source: null, startedAt: null, alert: null };
const listeners = new Set<() => void>();
let stopSound: (() => void) | null = null;
let timeout: number | null = null;
const emit = (next: SimState) => {
  sim = next;
  listeners.forEach((l) => l());
};
const IDLE: SimState = { active: false, source: null, startedAt: null, alert: null };

class WebSimulationBridge implements NativeBridge {
  readonly kind = "web-simulation" as const;
  readonly connected = false;
  capabilities(): NativeCapabilities {
    return {
      smsReceiver: false,
      backgroundMic: false,
      torch: false,
      alarmStream: false,
      lockScreenAlert: false,
      unlockDetection: false,
    };
  }
  async syncConfig() {
    /* no device to sync to in the browser */
  }
  async startAlert(source: TriggerSource, opts: { secureChallenge?: boolean; detail?: string } = {}) {
    if (sim.active) await this.stopAlert("manual", true);
    const alert = getConfig().alert;
    if (alert.alarmEnabled) stopSound = playAlarmPreview(alert.sound, alert.volume, alert.rampUp);
    emit({ active: true, source, startedAt: Date.now(), alert });
    // Keep simulated previews short regardless of configured max duration.
    timeout = window.setTimeout(() => void this.stopAlert("timeout"), Math.min(alert.maxDurationSec, 20) * 1000);
    addEvent({
      source,
      result: "simulated",
      secureChallenge: !!opts.secureChallenge,
      detail: opts.detail ?? "Simulated alert in the web preview.",
    });
  }
  async stopAlert(reason: "manual" | "unlock" | "timeout", silent = false) {
    stopSound?.();
    stopSound = null;
    if (timeout) window.clearTimeout(timeout);
    timeout = null;
    const was = sim;
    emit(IDLE);
    if (!silent && was.active && was.source) {
      const label = { manual: "Stopped manually", unlock: "Stopped: phone unlocked (simulated)", timeout: "Stopped: preview time limit" }[reason];
      addEvent({ source: was.source, result: "stopped", secureChallenge: false, detail: label });
    }
  }
}

export const bridge: NativeBridge = new WebSimulationBridge();

export const useSimState = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sim,
    () => IDLE,
  );
