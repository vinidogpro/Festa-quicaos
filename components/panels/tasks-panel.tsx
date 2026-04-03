import { Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskItem } from "@/lib/types";

export function TasksPanel({
  tasks,
  compact = false
}: {
  tasks: TaskItem[];
  compact?: boolean;
}) {
  return (
    <SectionCard
      title="Tarefas"
      description="Acompanhe responsaveis, andamento e proximos passos da organizacao."
      action={
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Plus className="h-4 w-4" />
          Adicionar tarefa
        </button>
      }
    >
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
              <p className="mt-1 text-sm text-slate-500">
                Responsavel: {task.owner} • Prazo: {task.dueLabel}
              </p>
            </div>
            <StatusBadge status={task.status} />
          </div>
        ))}
      </div>
      )}
    </SectionCard>
  );
}
