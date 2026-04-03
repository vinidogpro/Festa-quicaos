import { Pencil, Plus } from "lucide-react";
import { createSaleAction, updateSaleAction } from "@/lib/actions/event-management";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/forms/submit-button";
import { SalesRecord, SellerOption, ViewerPermissions } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface SalesControlPanelProps {
  eventId: string;
  sales: SalesRecord[];
  permissions: ViewerPermissions;
  sellerOptions: SellerOption[];
  compact?: boolean;
}

export function SalesControlPanel({
  eventId,
  sales,
  permissions,
  sellerOptions,
  compact = false
}: SalesControlPanelProps) {
  const visibleSales = sales.slice(0, compact ? 4 : sales.length);

  return (
    <SectionCard
      title="Controle de vendas"
      description="Gerencie entregas, vendas concluidas, ingressos restantes e repasses."
    >
      {permissions.canManageSales && !compact ? (
        <form action={createSaleAction} className="mb-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-6">
          <input type="hidden" name="eventId" value={eventId} />
          {permissions.sellerId ? (
            <input type="hidden" name="sellerId" value={permissions.sellerId} />
          ) : (
            <select
              name="sellerId"
              required
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                Selecionar vendedor
              </option>
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          )}
          <input
            name="quantity"
            type="number"
            min="1"
            placeholder="Quantidade"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor unitario"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            name="soldAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <select
            name="paymentStatus"
            defaultValue="pending"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </select>
          <input
            name="notes"
            placeholder="Observacoes"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <div className="lg:col-span-6">
            <SubmitButton className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
              <Plus className="h-4 w-4" />
              Adicionar venda
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {visibleSales.length === 0 ? (
        <EmptyState
          title="Sem vendas registradas"
          description="As novas vendas cadastradas pela equipe aparecerao aqui com repasse e impacto no ranking."
          icon={Plus}
        />
      ) : (
        <div className="space-y-3">
          {visibleSales.map((row) => {
            const canEdit = permissions.canManageSales && (row.isOwnedByViewer || !permissions.sellerId);

            return (
              <div key={row.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Vendedor</p>
                      <p className="mt-2 font-medium text-slate-900">{row.seller}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Recebidos</p>
                      <p className="mt-2 font-medium text-slate-900">{row.received}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Venda</p>
                      <p className="mt-2 font-medium text-slate-900">
                        {row.sold} • {formatCurrency(row.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Restantes</p>
                      <p className="mt-2 font-medium text-slate-900">{row.remaining}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Data</p>
                      <p className="mt-2 font-medium text-slate-900">{row.soldAt}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pagamento</p>
                      <div className="mt-2">
                        <StatusBadge status={row.paymentStatus} />
                      </div>
                    </div>
                  </div>

                  {canEdit && !compact ? (
                    <details className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:w-[24rem]">
                      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        <Pencil className="h-4 w-4" />
                        Editar venda
                      </summary>
                      <form action={updateSaleAction} className="mt-3 grid gap-3">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="saleId" value={row.id} />
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          defaultValue={row.sold}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        />
                        <input
                          name="unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={row.unitPrice}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        />
                        <input
                          name="soldAt"
                          type="date"
                          defaultValue={row.soldAt}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        />
                        <select
                          name="paymentStatus"
                          defaultValue={row.paymentStatus}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                        </select>
                        <input
                          name="notes"
                          defaultValue={row.notes ?? ""}
                          placeholder="Observacoes"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        />
                        <SubmitButton className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                          Salvar venda
                        </SubmitButton>
                      </form>
                    </details>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
