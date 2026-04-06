import { AuthForm } from "@/components/auth/auth-form";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur sm:p-8">
        <div className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Supabase Auth
        </div>
        <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950">
          Entrar na plataforma
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Entre com um usuario criado manualmente por voce no Supabase para acessar a plataforma.
        </p>
        <AuthForm />
      </section>
    </main>
  );
}
