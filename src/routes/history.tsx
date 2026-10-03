import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/fmp/AppShell";
import { EventList } from "@/components/fmp/EventList";
import { PageHeader, Panel } from "@/components/fmp/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearEvents, useEvents } from "@/lib/fmp/store";
import type { TriggerSource } from "@/lib/fmp/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Trigger history — FindMyPhone" },
      { name: "description", content: "Every trigger attempt with time, source, result and password challenge status." },
      { property: "og:title", content: "Trigger history — FindMyPhone" },
      { property: "og:description", content: "A clear log of every time someone tried to ring your phone." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const events = useEvents();
  const [filter, setFilter] = useState<"all" | TriggerSource>("all");
  const shown = filter === "all" ? events : events.filter((e) => e.source === filter);

  return (
    <AppShell>
      <PageHeader title="History" subtitle="Every trigger attempt, including ignored and rejected ones. Stored on this device only.">
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="soft" disabled={!events.length}><Trash2 /> Clear</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all history?</AlertDialogTitle>
              <AlertDialogDescription>This removes {events.length} events. Settings are kept.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearEvents}>Clear history</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
      </Tabs>
      <Panel><EventList events={shown} /></Panel>
    </AppShell>
  );
}
