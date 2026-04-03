import Link from "next/link";
import { ArrowUpRight, BarChart3 } from "lucide-react";
import { EventStatusBadge } from "@/components/event-status-badge";
import { EventSummary } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <article className="rounded-[28px] border border-white/60 bg-white/82 p-5 shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <EventStatusBadge status={event.status} />
          <h3 className="mt-4 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
            {event.name}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{formatDate(event.eventDate)}</p>
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total vendido</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(event.totalRevenue)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Meta</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(event.goalValue)}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Progresso comercial</span>
          <span className="font-semibold text-slate-900">{event.progress}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(event.progress, 100)}%` }} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">Melhor vendedor: {event.bestSeller}</p>
        <Link
          href={`/festas/${event.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Ver detalhes
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
