import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { ExportSummaryButton } from "@/components/export-summary-button";
import { EventSettingsPanel } from "@/components/forms/event-settings-panel";
import { EventStatusBadge } from "@/components/event-status-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { PartyEventDetail } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function EventHeader({ event }: { event: PartyEventDetail }) {
  const viewerRoleLabel = event.viewerEventRole ?? (event.viewer.role === "host" ? "host global" : "sem papel");

  return (
    <header className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para festas
            </Link>
            <EventStatusBadge status={event.status} />
          </div>
          <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {event.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatDate(event.eventDate)}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.venue}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {event.viewer.name} | {viewerRoleLabel}
          </div>
          {event.permissions.canManageEvent ? (
            <div className="w-full sm:w-auto">
              <EventSettingsPanel
                eventId={event.id}
                name={event.name}
                venue={event.venue}
                eventDate={event.eventDate}
                goalValue={event.goalValue}
                description={event.description}
                eventBatches={event.eventBatches}
              />
            </div>
          ) : null}
          <Link
            href={event.status === "past" ? "/historico" : "/festas"}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Navegar eventos
          </Link>
          <ExportSummaryButton eventId={event.id} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
