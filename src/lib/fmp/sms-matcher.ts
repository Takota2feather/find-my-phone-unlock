import { normalizePhrase } from "./validation";

export interface MatchResult {
  actionable: boolean;
  reason: string;
}

// Words allowed around the phrase in context-aware mode. Anything else means the
// message is probably *talking about* the phrase rather than requesting it.
const FILLER = new Set([
  "please", "pls", "plz", "now", "hey", "hi", "urgent", "asap", "help", "ok", "okay",
]);

const DISCUSSION_CUES =
  /\b(don'?t|do not|never|did you|what is|what's|is it|how does|how do|app|feature|said|says|saying|typed|type|text me|joke|lol|haha|meme)\b/;

/**
 * Conservative SMS trigger matcher.
 * - Exact mode: the whole message (ignoring case/punctuation) must equal the phrase.
 * - Context-aware mode: the phrase may be surrounded by a few filler words
 *   ("please find my phone now!") but messages that discuss the phrase are ignored.
 */
export function matchSms(message: string, phrase: string, contextAware: boolean): MatchResult {
  const msg = normalizePhrase(message);
  const p = normalizePhrase(phrase);
  if (!p) return { actionable: false, reason: "No trigger phrase configured." };
  if (!msg) return { actionable: false, reason: "Empty message." };

  if (msg === p) return { actionable: true, reason: "Exact phrase match." };
  if (!contextAware) return { actionable: false, reason: "Exact-match mode: message is not the phrase alone." };

  const idx = ` ${msg} `.indexOf(` ${p} `);
  if (idx === -1) return { actionable: false, reason: "Phrase not found." };
  if (message.includes("?")) return { actionable: false, reason: "Looks like a question about the phrase." };
  if (DISCUSSION_CUES.test(msg)) return { actionable: false, reason: "Message appears to discuss the phrase, not request it." };
  if (/["“”'‘’]/.test(message)) return { actionable: false, reason: "Phrase is quoted — treated as discussion." };

  const rest = (msg.slice(0, idx) + " " + msg.slice(idx + p.length)).split(" ").filter(Boolean);
  if (rest.length > 3) return { actionable: false, reason: "Too much surrounding text to be a clear request." };
  const extra = rest.find((w) => !FILLER.has(w));
  if (extra) return { actionable: false, reason: `Unrecognized word "${extra}" near the phrase.` };

  return { actionable: true, reason: "Clear request with the phrase and polite filler words." };
}
