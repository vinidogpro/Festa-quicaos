"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { initialTeamActionState } from "@/lib/actions/action-state";
import {
  addEventMemberAction,
  removeEventMemberAction,
  updateEventMemberRoleAction
} from "@/lib/actions/event-management";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { EventRole, TeamMember, UserDirectoryOption, ViewerPermissions } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface TeamPanelProps {
  eventId: string;
  permissions: ViewerPermissions;
  teamMembers: TeamMember[];
  availableUsers: UserDirectoryOption[];
}

const roleOptions: Array<{ value: EventRole; label: string }> = [
  { value: "host", label: "Host" },
  { value: "organizer", label: "Organizador" },
  { value: "seller", label: "Vendedor" }
];

function FeedbackMessage({
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

function TeamMemberRow({
  eventId,
  member,
  permissions
}: {
  eventId: string;
  member: TeamMember;
  permissions: ViewerPermissions;
}) {
  const [updateState, updateAction] = useFormState(updateEventMemberRoleAction, initialTeamActionState);
  const [removeState, removeAction] = useFormState(removeEventMemberAction, initialTeamActionState);
  const canAssignHost = permissions.canCreateEvents || permissions.eventRole === "host";
  const availableRoleOptions = canAssignHost ? roleOptions : roleOptions.filter((role) => role.value !== "host");
  const canManageThisMemberRole = canAssignHost || member.role !== "host";

  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{member.name}</h3>
              {member.isCurrentUser ? (
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  Voce
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">Usuario vinculado a esta festa.</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-brand-700">{member.role}</span>
            <span
              className={`rounded-full px-3 py-1 ${
                member.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
              }`}
            >
              {member.isActive ? "Ativo" : "Inativo"}
            </span>
          </div>
          {member.role === "seller" ? (
            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Desempenho individual</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {member.ticketsSold} ingressos vendidos | vendas registradas no sistema
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{member.ticketsSold} ingressos</p>
                  <p className="text-sm text-slate-500">{formatCurrency(member.revenue)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 xl:min-w-[22rem]">
          {canManageThisMemberRole ? (
            <form action={updateAction} className="grid gap-3 rounded-[20px] border border-white/70 bg-white p-3">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="membershipId" value={member.id} />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  name="role"
                  defaultValue={member.role}
                  className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                >
                  {availableRoleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <SubmitButton className="min-h-11 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  Salvar
                </SubmitButton>
              </div>
              <FeedbackMessage status={updateState.status} message={updateState.message} />
            </form>
          ) : (
            <div className="rounded-[20px] border border-white/70 bg-white p-3 text-sm text-slate-500">
              Apenas hosts podem alterar o cargo ou remover outro host desta festa.
            </div>
          )}

          <form action={removeAction} className="rounded-[20px] border border-white/70 bg-white p-3">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="membershipId" value={member.id} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Remova o membro quando ele nao fizer mais parte da operacao.</p>
              <button
                type="submit"
                disabled={!canManageThisMemberRole}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </div>
            <FeedbackMessage status={removeState.status} message={removeState.message} />
          </form>
        </div>
      </div>
    </article>
  );
}

export function TeamPanel({ eventId, permissions, teamMembers, availableUsers }: TeamPanelProps) {
  const [search, setSearch] = useState("");
  const [addState, addAction] = useFormState(addEventMemberAction, initialTeamActionState);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = !normalizedSearch
    ? availableUsers.slice(0, 12)
    : availableUsers.filter((user) => user.name.toLowerCase().includes(normalizedSearch)).slice(0, 12);
  const canAssignHost = permissions.canCreateEvents || permissions.eventRole === "host";
  const availableRoleOptions = canAssignHost ? roleOptions : roleOptions.filter((role) => role.value !== "host");

  const orderedMembers = [...teamMembers].sort((left, right) => {
    const roleWeight = { host: 0, organizer: 1, seller: 2 };
    const roleDiff = roleWeight[left.role] - roleWeight[right.role];

    if (roleDiff !== 0) {
      return roleDiff;
    }

    return left.name.localeCompare(right.name);
  });

  if (!permissions.canManageTeam) {
    return (
      <SectionCard
        title="Equipe"
        description="Somente host e organizadores podem gerenciar os membros desta festa."
      >
        <EmptyState
          title="Acesso restrito"
          description="Esta area fica disponivel apenas para quem gerencia a equipe da festa."
          icon={ShieldCheck}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Equipe"
      description="Adicione membros, distribua cargos e mantenha a operacao da festa organizada sem SQL manual."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Adicionar membro</h3>
              <p className="text-sm text-slate-500">Procure um usuario ja existente e vincule-o a esta festa.</p>
            </div>
          </div>

          <form action={addAction} className="mt-5 grid gap-3">
            <input type="hidden" name="eventId" value={eventId} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario por nome"
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            />
            <select
              name="userId"
              defaultValue=""
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              required
            >
              <option value="" disabled>
                Selecionar usuario
              </option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3">
              <select
                name="role"
                defaultValue="seller"
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                {availableRoleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
              </select>
            </div>
            <SubmitButton className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
              <UserPlus className="h-4 w-4" />
              Adicionar a equipe
            </SubmitButton>
            <FeedbackMessage status={addState.status} message={addState.message} />
          </form>

          {availableUsers.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Todos os usuarios disponiveis ja estao vinculados a esta festa.
            </p>
          ) : search.trim() && filteredUsers.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Nenhum usuario encontrado para essa busca.
            </p>
          ) : null}
        </div>

        <div className="rounded-[24px] bg-slate-950 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/60">Resumo da equipe</p>
              <h3 className="mt-2 font-[var(--font-heading)] text-3xl font-bold">{teamMembers.length}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {teamMembers.filter((member) => member.role === "seller").length} vendedores,
                {" "}
                {teamMembers.filter((member) => member.role === "organizer").length} organizadores e
                {" "}
                {teamMembers.filter((member) => member.role === "host").length} hosts.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Ativos</p>
              <p className="mt-2 text-2xl font-semibold">{teamMembers.filter((member) => member.isActive).length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Gestao</p>
              <p className="mt-2 text-2xl font-semibold">
                {teamMembers.filter((member) => member.role !== "seller").length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Comercial</p>
              <p className="mt-2 text-2xl font-semibold">
                {teamMembers.filter((member) => member.role === "seller").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {orderedMembers.length === 0 ? (
          <EmptyState
            title="Nenhum membro vinculado"
            description="Adicione o primeiro colega para liberar vendas, tarefas e colaboracao dentro desta festa."
            icon={Users}
          />
        ) : (
          orderedMembers.map((member) => (
            <TeamMemberRow key={member.id} eventId={eventId} member={member} permissions={permissions} />
          ))
        )}
      </div>
    </SectionCard>
  );
}
