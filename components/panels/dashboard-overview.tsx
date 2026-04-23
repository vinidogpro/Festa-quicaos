import { AlertTriangle, ArrowUpRight, Goal, Sparkles, Wallet } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { calculatePeriodComparison } from "@/lib/event-metrics";
import { PartyEventDetail } from "@/lib/types";
import { formatCurrencyParts } from "@/lib/utils";

function SummaryValue({
  value,
  isCurrency,
  isPositive = false
}: {
  value: number;
  isCurrency?: boolean;
  isPositive?: boolean;
}) {
  if (isCurrency === false) {
    return (
      <p className="ds-value-lg min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-slate-950">
        {value}
      </p>
    );
  }

  const { currencyLabel, amountLabel, isNegative } = formatCurrencyParts(value);

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <span className="ds-label block">
        {currencyLabel}
      </span>
        <span
          className={`ds-value-lg block min-w-0 break-words whitespace-normal sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap ${
            isNegative ? "text-rose-700" : isPositive ? "text-emerald-700" : "text-slate-950"
          }`}
        >
          {amountLabel}
      </span>
    </div>
  );
}

function SummaryIcon({ label }: { label: string }) {
  const iconTone = label.includes("Meta")
    ? "bg-amber-50 text-amber-700"
    : label.includes("Lucro")
      ? "bg-emerald-50 text-emerald-700"
      : label.includes("Vendedores")
        ? "bg-slate-100 text-slate-600"
        : "bg-brand-50 text-brand-700";

  return (
    <div className={`shrink-0 rounded-2xl p-2.5 ${iconTone}`}>
      {label.includes("Meta") ? (
        <Goal className="h-[18px] w-[18px]" />
      ) : label.includes("Lucro") ? (
        <Wallet className="h-[18px] w-[18px]" />
      ) : (
        <ArrowUpRight className="h-[18px] w-[18px]" />
      )}
    </div>
  );
}

function summaryCardTone(label: string, value: number) {
  if (label.includes("Lucro")) {
    if (value < 0) return "border-rose-200 bg-rose-50/80";
    if (value === 0) return "border-slate-200 bg-slate-50/70";
    return "border-emerald-200 bg-emerald-50/70";
  }

  if (label.includes("Meta")) {
    return "border-amber-200 bg-amber-50/70";
  }

  if (label.includes("Vendedores")) {
    return "border-slate-200 bg-slate-50/70";
  }

  return "border-brand-200 bg-white";
}

function buildExecutiveSummary(data: PartyEventDetail) {
  const periodComparison = calculatePeriodComparison(
    data.salesControl.map((sale) => ({
      quantity: sale.sold,
      unitPrice: sale.unitPrice,
      createdAt: sale.soldAt
    }))
  );
  const expenseRatio = data.totalRevenue > 0 ? Math.round((data.totalExpenses / data.totalRevenue) * 100) : 0;
  const healthHeadline =
    data.health.tone === "positive"
      ? "A festa esta saudavel"
      : data.health.tone === "warning"
        ? "A festa pede atencao"
        : "A festa esta em risco";
  const expenseLine =
    data.totalRevenue <= 0 && data.totalExpenses > 0
      ? "Despesas aguardam base de receita"
      : expenseRatio >= 70
        ? "Despesas estao altas"
        : expenseRatio >= 45
          ? "Despesas estao moderadas"
          : "Despesas estao sob controle";
  const dominantTypeLabel = data.postEventReport.commercial.dominantTicketType === "vip" ? "VIP" : "PISTA";
  const ticketTypeLine = `${dominantTypeLabel} concentra ${data.postEventReport.commercial.dominantTicketRevenueShare}% da receita`;
  const batchLine = `Lote campeao: ${data.postEventReport.commercial.bestBatchLabel}`;
  const saleTypeLine =
    data.postEventReport.commercial.dominantSaleType === "grupo"
      ? `Vendas em grupo representam ${data.postEventReport.commercial.dominantSaleTypeShare}% do total`
      : "Vendas normais dominam a operacao";

  let rhythmLine = "Ritmo comercial estavel";

  if ((periodComparison.variations.todayVsYesterdayTickets ?? 0) > 0) {
    rhythmLine = "Vendas aceleraram em relacao a ontem";
  } else if ((periodComparison.variations.todayVsYesterdayTickets ?? 0) < 0) {
    rhythmLine = "Vendas cairam em relacao a ontem";
  } else if ((periodComparison.variations.last7VsPrevious7Tickets ?? 0) > 0) {
    rhythmLine = "Bom ritmo de vendas na ultima semana";
  } else if ((periodComparison.variations.last7VsPrevious7Tickets ?? 0) < 0) {
    rhythmLine = "A ultima semana vendeu abaixo da anterior";
  }

  return {
    headline: healthHeadline,
    summary: data.health.summary,
    insights: [expenseLine, ticketTypeLine, batchLine, saleTypeLine, rhythmLine]
  };
}

function ExecutiveSummaryCard({ data }: { data: PartyEventDetail }) {
  const summary = buildExecutiveSummary(data);
  const toneClass =
    data.health.tone === "positive"
      ? "border-emerald-200 bg-emerald-50/70"
      : data.health.tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : "border-rose-200 bg-rose-50/70";
  const iconTone =
    data.health.tone === "positive"
      ? "bg-emerald-100 text-emerald-700"
      : data.health.tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return (
    <SectionCard
      title="Resumo executivo da festa"
      description="Leitura rapida e humana do momento da festa para entender o que esta funcionando e onde agir primeiro."
      className={toneClass}
      action={
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconTone}`}>
          <Sparkles className="h-5 w-5" />
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="ds-label">Estado da festa</p>
              <h3 className="mt-2 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {summary.headline}
              </h3>
              <p className="ds-helper mt-2">{summary.summary}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {summary.insights.map((insight) => (
            <div key={insight} className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
              {insight}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function DashboardOverview({ data }: { data: PartyEventDetail }) {
  return (
    <section className="space-y-4 sm:space-y-6">
      <ExecutiveSummaryCard data={data} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {data.summary.map((item) => (
          <SectionCard
            key={item.label}
            title={item.label}
            description={item.helper}
            action={<SummaryIcon label={item.label} />}
            className={`min-w-0 overflow-hidden ${summaryCardTone(item.label, item.value)}`}
          >
            <div className="flex min-h-[136px] min-w-0 flex-col justify-between overflow-hidden sm:min-h-[168px]">
              <div className="min-w-0 pt-2.5 sm:pt-4">
                  <SummaryValue
                    value={item.value}
                    isCurrency={item.isCurrency}
                    isPositive={item.label.includes("Lucro") && item.value > 0}
                  />
                </div>
            </div>

            {typeof item.progress === "number" ? (
              <div className="mt-5 min-w-0 overflow-hidden sm:mt-7">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-600 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Progresso atual
                </p>
              </div>
            ) : null}
          </SectionCard>
        ))}
      </div>
    </section>
  );
}
