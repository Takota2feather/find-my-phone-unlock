import { useSyncExternalStore } from "react";
import { DEFAULT_CONFIG } from "./defaults";
import type { FmpConfig, TriggerEvent } from "./types";

// Local-storage persistence for the prototype. Swap `persist`/`load` for a
// database adapter later; the state shape stays the same.
const KEY = "findmyphone:v1";
const MAX_EVENTS = 200;

interface State {
  config: FmpConfig;
  events: TriggerEvent[];
}

const DEFAULT_STATE: State = { config: DEFAULT_CONFIG, events: [] };

let state: State | null = null;
const listeners = new Set<() => void>();

function merge(saved: Partial<State>): State {
  const c = (saved.config ?? {}) as Partial<FmpConfig>;
  return {
    config: {
      version: 1,
      device: { ...DEFAULT_CONFIG.device, ...c.device },
      setup: {
        ...DEFAULT_CONFIG.setup,
        ...c.setup,
        steps: { ...DEFAULT_CONFIG.setup.steps, ...c.setup?.steps },
      },
      sms: { ...DEFAULT_CONFIG.sms, ...c.sms },
      voice: { ...DEFAULT_CONFIG.voice, ...c.voice },
      alert: { ...DEFAULT_CONFIG.alert, ...c.alert },
    },
    events: Array.isArray(saved.events) ? saved.events.slice(0, MAX_EVENTS) : [],
  };
}

function load(): State {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? merge(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function get(): State {
  if (typeof window === "undefined") return DEFAULT_STATE;
  if (!state) state = load();
  return state;
}

function set(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const useConfig = () =>
  useSyncExternalStore(subscribe, () => get().config, () => DEFAULT_STATE.config);
export const useEvents = () =>
  useSyncExternalStore(subscribe, () => get().events, () => DEFAULT_STATE.events);
export const getConfig = () => get().config;

export function updateSection<K extends Exclude<keyof FmpConfig, "version">>(
  key: K,
  patch: Partial<FmpConfig[K]>,
) {
  const s = get();
  set({ ...s, config: { ...s.config, [key]: { ...s.config[key], ...patch } } });
}

export function setSetupStep(id: keyof FmpConfig["setup"]["steps"], value: boolean) {
  const s = get();
  updateSection("setup", { steps: { ...s.config.setup.steps, [id]: value } });
}

export function addEvent(e: Omit<TriggerEvent, "id" | "timestamp">) {
  const s = get();
  const ev: TriggerEvent = {
    ...e,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  set({ ...s, events: [ev, ...s.events].slice(0, MAX_EVENTS) });
}

export const clearEvents = () => set({ ...get(), events: [] });
export const resetAll = () => set(DEFAULT_STATE);

export function exportState() {
  return JSON.stringify(get(), null, 2);
}
export function importState(json: string) {
  set(merge(JSON.parse(json)));
}
