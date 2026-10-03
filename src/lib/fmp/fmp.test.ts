import { describe, expect, it } from "vitest";
import { matchSms } from "./sms-matcher";
import { validatePassword, validateSms, validateAlert } from "./validation";
import { DEFAULT_CONFIG } from "./defaults";

const P = "find my phone";

describe("SMS matcher", () => {
  it("exact mode only accepts the phrase alone", () => {
    expect(matchSms("Find my phone!", P, false).actionable).toBe(true);
    expect(matchSms("please find my phone", P, false).actionable).toBe(false);
  });
  it("context-aware accepts polite requests", () => {
    expect(matchSms("Please find my phone now", P, true).actionable).toBe(true);
  });
  it("context-aware ignores discussion of the phrase", () => {
    expect(matchSms("did you try the find my phone app?", P, true).actionable).toBe(false);
    expect(matchSms('lol he said "find my phone"', P, true).actionable).toBe(false);
    expect(matchSms("I can't find my phone charger anywhere at all", P, true).actionable).toBe(false);
  });
});

describe("Password rules", () => {
  it("requires at least 6 chars", () => {
    expect(validatePassword("ab1", P)).toBeTruthy();
    expect(validatePassword("tiger42", P)).toBeUndefined();
  });
  it("rejects spaces and the trigger phrase", () => {
    expect(validatePassword("tiger 42", P)).toBeTruthy();
    expect(validatePassword("findmyphone", P)).toBeTruthy();
  });
});

describe("Defaults", () => {
  it("secure challenge defaults to 120s and 3 attempts", () => {
    expect(DEFAULT_CONFIG.sms.timeoutSec).toBe(120);
    expect(DEFAULT_CONFIG.sms.maxAttempts).toBe(3);
    expect(DEFAULT_CONFIG.sms.phrase).toBe("find my phone");
  });
  it("secure mode limits attempts to 1-5", () => {
    const base = { ...DEFAULT_CONFIG.sms, secureMode: true, password: "tiger42" };
    expect(validateSms({ ...base, maxAttempts: 6 }).maxAttempts).toBeTruthy();
    expect(validateSms({ ...base, maxAttempts: 5 }).maxAttempts).toBeUndefined();
  });
  it("alert must keep a stop condition", () => {
    expect(validateAlert({ ...DEFAULT_CONFIG.alert, stopOnUnlock: false, manualStop: false }).stop).toBeTruthy();
  });
});
