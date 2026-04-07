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

  try {
    const event = await getEventById(params.id);

    if (!event) {
      notFound();
    }

    return <EventDashboardShell event={event} />;
  } catch (error) {
    return (
      <SetupCard
        eyebrow="Falha ao carregar"
        title="Nao foi possivel abrir esta festa"
        description={
          error instanceof Error
            ? error.message
            : "O carregamento do evento falhou. Isso costuma indicar erro de consulta, sessao ou conexao com o Supabase, nao falta de ambiente."
        }
      />
    );
  }
}
