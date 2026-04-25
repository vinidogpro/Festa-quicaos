"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { ExportGuestListButton, ExportPortariaButton } from "@/components/export-summary-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { SaleEditForm } from "@/components/panels/sales-control-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { initialSalesActionState } from "@/lib/actions/action-state";
import {
  createManualGuestEntryAction,
  deleteManualGuestEntryAction,
  updateManualGuestEntryAction,
  updateSaleAttendeeNameAction
} from "@/lib/actions/event-management";
import { EventBatch, GuestListEntry, SellerOption, ViewerPermissions } from "@/lib/types";
import { formatCurrency, formatSaleTypeLabel, formatTicketTypeLabel } from "@/lib/utils";

type SortOption = "name" | "seller" | "sale-asc" | "recent";

function TicketTypeBadge({ ticketType }: { ticketType: NonNullable<GuestListEntry["ticketType"]> }) {
  return (
    <span
      className={`ds-badge ${
        ticketType === "vip"
          ? "ds-badge-vip"
          : "ds-badge-pista"
      }`}
    >
      {formatTicketTypeLabel(ticketType)}
    </span>
  );
}

function getEntryTimestamp(entry: GuestListEntry) {
  const timestamp = Date.parse(entry.createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareGuestListEntries(left: GuestListEntry, right: GuestListEntry, sortBy: SortOption) {
  if (sortBy === "seller") {
    return (
      left.sellerName.localeCompare(right.sellerName, "pt-BR") ||
      left.guestName.localeCompare(right.guestName, "pt-BR") ||
      getEntryTimestamp(right) - getEntryTimestamp(left)
    );
  }

  if (sortBy === "sale-asc") {
    const leftSaleWeight = left.saleNumber ?? Number.MAX_SAFE_INTEGER;
    const rightSaleWeight = right.saleNumber ?? Number.MAX_SAFE_INTEGER;

    return (
      leftSaleWeight - rightSaleWeight ||
      getEntryTimestamp(left) - getEntryTimestamp(right) ||
      left.guestName.localeCompare(right.guestName, "pt-BR")
    );
  }

  if (sortBy === "recent") {
    if (left.sourceType !== right.sourceType) {
      return left.sourceType === "manual" ? -1 : 1;
    }

    return (
      (right.saleNumber ?? 0) - (left.saleNumber ?? 0) ||
      getEntryTimestamp(right) - getEntryTimestamp(left) ||
      left.guestName.localeCompare(right.guestName, "pt-BR")
    );
  }

  return (
    left.guestName.localeCompare(right.guestName, "pt-BR") ||
    left.sellerName.localeCompare(right.sellerName, "pt-BR")
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

function ManualGuestEntryForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createManualGuestEntryAction, initialSalesActionState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="mt-6 rounded-[24px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200/60">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Entrada manual</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
            Adicionar nome manualmente
          </h3>
        </div>
      </div>

      <form ref={formRef} action={action} className="mt-5 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            name="guestName"
            placeholder="Nome da pessoa"
            className="ds-input"
            required
          />
          <input
            name="notes"
            placeholder="Observacao opcional"
            className="ds-input"
          />
          <SubmitButton
            pendingLabel="Salvando..."
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Adicionar nome
          </SubmitButton>
        </div>
        <p className="text-sm text-slate-500">
          Esses nomes entram apenas na lista final da festa e nao afetam vendas, ticket medio ou financeiro.
        </p>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </div>
  );
}

function SaleGuestNameEditForm({
  eventId,
  entry
}: {
  eventId: string;
  entry: GuestListEntry;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [state, action] = useFormState(updateSaleAttendeeNameAction, initialSalesActionState);

  useEffect(() => {
    if (state.status === "success") {
      detailsRef.current?.removeAttribute("open");
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <details ref={detailsRef} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <Pencil className="h-4 w-4" />
        Editar pessoa
      </summary>
      <form action={action} className="mt-3 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="attendeeId" value={entry.id} />
        <input
          name="guestName"
          defaultValue={entry.guestName}
          placeholder="Nome da pessoa"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SubmitButton
            pendingLabel="Salvando..."
            className="ds-button-dark"
          >
            Salvar alteracoes
          </SubmitButton>
          <button
            type="button"
            onClick={() => detailsRef.current?.removeAttribute("open")}
            className="ds-button-secondary"
          >
            Cancelar
          </button>
        </div>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </details>
  );
}

function ManualGuestEntryEditForm({
  eventId,
  entry
}: {
  eventId: string;
  entry: GuestListEntry;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [state, action] = useFormState(updateManualGuestEntryAction, initialSalesActionState);

  useEffect(() => {
    if (state.status === "success") {
      detailsRef.current?.removeAttribute("open");
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <details ref={detailsRef} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <Pencil className="h-4 w-4" />
        Editar nome
      </summary>
      <form action={action} className="mt-3 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="entryId" value={entry.id} />
        <input
          name="guestName"
          defaultValue={entry.guestName}
          placeholder="Nome da pessoa"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
          required
        />
        <input
          name="notes"
          defaultValue={entry.notes ?? ""}
          placeholder="Observacao opcional"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SubmitButton
            pendingLabel="Salvando..."
            className="ds-button-dark"
          >
            Salvar alteracoes
          </SubmitButton>
          <button
            type="button"
            onClick={() => detailsRef.current?.removeAttribute("open")}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </details>
  );
}

function ManualGuestEntryDeleteForm({
  eventId,
  entryId
}: {
  eventId: string;
  entryId: string;
}) {
  const router = useRouter();
  const [state, action] = useFormState(deleteManualGuestEntryAction, initialSalesActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Deseja realmente remover este nome manual da lista?")) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="entryId" value={entryId} />
      <SubmitButton
        pendingLabel="Removendo..."
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Remover
      </SubmitButton>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

function GuestListEntryActions({
  eventId,
  entry,
  canManageManualGuests,
  canEditSaleGuests,
  permissions,
  sellerOptions,
  eventBatches,
  hasVip,
  hasGroupSales
}: {
  eventId: string;
  entry: GuestListEntry;
  canManageManualGuests: boolean;
  canEditSaleGuests: boolean;
  permissions: ViewerPermissions;
  sellerOptions: SellerOption[];
  eventBatches: EventBatch[];
  hasVip: boolean;
  hasGroupSales: boolean;
}) {
  if (entry.sourceType === "manual") {
    if (!canManageManualGuests) {
      return null;
    }

    return (
      <div className="w-full space-y-2 sm:w-[17rem]">
        <ManualGuestEntryEditForm eventId={eventId} entry={entry} />
        <ManualGuestEntryDeleteForm eventId={eventId} entryId={entry.id} />
      </div>
    );
  }

  if (!canEditSaleGuests) {
    return null;
  }

  return (
    <div className="w-full space-y-2 sm:w-[23rem]">
      <SaleGuestNameEditForm eventId={eventId} entry={entry} />
      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <Pencil className="h-4 w-4" />
          Editar venda completa
        </summary>
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Esta opcao altera a venda inteira. Preco, VIP/PISTA, lote, tipo da venda, quantidade e nomes continuam no nivel da venda, nao de uma pessoa isolada.
          </div>
          <SaleEditForm
            eventId={eventId}
            row={{
              id: entry.saleId ?? "",
              saleNumber: entry.saleNumber ?? 0,
              sellerUserId: entry.sellerUserId ?? "",
              seller: entry.sellerName,
              batchId: entry.batchId ?? "",
              batchLabel: entry.batchLabel ?? "Sem lote",
              saleType: entry.saleType ?? "normal",
              ticketType: entry.ticketType ?? "pista",
              sold: entry.sold ?? Math.max(entry.attendeeNames?.length ?? 0, 1),
              unitPrice: entry.unitPrice ?? 0,
              soldAt: entry.soldAt ?? entry.createdAt,
              createdAt: entry.createdAt,
              notes: entry.notes,
              amount: entry.amount ?? ((entry.sold ?? 1) * (entry.unitPrice ?? 0)),
              attendeeNames: entry.attendeeNames ?? [entry.guestName],
              attendeeCount: entry.attendeeCount ?? (entry.attendeeNames?.length ?? 1),
              missingAttendeeCount: entry.missingAttendeeCount ?? 0,
              isOwnedByViewer: entry.isOwnedByViewer
            }}
            permissions={permissions}
            sellerOptions={sellerOptions}
            eventBatches={eventBatches}
            hasVip={hasVip}
            hasGroupSales={hasGroupSales}
          />
        </div>
      </details>
    </div>
  );
}

export function GuestListPanel({
  eventId,
  entries,
  permissions,
  sellerOptions,
  eventBatches,
  hasVip,
  hasGroupSales
}: {
  eventId: string;
  entries: GuestListEntry[];
  permissions: ViewerPermissions;
  sellerOptions: SellerOption[];
  eventBatches: EventBatch[];
  hasVip: boolean;
  hasGroupSales: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const nextEntries = !normalizedSearch
      ? [...entries]
      : entries.filter((entry) => {
          const saleNumberMatch = entry.saleNumber ? String(entry.saleNumber).includes(normalizedSearch) : false;

          return (
            entry.guestName.toLowerCase().includes(normalizedSearch) ||
            entry.sellerName.toLowerCase().includes(normalizedSearch) ||
            saleNumberMatch ||
            (entry.batchLabel ? entry.batchLabel.toLowerCase().includes(normalizedSearch) : false) ||
            (entry.saleType ? formatSaleTypeLabel(entry.saleType).toLowerCase().includes(normalizedSearch) : false) ||
            (entry.ticketType ? formatTicketTypeLabel(entry.ticketType).toLowerCase().includes(normalizedSearch) : false)
          );
        });

    nextEntries.sort((left, right) => compareGuestListEntries(left, right, sortBy));

    return nextEntries;
  }, [entries, search, sortBy]);

  return (
    <SectionCard
      title="Lista de entrada"
      description={
        permissions.canManageOwnSalesOnly
          ? "Veja os nomes vinculados as suas vendas, corrija o que precisar e deixe tudo pronto para a festa."
          : "Centralize os nomes vindos de vendas e tambem as entradas manuais, com busca rapida e exportacao pronta para o dia do evento."
      }
      action={
        <div className="flex flex-col gap-2 sm:items-end">
          <ExportGuestListButton eventId={eventId} />
          {permissions.eventRole === "host" || permissions.eventRole === "organizer" ? (
            <ExportPortariaButton eventId={eventId} />
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1fr_240px_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, vendedor, lote, tipo ou numero da venda"
          className="ds-input"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="ds-select"
        >
          <option value="name">Ordem alfabetica</option>
          <option value="seller">Ordenar por vendedor</option>
          <option value="sale-asc">Ordenar por venda crescente</option>
          <option value="recent">Vendas recentes</option>
        </select>
        <div className="flex min-h-11 items-center rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
          {filteredEntries.length} nome(s)
        </div>
      </div>

      {permissions.canManageManualGuests ? <ManualGuestEntryForm eventId={eventId} /> : null}

      <div className="mt-6 space-y-3">
        {filteredEntries.length === 0 ? (
          <EmptyState
            title="Nenhum nome cadastrado"
            description="Os nomes informados nas vendas e as entradas manuais vao aparecer aqui para formar a lista final da festa."
            icon={ListChecks}
          />
        ) : (
          filteredEntries.map((entry) => {
            const canEditSaleGuest =
              entry.sourceType === "sale" &&
              permissions.canManageSales &&
              (!permissions.canManageOwnSalesOnly || entry.isOwnedByViewer);

            return (
              <article
                key={`${entry.sourceType}-${entry.id}`}
                className={`rounded-[24px] border p-4 shadow-sm ${
                  entry.sourceType === "manual"
                    ? "border-brand-200 bg-brand-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{entry.guestName}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          entry.sourceType === "manual"
                            ? "border border-brand-200 bg-brand-100 text-brand-800"
                            : "border border-sky-100 bg-sky-50 text-sky-700"
                        }`}
                      >
                        {entry.sourceType === "manual" ? "Manual" : `Venda #${entry.saleNumber ?? 0}`}
                      </span>
                      {entry.sourceType === "sale" && entry.ticketType ? <TicketTypeBadge ticketType={entry.ticketType} /> : null}
                      {entry.sourceType === "sale" && entry.batchLabel ? (
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800">
                          {entry.batchLabel}
                        </span>
                      ) : null}
                      {entry.sourceType === "sale" && entry.saleType ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          {formatSaleTypeLabel(entry.saleType)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500">
                      <span>{entry.sellerName}</span>
                      {entry.sourceType === "sale" ? (
                        <>
                          {entry.ticketType ? (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span>{formatTicketTypeLabel(entry.ticketType)}</span>
                            </>
                          ) : null}
                          {entry.batchLabel ? (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span>{entry.batchLabel}</span>
                            </>
                          ) : null}
                          {entry.saleType ? (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span>{formatSaleTypeLabel(entry.saleType).toLowerCase()}</span>
                            </>
                          ) : null}
                          <span className="text-slate-300">&bull;</span>
                          <span>{formatCurrency(entry.unitPrice ?? 0)}</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {entry.sourceType === "manual" ? (
                        <span>Entrada sem venda</span>
                      ) : (
                        <span>Ligado a venda #{entry.saleNumber ?? 0}</span>
                      )}
                      {entry.notes ? (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span>{entry.notes}</span>
                        </>
                      ) : null}
                      {entry.checkedInAt ? (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Check-in feito</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <GuestListEntryActions
                    eventId={eventId}
                    entry={entry}
                    canManageManualGuests={permissions.canManageManualGuests}
                    canEditSaleGuests={Boolean(canEditSaleGuest)}
                    permissions={permissions}
                    sellerOptions={sellerOptions}
                    eventBatches={eventBatches}
                    hasVip={hasVip}
                    hasGroupSales={hasGroupSales}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
