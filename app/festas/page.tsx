import { EventsOverviewPage } from "@/components/events-overview-page";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer, getEventComparison, getEvents } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  try {
    const [viewer, events, comparison] = await Promise.all([
      getCurrentViewer(),
      getEvents(),
      getEventComparison()
    ]);

    if (!viewer) {
      redirect("/login");
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
  } catch (error) {
    return (
      <SetupCard
        eyebrow="Falha ao carregar"
        title="Nao foi possivel abrir as festas"
        description={
          error instanceof Error
            ? error.message
            : "A aplicacao nao conseguiu buscar os eventos agora. Verifique a sessao e a conexao com o Supabase."
        }
      />
    );
  }
}
