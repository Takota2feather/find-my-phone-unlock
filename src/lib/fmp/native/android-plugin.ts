// NATIVE-ONLY bridge surface. Implemented in Kotlin:
// android/app/src/main/java/app/findmyphone/guard/plugin/FindMyPhonePlugin.kt
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { FmpConfig, TriggerEvent, TriggerSource } from "../types";

export type PermState = "granted" | "denied" | "prompt" | "prompt-with-rationale" | "unsupported";

export interface NativeStatus {
  sdkInt: number;
  model: string;
  sms: PermState;
  microphone: PermState;
  notifications: PermState;
  fullScreenIntent: PermState;
  dndAccess: PermState;
  batteryUnrestricted: PermState;
  torch: PermState;
  backgroundVoice: PermState;
  alertActive: boolean;
}

export interface FindMyPhonePlugin {
  getStatus(): Promise<NativeStatus>;
  requestPermission(o: { name: "sms" | "microphone" | "notifications" }): Promise<NativeStatus>;
  openSettings(o: { target: "app" | "notifications" | "fullScreenIntent" | "dnd" | "battery" }): Promise<void>;
  syncConfig(o: { config: FmpConfig }): Promise<void>;
  startAlert(o: { source: TriggerSource; detail?: string }): Promise<void>;
  stopAlert(o: { reason: "manual" | "unlock" | "timeout" }): Promise<void>;
  drainEvents(): Promise<{ events: TriggerEvent[] }>;
  addListener(e: "event", cb: (ev: TriggerEvent) => void): Promise<PluginListenerHandle>;
  addListener(e: "alertState", cb: (s: { active: boolean; source: TriggerSource | null }) => void): Promise<PluginListenerHandle>;
}

export const isAndroidApp = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("FindMyPhone");
export const FindMyPhone = registerPlugin<FindMyPhonePlugin>("FindMyPhone");
