import { ArrowUpRight, Goal, Wallet } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { PartyEventDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function SummaryValue({ value, isCurrency }: { value: number; isCurrency?: boolean }) {
  if (isCurrency === false) {
    return (
      <p className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-[var(--font-heading)] text-[clamp(1.6rem,2.4vw,2.2rem)] font-bold tracking-tight text-slate-950">
        {value}
      </p>
    );
  }

  const formatted = formatCurrency(value);
  const [currencyLabel, amountLabel] = formatted.split(/\s(.+)/);

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {currencyLabel}
      </span>
      <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-[var(--font-heading)] text-[clamp(1.45rem,2.2vw,2.05rem)] font-bold tracking-tight text-slate-950">
        {amountLabel ?? formatted}
      </span>
    </div>
  );
}

function SummaryIcon({ label }: { label: string }) {
  return (
    <div className="shrink-0 rounded-2xl bg-brand-50 p-2.5 text-brand-700">
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

export function DashboardOverview({ data }: { data: PartyEventDetail }) {
  return (
    <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {data.summary.map((item) => (
        <SectionCard
          key={item.label}
          title={item.label}
          description={item.helper}
          action={<SummaryIcon label={item.label} />}
          className="min-w-0 overflow-hidden"
        >
          <div className="flex min-h-[136px] min-w-0 flex-col justify-between overflow-hidden sm:min-h-[156px]">
            <div className="min-w-0 pt-2 sm:pt-3">
              <SummaryValue value={item.value} isCurrency={item.isCurrency} />
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
