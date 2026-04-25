import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CreateEventForm } from "@/components/forms/create-event-form";
import { PlatformHeader } from "@/components/platform-header";
import { SectionCard } from "@/components/ui/section-card";
import { SetupCard } from "@/components/setup-card";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentViewer } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  if (!isSupabaseConfigured()) {
    return <SetupCard />;
  }

  try {
    const viewer = await getCurrentViewer();

    if (!viewer) {
      redirect("/login");
    }

    if (viewer.role !== "host") {
      redirect("/festas");
    }

    return (
      <main className="min-h-screen">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
          <PlatformHeader viewer={viewer} />

          <SectionCard
            title="Criar nova festa"
            description="Preencha os dados basicos, configure a operacao comercial e deixe a festa pronta para vender desde o primeiro acesso."
            action={
              <Link
                href="/festas"
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para festas
              </Link>
            }
          >
            <div className="mb-5 rounded-[24px] border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Fluxo completo
                  </div>
                  <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-slate-950">
                    Configure tudo em uma tela mais limpa e focada
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Aqui a gente organiza melhor a criacao da festa: dados basicos no topo, configuracao comercial no meio e criacao final sem disputar espaco com o restante do calendario.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
                  A configuracao vale para festas novas ou quando o host editar explicitamente o evento depois.
                </div>
              </div>
            </div>

            <CreateEventForm viewer={viewer} />
          </SectionCard>
        </div>
      </main>
    );
  } catch (error) {
    return (
      <SetupCard
        eyebrow="Falha ao abrir"
        title="Nao foi possivel iniciar a criacao da festa"
        description={
          error instanceof Error
            ? error.message
            : "A aplicacao nao conseguiu abrir a tela de criacao agora. Verifique a sessao e tente novamente."
        }
      />
    );
  }
}
