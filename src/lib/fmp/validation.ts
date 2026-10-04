import { LIMITS } from "./defaults";
import type { SmsConfig, VoiceConfig, AlertConfig } from "./types";

export type ErrKey = "phrase" | "password" | "challengeReply" | "timeoutSec" | "maxAttempts" | "sample" | "outputs" | "stop" | "blinkIntervalMs" | "maxDurationSec";
export type Errors = Partial<Record<ErrKey, string>>;

export function normalizePhrase(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

export function validatePhrase(phrase: string): string | undefined {
  const p = normalizePhrase(phrase);
  if (p.length < LIMITS.phrase.min) return `Use at least ${LIMITS.phrase.min} characters.`;
  if (p.length > LIMITS.phrase.max) return `Keep it under ${LIMITS.phrase.max} characters.`;
  if (p.split(" ").length < 2) return "Use at least two words so it isn't triggered by accident.";
  return undefined;
}

export function validatePassword(password: string, phrase: string): string | undefined {
  if (!password) return "A password is required when secure challenge is on.";
  if (/\s/.test(password)) return "Password cannot contain spaces.";
  if (password.length < LIMITS.password.min)
    return `Use at least ${LIMITS.password.min} characters.`;
  if (password.length > LIMITS.password.max)
    return `Keep it under ${LIMITS.password.max} characters.`;
  if (normalizePhrase(password) === normalizePhrase(phrase).replace(/ /g, "") ||
      normalizePhrase(password) === normalizePhrase(phrase))
    return "Password must differ from the trigger phrase.";
  if (/^(\d)\1+$/.test(password) || /^(123456|password|qwerty)/i.test(password))
    return "That password is too easy to guess.";
  return undefined;
}

const inRange = (n: number, r: { min: number; max: number }) =>
  Number.isInteger(n) && n >= r.min && n <= r.max;

export function validateSms(c: SmsConfig): Errors {
  const e: Errors = {};
  const pe = validatePhrase(c.phrase);
  if (pe) e.phrase = pe;
  if (c.secureMode) {
    const pw = validatePassword(c.password, c.phrase);
    if (pw) e.password = pw;
    if (!c.challengeReply.trim()) e.challengeReply = "Enter the reply sent to the requester.";
    else if (c.challengeReply.length > 120) e.challengeReply = "Keep the reply under 120 characters.";
    if (!inRange(c.timeoutSec, LIMITS.timeoutSec))
      e.timeoutSec = `Between ${LIMITS.timeoutSec.min} and ${LIMITS.timeoutSec.max} seconds.`;
    if (!inRange(c.maxAttempts, LIMITS.maxAttempts))
      e.maxAttempts = `Between ${LIMITS.maxAttempts.min} and ${LIMITS.maxAttempts.max} attempts.`;
  }
  return e;
}

export function validateVoice(c: VoiceConfig): Errors {
  const e: Errors = {};
  const pe = validatePhrase(c.phrase);
  if (pe) e.phrase = pe;
  if (c.enabled && !c.sample) e.sample = "Record or upload a voice sample before enabling.";
  return e;
}

export function validateAlert(c: AlertConfig): Errors {
  const e: Errors = {};
  if (!c.alarmEnabled && !c.flashlightEnabled) e.outputs = "Enable the alarm, the flashlight, or both.";
  if (!c.stopOnUnlock && !c.manualStop)
    e.stop = "Keep at least one way to stop the alert (unlock or manual stop).";
  if (!inRange(c.blinkIntervalMs, LIMITS.blinkIntervalMs)) e.blinkIntervalMs = "Out of range.";
  if (!inRange(c.maxDurationSec, LIMITS.maxDurationSec)) e.maxDurationSec = "Out of range.";
  return e;
}

export const hasErrors = (e: Errors) => Object.values(e).some(Boolean);
