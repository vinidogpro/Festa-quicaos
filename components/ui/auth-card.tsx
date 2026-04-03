import { LockKeyhole, Mail } from "lucide-react";

export function AuthCard() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur sm:p-8">
        <div className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Supabase Auth
        </div>
        <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950">
          Entrar no painel da festa
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Login simples por e-mail para administradores e membros acompanharem tudo em tempo real.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">E-mail</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="voce@grupo.com"
              />
            </div>
          </label>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            <LockKeyhole className="h-4 w-4" />
            Enviar link magico
          </button>
        </div>
      </section>
    </main>
  );
}
