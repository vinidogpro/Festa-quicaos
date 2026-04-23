import { EventStatus } from "@/lib/types";
import { getEventStatusLabel } from "@/lib/utils";

const styles: Record<EventStatus, string> = {
  current: "ds-badge-positive",
  upcoming: "ds-badge-primary",
  past: "ds-badge-neutral"
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`ds-badge ${styles[status]}`}>
      {getEventStatusLabel(status)}
    </span>
  );
}
