"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { initialEventActionState } from "@/lib/actions/action-state";
import { createEventAction } from "@/lib/actions/event-management";
import { DEFAULT_EVENT_BATCH_NAMES, ViewerProfile } from "@/lib/types";
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

export function CreateEventForm({ viewer }: { viewer: ViewerProfile }) {
  const router = useRouter();
  const [state, action] = useFormState(createEventAction, initialEventActionState);
  const [batchNames, setBatchNames] = useState<string[]>([...DEFAULT_EVENT_BATCH_NAMES]);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.push(state.redirectTo as any);
      router.refresh();
    }
  }, [router, state]);

  if (viewer.role !== "host") {
    return null;
  }

  return (
    <form action={action} className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
      <input
        name="name"
        placeholder="Nome da festa"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        required
      />
      <input
        name="venue"
        placeholder="Local"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        required
      />
      <textarea
        name="description"
        placeholder="Descricao da festa (opcional)"
        rows={3}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none lg:col-span-2"
      />
      <input
        name="eventDate"
        type="datetime-local"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        required
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <input
          name="goalValue"
          type="number"
          min="0"
          step="0.01"
          placeholder="Meta"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          name="status"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          defaultValue="upcoming"
        >
          <option value="current">Atual</option>
          <option value="upcoming">Proxima</option>
          <option value="past">Passada</option>
        </select>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 lg:col-span-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Lotes da festa</p>
            <p className="mt-1 text-sm text-slate-500">Defina os lotes que esta festa vai usar nas vendas.</p>
          </div>
          <button
            type="button"
            onClick={() => setBatchNames((current) => [...current, `Lote ${current.length + 1}`])}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            Adicionar lote
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {batchNames.map((batchName, index) => (
            <div key={`${index}-${batchName}`} className="flex flex-col gap-3 sm:flex-row">
              <input
                name="batchNames"
                defaultValue={batchName}
                placeholder={`Lote ${index + 1}`}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setBatchNames((current) =>
                    current.length > 1 ? current.filter((_, currentIndex) => currentIndex !== index) : current
                  )
                }
                disabled={batchNames.length <= 1}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        <SubmitButton
          pendingLabel="Criando festa..."
          className="inline-flex rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Criar festa
        </SubmitButton>
      </div>
      <div className="lg:col-span-2">
        <ActionFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}
