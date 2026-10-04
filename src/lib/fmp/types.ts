// Config & event shapes. Kept flat & JSON-serializable so each section can later
// map 1:1 to a database row (e.g. device_configs.sms jsonb, trigger_events table).

export type SetupStepId =
  | "companionInstalled"
  | "notificationPermission"
  | "smsPermission"
  | "micPermission"
  | "audioPermission"
  | "ownerAcknowledged";

export interface SetupConfig {
  steps: Record<SetupStepId, boolean>;
  completed: boolean;
}

export interface SmsConfig {
  enabled: boolean;
  phrase: string;
  contextAware: boolean;
  secureMode: boolean;
  password: string;
  challengeReply: string;
  timeoutSec: number;
  maxAttempts: number;
}

export interface VoiceSampleMeta {
  name: string;
  durationMs: number;
  source: "recorded" | "uploaded";
  createdAt: string;
}

export interface VoiceConfig {
  enabled: boolean;
  phrase: string;
  sensitivity: number; // 0-100
  sample: VoiceSampleMeta | null;
}

export type AlarmSound = "beacon" | "chime" | "siren" | "pulse";
export type FlashMode = "steady" | "blink" | "sos";

export interface AlertConfig {
  alarmEnabled: boolean;
  sound: AlarmSound;
  volume: number; // 0-100
  rampUp: boolean;
  maxVolumeOverride: boolean;
  flashlightEnabled: boolean;
  flashMode: FlashMode;
  blinkIntervalMs: number;
  combined: boolean;
  stopOnUnlock: boolean;
  manualStop: boolean;
  maxDurationSec: number;
}

export interface DeviceConfig {
  name: string;
}

export interface FmpConfig {
  version: 1;
  device: DeviceConfig;
  setup: SetupConfig;
  sms: SmsConfig;
  voice: VoiceConfig;
  alert: AlertConfig;
}

export type TriggerSource = "sms" | "voice" | "manual";
export type TriggerResult =
  | "activated"
  | "simulated"
  | "challenge_sent"
  | "rejected"
  | "ignored"
  | "expired"
  | "stopped";

export interface TriggerEvent {
  id: string;
  timestamp: string;
  source: TriggerSource;
  result: TriggerResult;
  secureChallenge: boolean;
  detail: string;
  durationMs?: number | undefined;
}
