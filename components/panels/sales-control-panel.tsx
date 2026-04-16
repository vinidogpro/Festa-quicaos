"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleAlert, Pencil, Plus, Sparkles, Ticket, Trash2 } from "lucide-react";
import { initialSalesActionState } from "@/lib/actions/action-state";
import { createSaleAction, deleteSaleAction, updateSaleAction } from "@/lib/actions/event-management";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
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

function GuestNameFields({
  quantity,
  values = []
}: {
  quantity: number;
  values?: string[];
}) {
  if (quantity <= 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Lista de entrada</p>
          <p className="mt-1 text-sm text-slate-500">Preencha os nomes ja confirmados para esta venda.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {values.filter(Boolean).length}/{quantity} nomes
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: quantity }).map((_, index) => (
          <input
            key={index}
            name="guestNames"
            defaultValue={values[index] ?? ""}
            placeholder={`Nome ${index + 1}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
          />
        ))}
      </div>
    </div>
  );
}

function ActionFeedback({
  status,
  message
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (!message || status === "idle") {
    return null;
  }

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        status === "success"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {message}
    </div>
  );
}

function SaleQuickForm({
  eventId,
  permissions,
  sellerOptions
}: Pick<SalesControlPanelProps, "eventId" | "permissions" | "sellerOptions">) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createSaleAction, initialSalesActionState);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");

  const totalPreview = useMemo(() => {
    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = Number(unitPrice.replace(",", "."));

    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedUnitPrice)) {
      return 0;
    }

    return Math.max(parsedQuantity, 0) * Math.max(parsedUnitPrice, 0);
  }, [quantity, unitPrice]);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setQuantity("1");
      setUnitPrice("");
      router.refresh();
    }
  }, [router, state.status]);

    return (
    <div className="mb-5 overflow-hidden rounded-[28px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-slate-50">
      <div className="grid gap-6 p-4 sm:p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200/60">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Registro rapido
              </p>
              <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                Registrar venda em poucos segundos
              </h3>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Preencha so o essencial. Ao salvar, a venda entra automaticamente como paga e atualiza a lista e o ranking do evento.
          </p>

          <form ref={formRef} action={action} className="mt-5 grid gap-3">
            <input type="hidden" name="eventId" value={eventId} />

            {permissions.sellerUserId ? (
              <input type="hidden" name="sellerId" value={permissions.sellerUserId} />
            ) : (
              <select
                name="sellerId"
                required
                defaultValue=""
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              >
                <option value="" disabled>
                  Escolher vendedor
                </option>
                {sellerOptions.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            )}

            <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Qtd.</span>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  required
                  defaultValue="1"
                  onChange={(event) => setQuantity(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-500"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Valor unitario
                </span>
                <input
                  name="unitPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-500"
                />
              </label>

            </div>

            <details className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                Opcoes avancadas
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Data</span>
                  <input
                    name="soldAt"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Observacoes
                  </span>
                  <input
                    name="notes"
                    placeholder="Opcional"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
                  />
                </label>
              </div>
            </details>

            <GuestNameFields quantity={Math.max(Number(quantity) || 0, 0)} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Total desta venda</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(totalPreview)}</p>
              </div>

              <SubmitButton
                pendingLabel="Registrando..."
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-200/60 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                Adicionar venda
              </SubmitButton>
            </div>

            <ActionFeedback status={state.status} message={state.message} />
          </form>
        </div>

        <div className="hidden rounded-[24px] bg-slate-950 p-5 text-white xl:block">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Fluxo otimizado</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm font-semibold">1. Informe quantidade e valor</p>
              <p className="mt-1 text-sm text-white/70">Os dois campos principais ficam logo na primeira linha.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm font-semibold">2. Salve sem sair da tela</p>
              <p className="mt-1 text-sm text-white/70">O sistema grava, mostra retorno e atualiza os cards da festa.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm font-semibold">3. Continue vendendo</p>
              <p className="mt-1 text-sm text-white/70">Os campos sao limpos automaticamente para o proximo registro.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaleDeleteForm({ eventId, saleId }: { eventId: string; saleId: string }) {
  const router = useRouter();
  const [state, action] = useFormState(deleteSaleAction, initialSalesActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Tem certeza que deseja excluir esta venda? Essa acao atualiza ranking, financeiro e insights.")) {
          event.preventDefault();
        }
      }}
      className="grid gap-3"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="saleId" value={saleId} />
      <SubmitButton
        pendingLabel="Excluindo..."
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </SubmitButton>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

function SaleEditForm({
  eventId,
  row,
  permissions,
  sellerOptions
}: {
  eventId: string;
  row: SalesRecord;
  permissions: ViewerPermissions;
  sellerOptions: SellerOption[];
}) {
  const router = useRouter();
  const [state, action] = useFormState(updateSaleAction, initialSalesActionState);
  const [quantity, setQuantity] = useState(String(row.sold));

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <details data-sale-edit className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <Pencil className="h-4 w-4" />
        Editar venda
      </summary>
      <form action={action} className="mt-3 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="saleId" value={row.id} />
        {permissions.canManageOwnSalesOnly ? (
          <input type="hidden" name="sellerId" value={row.sellerUserId} />
        ) : (
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vendedor</span>
            <select
              name="sellerId"
              defaultValue={row.sellerUserId}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            >
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <input
          name="quantity"
          type="number"
          min="1"
          defaultValue={row.sold}
          onChange={(event) => setQuantity(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        />
        <input
          name="unitPrice"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={row.unitPrice}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        />
        <input
          name="soldAt"
          type="date"
          defaultValue={row.soldAt}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        />
        <input
          name="notes"
          defaultValue={row.notes ?? ""}
          placeholder="Observacoes"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        />
        <GuestNameFields quantity={Math.max(Number(quantity) || 0, 0)} values={row.attendeeNames} />
        <SubmitButton
          pendingLabel="Salvando..."
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salvar venda
        </SubmitButton>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </details>
  );
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
      description="Registre vendas com rapidez e mantenha o comercial atualizado em tempo real."
    >
      {permissions.canManageSales && !compact ? (
        <SaleQuickForm eventId={eventId} permissions={permissions} sellerOptions={sellerOptions} />
      ) : null}

      {visibleSales.length === 0 ? (
        <EmptyState
          title="Sem vendas registradas"
          description="As novas vendas cadastradas pela equipe aparecerao aqui com impacto no ranking e atualizacao automatica."
          icon={Plus}
        />
      ) : (
        <div className="space-y-4">
          {visibleSales.map((row) => {
            const canEdit = permissions.canManageSales && (row.isOwnedByViewer || !permissions.canManageOwnSalesOnly);

            return (
              <div key={row.id} data-sale-card className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Venda #{row.saleNumber}
                        </p>
                        <p className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-950">
                          {row.seller}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Total</p>
                        <p className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-950">
                          {formatCurrency(row.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quantidade</p>
                        <p className="mt-1 font-semibold text-slate-900">{row.sold} ingressos</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Valor unitario</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(row.unitPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Data</p>
                        <p className="mt-1 font-semibold text-slate-900">{row.soldAt}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <details className="group w-full sm:w-auto">
                        <summary
                          className={`flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] sm:w-auto sm:justify-start sm:rounded-full sm:py-1 ${
                            row.missingAttendeeCount > 0
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : "bg-white text-slate-500"
                          }`}
                        >
                          {row.attendeeCount} nomes cadastrados
                          {row.missingAttendeeCount > 0 ? ` | faltam ${row.missingAttendeeCount}` : ""}
                          <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                        </summary>
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          {row.attendeeCount === 0 ? (
                            <p className="text-sm text-slate-500">Nenhum nome preenchido ainda.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {row.attendeeNames.map((name) => (
                                <span key={name} className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-700">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  {canEdit && !compact ? (
                    <div className="flex w-full flex-col gap-3 lg:w-[26rem]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            const details = (event.currentTarget.closest("[data-sale-card]") as HTMLElement | null)
                              ?.querySelector("[data-sale-edit]") as HTMLDetailsElement | null;
                            if (details) {
                              details.open = !details.open;
                            }
                          }}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <SaleDeleteForm eventId={eventId} saleId={row.id} />
                      </div>
                      <SaleEditForm eventId={eventId} row={row} permissions={permissions} sellerOptions={sellerOptions} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!compact && permissions.canManageOwnSalesOnly ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Como vendedor, voce pode registrar, editar e excluir apenas os seus proprios lancamentos.
        </div>
      ) : null}
    </SectionCard>
  );
}
