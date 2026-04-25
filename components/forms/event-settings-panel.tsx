"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { initialEventActionState } from "@/lib/actions/action-state";
import { deleteEventAction, updateEventAction, updateEventClosureAction } from "@/lib/actions/event-management";
import { EventBatch } from "@/lib/types";
import { CommercialConfigSection } from "@/components/forms/commercial-config-section";
import { SubmitButton } from "@/components/forms/submit-button";

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

export function EventSettingsPanel({
  eventId,
  name,
  venue,
  eventDate,
  goalValue,
  description,
  eventBatches,
  hasVip,
  hasGroupSales,
  isClosed,
  closedAt
}: {
  eventId: string;
  name: string;
  venue: string;
  eventDate: string;
  goalValue: number;
  description?: string;
  eventBatches: EventBatch[];
  hasVip: boolean;
  hasGroupSales: boolean;
  isClosed: boolean;
  closedAt?: string;
}) {
  const router = useRouter();
  const [updateState, updateAction] = useFormState(updateEventAction, initialEventActionState);
  const [deleteState, deleteAction] = useFormState(deleteEventAction, initialEventActionState);
  const [closureState, closureAction] = useFormState(updateEventClosureAction, initialEventActionState);

  useEffect(() => {
    if (updateState.status === "success" && updateState.redirectTo) {
      router.push(updateState.redirectTo as any);
      router.refresh();
    }
  }, [router, updateState]);

  useEffect(() => {
    if (deleteState.status === "success" && deleteState.redirectTo) {
      router.push(deleteState.redirectTo as any);
      router.refresh();
    }
  }, [router, deleteState]);

  useEffect(() => {
    if (closureState.status === "success") {
      router.refresh();
    }
  }, [router, closureState.status]);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        <Pencil className="h-4 w-4" />
        Editar evento
      </summary>

      <div className="space-y-4 border-t border-slate-100 p-4">
        <form action={updateAction} className="grid gap-4">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              defaultValue={name}
              placeholder="Nome da festa"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
            <input
              name="venue"
              defaultValue={venue}
              placeholder="Local"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
          </div>
          <textarea
            name="description"
            rows={3}
            defaultValue={description ?? ""}
            placeholder="Descricao da festa"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="eventDate"
              type="datetime-local"
              defaultValue={eventDate.slice(0, 16)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
            <input
              name="goalValue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={goalValue}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
          </div>

          <CommercialConfigSection
            mode="edit"
            initialHasVip={hasVip}
            initialHasGroupSales={hasGroupSales}
            initialBatches={eventBatches}
          />

          <div className="flex justify-end">
            <SubmitButton
              pendingLabel="Salvando evento..."
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Salvar alteracoes
            </SubmitButton>
          </div>
          <ActionFeedback status={updateState.status} message={updateState.message} />
        </form>

        <div className={`rounded-[24px] border p-4 ${isClosed ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-start gap-3">
            <div className={`mt-1 rounded-xl p-2 ${isClosed ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
              <Pencil className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className={isClosed ? "font-semibold text-amber-950" : "font-semibold text-slate-950"}>
                {isClosed ? "Festa fechada" : "Fechamento da festa"}
              </h3>
              <p className={`mt-1 text-sm leading-6 ${isClosed ? "text-amber-900/85" : "text-slate-600"}`}>
                {isClosed
                  ? `Esta festa foi fechada${closedAt ? ` em ${new Intl.DateTimeFormat("pt-BR").format(new Date(closedAt))}` : ""}. Sellers nao podem alterar vendas ou nomes; hosts podem reabrir para ajustes.`
                  : "Ao fechar a festa, sellers ficam bloqueados de alterar vendas e nomes. Hosts e organizadores ainda conseguem fazer correcoes pos-evento."}
              </p>
            </div>
          </div>

          <form
            action={closureAction}
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              const actionText = isClosed ? "reabrir" : "fechar";

              if (!window.confirm(`Tem certeza que deseja ${actionText} esta festa?`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="intent" value={isClosed ? "open" : "close"} />
            <input
              name="confirmation"
              placeholder={`Digite "${name}" para confirmar`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              required
            />
            <div className="flex justify-end">
              <SubmitButton
                pendingLabel={isClosed ? "Reabrindo..." : "Fechando..."}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isClosed ? "bg-slate-950 hover:bg-slate-800" : "bg-amber-700 hover:bg-amber-800"
                }`}
              >
                {isClosed ? "Reabrir festa" : "Fechar festa"}
              </SubmitButton>
            </div>
            <ActionFeedback status={closureState.status} message={closureState.message} />
          </form>
        </div>

        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl bg-rose-100 p-2 text-rose-700">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-rose-900">Excluir festa</h3>
              <p className="mt-1 text-sm leading-6 text-rose-800/85">
                Essa acao remove o evento e os dados relacionados. Digite o nome da festa para confirmar.
              </p>
            </div>
          </div>

          <form
            action={deleteAction}
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              if (!window.confirm("Tem certeza que deseja excluir esta festa? Essa acao nao pode ser desfeita.")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input
              name="confirmation"
              placeholder={`Digite "${name}" para confirmar`}
              className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400"
              required
            />
            <div className="flex justify-end">
              <SubmitButton
                pendingLabel="Excluindo..."
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Excluir festa
              </SubmitButton>
            </div>
            <ActionFeedback status={deleteState.status} message={deleteState.message} />
          </form>
        </div>
      </div>
    </details>
  );
}
