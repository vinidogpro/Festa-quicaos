import { TaskStatus } from "@/lib/types";

type Status = TaskStatus;

const styles: Record<Status, string> = {
  pending: "ds-badge ds-badge-warning",
  "in-progress": "ds-badge border-sky-100 bg-sky-50 text-sky-700",
  done: "ds-badge ds-badge-positive"
};

const labels: Record<Status, string> = {
  pending: "Pendente",
  "in-progress": "Em andamento",
  done: "Concluido"
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={styles[status]}>{labels[status]}</span>;
}
