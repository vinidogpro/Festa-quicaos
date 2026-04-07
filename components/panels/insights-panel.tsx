"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  BadgePercent,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Medal,
  TrendingUp
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { calculateAverageTicket, calculateGoalProgress, calculateGuestListStats } from "@/lib/event-metrics";
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

function sumValues(sales: SalesRecord[], status: "paid" | "pending") {
  return sales
    .filter((sale) => sale.paymentStatus === status)
    .reduce((total, sale) => total + sale.amount, 0);
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
  helper,
  tone = "default",
  icon: Icon
}: {
  title: string;
  value: string;
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
    <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <div className="mt-3 min-h-[64px] sm:mt-4 sm:min-h-[72px]">
            <p className="whitespace-nowrap font-[var(--font-heading)] text-[clamp(1.45rem,5vw,2.45rem)] font-bold tracking-tight text-slate-950">
              {value}
            </p>
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
  const isSellerView = false;

  const visibleSales = useMemo(
    () =>
      isSellerView
        ? event.salesControl.filter((sale) => sale.sellerUserId === event.permissions.sellerUserId)
        : event.salesControl,
    [event.permissions.sellerUserId, event.salesControl, isSellerView]
  );

  const visibleRanking = useMemo(
    () =>
      isSellerView
        ? event.ranking.filter((seller) => seller.sellerUserId === event.permissions.sellerUserId)
        : event.ranking,
    [event.permissions.sellerUserId, event.ranking, isSellerView]
  );

  const timeline = useMemo(() => groupSalesByDate(visibleSales), [visibleSales]);
  const topPerformer = visibleRanking[0];

  const totals = useMemo(() => {
    const guestListStats = calculateGuestListStats(
      visibleSales.map((sale) => ({
        quantity: sale.sold,
        attendeeCount: sale.attendeeCount
      }))
    );
    const soldTickets = sumTickets(visibleSales);

    if (!isSellerView) {
      return {
        grossSoldRevenue: event.ticketRevenue,
        additionalRevenue: event.additionalRevenue,
        confirmedRevenue: event.confirmedRevenue,
        pendingRevenue: event.pendingRevenue,
        generalRevenue: event.totalRevenue,
        soldTickets: event.totalTicketsSold,
        guestListStats,
        goalReference: event.goalValue,
        metaProgress: event.progress,
        pendingPaymentsCount: event.pendingPaymentsCount
      };
    }

    const grossSoldRevenue = visibleSales.reduce((total, sale) => total + sale.amount, 0);
    const confirmedRevenue = sumValues(visibleSales, "paid");
    const pendingRevenue = sumValues(visibleSales, "pending");
    const generalRevenue = grossSoldRevenue;

    return {
      grossSoldRevenue,
      additionalRevenue: 0,
      confirmedRevenue,
      pendingRevenue,
      generalRevenue,
      soldTickets,
      guestListStats,
      goalReference: event.goalValue,
      metaProgress: calculateGoalProgress(generalRevenue, event.goalValue),
      pendingPaymentsCount: visibleSales.filter((sale) => sale.paymentStatus === "pending").length
    };
  }, [
    event.additionalRevenue,
    event.confirmedRevenue,
    event.goalValue,
    event.pendingPaymentsCount,
    event.pendingRevenue,
    event.progress,
    event.ticketRevenue,
    event.totalRevenue,
    event.totalTicketsSold,
    isSellerView,
    visibleSales
  ]);

  const sellerChartData = useMemo(() => {
    if (isSellerView) {
      return visibleRanking.map((seller) => ({
        seller: seller.name.split(" ")[0] ?? seller.name,
        amount: seller.revenue
      }));
    }

    return event.sellerContribution.slice(0, compact ? 4 : 6);
  }, [compact, event.sellerContribution, isSellerView, visibleRanking]);

  const paymentChartData = useMemo(
    () => [
      { name: "Pago", value: totals.confirmedRevenue, color: "#16a34a" },
      { name: "Pendente", value: totals.pendingRevenue, color: "#f59e0b" }
    ],
    [totals.confirmedRevenue, totals.pendingRevenue]
  );
  const averageTicket = useMemo(
    () => calculateAverageTicket(totals.grossSoldRevenue, totals.soldTickets),
    [totals.grossSoldRevenue, totals.soldTickets]
  );

  const pendingTransfers = isSellerView
    ? event.transfersPending.filter((item) => item.id === event.permissions.sellerUserId)
    : event.transfersPending;
  const healthToneStyles =
    event.health.tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : event.health.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <SectionCard
      title="Insights do evento"
      description={
        isSellerView
          ? "Acompanhe sua performance, sua contribuicao para a meta e os repasses do seu proprio fluxo."
          : "Entenda o ritmo comercial da festa, acompanhe repasses e tome decisoes com base no desempenho da equipe."
      }
    >
      {visibleSales.length === 0 ? (
        <EmptyState
          title="Insights ainda sem movimento"
          description="Assim que as vendas comecarem, a aba vai mostrar evolucao de receita, ranking, repasses e avancos sobre a meta."
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

          <div className={`grid gap-4 ${compact ? "xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            <MetricTile
              title={isSellerView ? "Sua arrecadacao" : "Total arrecadado"}
              value={formatCurrency(totals.generalRevenue)}
              helper={
                isSellerView
                  ? `${totals.soldTickets} ingressos vendidos no seu nome`
                  : `${formatCurrency(totals.grossSoldRevenue)} em total vendido + ${formatCurrency(totals.additionalRevenue)} em vendas extras`
              }
              icon={CircleDollarSign}
            />
            <MetricTile
              title={isSellerView ? "Sua meta individual" : "Meta atingida"}
              value={`${totals.metaProgress}%`}
              helper={
                isSellerView
                  ? `${formatCurrency(totals.generalRevenue)} do seu faturamento atual`
                  : `${formatCurrency(totals.generalRevenue)} de ${formatCurrency(event.goalValue)} esperados`
              }
              icon={BadgePercent}
              tone="positive"
            />
            <MetricTile
              title="Ingressos vendidos"
              value={`${totals.soldTickets}`}
              helper={
                isSellerView
                  ? "Volume de ingressos vendidos por voce ate agora"
                  : "Total de ingressos vendidos pela equipe nesta festa"
              }
              icon={TrendingUp}
            />
            <MetricTile
              title="Ticket medio"
              value={totals.soldTickets > 0 ? formatCurrency(averageTicket) : "—"}
              helper={
                totals.soldTickets > 0
                  ? `${formatCurrency(totals.grossSoldRevenue)} divididos por ${totals.soldTickets} ingresso(s)`
                  : "A metrica aparece assim que a festa registrar as primeiras vendas"
              }
              icon={CircleDollarSign}
            />
            <MetricTile
              title={isSellerView ? "Repasse pendente" : "Receita confirmada"}
              value={formatCurrency(isSellerView ? totals.pendingRevenue : totals.confirmedRevenue)}
              helper={
                isSellerView
                  ? totals.pendingRevenue > 0
                    ? "Valor que ainda precisa ser acertado por voce"
                    : "Nenhum repasse pendente no momento"
                  : `${formatCurrency(totals.confirmedRevenue)} das vendas ja foram marcadas como pagas`
              }
              icon={isSellerView ? Clock3 : CheckCircle2}
              tone={isSellerView ? (totals.pendingRevenue > 0 ? "warning" : "default") : "positive"}
            />
            <MetricTile
              title={isSellerView ? "Sua meta de nomes" : "Receita pendente"}
              value={formatCurrency(totals.pendingRevenue)}
              helper={
                isSellerView
                  ? `${totals.guestListStats.missingNames} nome(s) ainda precisam ser preenchidos`
                  : `${totals.pendingPaymentsCount} pagamento(s) aguardando confirmacao`
              }
              icon={Clock3}
              tone={totals.pendingRevenue > 0 ? "warning" : "default"}
            />
            <MetricTile
              title={isSellerView ? "Nomes cadastrados" : "Lista de entrada"}
              value={`${totals.guestListStats.totalRegisteredNames}/${totals.guestListStats.totalExpectedNames}`}
              helper={
                totals.guestListStats.missingNames > 0
                  ? `${totals.guestListStats.missingNames} nome(s) ainda faltam`
                  : "Todos os nomes esperados ja foram preenchidos"
              }
              icon={CheckCircle2}
              tone={totals.guestListStats.missingNames > 0 ? "warning" : "positive"}
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
              title={isSellerView ? "Seu resultado" : "Comparacao entre vendedores"}
              description={
                isSellerView
                  ? "Consolidado do seu faturamento dentro do evento atual."
                  : "Compare rapidamente quem esta puxando a arrecadacao do evento."
              }
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
                    <p className="font-semibold text-slate-900">
                      {isSellerView ? "Seu posicionamento" : "Ranking de vendedores"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {isSellerView
                        ? "Seu desempenho dentro da festa e sua contribuicao total."
                        : "Top vendedores ordenados por arrecadacao total e repasse pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                    {visibleRanking.length} ativos
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {visibleRanking.map((seller, index) => (
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
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total vendido</p>
                          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                            {formatCurrency(seller.revenue)}
                          </p>
                          {seller.pendingTransferAmount > 0 ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                              Repasse pendente: {formatCurrency(seller.pendingTransferAmount)}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              Repasse em dia
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <InsightChart
                  title="Pagamentos confirmados x pendentes"
                  description="Distribuicao por valor para entender o quanto ja foi repassado e o que ainda esta em aberto."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={108}
                        paddingAngle={4}
                      >
                        {paymentChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: 18, borderColor: "#e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </InsightChart>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Repasses pendentes</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {isSellerView
                          ? "Valor que ainda depende do seu acerto financeiro."
                          : "Quem ainda precisa repassar valores para fechar o caixa."}
                      </p>
                    </div>
                    {topPerformer ? (
                      <div className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                        Destaque: {topPerformer.name.split(" ")[0]}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-3">
                    {pendingTransfers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                        Nenhum repasse pendente no momento.
                      </div>
                    ) : (
                      pendingTransfers.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {isSellerView ? "Seu valor pendente" : "Aguardando acerto"}
                            </p>
                          </div>
                          <p className="shrink-0 font-[var(--font-heading)] text-xl font-bold tracking-tight text-slate-950">
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
