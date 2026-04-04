import { ArrowUpRight, Goal, Wallet } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { PartyEventDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function SummaryValue({ value, isCurrency }: { value: number; isCurrency?: boolean }) {
  return (
    <p
      className={`mt-6 whitespace-nowrap font-[var(--font-heading)] font-bold tracking-tight text-slate-950 ${
        isCurrency === false ? "text-[clamp(1.9rem,2.8vw,2.5rem)]" : "text-[clamp(1.65rem,2.5vw,2.2rem)]"
      }`}
    >
      {isCurrency === false ? value : formatCurrency(value)}
    </p>
  );
}

export function DashboardOverview({ data }: { data: PartyEventDetail }) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
      {data.summary.map((item) => (
        <SectionCard key={item.label} title={item.label} description={item.helper} className="min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SummaryValue value={item.value} isCurrency={item.isCurrency} />
            </div>
            <div className="shrink-0 rounded-2xl bg-brand-50 p-3 text-brand-700">
              {item.label.includes("Meta") ? (
                <Goal className="h-5 w-5" />
              ) : item.label.includes("Lucro") ? (
                <Wallet className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )}
            </div>
          </div>

          {typeof item.progress === "number" ? (
            <div className="mt-5">
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
