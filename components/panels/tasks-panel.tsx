"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { initialTaskActionState } from "@/lib/actions/action-state";
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
  updateTaskStatusAction
} from "@/lib/actions/event-management";
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

function getTaskVisualState(task: TaskItem) {
  const isDone = task.status === "done";
  const hasOwner = task.ownerProfileId && task.owner !== "Sem responsavel";
  const hasDueAt = Boolean(task.dueAt);
  const isOverdue =
    !isDone &&
    hasDueAt &&
    new Date(`${task.dueAt}T23:59:59`).getTime() < new Date().getTime();

  return {
    isOverdue,
    hasOwner: Boolean(hasOwner),
    cardClassName: isOverdue
      ? "border-rose-200 bg-rose-50/60"
      : task.status === "done"
        ? "border-emerald-200 bg-emerald-50/50"
        : task.status === "in-progress"
          ? "border-sky-200 bg-sky-50/50"
          : "border-amber-200 bg-amber-50/50",
    dueClassName: isOverdue ? "text-rose-700" : "text-slate-500"
  };
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
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

function TaskCreateForm({
  eventId,
  participantOptions
}: {
  eventId: string;
  participantOptions: SellerOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createTaskAction, initialTaskActionState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mb-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_auto]"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input
        name="title"
        placeholder="Titulo da tarefa"
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        required
      />
      <select
        name="ownerProfileId"
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        defaultValue=""
      >
        <option value="">Sem responsavel</option>
        {participantOptions.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participant.name}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue="pending"
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
      >
        <option value="pending">Pendente</option>
        <option value="in-progress">Em andamento</option>
        <option value="done">Concluida</option>
      </select>
      <input
        name="dueAt"
        type="date"
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
      />
      <SubmitButton
        pendingLabel="Criando..."
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        Adicionar tarefa
      </SubmitButton>
      <div className="lg:col-span-5">
        <ActionFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

function TaskStatusForm({ eventId, task }: { eventId: string; task: TaskItem }) {
  const router = useRouter();
  const [state, action] = useFormState(updateTaskStatusAction, initialTaskActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="taskId" value={task.id} />
      <select
        name="status"
        defaultValue={task.status}
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-brand-500"
      >
        <option value="pending">Pendente</option>
        <option value="in-progress">Em andamento</option>
        <option value="done">Concluida</option>
      </select>
      <SubmitButton
        pendingLabel="Atualizando..."
        className="min-h-11 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Status
      </SubmitButton>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

function TaskEditForm({
  eventId,
  task,
  participantOptions
}: {
  eventId: string;
  task: TaskItem;
  participantOptions: SellerOption[];
}) {
  const router = useRouter();
  const [updateState, updateAction] = useFormState(updateTaskAction, initialTaskActionState);
  const [deleteState, deleteAction] = useFormState(deleteTaskAction, initialTaskActionState);

  useEffect(() => {
    if (updateState.status === "success" || deleteState.status === "success") {
      router.refresh();
    }
  }, [deleteState.status, router, updateState.status]);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        <Pencil className="h-4 w-4" />
        Editar
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-4">
        <form action={updateAction} className="grid gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="taskId" value={task.id} />
          <input
            name="title"
            defaultValue={task.title}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              name="ownerProfileId"
              defaultValue={task.ownerProfileId ?? ""}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            >
              <option value="">Sem responsavel</option>
              {participantOptions.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={task.status}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            >
              <option value="pending">Pendente</option>
              <option value="in-progress">Em andamento</option>
              <option value="done">Concluida</option>
            </select>
            <input
              name="dueAt"
              type="date"
              defaultValue={task.dueAt ?? ""}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton
              pendingLabel="Salvando..."
              className="min-h-11 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Salvar tarefa
            </SubmitButton>
          </div>
          <ActionFeedback status={updateState.status} message={updateState.message} />
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Deseja realmente excluir esta tarefa?")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="taskId" value={task.id} />
          <SubmitButton
            pendingLabel="Excluindo..."
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Excluir tarefa
          </SubmitButton>
          <div className="mt-3">
            <ActionFeedback status={deleteState.status} message={deleteState.message} />
          </div>
        </form>
      </div>
    </details>
  );
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
        <TaskCreateForm eventId={eventId} participantOptions={participantOptions} />
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa cadastrada"
          description="Use este espaco para planejar operacao, marketing, staff e entregas do evento."
          icon={CheckCheck}
        />
      ) : (
        <div className="space-y-3">
          {tasks.slice(0, compact ? 3 : tasks.length).map((task) => {
            const visualState = getTaskVisualState(task);

            return (
              <article
                key={task.id}
                className={`rounded-[24px] border p-4 ${visualState.cardClassName}`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{task.title}</h3>
                      {!permissions.canManageTasks || compact ? <StatusBadge status={task.status} /> : null}
                      {visualState.isOverdue ? (
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                          Atrasada
                        </span>
                      ) : null}
                      {!visualState.hasOwner ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Sem responsavel
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-3">
                      <span className={!visualState.hasOwner ? "text-slate-600" : undefined}>Responsavel: {task.owner}</span>
                      <span className={visualState.dueClassName}>Prazo: {task.dueLabel}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        Criada em {formatDateTime(task.createdAt)}
                      </span>
                    </div>
                  </div>

                  {permissions.canManageTasks && !compact ? (
                    <div className="grid gap-3 xl:w-[25rem]">
                      <TaskStatusForm eventId={eventId} task={task} />
                      <TaskEditForm eventId={eventId} task={task} participantOptions={participantOptions} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
