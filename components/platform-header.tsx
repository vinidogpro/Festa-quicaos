import Link from "next/link";
import { CalendarClock, Sparkles } from "lucide-react";

export function PlatformHeader() {
  return (
    <header className="rounded-[28px] border border-white/60 bg-white/82 p-5 shadow-soft backdrop-blur sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma de eventos
          </div>
          <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Gestao anual de festas em um unico painel
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Acompanhe festa atual, proximos lancamentos, historico e comparativos sem perder o contexto operacional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/festas"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <CalendarClock className="h-4 w-4" />
            Ver calendario
          </Link>
          <Link
            href="/historico"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Historico completo
          </Link>
        </div>
      </div>
    </header>
  );
}
