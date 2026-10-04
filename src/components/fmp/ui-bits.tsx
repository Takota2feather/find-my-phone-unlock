import { Info, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, description, icon, children, className, action }: {
  title?: string; description?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 md:p-6", className)}>
      {title && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 rounded-lg bg-secondary p-2 text-primary [&_svg]:size-4">{icon}</div>}
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SettingRow({ id, label, hint, checked, onChange, disabled }: {
  id: string; label: string; hint?: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function NativeNote({ children, title = "Requires the Android companion" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-info/30 bg-info/10 p-3 text-xs leading-relaxed text-info">
      <Smartphone className="mt-0.5 size-4 shrink-0" />
      <div><span className="font-semibold">{title}. </span><span className="text-foreground/80">{children}</span></div>
    </div>
  );
}

export function InlineHint({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warning" }) {
  return (
    <div className={cn("flex gap-2 rounded-xl p-3 text-xs leading-relaxed",
      tone === "warning" ? "border border-warning/30 bg-warning/10 text-foreground/85" : "bg-secondary/60 text-muted-foreground")}>
      <Info className={cn("mt-0.5 size-4 shrink-0", tone === "warning" && "text-warning")} />
      <div>{children}</div>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string | undefined }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{msg}</p>;
}
