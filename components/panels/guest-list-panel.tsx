"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { ListChecks, Pencil } from "lucide-react";
import { ExportGuestListButton } from "@/components/export-summary-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { initialSalesActionState } from "@/lib/actions/action-state";
import { updateSaleAttendeeNameAction } from "@/lib/actions/event-management";
import { GuestListEntry, ViewerPermissions } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type SortOption = "name" | "seller" | "sale-asc" | "recent";

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

function GuestNameEditForm({
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
        Editar nome
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
            className="min-h-11 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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

export function GuestListPanel({
  eventId,
  entries,
  permissions
}: {
  eventId: string;
  entries: GuestListEntry[];
  permissions: ViewerPermissions;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const nextEntries = !normalizedSearch
      ? [...entries]
      : entries.filter(
          (entry) =>
            entry.guestName.toLowerCase().includes(normalizedSearch) ||
            entry.sellerName.toLowerCase().includes(normalizedSearch) ||
            String(entry.saleNumber).includes(normalizedSearch)
        );

    nextEntries.sort((left, right) => {
      if (sortBy === "seller") {
        return left.sellerName.localeCompare(right.sellerName) || left.guestName.localeCompare(right.guestName);
      }

      if (sortBy === "sale-asc") {
        return left.saleNumber - right.saleNumber || left.guestName.localeCompare(right.guestName);
      }

      if (sortBy === "recent") {
        return right.saleNumber - left.saleNumber || right.createdAt.localeCompare(left.createdAt);
      }

      return left.guestName.localeCompare(right.guestName);
    });

    return nextEntries;
  }, [entries, search, sortBy]);

  return (
    <SectionCard
      title="Lista de entrada"
      description={
        permissions.canManageOwnSalesOnly
          ? "Veja os nomes vinculados as suas vendas, corrija o que precisar e deixe tudo pronto para a festa."
          : "Centralize todos os nomes da festa, pesquise rapidamente e corrija a lista final antes do dia do evento."
      }
      action={<ExportGuestListButton eventId={eventId} />}
    >
      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_240px_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, vendedor ou numero da venda"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="name">Ordenar por nome</option>
          <option value="seller">Ordenar por vendedor</option>
          <option value="sale-asc">Ordenar por venda crescente</option>
          <option value="recent">Ordenar por vendas recentes</option>
        </select>
        <div className="min-h-11 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
          {filteredEntries.length} nome(s)
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filteredEntries.length === 0 ? (
          <EmptyState
            title="Nenhum nome cadastrado"
            description="Os nomes informados nas vendas vao aparecer aqui para formar a lista final de entrada."
            icon={ListChecks}
          />
        ) : (
          filteredEntries.map((entry) => {
            const canEditName =
              permissions.canManageSales && (!permissions.canManageOwnSalesOnly || entry.isOwnedByViewer);

            return (
              <article key={entry.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{entry.guestName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500">
                      <span>{entry.sellerName}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span>{formatCurrency(entry.unitPrice)}</span>
                      <span className="text-slate-300">&bull;</span>
                      <StatusBadge status={entry.paymentStatus} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <span>Venda #{entry.saleNumber}</span>
                      {entry.checkedInAt ? (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Check-in feito</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {canEditName ? (
                    <div className="w-full sm:w-[17rem]">
                      <GuestNameEditForm eventId={eventId} entry={entry} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
