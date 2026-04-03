import { Plus } from "lucide-react";
import { createTaskAction, updateTaskStatusAction } from "@/lib/actions/event-management";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SellerOption, TaskItem, ViewerPermissions } from "@/lib/types";

interface TasksPanelProps {
  eventId: string;
  tasks: TaskItem[];
  participantOptions: SellerOption[];
  permissions: ViewerPermissions;
  compact?: boolean;
}

export function TasksPanel({
  eventId,
  tasks,
  participantOptions,
  permissions,
  compact = false
}: TasksPanelProps) {
  return (
    <SectionCard
      title="Tarefas"
      description="Acompanhe responsaveis, andamento e proximos passos da organizacao."
    >
      {permissions.canManageTasks && !compact ? (
        <form action={createTaskAction} className="mb-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input
            name="title"
            placeholder="Titulo da tarefa"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <select
            name="ownerProfileId"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            defaultValue=""
          >
            <option value="">Sem responsavel</option>
            {participantOptions.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
          <input
            name="dueAt"
            type="date"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <SubmitButton className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />
            Adicionar tarefa
          </SubmitButton>
        </form>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa cadastrada"
          description="Use este espaco para planejar operacao, marketing, staff e entregas do evento."
          icon={Plus}
        />
      ) : (
        <div className="space-y-3">
          {tasks.slice(0, compact ? 3 : tasks.length).map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="mt-1 text-sm text-slate-500">Responsavel: {task.owner} | Prazo: {task.dueLabel}</p>
              </div>
              {permissions.canManageTasks && !compact ? (
                <form action={updateTaskStatusAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <select
                    name="status"
                    defaultValue={task.status}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                  >
                    <option value="pending">Pendente</option>
                    <option value="in-progress">Em andamento</option>
                    <option value="done">Concluido</option>
                  </select>
                  <SubmitButton className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                    Atualizar
                  </SubmitButton>
                </form>
              ) : (
                <StatusBadge status={task.status} />
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
