"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { initialEventActionState } from "@/lib/actions/action-state";
import { createEventAction } from "@/lib/actions/event-management";
import { ViewerProfile } from "@/lib/types";
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
    <form action={action} className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
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
