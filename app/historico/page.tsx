import { PastEventsPage } from "@/components/past-events-page";
import { getEvents } from "@/lib/supabase/queries";

export default async function HistoryPage() {
  const events = await getEvents();

  return <PastEventsPage events={events.filter((event) => event.status === "past")} />;
}
