import Link from "next/link";
import { ArrowLeft, Layers, ReceiptText, Tags, Ticket, Users } from "lucide-react";
import { ComparisonSection } from "@/components/comparison-section";
import { PlatformHeader } from "@/components/platform-header";
import { AdvancedStrategicAnalysisSection } from "@/components/strategic-intelligence-section";
import { SectionCard } from "@/components/ui/section-card";
import { EventComparisonSnapshot, StrategicOverviewSnapshot, ViewerProfile } from "@/lib/types";

export function AdvancedAnalyticsPage({
  viewer,
  comparison,
  strategic
}: {
  viewer: ViewerProfile;
  comparison: EventComparisonSnapshot;
  strategic: StrategicOverviewSnapshot;
}) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
        <PlatformHeader viewer={viewer} />

        <SectionCard
          title="Analises avancadas"
          description="Comparativos entre festas e aprendizados comerciais reunidos em uma area mais profunda."
        >
          <div className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-white via-brand-50/45 to-slate-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Link
                  href="/"
                  className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para principal
                </Link>
                <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Inteligencia entre eventos
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use esta tela para comparar festas, enxergar padroes de lote, ingresso, tipo de venda e custos antes de decidir a proxima estrategia.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <NavigationPill href="#visao-geral" icon={Layers} label="Visao geral" />
              <NavigationPill href="#lotes" icon={Tags} label="Lotes" />
              <NavigationPill href="#tipos-ingresso" icon={Ticket} label="VIP vs PISTA" />
              <NavigationPill href="#tipos-venda" icon={Users} label="Normal vs Grupo" />
              <NavigationPill href="#financeiro" icon={ReceiptText} label="Financeiro" />
            </div>
          </div>
        </SectionCard>

        <div id="comparativo">
          <ComparisonSection comparison={comparison} />
        </div>
        <AdvancedStrategicAnalysisSection strategic={strategic} />
      </div>
    </main>
  );
}

function NavigationPill({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/70">
      <Icon className="h-4 w-4 text-brand-700" />
      {label}
    </a>
  );
}
