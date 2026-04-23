import { EventCard } from "@/components/event-card";
import { StrategicIntelligenceSection } from "@/components/strategic-intelligence-section";
import { SectionCard } from "@/components/ui/section-card";
import { EventSummary, StrategicOverviewSnapshot } from "@/lib/types";

export function PastEventsPage({
  events,
  strategic
}: {
  events: EventSummary[];
  strategic: StrategicOverviewSnapshot;
}) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
        <StrategicIntelligenceSection strategic={strategic} />

        <SectionCard
          title="Historico de festas"
          description="Veja rapidamente arrecadacao, lucro, vendedor destaque e volume total dos eventos anteriores."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
