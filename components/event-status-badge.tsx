import { EventStatus } from "@/lib/types";
import { getEventStatusLabel } from "@/lib/utils";

const styles: Record<EventStatus, string> = {
  current: "border-emerald-100 bg-emerald-50 text-emerald-700",
  upcoming: "border-sky-100 bg-sky-50 text-sky-700",
  past: "border-slate-200 bg-slate-100 text-slate-600"
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {getEventStatusLabel(status)}
    </span>
  );
}
