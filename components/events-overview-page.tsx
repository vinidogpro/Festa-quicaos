import { ComparisonSection } from "@/components/comparison-section";
import { EventCard } from "@/components/event-card";
import { PlatformHeader } from "@/components/platform-header";
import { SectionCard } from "@/components/ui/section-card";
import { EventComparisonSnapshot, EventSummary } from "@/lib/types";

interface EventsOverviewPageProps {
  currentEvents: EventSummary[];
  upcomingEvents: EventSummary[];
  pastEvents: EventSummary[];
  comparison: EventComparisonSnapshot;
}

export function EventsOverviewPage({
  currentEvents,
  upcomingEvents,
  pastEvents,
  comparison
}: EventsOverviewPageProps) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
        <PlatformHeader />

        <SectionCard
          title="Festa atual"
          description="O evento em operacao fica sempre em destaque para acesso rapido da equipe."
        >
          <div className="grid gap-6">
            {currentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Proximas festas"
          description="Acompanhe o pipeline do calendario e prepare a operacao comercial com antecedencia."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </SectionCard>

        <ComparisonSection comparison={comparison} />

        <SectionCard
          title="Festas passadas"
          description="Historico resumido com performance consolidada dos eventos anteriores."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
