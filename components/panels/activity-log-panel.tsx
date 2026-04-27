"use client";

import { useMemo, useState } from "react";
import { History, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { ActivityLogItem, ViewerPermissions } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const METADATA_LABELS: Record<string, string> = {
  sellerUserId: "Vendedor",
  previousSellerUserId: "Vendedor anterior",
  nextSellerUserId: "Vendedor novo",
  batchId: "Lote",
  batchLabel: "Lote",
  previousBatchLabel: "Lote anterior",
  nextBatchLabel: "Lote novo",
  previousSaleType: "Tipo anterior",
  nextSaleType: "Tipo novo",
  saleType: "Tipo de venda",
  previousTicketType: "Ingresso anterior",
  nextTicketType: "Ingresso novo",
  ticketType: "Tipo de ingresso",
  previousQuantity: "Qtd. anterior",
  nextQuantity: "Qtd. nova",
  quantity: "Quantidade",
  previousUnitPrice: "Preco anterior",
  nextUnitPrice: "Preco novo",
  unitPrice: "Preco",
  previousAmount: "Valor anterior",
  nextAmount: "Valor novo",
  amount: "Valor",
  previousTitle: "Titulo anterior",
  nextTitle: "Titulo novo",
  title: "Titulo",
  previousCategory: "Categoria anterior",
  nextCategory: "Categoria nova",
  category: "Categoria",
  previousGuestName: "Nome anterior",
  nextGuestName: "Nome novo",
  guestName: "Nome",
  previousGuestNames: "Nomes anteriores",
  nextGuestNames: "Nomes novos",
  previousNotes: "Obs. anterior",
  nextNotes: "Obs. nova",
  notes: "Observacoes",
  previousSoldAt: "Data anterior",
  nextSoldAt: "Data nova",
  previousIncurredAt: "Data anterior",
  nextIncurredAt: "Data nova",
  previousDate: "Data anterior",
  nextDate: "Data nova",
  attendeeCount: "Nomes vinculados"
};

const HIDDEN_METADATA_KEYS = new Set([
  "batchId",
  "previousBatchId",
  "nextBatchId",
  "saleId",
  "eventSlug",
  "sellerUserId",
  "previousSellerUserId",
  "nextSellerUserId"
]);

function formatMetadataValue(key: string, value: string | number | boolean | null) {
  if (value === null || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  if (typeof value === "number" && /(price|amount|unitPrice)/i.test(key)) {
    return formatCurrency(value);
  }

  return String(value);
}

function getMetadataEntries(metadata?: ActivityLogItem["metadata"]) {
  if (!metadata) {
    return [];
  }

  return Object.entries(metadata).filter(([key]) => !HIDDEN_METADATA_KEYS.has(key));
}

export function ActivityLogPanel({
  logs,
  permissions
}: {
  logs: ActivityLogItem[];
  permissions: ViewerPermissions;
}) {
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const actorOptions = useMemo(
    () => Array.from(new Map(logs.map((log) => [log.actorUserId, { id: log.actorUserId, name: log.actorName }])).values()),
    [logs]
  );

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entityType))),
    [logs]
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesActor = actorFilter === "all" || log.actorUserId === actorFilter;
        const matchesAction = actionFilter === "all" || log.entityType === actionFilter;
        return matchesActor && matchesAction;
      }),
    [actionFilter, actorFilter, logs]
  );

  const highlightedLogs = useMemo(
    () =>
      filteredLogs
        .filter((log) =>
          ["sale.updated", "sale_attendee.updated", "manual_guest_entry.updated", "expense.updated", "additional_revenue.updated"].includes(
            log.action
          )
        )
        .slice(0, 3),
    [filteredLogs]
  );

  if (!permissions.canViewActivityLog) {
    return (
      <SectionCard title="Atividades" description="Somente hosts podem acessar o historico de auditoria desta festa.">
        <EmptyState
          title="Acesso restrito"
          description="O historico da festa fica disponivel apenas para quem responde pela auditoria do evento."
          icon={ShieldCheck}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Atividades"
      description="Historico das acoes mais importantes para acompanhar quem fez o que dentro da festa."
    >
      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1fr_auto]">
        <select
          value={actorFilter}
          onChange={(event) => setActorFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">Todos os usuarios</option>
          {actorOptions.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">Todas as entidades</option>
          {actionOptions.map((entityType) => (
            <option key={entityType} value={entityType}>
              {entityType}
            </option>
          ))}
        </select>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
          {filteredLogs.length} atividade(s)
        </div>
      </div>

      {highlightedLogs.length > 0 ? (
        <div className="mt-6 rounded-[26px] border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-950">Alteracoes sensiveis recentes</p>
              <p className="text-sm text-amber-800">Edicoes que podem impactar financeiro, lista ou auditoria.</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
              Auditoria
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {highlightedLogs.map((log) => (
              <div key={`highlight-${log.id}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <span className="font-semibold text-slate-950">{log.actorName}</span> - {log.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="Nenhuma atividade encontrada"
            description="Quando a equipe criar, editar ou remover informacoes importantes, o historico aparecera aqui."
            icon={History}
          />
        ) : (
          filteredLogs.map((log) => {
            const metadataEntries = getMetadataEntries(log.metadata);

            return (
              <article key={log.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{log.actorName}</p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {log.entityType}
                      </span>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                        {log.action}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{log.message}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Data</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(log.createdAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(new Date(log.createdAt))}
                    </p>
                  </div>
                </div>

                {metadataEntries.length > 0 ? (
                  <div className="mt-4 grid gap-2 rounded-[20px] border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {metadataEntries.map(([key, value]) => (
                      <div key={key} className="min-w-0 rounded-2xl bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {METADATA_LABELS[key] ?? key}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-800" title={formatMetadataValue(key, value)}>
                          {formatMetadataValue(key, value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
