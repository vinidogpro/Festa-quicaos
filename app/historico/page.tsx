import { PastEventsPage } from "@/components/past-events-page";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer, getEvents } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  const viewer = await getCurrentViewer();
  const events = await getEvents();

  if (!viewer) {
    return <SetupCard />;
  }

  return <PastEventsPage events={events.filter((event) => event.status === "past")} />;
}
