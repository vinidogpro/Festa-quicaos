import { EventsOverviewPage } from "@/components/events-overview-page";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer, getEventComparison, getEvents } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  const [viewer, events, comparison] = await Promise.all([
    getCurrentViewer(),
    getEvents(),
    getEventComparison()
  ]);

  if (!viewer) {
    return <SetupCard />;
  }

  return (
    <EventsOverviewPage
      viewer={viewer}
      currentEvents={events.filter((event) => event.status === "current")}
      upcomingEvents={events.filter((event) => event.status === "upcoming")}
      pastEvents={events.filter((event) => event.status === "past")}
      comparison={comparison}
    />
  );
}
