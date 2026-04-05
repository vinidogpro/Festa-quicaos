"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Pin, Pencil, Plus, Trash2 } from "lucide-react";
import { initialAnnouncementActionState } from "@/lib/actions/action-state";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction
} from "@/lib/actions/event-management";
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

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function ActionFeedback({
  status,
  message
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (!message || status === "idle") {
    return null;
  }

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        status === "success"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {message}
    </div>
  );
}

function AnnouncementCreateForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createAnnouncementAction, initialAnnouncementActionState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={action} ref={formRef} className="mb-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input
        name="title"
        placeholder="Titulo do comunicado"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        required
      />
      <textarea
        name="body"
        placeholder="Mensagem para a equipe"
        className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        required
      />
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="pinned" className="h-4 w-4 rounded border-slate-300" />
        Fixar comunicado
      </label>
      <div className="flex justify-end">
        <SubmitButton
          pendingLabel="Publicando..."
          className="inline-flex w-fit items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Publicar aviso
        </SubmitButton>
      </div>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

function AnnouncementEditForm({ eventId, announcement }: { eventId: string; announcement: Announcement }) {
  const router = useRouter();
  const [updateState, updateAction] = useFormState(updateAnnouncementAction, initialAnnouncementActionState);
  const [deleteState, deleteAction] = useFormState(deleteAnnouncementAction, initialAnnouncementActionState);

  useEffect(() => {
    if (updateState.status === "success" || deleteState.status === "success") {
      router.refresh();
    }
  }, [deleteState.status, router, updateState.status]);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        <Pencil className="h-4 w-4" />
        Editar
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-4">
        <form action={updateAction} className="grid gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="announcementId" value={announcement.id} />
          <input
            name="title"
            defaultValue={announcement.title}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <textarea
            name="body"
            defaultValue={announcement.body}
            className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="pinned"
              defaultChecked={announcement.pinned}
              className="h-4 w-4 rounded border-slate-300"
            />
            Manter fixado
          </label>
          <div className="flex justify-end">
            <SubmitButton
              pendingLabel="Salvando..."
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Salvar comunicado
            </SubmitButton>
          </div>
          <ActionFeedback status={updateState.status} message={updateState.message} />
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Deseja realmente excluir este comunicado?")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="announcementId" value={announcement.id} />
          <SubmitButton
            pendingLabel="Excluindo..."
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Excluir comunicado
          </SubmitButton>
          <div className="mt-3">
            <ActionFeedback status={deleteState.status} message={deleteState.message} />
          </div>
        </form>
      </div>
    </details>
  );
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
      {permissions.canManageAnnouncements && !compact ? <AnnouncementCreateForm eventId={eventId} /> : null}

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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    {item.pinned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                        <Pin className="h-3.5 w-3.5" />
                        Fixado
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.author ? `${item.author} | ` : ""}
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>

                {permissions.canManageAnnouncements && !compact ? (
                  <div className="lg:w-[23rem]">
                    <AnnouncementEditForm eventId={eventId} announcement={item} />
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
