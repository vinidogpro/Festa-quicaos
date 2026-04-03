import { notFound } from "next/navigation";
import { EventDashboardShell } from "@/components/event-dashboard-shell";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getEventById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function EventDetailsPage({
  params
}: {
  params: { id: string };
}) {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  return <EventDashboardShell event={event} />;
}
