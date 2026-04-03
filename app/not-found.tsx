import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-[32px] border border-white/70 bg-white/85 p-8 text-center shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Evento nao encontrado</p>
        <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950">
          Essa festa nao existe neste mock
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Volte para a lista principal para abrir um evento valido e continuar navegando.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Ir para a home
        </Link>
      </section>
    </main>
  );
}
