import { AdvancedAnalyticsPage } from "@/components/advanced-analytics-page";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer, getEventComparison, getEvents, getStrategicOverview } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdvancedAnalyticsRoute() {
  if (!isSupabaseConfigured) {
    return <SetupCard />;
  }

  try {
    const viewer = await getCurrentViewer();

    if (!viewer) {
      redirect("/login");
    }

    const events = await getEvents();
    const [comparison, strategic] = await Promise.all([getEventComparison(events), getStrategicOverview(events)]);

    return <AdvancedAnalyticsPage viewer={viewer} comparison={comparison} strategic={strategic} />;
  } catch (error) {
    return (
      <SetupCard
        eyebrow="Falha ao carregar"
        title="Nao foi possivel carregar as analises avancadas"
        description={error instanceof Error ? error.message : "Confira a conexao com o Supabase e tente novamente."}
      />
    );
  }
}
