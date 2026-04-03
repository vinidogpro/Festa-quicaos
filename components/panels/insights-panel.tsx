"use client";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { SalesSeries, SellerContribution } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface InsightsPanelProps {
  salesSeries: SalesSeries[];
  sellerContribution: SellerContribution[];
  compact?: boolean;
}

export function InsightsPanel({
  salesSeries,
  sellerContribution,
  compact = false
}: InsightsPanelProps) {
  return (
    <SectionCard
      title="Insights"
      description="Visualize ritmo de vendas e contribuicao individual com graficos limpos."
    >
      {salesSeries.length === 0 || sellerContribution.length === 0 ? (
        <EmptyState
          title="Graficos aguardando dados"
          description="Assim que a festa tiver historico de vendas, os graficos vao mostrar evolucao diaria e contribuicao por vendedor."
          icon={BarChart3}
        />
      ) : (
      <div className={`grid gap-6 ${compact ? "" : "xl:grid-cols-2"}`}>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-4 font-semibold text-slate-900">Vendas por dia</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4dd" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(value) => `R$${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#2f8a4f"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2f8a4f" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-4 font-semibold text-slate-900">Contribuicao por vendedor</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellerContribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4dd" />
                <XAxis dataKey="seller" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(value) => `R$${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#0f172a" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </SectionCard>
  );
}
