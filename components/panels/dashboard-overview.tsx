import { ArrowUpRight, Goal, Wallet } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
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
          className={`ds-value-lg block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${
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

export function DashboardOverview({ data }: { data: PartyEventDetail }) {
  return (
    <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {data.summary.map((item) => (
        <SectionCard
          key={item.label}
          title={item.label}
          description={item.helper}
          action={<SummaryIcon label={item.label} />}
          className={`min-w-0 overflow-hidden ${summaryCardTone(item.label, item.value)}`}
        >
          <div className="flex min-h-[152px] min-w-0 flex-col justify-between overflow-hidden sm:min-h-[168px]">
            <div className="min-w-0 pt-3 sm:pt-4">
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
    </section>
  );
}
