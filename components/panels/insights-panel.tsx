"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  BadgePercent,
  ChevronDown,
  CheckCircle2,
  CircleDollarSign,
  Medal,
  TrendingUp,
  Wallet
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import {
  calculateAverageTicket,
  calculateBatchMetrics,
  calculateGuestListStats,
  calculateOperationalTimeline,
  calculatePeriodComparison,
  calculateSalePriceConversion,
  calculateSalePriceMode,
  calculateSalePriceRanking,
  calculateSaleTypeMetrics,
  calculateTicketTypeMetrics
} from "@/lib/event-metrics";
import { PartyEventDetail, SalesRecord } from "@/lib/types";
import { formatCurrency, formatCurrencyParts, formatSaleTypeLabel, formatTicketTypeLabel } from "@/lib/utils";

interface InsightsPanelProps {
  event: PartyEventDetail;
  compact?: boolean;
}

function groupSalesByDate(sales: SalesRecord[]) {
  const grouped = new Map<string, { label: string; amount: number; tickets: number; timestamp: number }>();

  for (const sale of sales) {
    const key = sale.soldAt;
    const [year, month, day] = key.split("-").map(Number);

    if (!year || !month || !day) {
      continue;
    }

    const existing = grouped.get(key);

    if (existing) {
      existing.amount += sale.amount;
      existing.tickets += sale.sold;
      continue;
    }

    grouped.set(key, {
      label: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      amount: sale.amount,
      tickets: sale.sold,
      timestamp: year * 10000 + month * 100 + day
    });
  }

  return Array.from(grouped.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ label, amount, tickets }) => ({ label, amount, tickets }));
}

function sumTickets(sales: SalesRecord[]) {
  return sales.reduce((total, sale) => total + sale.sold, 0);
}

function rankHighlight(index: number) {
  if (index === 0) return "ds-tone-positive";
  if (index === 1) return "ds-tone-primary";
  if (index === 2) return "ds-tone-warning";
  return "ds-card-muted";
}

function TicketTypeValue({ value }: { value: string }) {
  const normalizedValue = value.replace(/\u00a0/g, " ");

  if (!normalizedValue.startsWith("R$")) {
    return (
      <p className="mt-4 min-w-0 break-words font-[var(--font-heading)] text-[clamp(1.25rem,2vw,1.75rem)] font-bold leading-tight tracking-tight text-slate-950">
        {value}
      </p>
    );
  }

  const amountLabel = normalizedValue.replace(/^R\$\s*/, "");

  return (
    <div className="mt-4 min-w-0 space-y-2">
      <p className="ds-label">R$</p>
      <p className="min-w-0 break-words font-[var(--font-heading)] text-[clamp(1.15rem,5vw,1.75rem)] font-bold leading-tight tracking-tight text-slate-950">
        {amountLabel}
      </p>
    </div>
  );
}

function InlineStatCard({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "soft";
}) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl px-4 py-4 ${tone === "soft" ? "bg-white/75" : "bg-slate-50"}`}>
      <p className="ds-label">{label}</p>
      <p className="mt-2 break-words font-[var(--font-heading)] text-[clamp(1.2rem,5vw,1.85rem)] font-bold leading-tight tracking-tight text-slate-950">
        {value}
      </p>
      {helper ? <p className="ds-helper mt-2">{helper}</p> : null}
    </div>
  );
}

function TicketTypeMetricBlock({
  title,
  items
}: {
  title: string;
  items: Array<{
    ticketType: "vip" | "pista";
    value: string;
    helper: string;
    tone: "vip" | "pista";
  }>;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="ds-helper mt-1">Comparativo por tipo de ingresso, usando apenas as vendas registradas.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {items.map((item) => (
          <div key={item.ticketType} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`ds-badge ${
                  item.tone === "vip"
                    ? "ds-badge-vip"
                    : "ds-badge-pista"
                }`}
              >
                {formatTicketTypeLabel(item.ticketType)}
              </span>
            </div>
            <TicketTypeValue value={item.value} />
            <p className="ds-helper mt-2">{item.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatchAnalysisBlock({
  rows
}: {
  rows: Array<{
    batchLabel: string;
    ticketsSold: number;
    revenue: number;
    averageTicket: number;
    percentage: number;
    revenuePercentage: number;
    ticketTypes: Record<
      "vip" | "pista",
      {
        ticketsSold: number;
        revenue: number;
        averageTicket: number;
        revenuePercentage: number;
      }
    >;
  }>;
}) {
  const ticketTypeBreakdown = [
    { key: "vip" as const, badgeClassName: "ds-badge-vip", panelClassName: "border-amber-200 bg-amber-50/60" },
    { key: "pista" as const, badgeClassName: "ds-badge-pista", panelClassName: "border-rose-200 bg-rose-50/60" }
  ];

  return (
    <details className="group rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Lotes</p>
          <p className="ds-helper mt-1">
            Leitura comercial por lote para entender volume, arrecadacao e ticket medio.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
          {rows.length} lote(s)
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </div>
      </summary>

      {rows.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
          Os lotes aparecem aqui assim que a festa registrar vendas.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.batchLabel} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="ds-badge ds-badge-batch">
                  {row.batchLabel}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {row.revenuePercentage}% da receita
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InlineStatCard label="Ingressos" value={`${row.ticketsSold}`} />
                <InlineStatCard label="Receita" value={formatCurrency(row.revenue)} />
                <InlineStatCard label="Ticket medio" value={formatCurrency(row.averageTicket)} />
                <InlineStatCard label="Participacao na receita" value={`${row.revenuePercentage}%`} />
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {ticketTypeBreakdown.map((item) => {
                  const metric = row.ticketTypes[item.key];

                  return (
                    <div key={item.key} className={`rounded-2xl border p-4 ${item.panelClassName}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`ds-badge ${item.badgeClassName}`}>
                          {formatTicketTypeLabel(item.key)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {metric.revenuePercentage}% do lote
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="ds-label">Ingressos</p>
                          <p className="mt-1 text-xl font-bold text-slate-950">{metric.ticketsSold}</p>
                        </div>
                        <div>
                          <p className="ds-label">Receita</p>
                          <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(metric.revenue)}</p>
                        </div>
                        <div>
                          <p className="ds-label">Ticket medio</p>
                          <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(metric.averageTicket)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

function SaleTypeAnalysisBlock({
  metrics
}: {
  metrics: Record<
    "normal" | "grupo",
    {
      ticketsSold: number;
      revenue: number;
      averageTicket: number;
      percentage: number;
    }
  >;
}) {
  const items = [
    {
      saleType: "normal" as const,
      tone: "border-[color:var(--ds-info-border)] bg-[color:var(--ds-info-bg)] text-[color:var(--ds-info-text)]",
      metrics: metrics.normal
    },
    {
      saleType: "grupo" as const,
      tone: "border-[color:var(--ds-group-border)] bg-[color:var(--ds-group-bg)] text-[color:var(--ds-group-text)]",
      metrics: metrics.grupo
    }
  ];

  return (
    <details className="group rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Tipo de venda</p>
          <p className="ds-helper mt-1">
            Compare vendas normais e em grupo para entender impacto em volume e ticket medio.
          </p>
        </div>
        <ChevronDown className="mt-1 h-4 w-4 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="mt-5 grid gap-4">
        {items.map((item) => (
          <div key={item.saleType} className={`min-w-0 overflow-hidden rounded-2xl border px-5 py-5 ${item.tone}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="ds-badge border-current/20 bg-white/80">
                {formatSaleTypeLabel(item.saleType)}
              </span>
              <span className="ds-label opacity-70">
                {item.metrics.percentage}% do total
              </span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              <InlineStatCard label="Ingressos" value={`${item.metrics.ticketsSold}`} tone="soft" />
              <InlineStatCard label="Receita" value={formatCurrency(item.metrics.revenue)} tone="soft" />
              <InlineStatCard
                label="Ticket medio"
                value={item.metrics.ticketsSold > 0 ? formatCurrency(item.metrics.averageTicket) : "-"}
                tone="soft"
              />
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function MetricTile({
  title,
  value,
  currencyPrefix,
  isNegative = false,
  isPositive = false,
  helper,
  tone = "default",
  icon: Icon
}: {
  title: string;
  value: string;
  currencyPrefix?: string;
  isNegative?: boolean;
  isPositive?: boolean;
  helper: string;
  tone?: "default" | "positive" | "warning";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneStyles =
    tone === "positive"
      ? "ds-tone-positive"
      : tone === "warning"
        ? "ds-tone-warning"
        : "ds-tone-info";

  return (
    <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm sm:min-h-[208px] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="max-w-[13rem] ds-label">{title}</p>
          <div className="mt-3 min-h-[84px] sm:mt-4 sm:min-h-[96px]">
            {currencyPrefix ? (
              <div className="min-w-0">
                <p className="ds-label">{currencyPrefix}</p>
                  <p
                    className={`mt-2 break-words whitespace-normal font-[var(--font-heading)] text-[clamp(1.35rem,7vw,2.45rem)] font-bold tracking-tight sm:whitespace-nowrap ${
                      isNegative ? "ds-stat-danger" : isPositive ? "ds-stat-positive" : "text-slate-950"
                    }`}
                  >
                    {value}
                </p>
              </div>
            ) : (
              <p className="break-words whitespace-normal font-[var(--font-heading)] text-[clamp(1.35rem,7vw,2.45rem)] font-bold tracking-tight text-slate-950 sm:whitespace-nowrap">
                {value}
              </p>
            )}
          </div>
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 ${toneStyles}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="ds-helper mt-2">{helper}</p>
    </div>
  );
}

function InsightChart({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="ds-helper mt-1">{description}</p>
      <div className="mt-5 h-64 sm:h-72">{children}</div>
    </div>
  );
}

function formatVariation(value: number | null) {
  if (value === null) {
    return "Sem base";
  }

  return `${value > 0 ? "+" : ""}${value}%`;
}

function variationTone(value: number | null) {
  if (value === null) {
    return "text-slate-500";
  }

  if (value > 0) {
    return "ds-stat-positive";
  }

  if (value < 0) {
    return "ds-stat-danger";
  }

  return "text-slate-500";
}

function formatTimelineDisplayDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function InsightsPanel({ event, compact = false }: InsightsPanelProps) {
  const visibleSales = event.salesControl;
  const timeline = useMemo(() => groupSalesByDate(visibleSales), [visibleSales]);
  const topPerformer = event.ranking[0];
  const soldTickets = useMemo(() => sumTickets(visibleSales), [visibleSales]);
  const guestListStats = useMemo(
    () =>
      calculateGuestListStats(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          attendeeCount: sale.attendeeCount
        }))
      ),
    [visibleSales]
  );
  const averageTicket = useMemo(
    () => calculateAverageTicket(event.ticketRevenue, soldTickets),
    [event.ticketRevenue, soldTickets]
  );
  const salePriceMode = useMemo(
    () =>
      calculateSalePriceMode(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice
        }))
      ),
    [visibleSales]
  );
  const salePriceRanking = useMemo(
    () =>
      calculateSalePriceRanking(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice
        }))
      ).slice(0, 5),
    [visibleSales]
  );
  const salePriceConversion = useMemo(
    () =>
      calculateSalePriceConversion(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice
        }))
      ).slice(0, 5),
    [visibleSales]
  );
  const ticketTypeMetrics = useMemo(
    () =>
      calculateTicketTypeMetrics(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice,
          ticketType: sale.ticketType
        }))
      ),
    [visibleSales]
  );
  const batchMetrics = useMemo(
    () =>
      calculateBatchMetrics(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice,
          batchLabel: sale.batchLabel,
          ticketType: sale.ticketType
        }))
      ),
    [visibleSales]
  );
  const saleTypeMetrics = useMemo(
    () =>
      calculateSaleTypeMetrics(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice,
          saleType: sale.saleType
        }))
      ),
    [visibleSales]
  );
  const periodComparison = useMemo(
    () =>
      calculatePeriodComparison(
        visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice,
          createdAt: sale.soldAt
        }))
      ),
    [visibleSales]
  );
  const operationalTimeline = useMemo(
    () =>
      calculateOperationalTimeline({
        sales: visibleSales.map((sale) => ({
          quantity: sale.sold,
          unitPrice: sale.unitPrice,
          createdAt: sale.soldAt
        })),
        additionalRevenues: event.additionalRevenues.map((revenue) => ({
          amount: revenue.amount,
          date: revenue.date
        })),
        expenses: event.expenses.map((expense) => ({
          amount: expense.amount,
          incurredAt: expense.incurredAt,
          category: expense.category,
          title: expense.title
        }))
      }),
    [event.additionalRevenues, event.expenses, visibleSales]
  );
  const sellerChartData = useMemo(
    () => event.sellerContribution.slice(0, compact ? 4 : 6),
    [compact, event.sellerContribution]
  );
  const totalRevenueDisplay = formatCurrencyParts(event.totalRevenue);
  const additionalRevenueDisplay = formatCurrencyParts(event.additionalRevenue);
  const expensesDisplay = formatCurrencyParts(event.totalExpenses);
  const profitDisplay = formatCurrencyParts(event.estimatedProfit);
  const averageTicketDisplay = soldTickets > 0 ? formatCurrencyParts(averageTicket) : null;
  const salePriceModeDisplay = salePriceMode.modeCount > 0 ? formatCurrencyParts(salePriceMode.modePrice) : null;
  const healthToneStyles =
    event.health.tone === "positive"
      ? "ds-tone-positive"
      : event.health.tone === "warning"
        ? "ds-tone-warning"
        : "ds-tone-danger";

  return (
    <SectionCard
      title="Desempenho do evento"
      description="Entenda o ritmo comercial da festa e tome decisoes com base no desempenho real da operacao."
    >
      {visibleSales.length === 0 ? (
        <EmptyState
          title="Desempenho ainda sem movimento"
          description="Assim que as vendas comecarem, esta aba vai mostrar evolucao de receita, ranking e avancos sobre a meta."
          icon={BarChart3}
        />
      ) : (
        <div className="space-y-6">
          {!compact ? (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className={`rounded-[24px] border p-5 sm:p-6 ${healthToneStyles}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Estado da festa</p>
                    <h3 className="mt-2 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                      {event.health.label}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6">{event.health.summary}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-60">Meta atingida</p>
                    <p className="mt-2 text-2xl font-semibold">{event.progress}%</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-60">Melhor vendedor</p>
                    <p className="mt-2 text-lg font-semibold">{topPerformer?.name ?? "Sem vendas"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-60">Principal problema</p>
                    <p className="mt-2 text-sm font-semibold">
                      {event.attentionItems[0]?.title ?? "Nenhuma pendencia critica"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <p className="font-semibold text-slate-900">Pontos que exigem atencao</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Itens que ajudam a entender onde agir primeiro para melhorar o resultado da festa.
                </p>
                <div className="mt-5 space-y-3">
                  {event.attentionItems.length === 0 ? (
                    <div className="ds-tone-positive rounded-2xl border border-dashed px-4 py-5 text-sm">
                      Nenhum ponto critico no momento. A operacao esta equilibrada.
                    </div>
                  ) : (
                    event.attentionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-4 ${
                          item.tone === "critical"
                            ? "ds-tone-danger"
                            : "ds-tone-warning"
                        }`}
                      >
                        <p
                          className={`font-semibold ${
                            item.tone === "critical" ? "ds-stat-danger" : "text-[color:var(--ds-warning-text)]"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`mt-1 text-sm leading-6 ${
                            item.tone === "critical" ? "text-[color:var(--ds-danger-text)]" : "text-[color:var(--ds-warning-text)]"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className={`grid gap-4 ${compact ? "[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]" : "[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"}`}>
            <MetricTile
              title="Total arrecadado"
              value={totalRevenueDisplay.amountLabel}
              currencyPrefix={totalRevenueDisplay.currencyLabel}
              helper={`${formatCurrency(event.ticketRevenue)} em ingressos + ${formatCurrency(event.additionalRevenue)} em vendas extras`}
              icon={CircleDollarSign}
              tone="positive"
            />
            <MetricTile
              title="Meta atingida"
              value={`${event.progress}%`}
              helper={`${formatCurrency(event.totalRevenue)} de ${formatCurrency(event.goalValue)} esperados`}
              icon={BadgePercent}
              tone={event.progress >= 100 ? "positive" : event.progress >= 75 ? "warning" : "default"}
            />
            <MetricTile
              title="Ingressos vendidos"
              value={`${soldTickets}`}
              helper="Total de ingressos vendidos pela equipe nesta festa"
              icon={TrendingUp}
            />
            <MetricTile
              title="Ticket medio"
              value={averageTicketDisplay?.amountLabel ?? "-"}
              currencyPrefix={averageTicketDisplay?.currencyLabel}
              helper={
                soldTickets > 0
                  ? `${formatCurrency(event.ticketRevenue)} divididos por ${soldTickets} ingresso(s)`
                  : "A metrica aparece assim que a festa registrar as primeiras vendas"
              }
              icon={CircleDollarSign}
            />
            <MetricTile
              title="Valor mais vendido"
              value={salePriceModeDisplay?.amountLabel ?? "-"}
              currencyPrefix={salePriceModeDisplay?.currencyLabel}
              helper={
                salePriceMode.modeCount > 0
                  ? `${salePriceMode.modeCount} ingresso(s) foram vendidos nesse valor`
                  : "A moda aparece assim que a festa registrar as primeiras vendas"
              }
              icon={CircleDollarSign}
            />
            <MetricTile
              title="Vendas extras"
              value={additionalRevenueDisplay.amountLabel}
              currencyPrefix={additionalRevenueDisplay.currencyLabel}
              helper="Entradas adicionais como bar, copos e outras arrecadacoes"
              icon={CircleDollarSign}
              tone="positive"
            />
            <MetricTile
              title="Total de despesas"
              value={expensesDisplay.amountLabel}
              currencyPrefix={expensesDisplay.currencyLabel}
              helper="Saidas cadastradas para calcular o resultado real da festa"
              icon={Wallet}
              tone="warning"
            />
              <MetricTile
                title="Lucro estimado"
                value={profitDisplay.amountLabel}
                currencyPrefix={profitDisplay.currencyLabel}
                isNegative={profitDisplay.isNegative}
                isPositive={event.estimatedProfit > 0}
                helper="Total arrecadado menos despesas registradas"
                icon={Wallet}
                tone={profitDisplay.isNegative ? "warning" : "positive"}
              />
            <MetricTile
              title="Lista de entrada"
              value={`${guestListStats.totalRegisteredNames}/${guestListStats.totalExpectedNames}`}
              helper={
                guestListStats.missingNames > 0
                  ? `${guestListStats.missingNames} nome(s) ainda faltam`
                  : "Todos os nomes esperados ja foram preenchidos"
              }
              icon={CheckCircle2}
              tone={guestListStats.missingNames > 0 ? "warning" : "positive"}
            />
          </div>

          {!compact && event.hasVip ? (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] xl:[grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
              <TicketTypeMetricBlock
                title="Ingressos por tipo"
                items={[
                  {
                    ticketType: "vip",
                    value: `${ticketTypeMetrics.vip.ticketsSold}`,
                    helper: `${ticketTypeMetrics.vip.ticketsSold} ingresso(s) VIP vendidos (${ticketTypeMetrics.vip.percentage}%)`,
                    tone: "vip"
                  },
                  {
                    ticketType: "pista",
                    value: `${ticketTypeMetrics.pista.ticketsSold}`,
                    helper: `${ticketTypeMetrics.pista.ticketsSold} ingresso(s) PISTA vendidos (${ticketTypeMetrics.pista.percentage}%)`,
                    tone: "pista"
                  }
                ]}
              />
              <TicketTypeMetricBlock
                title="Receita por tipo"
                items={[
                  {
                    ticketType: "vip",
                    value: formatCurrency(ticketTypeMetrics.vip.revenue),
                    helper: `Total arrecadado nas vendas VIP`,
                    tone: "vip"
                  },
                  {
                    ticketType: "pista",
                    value: formatCurrency(ticketTypeMetrics.pista.revenue),
                    helper: `Total arrecadado nas vendas PISTA`,
                    tone: "pista"
                  }
                ]}
              />
              <TicketTypeMetricBlock
                title="Ticket medio por tipo"
                items={[
                  {
                    ticketType: "vip",
                    value: ticketTypeMetrics.vip.ticketsSold > 0 ? formatCurrency(ticketTypeMetrics.vip.averageTicket) : "-",
                    helper:
                      ticketTypeMetrics.vip.ticketsSold > 0
                        ? `${formatCurrency(ticketTypeMetrics.vip.revenue)} divididos por ${ticketTypeMetrics.vip.ticketsSold} ingresso(s) VIP`
                        : "Sem vendas VIP para calcular o ticket medio",
                    tone: "vip"
                  },
                  {
                    ticketType: "pista",
                    value: ticketTypeMetrics.pista.ticketsSold > 0 ? formatCurrency(ticketTypeMetrics.pista.averageTicket) : "-",
                    helper:
                      ticketTypeMetrics.pista.ticketsSold > 0
                        ? `${formatCurrency(ticketTypeMetrics.pista.revenue)} divididos por ${ticketTypeMetrics.pista.ticketsSold} ingresso(s) PISTA`
                        : "Sem vendas PISTA para calcular o ticket medio",
                    tone: "pista"
                  }
                ]}
              />
            </div>
          ) : null}

          {!compact ? (
            <div className="grid gap-6">
              <BatchAnalysisBlock rows={batchMetrics} />
              {event.hasGroupSales ? <SaleTypeAnalysisBlock metrics={saleTypeMetrics} /> : null}
            </div>
          ) : null}

          {!compact ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Comparativo por periodo</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Ritmo de vendas usando a data real da venda para comparar hoje, ontem e os ultimos 7 dias.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {[
                  {
                    title: "Hoje",
                    tickets: periodComparison.today.ticketsSold,
                    revenue: periodComparison.today.revenue,
                    variation: periodComparison.variations.todayVsYesterdayTickets,
                    helper: "Comparado com ontem"
                  },
                  {
                    title: "Ontem",
                    tickets: periodComparison.yesterday.ticketsSold,
                    revenue: periodComparison.yesterday.revenue,
                    variation: null,
                    helper: "Base para comparacao"
                  },
                  {
                    title: "Ultimos 7 dias",
                    tickets: periodComparison.last7Days.ticketsSold,
                    revenue: periodComparison.last7Days.revenue,
                    variation: periodComparison.variations.last7VsPrevious7Tickets,
                    helper: "Comparado com os 7 dias anteriores"
                  }
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
                        <p className="mt-3 font-[var(--font-heading)] text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-slate-950">
                          {item.tickets}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">ingresso(s)</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${variationTone(item.variation)}`}>
                        {formatVariation(item.variation)}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Receita</p>
                      <p className="mt-2 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                        {formatCurrency(item.revenue)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={`grid gap-6 ${compact ? "lg:grid-cols-1" : "2xl:grid-cols-[1.1fr_0.9fr]"}`}>
            <InsightChart
              title="Evolucao da receita"
              description="Veja como o valor arrecadado avanca ao longo do tempo e identifique os dias com melhor resposta."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    width={80}
                    tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Periodo ${label}`}
                    contentStyle={{ borderRadius: 18, borderColor: "#e2e8f0" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: "#2563eb" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </InsightChart>

            <InsightChart
              title="Evolucao dos ingressos vendidos"
              description="Acompanhe a quantidade de ingressos vendidos ao longo do tempo usando a mesma leitura temporal do grafico de receita."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} width={56} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value} ingresso${value === 1 ? "" : "s"}`, "Ingressos"]}
                    labelFormatter={(label) => `Periodo ${label}`}
                    contentStyle={{ borderRadius: 18, borderColor: "#e2e8f0" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tickets"
                    stroke="#d97706"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: "#d97706" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </InsightChart>

            <InsightChart
              title="Comparacao entre vendedores"
              description="Compare rapidamente quem esta puxando a arrecadacao do evento."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="seller" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    width={80}
                    tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 18, borderColor: "#e2e8f0" }}
                  />
                  <Bar dataKey="amount" radius={[14, 14, 4, 4]}>
                    {sellerChartData.map((entry, index) => (
                      <Cell
                        key={`${entry.seller}-${index}`}
                        fill={index === 0 ? "#2563eb" : index === 1 ? "#0ea5e9" : "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </InsightChart>
          </div>

          {!compact ? (
            <details className="group rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Linha do tempo operacional</p>
                  <p className="ds-helper mt-1">
                    Leitura historica da operacao para enxergar quando as vendas ganharam tracao, quando a receita subiu e quando os custos apertaram.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                  {operationalTimeline.length} marco(s)
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </span>
              </summary>

              {operationalTimeline.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                  A linha do tempo aparece assim que a festa tiver vendas ou despesas registradas.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {operationalTimeline.map((item) => {
                    const importanceBadge = item.title.includes("Pico")
                      ? {
                          label: "Pico",
                          className: "bg-[color:var(--ds-group-text)] text-white border-[color:var(--ds-group-text)]"
                        }
                      : item.title.includes("Aceleracao")
                        ? {
                            label: "Aceleracao",
                          className: "bg-[color:var(--ds-batch-text)] text-white border-[color:var(--ds-batch-text)]"
                          }
                        : item.title.includes("Aumento de custos")
                          ? {
                              label: "Custo alto",
                              className: "bg-[color:var(--ds-danger-text)] text-white border-[color:var(--ds-danger-text)]"
                            }
                          : item.title.includes("Inicio")
                            ? {
                                label: "Marco inicial",
                                className: "bg-[color:#4f5b71] text-white border-[color:#4f5b71]"
                              }
                            : item.category === "attention"
                              ? {
                                  label: "Atencao",
                                  className: "bg-[color:var(--ds-warning-text)] text-white border-[color:var(--ds-warning-text)]"
                                }
                              : null;
                    const toneStyles =
                      item.category === "expense"
                        ? {
                            rail: "bg-[color:var(--ds-danger-border)]",
                            dot: "bg-[color:var(--ds-danger-text)]",
                            badge: "ds-badge-danger"
                          }
                        : item.category === "revenue"
                          ? {
                              rail: "bg-[color:var(--ds-success-border)]",
                              dot: "bg-[color:var(--ds-success-text)]",
                              badge: "ds-badge-positive"
                            }
                          : item.category === "attention"
                            ? {
                                rail: "bg-[color:var(--ds-warning-border)]",
                                dot: "bg-[color:var(--ds-warning-text)]",
                                badge: "ds-badge-warning"
                              }
                            : {
                                rail: "bg-[color:var(--ds-batch-border)]",
                                dot: "bg-[color:var(--ds-batch-text)]",
                                badge: "ds-badge-batch"
                              };

                    return (
                      <div key={item.id} className="grid gap-3 sm:grid-cols-[140px_16px_minmax(0,1fr)] sm:items-start">
                        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <p className="ds-label">Data</p>
                          <p className="mt-2 font-semibold text-slate-900">{formatTimelineDisplayDate(item.date)}</p>
                        </div>

                        <div className="relative hidden h-full justify-center sm:flex">
                          <div className={`absolute inset-y-0 w-px ${toneStyles.rail}`} />
                          <div className={`relative mt-3 h-3 w-3 rounded-full ${toneStyles.dot}`} />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-950">{item.title}</p>
                                {importanceBadge ? (
                                  <span className={`ds-badge border ${importanceBadge.className}`}>
                                    {importanceBadge.label}
                                  </span>
                                ) : null}
                              </div>
                              <p className="ds-helper mt-2 text-sm leading-6">{item.description}</p>
                            </div>
                            <span className={`ds-badge ${toneStyles.badge}`}>
                              {item.category === "sales"
                                ? "Vendas"
                                : item.category === "revenue"
                                  ? "Receita"
                                  : item.category === "expense"
                                    ? "Despesa"
                                    : "Atencao"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </details>
          ) : null}

          {!compact ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Ranking de vendedores</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Top vendedores ordenados por arrecadacao total e volume de ingressos vendidos.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                    {event.ranking.length} ativos
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {event.ranking.map((seller, index) => (
                    <div key={seller.id} className={`rounded-[22px] border p-4 ${rankHighlight(index)}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-900 shadow-sm">
                              #{index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">{seller.name}</p>
                              <p className="mt-1 text-sm text-slate-500">{seller.ticketsSold} ingressos vendidos</p>
                            </div>
                          </div>
                        </div>
                        {index < 3 ? <Medal className="h-5 w-5 shrink-0 text-[color:var(--ds-warning-text)]" /> : null}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total vendido</p>
                        <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                          {formatCurrency(seller.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Ranking de precos</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Valores de ingresso mais vendidos, ponderados pela quantidade total de ingressos em cada preco.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                    Top 5
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {salePriceRanking.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      O ranking aparece assim que a festa registrar vendas com preco definido.
                    </div>
                  ) : (
                    salePriceRanking.map((entry, index) => (
                      <div
                        key={`${entry.unitPrice}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">#{index + 1}</p>
                          <p className="mt-2 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                            {formatCurrency(entry.unitPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.ticketsSold} ingresso{entry.ticketsSold === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">vendidos nesse valor</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {salePriceConversion[index]?.percentage ?? 0}% do total
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
