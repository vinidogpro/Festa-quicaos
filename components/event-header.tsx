import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { ExportBackupButton, ExportSummaryButton } from "@/components/export-summary-button";
import { EventSettingsPanel } from "@/components/forms/event-settings-panel";
import { EventStatusBadge } from "@/components/event-status-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { PartyEventDetail } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function EventHeader({ event }: { event: PartyEventDetail }) {
  const viewerRoleLabel = event.viewerEventRole ?? (event.viewer.role === "host" ? "host global" : "sem papel");

  return (
    <header className="rounded-[28px] border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
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
            {event.isClosed ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                Fechada
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {event.name}
          </h1>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
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

        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:col-span-2 lg:col-span-1">
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
                hasVip={event.hasVip}
                hasGroupSales={event.hasGroupSales}
                isClosed={event.isClosed}
                closedAt={event.closedAt}
              />
            </div>
          ) : null}
          <Link
            href={event.status === "past" ? "/historico" : "/festas"}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Navegar eventos
          </Link>
          <ExportSummaryButton eventId={event.id} />
          {event.permissions.canManageEvent ? <ExportBackupButton eventId={event.id} /> : null}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
