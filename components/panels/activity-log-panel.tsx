"use client";

import { useMemo, useState } from "react";
import { History, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { ActivityLogItem, ViewerPermissions } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

      <div className="mt-6 space-y-3">
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="Nenhuma atividade encontrada"
            description="Quando a equipe criar, editar ou remover informacoes importantes, o historico aparecera aqui."
            icon={History}
          />
        ) : (
          filteredLogs.map((log) => (
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
            </article>
          ))
        )}
      </div>
    </SectionCard>
  );
}
