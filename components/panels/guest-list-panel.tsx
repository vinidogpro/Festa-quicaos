"use client";

import { useMemo, useState } from "react";
import { Download, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { GuestListEntry, ViewerPermissions } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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
  const [sortBy, setSortBy] = useState<"name" | "seller">("name");

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const nextEntries = !normalizedSearch
      ? [...entries]
      : entries.filter(
          (entry) =>
            entry.guestName.toLowerCase().includes(normalizedSearch) ||
            entry.sellerName.toLowerCase().includes(normalizedSearch)
        );

    nextEntries.sort((left, right) =>
      sortBy === "seller"
        ? left.sellerName.localeCompare(right.sellerName) || left.guestName.localeCompare(right.guestName)
        : left.guestName.localeCompare(right.guestName)
    );

    return nextEntries;
  }, [entries, search, sortBy]);

  return (
    <SectionCard
      title="Lista de entrada"
      description={
        permissions.canManageOwnSalesOnly
          ? "Veja os nomes vinculados as suas vendas e complete o que faltar antes da festa."
          : "Centralize todos os nomes da festa, pesquise rapidamente e exporte a lista final para o dia do evento."
      }
      action={
        <a
          href={`/festas/${eventId}/guest-list/export`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Exportar lista
        </a>
      }
    >
      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_220px_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou vendedor"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as "name" | "seller")}
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="name">Ordenar por nome</option>
          <option value="seller">Ordenar por vendedor</option>
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
          filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{entry.guestName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500">
                    <span>{entry.sellerName}</span>
                    <span className="text-slate-300">•</span>
                    <span>Venda #{entry.saleNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span>{formatCurrency(entry.unitPrice)}</span>
                    <span className="text-slate-300">•</span>
                    <StatusBadge status={entry.paymentStatus} />
                  </div>
                </div>
                {entry.checkedInAt ? (
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Check-in feito
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </SectionCard>
  );
}
