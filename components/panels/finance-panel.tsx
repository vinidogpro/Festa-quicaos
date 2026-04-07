"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { CircleDollarSign, ClipboardList, Pencil, Plus, ReceiptText, Ticket, Trash2, Wallet } from "lucide-react";
import { initialFinanceActionState } from "@/lib/actions/action-state";
import {
  createAdditionalRevenueAction,
  createExpenseAction,
  deleteAdditionalRevenueAction,
  deleteExpenseAction,
  updateExpenseAction,
  updateAdditionalRevenueAction
} from "@/lib/actions/event-management";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { AdditionalRevenue, Expense, TransferPending, ViewerPermissions } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface FinancePanelProps {
  eventId: string;
  permissions: ViewerPermissions;
  ticketRevenue: number;
  additionalRevenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  estimatedProfit: number;
  pendingPaymentsCount: number;
  confirmedPaymentsCount: number;
  expenses: Expense[];
  additionalRevenues: AdditionalRevenue[];
  transfersPending: TransferPending[];
  compact?: boolean;
}

function FinanceMetricCard({
  label,
  value,
  icon,
  valueClassName,
  cardClassName
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName: string;
  cardClassName: string;
}) {
  return (
    <div className={`min-w-0 rounded-[24px] p-4 sm:min-h-[176px] sm:p-5 ${cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-5">{label}</p>
        <div className="mt-0.5 shrink-0 opacity-80">{icon}</div>
      </div>
      <p
        className={`mt-6 whitespace-nowrap font-[var(--font-heading)] font-bold tracking-tight sm:mt-8 ${valueClassName}`}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
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

function ExpenseForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createExpenseAction, initialFinanceActionState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="mb-6 rounded-[28px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200/60">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Nova despesa</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
            Registrar saida financeira
          </h3>
        </div>
      </div>

      <form ref={formRef} action={action} className="mt-5 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr]">
          <input
            name="title"
            placeholder="Titulo da despesa"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <input
            name="category"
            placeholder="Categoria"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Valor"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <input
            name="incurredAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
          />
        </div>
        <input
          name="notes"
          placeholder="Observacoes da despesa"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            A despesa entra no resultado da festa assim que for salva.
          </p>
          <SubmitButton
            pendingLabel="Salvando despesa..."
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Adicionar despesa
          </SubmitButton>
        </div>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </div>
  );
}

function AdditionalRevenueForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createAdditionalRevenueAction, initialFinanceActionState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="mb-6 rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200/60">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Nova arrecadacao</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
            Registrar entrada extra
          </h3>
        </div>
      </div>

      <form ref={formRef} action={action} className="mt-5 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr_0.7fr_0.7fr]">
          <input
            name="title"
            placeholder="Titulo da arrecadacao"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="category"
            placeholder="Categoria (opcional)"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          />
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Valor"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Registre entradas como bar, copos ou extras para consolidar o total arrecadado.
          </p>
          <SubmitButton
            pendingLabel="Salvando arrecadacao..."
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Adicionar arrecadacao
          </SubmitButton>
        </div>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </div>
  );
}

function ExpenseDeleteForm({ eventId, expenseId }: { eventId: string; expenseId: string }) {
  const router = useRouter();
  const [state, action] = useFormState(deleteExpenseAction, initialFinanceActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Deseja realmente excluir esta despesa?")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-2"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expenseId" value={expenseId} />
      <SubmitButton
        pendingLabel="Excluindo..."
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </SubmitButton>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

function ExpenseEditForm({
  eventId,
  expense
}: {
  eventId: string;
  expense: Expense;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [state, action] = useFormState(updateExpenseAction, initialFinanceActionState);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      setShowToast(true);
      detailsRef.current?.removeAttribute("open");
      router.refresh();

      const timeout = window.setTimeout(() => setShowToast(false), 2400);
      return () => window.clearTimeout(timeout);
    }
  }, [router, state.status]);

  return (
    <div className="space-y-2">
      {showToast ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Despesa atualizada com sucesso.
        </div>
      ) : null}
      <details ref={detailsRef} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <Pencil className="h-4 w-4" />
          Editar
        </summary>
        <form action={action} className="mt-3 grid gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="expenseId" value={expense.id} />
          <input
            name="title"
            defaultValue={expense.title}
            placeholder="Titulo"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            required
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="category"
              defaultValue={expense.category}
              placeholder="Categoria"
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={expense.amount}
              placeholder="Valor"
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
            <input
              name="incurredAt"
              type="date"
              defaultValue={expense.incurredAt}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
              required
            />
          </div>
          <input
            name="notes"
            defaultValue={expense.notes ?? ""}
            placeholder="Observacoes"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton
              pendingLabel="Salvando..."
              className="min-h-11 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Salvar alteracoes
            </SubmitButton>
            <button
              type="button"
              onClick={() => {
                detailsRef.current?.removeAttribute("open");
              }}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
          <ActionFeedback status={state.status} message={state.message} />
        </form>
      </details>
    </div>
  );
}

function AdditionalRevenueDeleteForm({ eventId, revenueId }: { eventId: string; revenueId: string }) {
  const router = useRouter();
  const [state, action] = useFormState(deleteAdditionalRevenueAction, initialFinanceActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Deseja realmente excluir esta arrecadacao?")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-2"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="revenueId" value={revenueId} />
      <SubmitButton
        pendingLabel="Excluindo..."
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </SubmitButton>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

function AdditionalRevenueEditForm({
  eventId,
  revenue
}: {
  eventId: string;
  revenue: AdditionalRevenue;
}) {
  const router = useRouter();
  const [state, action] = useFormState(updateAdditionalRevenueAction, initialFinanceActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <Pencil className="h-4 w-4" />
        Editar
      </summary>
      <form action={action} className="mt-3 grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="revenueId" value={revenue.id} />
        <input
          name="title"
          defaultValue={revenue.title}
          placeholder="Titulo"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          required
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="category"
            defaultValue={revenue.category ?? ""}
            placeholder="Categoria"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          />
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={revenue.amount}
            placeholder="Valor"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="date"
            type="date"
            defaultValue={revenue.date}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
        <SubmitButton
          pendingLabel="Salvando..."
          className="min-h-11 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salvar alteracoes
        </SubmitButton>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </details>
  );
}

export function FinancePanel({
  eventId,
  permissions,
  ticketRevenue,
  additionalRevenue,
  confirmedRevenue,
  pendingRevenue,
  totalRevenue,
  totalExpenses,
  estimatedProfit,
  pendingPaymentsCount,
  confirmedPaymentsCount,
  expenses,
  additionalRevenues,
  transfersPending,
  compact = false
}: FinancePanelProps) {
  const totalPendingTransfers = transfersPending.reduce((sum, person) => sum + person.amount, 0);

  return (
    <SectionCard
      title="Financeiro"
      description="Veja entradas, saidas e o resultado operacional da festa com dados reais do evento."
    >
      {permissions.canManageFinance && !compact ? (
        <>
          <ExpenseForm eventId={eventId} />
          <AdditionalRevenueForm eventId={eventId} />
        </>
      ) : null}

      {expenses.length === 0 &&
      additionalRevenues.length === 0 &&
      transfersPending.length === 0 &&
      totalRevenue === 0 ? (
        <EmptyState
          title="Financeiro em preparacao"
          description="Assim que custos e vendas forem lancados, esta area passa a consolidar caixa, lucro e pendencias."
          icon={Wallet}
        />
      ) : (
        <div className="grid gap-6">
          <div
            className={`grid gap-4 ${
              compact ? "sm:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
            }`}
          >
            <FinanceMetricCard
              label="Total vendido"
              value={formatCurrency(ticketRevenue)}
              icon={<Ticket className="h-5 w-5 text-white/60" />}
              cardClassName="bg-slate-950 text-white"
              valueClassName="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none text-white"
            />

            <FinanceMetricCard
              label="Vendas extras"
              value={formatCurrency(additionalRevenue)}
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              cardClassName="border border-emerald-200 bg-emerald-50 text-emerald-800"
              valueClassName="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none text-emerald-900"
            />

            <FinanceMetricCard
              label="Total arrecadado"
              value={formatCurrency(totalRevenue)}
              icon={<CircleDollarSign className="h-5 w-5 text-white/60" />}
              cardClassName="bg-brand-700 text-white"
              valueClassName="text-[clamp(1.7rem,2.5vw,2.35rem)] leading-none text-white"
            />

            <FinanceMetricCard
              label="Receita confirmada"
              value={formatCurrency(confirmedRevenue)}
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              cardClassName="border border-emerald-200 bg-emerald-50 text-emerald-800"
              valueClassName="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none text-emerald-900"
            />

            <FinanceMetricCard
              label="Receita pendente"
              value={formatCurrency(pendingRevenue)}
              icon={<ClipboardList className="h-5 w-5 text-amber-600" />}
              cardClassName="border border-amber-200 bg-amber-50 text-amber-800"
              valueClassName="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none text-amber-900"
            />

            <FinanceMetricCard
              label="Total de despesas"
              value={formatCurrency(totalExpenses)}
              icon={<ReceiptText className="h-5 w-5 text-slate-400" />}
              cardClassName="border border-slate-200 bg-white text-slate-500"
              valueClassName="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none text-slate-950"
            />

            <FinanceMetricCard
              label="Lucro estimado"
              value={formatCurrency(estimatedProfit)}
              icon={<Wallet className="h-5 w-5 text-brand-600" />}
              cardClassName="bg-brand-50 text-slate-500"
              valueClassName="text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none text-slate-950"
            />

            <FinanceMetricCard
              label="Pagamentos pendentes"
              value={pendingPaymentsCount}
              icon={<ClipboardList className="h-5 w-5 text-amber-600" />}
              cardClassName="border border-amber-200 bg-amber-50 text-amber-800"
              valueClassName="text-[clamp(1.7rem,2.4vw,2.15rem)] leading-none text-amber-900"
            />

            <FinanceMetricCard
              label="Pagamentos confirmados"
              value={confirmedPaymentsCount}
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              cardClassName="border border-emerald-200 bg-emerald-50 text-emerald-800"
              valueClassName="text-[clamp(1.7rem,2.4vw,2.15rem)] leading-none text-emerald-900"
            />
          </div>

          <div className={`grid gap-6 ${compact ? "" : "xl:grid-cols-[0.95fr_1.05fr]"}`}>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Repasses pendentes</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {transfersPending.length} membros ainda precisam acertar valores com a festa.
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total pendente</p>
                  <p className="mt-1 font-semibold text-amber-700">{formatCurrency(totalPendingTransfers)}</p>
                </div>
              </div>

              {transfersPending.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum repasse pendente no momento.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {transfersPending.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                    >
                      <span className="font-medium text-slate-700">{person.name}</span>
                      <span className="font-semibold text-amber-600">{formatCurrency(person.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Arrecadacoes adicionais</h3>
                    <p className="mt-1 text-sm text-slate-500">Entradas extras do evento alem dos ingressos.</p>
                  </div>
                  <span className="text-sm text-slate-400">{additionalRevenues.length} lancamentos</span>
                </div>

                {additionalRevenues.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma arrecadacao adicional cadastrada ainda.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {additionalRevenues.map((revenue) => (
                      <article key={revenue.id} className="rounded-2xl bg-white px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-slate-900">{revenue.title}</h4>
                              {revenue.category ? (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                                  {revenue.category}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">Data: {revenue.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-emerald-700">{formatCurrency(revenue.amount)}</p>
                            {permissions.canManageFinance && !compact ? (
                              <div className="mt-3 space-y-2">
                                <AdditionalRevenueEditForm eventId={eventId} revenue={revenue} />
                                <AdditionalRevenueDeleteForm eventId={eventId} revenueId={revenue.id} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Despesas da festa</h3>
                    <p className="mt-1 text-sm text-slate-500">Cada lancamento impacta o lucro estimado automaticamente.</p>
                  </div>
                  <span className="text-sm text-slate-400">{expenses.length} lancamentos</span>
                </div>

                {expenses.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma despesa cadastrada para esta festa.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {expenses.map((expense) => (
                      <article key={expense.id} className="rounded-2xl bg-white px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-slate-900">{expense.title}</h4>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                                {expense.category}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">Data: {expense.incurredAt}</p>
                            {expense.notes ? (
                              <p className="mt-2 text-sm leading-6 text-slate-500">{expense.notes}</p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                            {permissions.canManageFinance && !compact ? (
                              <div className="mt-3 space-y-2">
                                <ExpenseEditForm eventId={eventId} expense={expense} />
                                <ExpenseDeleteForm eventId={eventId} expenseId={expense.id} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!compact && !permissions.canManageFinance ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Voce pode visualizar o financeiro desta festa, mas o cadastro e a exclusao de despesas ficam restritos a hosts e organizadores.
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
