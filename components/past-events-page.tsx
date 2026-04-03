import { EventCard } from "@/components/event-card";
import { SectionCard } from "@/components/ui/section-card";
import { EventSummary } from "@/lib/types";

export function PastEventsPage({ events }: { events: EventSummary[] }) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
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
