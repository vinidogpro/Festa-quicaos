import { ArrowUpRight, Goal, Wallet } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { PartyEventDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function DashboardOverview({ data }: { data: PartyEventDetail }) {
  return (
    <section className="grid gap-6 lg:grid-cols-4">
      {data.summary.map((item) => (
        <SectionCard
          key={item.label}
          title={item.label}
          description={item.helper}
          className="overflow-hidden"
        >
          <div className="flex items-end justify-between gap-4">
            <p className="font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950">
              {item.isCurrency === false ? item.value : formatCurrency(item.value)}
            </p>
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
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
