"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  BadgePercent,
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
  calculateGuestListStats,
  calculateSalePriceMode,
  calculateSalePriceRanking
} from "@/lib/event-metrics";
import { PartyEventDetail, SalesRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface InsightsPanelProps {
  event: PartyEventDetail;
  compact?: boolean;
}

function groupSalesByDate(sales: SalesRecord[]) {
  const grouped = new Map<string, { label: string; amount: number; tickets: number; timestamp: number }>();

  for (const sale of sales) {
    const soldDate = new Date(sale.soldAt);
    const key = soldDate.toISOString().slice(0, 10);
    const existing = grouped.get(key);

    if (existing) {
      existing.amount += sale.amount;
      existing.tickets += sale.sold;
      continue;
    }

    grouped.set(key, {
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(soldDate),
      amount: sale.amount,
      tickets: sale.sold,
      timestamp: soldDate.getTime()
    });
  }

  return Array.from(grouped.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ label, amount, tickets }) => ({ label, amount, tickets }));
}

function sumTickets(sales: SalesRecord[]) {
  return sales.reduce((total, sale) => total + sale.sold, 0);
}

function splitCurrencyValue(value: string) {
  const [currencyPrefix, amount] = value.split(/\s(.+)/);

  if (!amount) {
    return { currencyPrefix: undefined, amount: value };
  }

  return { currencyPrefix, amount };
}

function rankHighlight(index: number) {
  if (index === 0) return "border-brand-200 bg-brand-50/80";
  if (index === 1) return "border-sky-100 bg-sky-50/80";
  if (index === 2) return "border-amber-100 bg-amber-50/80";
  return "border-slate-200 bg-slate-50/80";
}

function MetricTile({
  title,
  value,
  currencyPrefix,
  helper,
  tone = "default",
  icon: Icon
}: {
  title: string;
  value: string;
  currencyPrefix?: string;
  helper: string;
  tone?: "default" | "positive" | "warning";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneStyles =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-brand-50 text-brand-700";

  return (
    <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm sm:min-h-[208px] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="max-w-[13rem] text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <div className="mt-3 min-h-[84px] sm:mt-4 sm:min-h-[96px]">
            {currencyPrefix ? (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{currencyPrefix}</p>
                <p className="mt-2 whitespace-nowrap font-[var(--font-heading)] text-[clamp(1.55rem,4vw,2.45rem)] font-bold tracking-tight text-slate-950">
                  {value}
                </p>
              </div>
            ) : (
              <p className="whitespace-nowrap font-[var(--font-heading)] text-[clamp(1.55rem,4vw,2.45rem)] font-bold tracking-tight text-slate-950">
                {value}
              </p>
            )}
          </div>
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 ${toneStyles}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
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
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 h-64 sm:h-72">{children}</div>
    </div>
  );
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
  const sellerChartData = useMemo(
    () => event.sellerContribution.slice(0, compact ? 4 : 6),
    [compact, event.sellerContribution]
  );
  const totalRevenueDisplay = splitCurrencyValue(formatCurrency(event.totalRevenue));
  const additionalRevenueDisplay = splitCurrencyValue(formatCurrency(event.additionalRevenue));
  const expensesDisplay = splitCurrencyValue(formatCurrency(event.totalExpenses));
  const profitDisplay = splitCurrencyValue(formatCurrency(event.estimatedProfit));
  const averageTicketDisplay = soldTickets > 0 ? splitCurrencyValue(formatCurrency(averageTicket)) : null;
  const salePriceModeDisplay =
    salePriceMode.modeCount > 0 ? splitCurrencyValue(formatCurrency(salePriceMode.modePrice)) : null;
  const healthToneStyles =
    event.health.tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : event.health.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-800";

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
                    <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                      Nenhum ponto critico no momento. A operacao esta equilibrada.
                    </div>
                  ) : (
                    event.attentionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-4 ${
                          item.tone === "critical"
                            ? "border-rose-200 bg-rose-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <p
                          className={`font-semibold ${
                            item.tone === "critical" ? "text-rose-900" : "text-amber-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`mt-1 text-sm leading-6 ${
                            item.tone === "critical" ? "text-rose-800" : "text-amber-800"
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

          <div className={`grid gap-4 ${compact ? "2xl:grid-cols-2" : "lg:grid-cols-2 2xl:grid-cols-3"}`}>
            <MetricTile
              title="Total arrecadado"
              value={totalRevenueDisplay.amount}
              currencyPrefix={totalRevenueDisplay.currencyPrefix}
              helper={`${formatCurrency(event.ticketRevenue)} em ingressos + ${formatCurrency(event.additionalRevenue)} em vendas extras`}
              icon={CircleDollarSign}
            />
            <MetricTile
              title="Meta atingida"
              value={`${event.progress}%`}
              helper={`${formatCurrency(event.totalRevenue)} de ${formatCurrency(event.goalValue)} esperados`}
              icon={BadgePercent}
              tone="positive"
            />
            <MetricTile
              title="Ingressos vendidos"
              value={`${soldTickets}`}
              helper="Total de ingressos vendidos pela equipe nesta festa"
              icon={TrendingUp}
            />
            <MetricTile
              title="Ticket medio"
              value={averageTicketDisplay?.amount ?? "-"}
              currencyPrefix={averageTicketDisplay?.currencyPrefix}
              helper={
                soldTickets > 0
                  ? `${formatCurrency(event.ticketRevenue)} divididos por ${soldTickets} ingresso(s)`
                  : "A metrica aparece assim que a festa registrar as primeiras vendas"
              }
              icon={CircleDollarSign}
            />
            <MetricTile
              title="Valor mais vendido"
              value={salePriceModeDisplay?.amount ?? "-"}
              currencyPrefix={salePriceModeDisplay?.currencyPrefix}
              helper={
                salePriceMode.modeCount > 0
                  ? `${salePriceMode.modeCount} ingresso(s) foram vendidos nesse valor`
                  : "A moda aparece assim que a festa registrar as primeiras vendas"
              }
              icon={CircleDollarSign}
            />
            <MetricTile
              title="Vendas extras"
              value={additionalRevenueDisplay.amount}
              currencyPrefix={additionalRevenueDisplay.currencyPrefix}
              helper="Entradas adicionais como bar, copos e outras arrecadacoes"
              icon={CircleDollarSign}
            />
            <MetricTile
              title="Total de despesas"
              value={expensesDisplay.amount}
              currencyPrefix={expensesDisplay.currencyPrefix}
              helper="Saidas cadastradas para calcular o resultado real da festa"
              icon={Wallet}
            />
            <MetricTile
              title="Lucro estimado"
              value={profitDisplay.amount}
              currencyPrefix={profitDisplay.currencyPrefix}
              helper="Total arrecadado menos despesas registradas"
              icon={Wallet}
              tone="positive"
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

          <div className={`grid gap-6 ${compact ? "lg:grid-cols-1" : "xl:grid-cols-[1.1fr_0.9fr]"}`}>
            <InsightChart
              title="Evolucao de vendas"
              description="Veja como a receita avanca ao longo do tempo e identifique dias com melhor resposta."
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
                        {index < 3 ? <Medal className="h-5 w-5 shrink-0 text-amber-500" /> : null}
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
