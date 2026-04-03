import { Plus } from "lucide-react";
import { createExpenseAction } from "@/lib/actions/event-management";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { Expense, TransferPending, ViewerPermissions } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface FinancePanelProps {
  eventId: string;
  permissions: ViewerPermissions;
  totalRevenue: number;
  estimatedProfit: number;
  expenses: Expense[];
  transfersPending: TransferPending[];
  compact?: boolean;
}

export function FinancePanel({
  eventId,
  permissions,
  totalRevenue,
  estimatedProfit,
  expenses,
  transfersPending,
  compact = false
}: FinancePanelProps) {
  return (
    <SectionCard
      title="Financeiro"
      description="Controle entradas, despesas e quem ainda precisa repassar valores."
    >
      {permissions.canManageFinance && !compact ? (
        <form action={createExpenseAction} className="mb-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-5">
          <input type="hidden" name="eventId" value={eventId} />
          <input
            name="title"
            placeholder="Titulo da despesa"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            name="category"
            placeholder="Categoria"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            name="incurredAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <SubmitButton className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />
            Adicionar despesa
          </SubmitButton>
        </form>
      ) : null}

      {expenses.length === 0 && transfersPending.length === 0 && totalRevenue === 0 ? (
        <EmptyState
          title="Financeiro em preparacao"
          description="Assim que custos e vendas forem lancados, esta area passa a consolidar caixa, lucro e pendencias."
          icon={Plus}
        />
      ) : (
        <div className={`grid gap-4 ${compact ? "" : "xl:grid-cols-[0.95fr_1.05fr]"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] bg-slate-950 p-5 text-white">
              <p className="text-sm text-white/70">Total arrecadado</p>
              <p className="mt-2 font-[var(--font-heading)] text-3xl font-bold">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="rounded-[24px] bg-brand-50 p-5">
              <p className="text-sm text-slate-500">Lucro estimado</p>
              <p className="mt-2 font-[var(--font-heading)] text-3xl font-bold text-slate-950">
                {formatCurrency(estimatedProfit)}
              </p>
            </div>

            <div className="sm:col-span-2 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Pessoas com repasse pendente</h3>
                <span className="text-sm text-slate-400">{transfersPending.length} pendencias</span>
              </div>
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
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Despesas recentes</h3>
              <span className="text-sm text-slate-400">{expenses.length} lancamentos</span>
            </div>
            <div className="mt-4 space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{expense.title}</p>
                    <p className="text-sm text-slate-500">{expense.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                    <p className="text-xs text-slate-400">{expense.incurredAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
