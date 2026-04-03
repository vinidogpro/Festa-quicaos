import { Crown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { SellerRanking } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface RankingPanelProps {
  ranking: SellerRanking[];
  period: "week" | "total";
  onPeriodChange: (period: "week" | "total") => void;
  compact?: boolean;
}

export function RankingPanel({
  ranking,
  period,
  onPeriodChange,
  compact = false
}: RankingPanelProps) {
  return (
    <SectionCard
      title="Ranking de vendedores"
      description="Veja quem mais vendeu e acompanhe a performance por periodo."
      action={
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => onPeriodChange("week")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              period === "week" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => onPeriodChange("total")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              period === "total" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Total
          </button>
        </div>
      }
    >
      {ranking.length === 0 ? (
        <EmptyState
          title="Ranking ainda sem dados"
          description="Quando as vendas iniciarem, o ranking vai mostrar desempenho individual e destaque do top 3."
          icon={Crown}
        />
      ) : (
      <div className={`grid gap-4 ${compact ? "lg:grid-cols-3" : ""}`}>
        {ranking.slice(0, compact ? 3 : ranking.length).map((seller, index) => (
          <div
            key={seller.id}
            className={`rounded-[24px] border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
              index === 0
                ? "border-brand-200 bg-brand-50/70"
                : index === 1
                  ? "border-sky-100 bg-sky-50/70"
                  : index === 2
                    ? "border-amber-100 bg-amber-50/70"
                    : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-semibold text-slate-900 shadow-sm">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{seller.name}</p>
                  <p className="text-sm text-slate-500">{seller.ticketsSold} ingressos vendidos</p>
                </div>
              </div>
              {index < 3 ? <Crown className="h-5 w-5 text-amber-500" /> : null}
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Arrecadacao</p>
                <p className="font-[var(--font-heading)] text-2xl font-bold text-slate-950">
                  {formatCurrency(seller.revenue)}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm">
                <TrendingUp className="h-4 w-4" />
                {seller.delta}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </SectionCard>
  );
}
