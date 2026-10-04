import type { FmpConfig } from "./types";

export const DEFAULT_PHRASE = "find my phone";

export const DEFAULT_CONFIG: FmpConfig = {
  version: 1,
  device: { name: "My phone" },
  setup: {
    steps: {
      companionInstalled: false,
      notificationPermission: false,
      smsPermission: false,
      micPermission: false,
      audioPermission: false,
      ownerAcknowledged: false,
    },
    completed: false,
  },
  sms: {
    enabled: true,
    phrase: DEFAULT_PHRASE,
    contextAware: true,
    secureMode: false,
    password: "",
    challengeReply: "Password?",
    timeoutSec: 120,
    maxAttempts: 3,
  },
  voice: {
    enabled: false,
    phrase: "Trent’s phone, locate yourself",
    sensitivity: 50,
    sample: null,
  },
  alert: {
    alarmEnabled: true,
    sound: "beacon",
    volume: 85,
    rampUp: true,
    maxVolumeOverride: true,
    flashlightEnabled: true,
    flashMode: "blink",
    blinkIntervalMs: 500,
    combined: true,
    stopOnUnlock: true,
    manualStop: true,
    maxDurationSec: 120,
  },
};

export const LIMITS = {
  password: { min: 6, max: 64 },
  phrase: { min: 3, max: 48 },
  timeoutSec: { min: 30, max: 600 },
  maxAttempts: { min: 1, max: 5 },
  blinkIntervalMs: { min: 150, max: 2000 },
  maxDurationSec: { min: 15, max: 600 },
  voiceSample: { minMs: 1500, maxMs: 10000, maxBytes: 5 * 1024 * 1024 },
} as const;
