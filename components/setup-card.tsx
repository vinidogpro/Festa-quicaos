export function SetupCard() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Configurar Supabase</p>
        <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950">
          Ambiente ainda nao conectado
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, rode o schema em
          `supabase/schema.sql` e carregue os dados iniciais de `supabase/seed.sql`.
        </p>
      </section>
    </main>
  );
}
