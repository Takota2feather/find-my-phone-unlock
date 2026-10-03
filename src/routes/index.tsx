import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, Flashlight, LockKeyhole, MessageSquareText, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/fmp/Logo";
import { useConfig } from "@/lib/fmp/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FindMyPhone — Ring and flash your misplaced Android phone" },
      { name: "description", content: "Owner-controlled SMS and voice triggers that sound an alarm and flash the torch on your own Android phone." },
      { property: "og:title", content: "FindMyPhone — Find your misplaced phone" },
      { property: "og:description", content: "Text a phrase or say your custom phrase — your own phone rings and flashes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: MessageSquareText, title: "Text a phrase", body: "Send “find my phone” from any phone. Optional password challenge." },
  { icon: Mic, title: "Say your phrase", body: "On-device wake phrase matched to your own voice." },
  { icon: Flashlight, title: "Ring & flash", body: "Loud alarm plus torch blink, even on silent." },
  { icon: LockKeyhole, title: "Stops on unlock", body: "Unlock your phone and it goes quiet." },
];

function Landing() {
  const { setup } = useConfig();
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <Link to="/android" className="text-sm text-muted-foreground hover:text-foreground">How it works</Link>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-12 py-10 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> Owner-controlled · no tracking
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] md:text-6xl">
              Lost it in the couch?<br /><span className="text-primary">Make it shout.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Set up triggers that make your own Android phone ring loudly and flash its light — by text or by voice.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="hero" size="xl">
                <Link to={setup.completed ? "/dashboard" : "/setup"}>
                  {setup.completed ? "Open dashboard" : "Get started"} <ArrowRight />
                </Link>
              </Button>
              {!setup.completed && (
                <Button asChild variant="soft" size="xl"><Link to="/dashboard">Explore the preview</Link></Button>
              )}
            </div>
            <p className="mt-4 max-w-md text-xs text-muted-foreground">
              This web app is the control panel and a simulation. Ringing, flashing and listening for texts happen in the
              FindMyPhone Android companion you install on your phone.
            </p>
          </div>

          <div className="relative mx-auto flex size-72 items-center justify-center md:size-96" aria-hidden>
            {[0, 0.8, 1.6].map((d) => (
              <span key={d} className="absolute inset-16 rounded-full border-2 border-primary/50 animate-radar" style={{ animationDelay: `${d}s` }} />
            ))}
            <div className="relative flex h-52 w-28 flex-col items-center justify-center gap-2 rounded-[1.8rem] border-4 border-secondary bg-card shadow-glow">
              <span className="absolute right-3 top-4 size-3 rounded-full bg-torch shadow-[0_0_24px_10px_var(--torch)]" />
              <BellRing className="size-9 text-alarm" />
              <span className="text-[10px] font-semibold">Here I am!</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
