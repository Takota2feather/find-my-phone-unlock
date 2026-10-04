import { KeyRound, MessageSquareText, Mic, Hand } from "lucide-react";
import type { TriggerEvent } from "@/lib/fmp/types";
import { RESULT_META, StatusBadge } from "./StatusBadge";

const SOURCE = {
  sms: { icon: MessageSquareText, label: "SMS" },
  voice: { icon: Mic, label: "Voice" },
  manual: { icon: Hand, label: "Manual" },
};

export function EventList({ events, compact }: { events: TriggerEvent[]; compact?: boolean }) {
  if (!events.length)
    return <p className="py-6 text-center text-sm text-muted-foreground">No trigger events yet. Try a test alert.</p>;
  return (
    <ul className="divide-y">
      {events.map((e) => {
        const S = SOURCE[e.source];
        const r = RESULT_META[e.result];
        const d = new Date(e.timestamp);
        return (
          <li key={e.id} className="flex items-start gap-3 py-3">
            <div className="rounded-lg bg-secondary p-2 text-muted-foreground"><S.icon className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{S.label}</span>
                <StatusBadge tone={r.tone}>{r.label}</StatusBadge>
                {e.secureChallenge && <StatusBadge tone="warning"><KeyRound className="size-3" /> Challenge</StatusBadge>}
                {e.durationMs != null && <span className="text-xs text-muted-foreground">{Math.round(e.durationMs / 1000)}s</span>}
              </div>
              {!compact && <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>}
            </div>
            <time dateTime={e.timestamp} className="shrink-0 text-right text-xs text-muted-foreground">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {!compact && <><br />{d.toLocaleDateString()}</>}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
