"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgePercent, Crown, Goal, PiggyBank, Sparkles, TrendingUp } from "lucide-react";
import { EventStatusBadge } from "@/components/event-status-badge";
import { SectionCard } from "@/components/ui/section-card";
import { StrategicOverviewSnapshot } from "@/lib/types";
import { formatCurrency, formatDate, formatSaleTypeLabel, formatTicketTypeLabel } from "@/lib/utils";

type EventSortOption = "profit" | "revenue" | "ticket" | "date";

export function StrategicIntelligenceSection({ strategic }: { strategic: StrategicOverviewSnapshot }) {
  const [sortBy, setSortBy] = useState<EventSortOption>("profit");

  const eventRows = useMemo(() => {
    const rows = [...strategic.eventSnapshots];

    rows.sort((left, right) => {
      if (sortBy === "revenue") {
        return right.totalRevenue - left.totalRevenue;
      }

      if (sortBy === "ticket") {
        return right.averageTicket - left.averageTicket;
      }

      if (sortBy === "date") {
        return right.eventDate.localeCompare(left.eventDate);
      }

      return right.estimatedProfit - left.estimatedProfit;
    });

    return rows;
  }, [sortBy, strategic.eventSnapshots]);

  const mostProfitableEvent = useMemo(
    () => [...strategic.eventSnapshots].sort((left, right) => right.estimatedProfit - left.estimatedProfit)[0],
    [strategic.eventSnapshots]
  );
  const highestTicketEvent = useMemo(
    () => [...strategic.eventSnapshots].sort((left, right) => right.averageTicket - left.averageTicket)[0],
    [strategic.eventSnapshots]
  );

  return (
    <div className="space-y-6">
      <SectionCard
        title="Visao geral entre festas"
        description="Compare resultados entre eventos para entender rapidamente quais festas entregaram mais retorno."
      >
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <ExecutiveHighlight
            label="Festa mais lucrativa"
            value={mostProfitableEvent?.name ?? "Sem dados"}
            helper={mostProfitableEvent ? formatCurrency(mostProfitableEvent.estimatedProfit) : "Sem base"}
            icon={PiggyBank}
            tone="positive"
          />
          <ExecutiveHighlight
            label="Maior ticket medio"
            value={highestTicketEvent?.name ?? "Sem dados"}
            helper={highestTicketEvent ? formatCurrency(highestTicketEvent.averageTicket) : "Sem base"}
            icon={Crown}
            tone="primary"
          />
          <ExecutiveHighlight
            label="Abaixo da meta"
            value={`${strategic.eventSnapshots.filter((event) => event.isBelowGoal).length} festa(s)`}
            helper="Eventos que ainda nao bateram 100% da meta"
            icon={Goal}
            tone="warning"
          />
          <ExecutiveHighlight
            label="Com prejuizo"
            value={`${strategic.eventSnapshots.filter((event) => event.isLoss).length} festa(s)`}
            helper="Eventos com lucro final negativo"
            icon={TrendingUp}
            tone="danger"
          />
        </div>

        <div className="ds-card-muted mt-5 rounded-[24px] border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-950">Comparativo de eventos</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Receita, despesas, lucro, ticket medio e volume comercial em uma leitura unica.
              </p>
            </div>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as EventSortOption)} className="ds-select w-full sm:w-[220px]">
              <option value="profit">Ordenar por lucro</option>
              <option value="revenue">Ordenar por receita</option>
              <option value="ticket">Ordenar por ticket medio</option>
              <option value="date">Ordenar por data</option>
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {eventRows.map((event) => (
              <article key={event.id} className="rounded-2xl border border-[color:var(--ds-border)] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventStatusBadge status={event.status} />
                      {event.id === mostProfitableEvent?.id ? <span className="ds-badge ds-badge-positive">Mais lucrativa</span> : null}
                      {event.id === highestTicketEvent?.id ? <span className="ds-badge ds-badge-primary">Maior ticket</span> : null}
                      {event.isBelowGoal ? <span className="ds-badge ds-badge-warning">Abaixo da meta</span> : null}
                      {event.isLoss ? <span className="ds-badge ds-badge-danger">Prejuizo</span> : null}
                    </div>
                    <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                      {event.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(event.eventDate)}</p>
                  </div>

                  <Link
                    href={`/festas/${event.id}`}
                    className="ds-button-secondary w-full sm:w-auto"
                  >
                    Ver festa
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                  <SnapshotMetric label="Total arrecadado" value={formatCurrency(event.totalRevenue)} tone="positive" />
                  <SnapshotMetric label="Despesas" value={formatCurrency(event.totalExpenses)} tone="danger" />
                  <SnapshotMetric label="Lucro" value={formatCurrency(event.estimatedProfit)} tone={event.estimatedProfit >= 0 ? "positive" : "danger"} />
                  <SnapshotMetric label="Ticket medio" value={formatCurrency(event.averageTicket)} />
                  <SnapshotMetric label="Ingressos vendidos" value={`${event.totalTicketsSold}`} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Aprendizado entre eventos"
        description="Descubra os padroes que mais ajudam a montar as proximas festas com mais clareza comercial."
      >
        <div className="rounded-[28px] border border-[color:var(--ds-border)] bg-[linear-gradient(180deg,rgba(246,249,252,0.96),rgba(255,255,255,0.92)_36%,rgba(245,248,251,0.98))] p-3 shadow-[0_20px_50px_rgba(15,23,42,0.04)] sm:p-4">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--ds-border)_78%,var(--ds-primary-border)_22%)] bg-[linear-gradient(180deg,rgba(240,246,250,0.94),rgba(255,255,255,0.9)_42%,rgba(244,248,251,0.98))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Lotes que mais performam</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Receita, volume, ticket medio e participacao consolidada de cada lote ao longo das festas.
                  </p>
                </div>
                <span className="rounded-2xl border border-[color:var(--ds-primary-border)] bg-[color:var(--ds-primary-bg)]/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ds-text-secondary)] shadow-sm">
                  Top {Math.min(strategic.batchLearning.length, 5)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {strategic.batchLearning.slice(0, 5).map((item) => (
                  <div key={item.batchLabel} className="rounded-2xl border border-[color:var(--ds-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,248,251,0.96))] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="ds-badge ds-badge-batch">{item.batchLabel}</span>
                      <span className="ds-label">{item.percentage}% do volume</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <SnapshotMetric label="Ingressos" value={`${item.ticketsSold}`} compact className="bg-white/88" />
                      <SnapshotMetric label="Receita" value={formatCurrency(item.revenue)} compact tone="positive" className="bg-emerald-50/70" />
                      <SnapshotMetric label="Ticket medio" value={formatCurrency(item.averageTicket)} compact className="bg-white/88" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--ds-border)_75%,var(--ds-danger-border)_25%)] bg-[linear-gradient(180deg,rgba(252,246,248,0.96),rgba(255,255,255,0.9)_40%,rgba(251,245,247,0.98))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Despesas que mais pesam</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Categorias mais impactantes, media por festa e peso sobre a receita total.
                  </p>
                </div>
                <BadgePercent className="h-5 w-5 text-slate-500" />
              </div>

              <div className="mt-4 space-y-3">
                {strategic.expenseCategoryLearning.slice(0, 5).map((item) => (
                  <div key={item.category} className="rounded-2xl border border-[color:var(--ds-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(252,246,248,0.95))] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.category}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.count} lancamento(s) | media de {formatCurrency(item.averagePerEvent)} por festa
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold ds-stat-danger">{formatCurrency(item.total)}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.revenueShare}% da receita total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <TwoWayComparisonCard
              title="VIP vs PISTA"
              description="Qual tipo gera mais receita, maior ticket medio e mais volume ao longo das festas."
              leftLabel="VIP"
              leftTone="vip"
              leftMetrics={[
                { label: "Ingressos", value: `${strategic.ticketTypeLearning.vip.ticketsSold}` },
                { label: "Receita", value: formatCurrency(strategic.ticketTypeLearning.vip.revenue) },
                { label: "Ticket medio", value: formatCurrency(strategic.ticketTypeLearning.vip.averageTicket) }
              ]}
              rightLabel="PISTA"
              rightTone="pista"
              rightMetrics={[
                { label: "Ingressos", value: `${strategic.ticketTypeLearning.pista.ticketsSold}` },
                { label: "Receita", value: formatCurrency(strategic.ticketTypeLearning.pista.revenue) },
                { label: "Ticket medio", value: formatCurrency(strategic.ticketTypeLearning.pista.averageTicket) }
              ]}
            />

            <TwoWayComparisonCard
              title="Normal vs Grupo"
              description="Entenda como o desconto coletivo influencia volume e ticket medio da operacao."
              leftLabel="Normal"
              leftTone="default"
              leftMetrics={[
                { label: "Ingressos", value: `${strategic.saleTypeLearning.normal.ticketsSold}` },
                { label: "Receita", value: formatCurrency(strategic.saleTypeLearning.normal.revenue) },
                { label: "Ticket medio", value: formatCurrency(strategic.saleTypeLearning.normal.averageTicket) }
              ]}
              rightLabel="Grupo"
              rightTone="group"
              rightMetrics={[
                { label: "Ingressos", value: `${strategic.saleTypeLearning.grupo.ticketsSold}` },
                { label: "Receita", value: formatCurrency(strategic.saleTypeLearning.grupo.revenue) },
                { label: "Ticket medio", value: formatCurrency(strategic.saleTypeLearning.grupo.averageTicket) }
              ]}
            />
          </div>
        </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Relatorios pos-evento"
        description="Leitura final pronta para decisao, comparando resultado, comercial e impacto financeiro de cada festa."
      >
        <div className="space-y-4">
          {strategic.postEventReports.map((report) => (
            <article key={report.eventId} className="rounded-[24px] border border-[color:var(--ds-border)] bg-[linear-gradient(180deg,rgba(243,247,251,0.95),rgba(255,255,255,0.9)_34%,rgba(245,248,251,0.98))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={report.status} />
                    <span className="ds-badge ds-badge-neutral">{formatDate(report.eventDate)}</span>
                  </div>
                  <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                    {report.eventName}
                  </h3>
                </div>
                <Link href={`/festas/${report.eventId}`} className="ds-button-secondary w-full sm:w-auto">
                  Abrir festa
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                <SnapshotMetric label="Total arrecadado" value={formatCurrency(report.overview.totalRevenue)} tone="positive" />
                <SnapshotMetric label="Despesas" value={formatCurrency(report.overview.totalExpenses)} tone="danger" />
                <SnapshotMetric label="Lucro final" value={formatCurrency(report.overview.estimatedProfit)} tone={report.overview.estimatedProfit >= 0 ? "positive" : "danger"} />
                <SnapshotMetric label="Ticket medio" value={formatCurrency(report.overview.averageTicket)} />
                <SnapshotMetric label="Ingressos" value={`${report.overview.totalTicketsSold}`} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--ds-border)_78%,var(--ds-primary-border)_22%)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,252,0.96))] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                  <p className="ds-label">Analise comercial</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <p><span className="font-semibold text-slate-950">Lote campeao:</span> {report.commercial.bestBatchLabel}</p>
                    <p><span className="font-semibold text-slate-950">Tipo dominante:</span> {formatTicketTypeLabel(report.commercial.dominantTicketType)}</p>
                    <p><span className="font-semibold text-slate-950">Preco mais eficiente:</span> {formatCurrency(report.commercial.mostEfficientPrice)}</p>
                    <p><span className="font-semibold text-slate-950">Tipo da venda dominante:</span> {formatSaleTypeLabel(report.commercial.dominantSaleType)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--ds-border)_76%,var(--ds-danger-border)_24%)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,245,247,0.96))] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                  <p className="ds-label">Analise financeira</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <p><span className="font-semibold text-slate-950">Margem:</span> {report.financial.marginPercentage}%</p>
                    <p><span className="font-semibold text-slate-950">Despesas sobre receita:</span> {report.financial.expenseRatio}%</p>
                    <p>
                      <span className="font-semibold text-slate-950">Categoria que mais pesou:</span>{" "}
                      {report.financial.heaviestExpenseCategory?.category ?? "Sem categoria dominante"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-950">Principal impacto:</span>{" "}
                      {report.financial.heaviestExpenseCategory
                        ? formatCurrency(report.financial.heaviestExpenseCategory.total)
                        : "Sem despesas registradas"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[color:var(--ds-primary-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,252,0.95))] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 ds-stat-primary" />
                  <p className="font-semibold text-slate-950">Insights automaticos</p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {report.insights.map((insight) => (
                    <div key={insight} className="rounded-2xl border border-[color:var(--ds-primary-border)]/60 bg-[color:var(--ds-primary-bg)]/90 px-4 py-3 text-sm leading-6 text-[color:var(--ds-text-secondary)]">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ExecutiveHighlight({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "warning" | "danger" | "primary";
}) {
  const toneClass =
    tone === "positive"
      ? "ds-tone-positive"
      : tone === "warning"
        ? "ds-tone-warning"
        : tone === "danger"
          ? "ds-tone-danger"
          : tone === "primary"
            ? "ds-tone-primary"
            : "ds-tone-info";

  return (
    <div className="ds-metric-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ds-label">{label}</p>
          <p className="mt-3 break-words font-[var(--font-heading)] text-[clamp(1.2rem,4vw,1.9rem)] font-bold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="ds-helper mt-2">{helper}</p>
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SnapshotMetric({
  label,
  value,
  tone = "default",
  compact = false,
  className = ""
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "danger";
  compact?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "positive" ? "ds-stat-positive" : tone === "danger" ? "ds-stat-danger" : "text-slate-950";

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white px-4 ${compact ? "py-3" : "py-4"} ${className}`}>
      <p className="ds-label">{label}</p>
      <p className={`mt-2 break-words font-[var(--font-heading)] ${compact ? "text-2xl" : "text-[clamp(1.35rem,4vw,2rem)]"} font-bold tracking-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function TwoWayComparisonCard({
  title,
  description,
  leftLabel,
  leftTone,
  leftMetrics,
  rightLabel,
  rightTone,
  rightMetrics
}: {
  title: string;
  description: string;
  leftLabel: string;
  leftTone: "vip" | "default";
  leftMetrics: Array<{ label: string; value: string }>;
  rightLabel: string;
  rightTone: "pista" | "group";
  rightMetrics: Array<{ label: string; value: string }>;
}) {
  const toneClass = (tone: "vip" | "default" | "pista" | "group") =>
    tone === "vip"
      ? "border-[color:var(--ds-vip-border)] bg-[image:linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.72)),var(--ds-vip-bg)]"
      : tone === "pista"
        ? "border-[color:var(--ds-pista-border)] bg-[color:color-mix(in_srgb,var(--ds-pista-bg)_72%,white_28%)]"
        : tone === "group"
          ? "border-[color:var(--ds-group-border)] bg-[color:color-mix(in_srgb,var(--ds-group-bg)_72%,white_28%)]"
          : "border-[color:var(--ds-info-border)] bg-[color:color-mix(in_srgb,var(--ds-info-bg)_74%,white_26%)]";

  const badgeClass = (tone: "vip" | "default" | "pista" | "group") =>
    tone === "vip"
      ? "ds-badge ds-badge-vip"
      : tone === "pista"
        ? "ds-badge ds-badge-pista"
        : tone === "group"
          ? "ds-badge ds-badge-group"
          : "ds-badge ds-badge-info";

  return (
    <div className="rounded-[24px] border border-[color:var(--ds-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,249,252,0.96))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-5">
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[
          { label: leftLabel, tone: leftTone, metrics: leftMetrics },
          { label: rightLabel, tone: rightTone, metrics: rightMetrics }
        ].map((item) => (
          <div
            key={item.label}
            className={`min-w-0 overflow-hidden rounded-[26px] border p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] md:p-5 ${toneClass(item.tone)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={badgeClass(item.tone)}>{item.label}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {item.metrics[0]?.value === "0" || item.metrics[1]?.value === "R$ 0,00" ? "Baixa tracao" : "Em destaque"}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {item.metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={`min-w-0 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,251,253,0.92))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-5`}
                >
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="ds-label">{metric.label}</p>
                      <p className="mt-3 whitespace-nowrap font-[var(--font-heading)] text-[clamp(1.55rem,3.3vw,2.05rem)] font-bold leading-tight tracking-tight text-slate-950">
                        {metric.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
