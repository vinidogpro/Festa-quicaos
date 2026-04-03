import { Pin, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { Announcement } from "@/lib/types";

export function AnnouncementPanel({
  announcements,
  compact = false
}: {
  announcements: Announcement[];
  compact?: boolean;
}) {
  return (
    <SectionCard
      title="Comunicados"
      description="Publique avisos importantes e mantenha todo mundo alinhado."
      action={
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Plus className="h-4 w-4" />
          Novo aviso
        </button>
      }
    >
      {announcements.length === 0 ? (
        <EmptyState
          title="Sem comunicados publicados"
          description="Avisos fixados e mensagens operacionais aparecerao aqui quando a equipe iniciar a comunicacao."
          icon={Pin}
        />
      ) : (
      <div className="space-y-4">
        {announcements.slice(0, compact ? 2 : announcements.length).map((item) => (
          <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
              {item.pinned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                  <Pin className="h-3.5 w-3.5" />
                  Fixado
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      )}
    </SectionCard>
  );
}
