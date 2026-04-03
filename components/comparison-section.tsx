import { BarChart3, Crown, PiggyBank, Users } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { EventComparisonSnapshot } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function ComparisonSection({ comparison }: { comparison: EventComparisonSnapshot }) {
  const items = [
    {
      label: "Melhor festa em arrecadacao",
      value: comparison.bestRevenueEvent.eventName,
      helper: formatCurrency(comparison.bestRevenueEvent.value),
      icon: BarChart3
    },
    {
      label: "Melhor festa em lucro",
      value: comparison.bestProfitEvent.eventName,
      helper: formatCurrency(comparison.bestProfitEvent.value),
      icon: PiggyBank
    },
    {
      label: "Melhor vendedor acumulado",
      value: comparison.topSellerOverall.sellerName,
      helper: formatCurrency(comparison.topSellerOverall.value),
      icon: Crown
    },
    {
      label: "Media de vendas por festa",
      value: formatCurrency(comparison.averageSalesPerEvent),
      helper: "Base mockada anual",
      icon: Users
    }
  ];

  return (
    <SectionCard
      title="Comparacao entre festas"
      description="Uma leitura rapida do desempenho acumulado para orientar o calendario do ano."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="max-w-[12rem] text-sm text-slate-500">{item.label}</p>
                <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-6 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
