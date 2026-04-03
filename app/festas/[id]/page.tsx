import { notFound } from "next/navigation";
import { EventDashboardShell } from "@/components/event-dashboard-shell";
import { getEventById } from "@/lib/supabase/queries";

export default async function EventDetailsPage({
  params
}: {
  params: { id: string };
}) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  return <EventDashboardShell event={event} />;
}
