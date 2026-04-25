import { ComparisonSection } from "@/components/comparison-section";
import { EventCard } from "@/components/event-card";
import { PlatformHeader } from "@/components/platform-header";
import { StrategicIntelligenceSection } from "@/components/strategic-intelligence-section";
import { SectionCard } from "@/components/ui/section-card";
import { EventComparisonSnapshot, EventSummary, StrategicOverviewSnapshot, ViewerProfile } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

interface EventsOverviewPageProps {
  viewer: ViewerProfile;
  currentEvents: EventSummary[];
  upcomingEvents: EventSummary[];
  pastEvents: EventSummary[];
  comparison: EventComparisonSnapshot;
  strategic: StrategicOverviewSnapshot;
}

export function EventsOverviewPage({
  viewer,
  currentEvents,
  upcomingEvents,
  pastEvents,
  comparison,
  strategic
}: EventsOverviewPageProps) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
        <PlatformHeader viewer={viewer} />

        <SectionCard
          title="Operacao"
          description="Crie novas festas, acompanhe o calendario e mantenha o time trabalhando na mesma plataforma."
        >
          {viewer.role === "host" ? (
            <div className="rounded-[24px] border border-brand-100 bg-gradient-to-br from-white via-brand-50/35 to-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
                    <Plus className="h-3.5 w-3.5" />
                    Nova festa
                  </div>
                  <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                    Abra uma tela dedicada para criar a festa com mais foco
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    O fluxo completo de criacao agora fica em uma pagina propria, com dados basicos, configuracao comercial e revisao final em um espaco mais confortavel.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/festas/nova"
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200/70 transition hover:bg-slate-800"
                  >
                    Criar festa
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Sua conta esta pronta para colaborar nos eventos liberados para o seu papel atual.
            </p>
          )}
        </SectionCard>

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

        <StrategicIntelligenceSection strategic={strategic} />

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
