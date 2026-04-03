import { Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SalesRecord } from "@/lib/types";

export function SalesControlPanel({
  sales,
  compact = false
}: {
  sales: SalesRecord[];
  compact?: boolean;
}) {
  return (
    <SectionCard
      title="Controle de vendas"
      description="Gerencie entregas, vendas concluidas, ingressos restantes e repasses."
      action={
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Plus className="h-4 w-4" />
          Novo lote
        </button>
      }
    >
      {sales.length === 0 ? (
        <EmptyState
          title="Sem vendas registradas"
          description="Essa festa ainda nao tem lotes distribuidos ou vendas consolidadas no mock atual."
          icon={Plus}
        />
      ) : (
      <div className="overflow-hidden rounded-[24px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.22em] text-slate-400">
              <tr>
                <th className="px-4 py-4">Vendedor</th>
                <th className="px-4 py-4">Recebidos</th>
                <th className="px-4 py-4">Vendidos</th>
                <th className="px-4 py-4">Restantes</th>
                <th className="px-4 py-4">Pagamento</th>
                <th className="px-4 py-4 text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sales.map((row) => (
                <tr key={row.id} className="text-sm text-slate-600">
                  <td className="px-4 py-4 font-medium text-slate-900">{row.seller}</td>
                  <td className="px-4 py-4">{row.received}</td>
                  <td className="px-4 py-4">{row.sold}</td>
                  <td className="px-4 py-4">{row.remaining}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.paymentStatus} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:bg-slate-50">
                      <Pencil className="h-4 w-4" />
                      {!compact ? "Editar" : ""}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </SectionCard>
  );
}
