import { Pin, Plus } from "lucide-react";
import { createAnnouncementAction } from "@/lib/actions/event-management";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { Announcement, ViewerPermissions } from "@/lib/types";

interface AnnouncementPanelProps {
  eventId: string;
  announcements: Announcement[];
  permissions: ViewerPermissions;
  compact?: boolean;
}

export function AnnouncementPanel({
  eventId,
  announcements,
  permissions,
  compact = false
}: AnnouncementPanelProps) {
  return (
    <SectionCard
      title="Comunicados"
      description="Publique avisos importantes e mantenha todo mundo alinhado."
    >
      {permissions.canManageAnnouncements && !compact ? (
        <form action={createAnnouncementAction} className="mb-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input
            name="title"
            placeholder="Titulo do comunicado"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <textarea
            name="body"
            placeholder="Mensagem para a equipe"
            className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="pinned" className="h-4 w-4 rounded border-slate-300" />
            Fixar comunicado
          </label>
          <SubmitButton className="inline-flex w-fit items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />
            Publicar aviso
          </SubmitButton>
        </form>
      ) : null}

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
