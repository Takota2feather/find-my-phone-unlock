import { Link } from "@tanstack/react-router";
import { BookOpen, History, LayoutDashboard, MessageSquareText, Mic, Settings, Siren } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/sms", label: "SMS", icon: MessageSquareText },
  { to: "/voice", label: "Voice", icon: Mic },
  { to: "/alerts", label: "Alert", icon: Siren },
  { to: "/history", label: "History", icon: History },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hero pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link to="/android" aria-label="Android implementation guide"
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-primary" }}>
              <BookOpen className="size-5" />
            </Link>
            <Link to="/settings" aria-label="Settings"
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-primary" }}>
              <Settings className="size-5" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden" aria-label="Primary">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}>
              <n.icon className="size-5" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
