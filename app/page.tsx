import { EventsOverviewPage } from "@/components/events-overview-page";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer, getEventComparison, getEvents } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  try {
    const viewer = await getCurrentViewer();

    if (!viewer) {
      redirect("/login");
    }

    const events = await getEvents();
    const comparison = await getEventComparison(events);

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
        title="Nao foi possivel abrir a plataforma"
        description={
          error instanceof Error
            ? error.message
            : "A aplicacao nao conseguiu carregar seus dados agora. Verifique a sessao, a conexao com o Supabase e tente novamente."
        }
      />
    );
  }
}
