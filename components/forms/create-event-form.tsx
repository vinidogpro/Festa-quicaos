import { createEventAction } from "@/lib/actions/event-management";
import { ViewerProfile } from "@/lib/types";
import { SubmitButton } from "@/components/forms/submit-button";

export function CreateEventForm({ viewer }: { viewer: ViewerProfile }) {
  if (viewer.role !== "admin") {
    return null;
  }

  return (
    <form action={createEventAction} className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
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
      <div className="lg:col-span-4">
        <SubmitButton className="inline-flex rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          Criar festa
        </SubmitButton>
      </div>
    </form>
  );
}
