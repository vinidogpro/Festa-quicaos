import { PastEventsPage } from "@/components/past-events-page";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer, getEvents } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  try {
    const viewer = await getCurrentViewer();
    const events = await getEvents();

    if (!viewer) {
      redirect("/login");
    }

    return <PastEventsPage events={events.filter((event) => event.status === "past")} />;
  } catch (error) {
    return (
      <SetupCard
        eyebrow="Falha ao carregar"
        title="Nao foi possivel abrir o historico"
        description={
          error instanceof Error
            ? error.message
            : "O historico nao conseguiu carregar agora. Verifique a conexao com o Supabase e tente novamente."
        }
      />
    );
  }
}
