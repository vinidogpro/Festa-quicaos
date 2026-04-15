import { TaskStatus } from "@/lib/types";

type Status = TaskStatus;

const styles: Record<Status, string> = {
  pending: "border-amber-100 bg-amber-50 text-amber-700",
  "in-progress": "border-sky-100 bg-sky-50 text-sky-700",
  done: "border-emerald-100 bg-emerald-50 text-emerald-700"
};

const labels: Record<Status, string> = {
  pending: "Pendente",
  "in-progress": "Em andamento",
  done: "Concluido"
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
