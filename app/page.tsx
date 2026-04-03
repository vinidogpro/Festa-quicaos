import { EventsOverviewPage } from "@/components/events-overview-page";
import { getEventComparison, getEvents } from "@/lib/supabase/queries";

export default async function HomePage() {
  const [events, comparison] = await Promise.all([getEvents(), getEventComparison()]);

  return (
    <EventsOverviewPage
      currentEvents={events.filter((event) => event.status === "current")}
      upcomingEvents={events.filter((event) => event.status === "upcoming")}
      pastEvents={events.filter((event) => event.status === "past")}
      comparison={comparison}
    />
  );
}
