"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleDollarSign, Pencil, Plus, ReceiptText, Ticket, Trash2, Wallet } from "lucide-react";
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
import {
  calculateCashFlowByDate,
  calculateCategoryBreakdown,
  calculateFinanceTotals,
  calculateTicketTypeMetrics
} from "@/lib/event-metrics";
import { AdditionalRevenue, EventBatch, Expense, SaleType, SalesRecord, TicketType, ViewerPermissions } from "@/lib/types";
import { formatCurrency, formatCurrencyParts, formatSaleTypeLabel, formatTicketTypeLabel } from "@/lib/utils";

interface FinancePanelProps {
  eventId: string;
  permissions: ViewerPermissions;
  ticketRevenue: number;
  additionalRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  estimatedProfit: number;
  goalValue: number;
  sales: SalesRecord[];
  expenses: Expense[];
  additionalRevenues: AdditionalRevenue[];
  eventBatches: EventBatch[];
  hasVip: boolean;
  hasGroupSales: boolean;
  compact?: boolean;
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(date));
}

function FinanceMetricCard({
  label,
  value,
  rawValue,
  isCurrency = false,
  icon,
  valueClassName,
  cardClassName
}: {
  label: string;
  value: string | number;
  rawValue?: number;
  isCurrency?: boolean;
  icon: React.ReactNode;
  valueClassName: string;
  cardClassName: string;
}) {
  const valueLabel = String(value);
  const currencyParts = isCurrency && typeof rawValue === "number" ? formatCurrencyParts(rawValue) : null;

  return (
    <div className={`min-w-0 rounded-[22px] p-4 sm:min-h-[188px] sm:rounded-[24px] sm:p-5 ${cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[13rem] text-sm leading-5">{label}</p>
        <div className="mt-0.5 shrink-0 opacity-80">{icon}</div>
      </div>

      <div className="mt-4 min-w-0 sm:mt-8">
        {isCurrency ? (
          <div className="min-w-0">
            <p className="ds-label opacity-70">
              {currencyParts?.currencyLabel ?? valueLabel}
            </p>
              <p
                className={`mt-2 min-w-0 break-words whitespace-normal font-[var(--font-heading)] font-bold tracking-tight sm:whitespace-nowrap ${valueClassName}`}
                title={valueLabel}
              >
                {currencyParts?.amountLabel ?? valueLabel}
              </p>
          </div>
        ) : (
          <p
            className={`min-w-0 break-words whitespace-normal font-[var(--font-heading)] font-bold tracking-tight sm:whitespace-nowrap ${valueClassName}`}
            title={valueLabel}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function ClosingMetricCard({
  label,
  value,
  tone = "neutral",
  wide = false
}: {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "negative" | "primary";
  wide?: boolean;
}) {
  const currencyParts = formatCurrencyParts(value);
  const amountToneClass =
    tone === "positive"
      ? "text-emerald-900"
      : tone === "negative"
        ? "text-rose-900"
        : tone === "primary"
          ? "text-brand-800"
          : "text-slate-950";
  const labelToneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-700"
        : tone === "primary"
          ? "text-brand-700"
          : "text-slate-500";
  const accentClass =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "negative"
        ? "bg-rose-500"
        : tone === "primary"
          ? "bg-brand-600"
          : "bg-slate-300";

  return (
    <div className={`rounded-2xl border border-white bg-white px-4 py-3.5 shadow-sm ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accentClass}`} />
        <p className={`ds-label ${labelToneClass}`}>{label}</p>
      </div>
      <div className="mt-2.5 min-w-0">
        <p className="ds-label text-slate-400">{currencyParts.currencyLabel}</p>
        <p className={`mt-1.5 break-words whitespace-normal font-[var(--font-heading)] text-[clamp(1.45rem,8vw,2.35rem)] font-bold leading-[0.98] tracking-tight sm:whitespace-nowrap ${amountToneClass}`}>
          {currencyParts.amountLabel}
        </p>
      </div>
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

function CategorySubtotalPanel({
  title,
  description,
  tone,
  items
}: {
  title: string;
  description: string;
  tone: "expense" | "revenue";
  items: Array<{ category: string; total: number; count: number; percentage: number }>;
}) {
  const palette =
    tone === "expense"
      ? {
          badge: "bg-rose-100 text-rose-700",
          progress: "bg-rose-500",
          emptyBorder: "border-rose-200",
          emptyBg: "bg-rose-50/60"
        }
      : {
          badge: "bg-emerald-100 text-emerald-700",
          progress: "bg-emerald-500",
          emptyBorder: "border-emerald-200",
          emptyBg: "bg-emerald-50/60"
        };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${palette.badge}`}>
          {items.length} categorias
        </span>
      </div>

      {items.length === 0 ? (
        <div className={`mt-4 rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-slate-500 ${palette.emptyBorder} ${palette.emptyBg}`}>
          Nenhuma categoria consolidada ainda.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.category} className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.category}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.count} lancamento(s) | {item.percentage}% do total
                  </p>
                </div>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(item.total)}</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${palette.progress}`} style={{ width: `${Math.max(item.percentage, 6)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CashFlowPanel({
  rows
}: {
  rows: Array<{ date: string; inflow: number; outflow: number; balance: number; cumulativeBalance: number }>;
}) {
  return (
    <details className="group rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Fluxo de caixa por data</h3>
          <p className="mt-1 text-sm text-slate-500">
            Entradas e saidas consolidadas por dia para acompanhar o saldo operacional da festa.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {rows.length} dias
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </span>
      </summary>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          O fluxo de caixa aparece assim que houver entradas ou saidas registradas.
        </div>
      ) : (
        <>
        <div className="mt-4 space-y-3 md:hidden">
          {rows.map((row) => (
            <article key={row.date} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-950">{formatShortDate(row.date)}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.balance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {row.balance >= 0 ? "Saldo positivo" : "Saldo negativo"}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Entradas</span>
                  <span className="font-semibold text-emerald-700">+ {formatCurrency(row.inflow)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Saidas</span>
                  <span className="font-semibold text-rose-700">- {formatCurrency(row.outflow)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                  <span className="font-medium text-slate-700">Saldo do dia</span>
                  <span className={`font-semibold ${row.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {row.balance >= 0 ? "+" : "-"} {formatCurrency(Math.abs(row.balance))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Acumulado</span>
                  <span className={`font-semibold ${row.cumulativeBalance >= 0 ? "text-slate-900" : "text-rose-800"}`}>
                    {row.cumulativeBalance >= 0 ? "" : "-"}{formatCurrency(Math.abs(row.cumulativeBalance))}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3 pr-4 font-semibold">Data</th>
                <th className="pb-3 pr-4 font-semibold">Entradas</th>
                <th className="pb-3 pr-4 font-semibold">Saidas</th>
                <th className="pb-3 pr-4 font-semibold">Saldo do dia</th>
                <th className="pb-3 font-semibold">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.date}>
                  <td className="py-3 pr-4 font-medium text-slate-900">{formatShortDate(row.date)}</td>
                  <td className="py-3 pr-4 font-semibold text-emerald-700">+ {formatCurrency(row.inflow)}</td>
                  <td className="py-3 pr-4 font-semibold text-rose-700">- {formatCurrency(row.outflow)}</td>
                  <td className={`py-3 pr-4 font-semibold ${row.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {row.balance >= 0 ? "+" : "-"} {formatCurrency(Math.abs(row.balance))}
                  </td>
                  <td className={`py-3 font-semibold ${row.cumulativeBalance >= 0 ? "text-slate-900" : "text-rose-800"}`}>
                    {row.cumulativeBalance >= 0 ? "" : "-"}{formatCurrency(Math.abs(row.cumulativeBalance))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </details>
  );
}

function ResultSimulator({
  ticketRevenue,
  totalRevenue,
  estimatedProfit,
  goalValue,
  currentTicketsSold,
  eventBatches,
  hasVip,
  hasGroupSales
}: {
  ticketRevenue: number;
  totalRevenue: number;
  estimatedProfit: number;
  goalValue: number;
  currentTicketsSold: number;
  eventBatches: EventBatch[];
  hasVip: boolean;
  hasGroupSales: boolean;
}) {
  const activeBatches = useMemo(
    () => eventBatches.filter((batch) => batch.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [eventBatches]
  );
  const [quantity, setQuantity] = useState("50");
  const [unitPrice, setUnitPrice] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("pista");
  const [saleType, setSaleType] = useState<SaleType>("normal");
  const [batchId, setBatchId] = useState(activeBatches[0]?.id ?? "");
  const [additionalExpense, setAdditionalExpense] = useState("0");

  const selectedBatch = activeBatches.find((batch) => batch.id === batchId) ?? activeBatches[0];
  const suggestedPrice =
    selectedBatch && ticketType === "vip" ? selectedBatch.vipPrice ?? selectedBatch.pistaPrice ?? 0 : selectedBatch?.pistaPrice ?? 0;

  useEffect(() => {
    if (!batchId && activeBatches[0]) {
      setBatchId(activeBatches[0].id);
    }
  }, [activeBatches, batchId]);

  useEffect(() => {
    if (suggestedPrice > 0) {
      setUnitPrice(String(suggestedPrice));
    }
  }, [selectedBatch?.id, suggestedPrice, ticketType]);

  useEffect(() => {
    if (!hasVip && ticketType !== "pista") {
      setTicketType("pista");
    }
  }, [hasVip, ticketType]);

  useEffect(() => {
    if (!hasGroupSales && saleType !== "normal") {
      setSaleType("normal");
    }
  }, [hasGroupSales, saleType]);

  const parsedQuantity = Number(quantity);
  const parsedUnitPrice = Number(unitPrice);
  const parsedAdditionalExpense = Number(additionalExpense);
  const validQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
  const validUnitPrice = Number.isFinite(parsedUnitPrice) && parsedUnitPrice >= 0 ? parsedUnitPrice : 0;
  const validAdditionalExpense = Number.isFinite(parsedAdditionalExpense) && parsedAdditionalExpense >= 0 ? parsedAdditionalExpense : 0;
  const simulatedRevenue = validQuantity * validUnitPrice;
  const profitDelta = simulatedRevenue - validAdditionalExpense;
  const projectedTotalRevenue = totalRevenue + simulatedRevenue;
  const projectedProfit = estimatedProfit + profitDelta;
  const projectedAverageTicket =
    currentTicketsSold + validQuantity > 0 ? (ticketRevenue + simulatedRevenue) / (currentTicketsSold + validQuantity) : 0;
  const projectedGoalProgress = goalValue > 0 ? Math.round((projectedTotalRevenue / goalValue) * 100) : 0;
  const hasValidationWarning =
    parsedQuantity <= 0 ||
    Number.isNaN(parsedQuantity) ||
    parsedUnitPrice < 0 ||
    Number.isNaN(parsedUnitPrice) ||
    parsedAdditionalExpense < 0 ||
    Number.isNaN(parsedAdditionalExpense);

  return (
    <details className="group rounded-[28px] border border-brand-100 bg-gradient-to-br from-white via-brand-50/40 to-emerald-50/50 p-4 shadow-sm sm:p-5">
      <summary className="flex cursor-pointer list-none flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Simulador de resultado</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
            Simule novas vendas antes de lancar no sistema
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Calculo temporario: nada aqui cria venda, altera financeiro ou muda as metricas reais da festa.
          </p>
        </div>
        <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
          Lucro atual: <span className="font-semibold text-slate-950">{formatCurrency(estimatedProfit)}</span>
          <ChevronDown className="ml-2 inline h-4 w-4 align-text-bottom text-slate-400 transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-3 rounded-[24px] border border-white bg-white/80 p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Quantidade adicional
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Preco unitario
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-400"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Lote
              <select
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-400"
              >
                {activeBatches.length === 0 ? <option value="">Sem lotes ativos</option> : null}
                {activeBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Despesa adicional estimada
              <input
                type="number"
                min="0"
                step="0.01"
                value={additionalExpense}
                onChange={(event) => setAdditionalExpense(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-400"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {hasVip ? (
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Tipo de ingresso
                <select
                  value={ticketType}
                  onChange={(event) => setTicketType(event.target.value as TicketType)}
                  className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-400"
                >
                  <option value="pista">PISTA</option>
                  <option value="vip">VIP</option>
                </select>
              </label>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="ds-label text-slate-400">Tipo de ingresso</span>
                <p className="mt-1 font-semibold text-slate-900">{formatTicketTypeLabel("pista")}</p>
              </div>
            )}

            {hasGroupSales ? (
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Tipo de venda
                <select
                  value={saleType}
                  onChange={(event) => setSaleType(event.target.value as SaleType)}
                  className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-400"
                >
                  <option value="normal">Normal</option>
                  <option value="grupo">Grupo</option>
                </select>
              </label>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="ds-label text-slate-400">Tipo de venda</span>
                <p className="mt-1 font-semibold text-slate-900">{formatSaleTypeLabel("normal")}</p>
              </div>
            )}
          </div>

          {suggestedPrice > 0 ? (
            <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
              Preco sugerido para {selectedBatch?.name ?? "o lote"}: <span className="font-semibold">{formatCurrency(suggestedPrice)}</span>.
            </p>
          ) : null}

          {hasValidationWarning ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Informe quantidade maior que zero e valores sem sinal negativo para calcular a simulacao.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] border border-white bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Resultado projetado</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-white/60">Receita adicional</p>
                <p className="mt-1 font-[var(--font-heading)] text-3xl font-bold">{formatCurrency(simulatedRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Lucro projetado</p>
                <p className={`mt-1 font-[var(--font-heading)] text-3xl font-bold ${projectedProfit >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {formatCurrency(projectedProfit)}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm text-white/60">Diferenca no lucro</p>
              <p className={`mt-1 text-xl font-semibold ${profitDelta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                {profitDelta >= 0 ? "+" : "-"} {formatCurrency(Math.abs(profitDelta))}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="ds-label text-slate-400">Total arrecadado</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{formatCurrency(projectedTotalRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="ds-label text-slate-400">Ticket medio</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{formatCurrency(projectedAverageTicket)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="ds-label text-slate-400">Meta projetada</p>
              <p className="mt-2 text-lg font-bold text-brand-800">{goalValue > 0 ? `${projectedGoalProgress}%` : "Sem meta"}</p>
            </div>
          </div>
        </div>
      </div>
    </details>
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
    <div className="mb-5 rounded-[24px] border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-slate-50 p-4 sm:mb-6 sm:rounded-[28px] sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-700 text-white shadow-lg shadow-rose-200/60 sm:h-12 sm:w-12">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Nova despesa</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
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
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400"
            required
          />
          <input
            name="category"
            placeholder="Categoria"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400"
            required
          />
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Valor"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400"
            required
          />
          <input
            name="incurredAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400"
          />
        </div>
        <input
          name="notes"
          placeholder="Observacoes da despesa"
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            A despesa entra no resultado da festa assim que for salva.
          </p>
          <SubmitButton
            pendingLabel="Salvando despesa..."
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
    <div className="mb-5 rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 sm:mb-6 sm:rounded-[28px] sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200/60 sm:h-12 sm:w-12">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Nova arrecadacao</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
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
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
      className="flex flex-col items-stretch gap-2 sm:items-end"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expenseId" value={expenseId} />
      <SubmitButton
        pendingLabel="Excluindo..."
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
      <details ref={detailsRef} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm open:bg-slate-50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50/50">
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
              className="min-h-11 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Salvar alteracoes
            </SubmitButton>
            <button
              type="button"
              onClick={() => {
                detailsRef.current?.removeAttribute("open");
              }}
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
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
      className="flex flex-col items-stretch gap-2 sm:items-end"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="revenueId" value={revenueId} />
      <SubmitButton
        pendingLabel="Excluindo..."
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
      <details className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm open:bg-slate-50">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/50">
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
          className="min-h-11 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
  totalRevenue,
  totalExpenses,
  estimatedProfit,
  goalValue,
  sales,
  expenses,
  additionalRevenues,
  eventBatches,
  hasVip,
  hasGroupSales,
  compact = false
}: FinancePanelProps) {
  const financeTotals = calculateFinanceTotals({
    sales: sales.map((sale) => ({
      quantity: sale.sold,
      unitPrice: sale.unitPrice
    })),
    expenses: expenses.map((expense) => ({ amount: expense.amount })),
    additionalRevenues: additionalRevenues.map((revenue) => ({ amount: revenue.amount }))
  });
  const ticketTypeMetrics = calculateTicketTypeMetrics(
    sales.map((sale) => ({
      quantity: sale.sold,
      unitPrice: sale.unitPrice,
      ticketType: sale.ticketType
    }))
  );
  const expenseCategories = calculateCategoryBreakdown(
    expenses.map((expense) => ({
      category: expense.category,
      amount: expense.amount
    }))
  );
  const additionalRevenueCategories = calculateCategoryBreakdown(
    additionalRevenues.map((revenue) => ({
      category: revenue.category,
      amount: revenue.amount
    }))
  );
  const cashFlowRows = calculateCashFlowByDate({
    sales: sales.map((sale) => ({
      quantity: sale.sold,
      unitPrice: sale.unitPrice,
      createdAt: sale.soldAt || sale.createdAt
    })),
    additionalRevenues: additionalRevenues.map((revenue) => ({
      amount: revenue.amount,
      date: revenue.date
    })),
    expenses: expenses.map((expense) => ({
      amount: expense.amount,
      incurredAt: expense.incurredAt
    }))
  });
  const vipRevenueShare =
    financeTotals.ticketRevenue > 0 ? Math.round((ticketTypeMetrics.vip.revenue / financeTotals.ticketRevenue) * 100) : 0;
  const pistaRevenueShare =
    financeTotals.ticketRevenue > 0 ? Math.round((ticketTypeMetrics.pista.revenue / financeTotals.ticketRevenue) * 100) : 0;

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

      {!compact ? (
        <div className="mb-5 sm:mb-6">
          <ResultSimulator
            ticketRevenue={ticketRevenue}
            totalRevenue={totalRevenue}
            estimatedProfit={estimatedProfit}
            goalValue={goalValue}
            currentTicketsSold={sales.reduce((total, sale) => total + sale.sold, 0)}
            eventBatches={eventBatches}
            hasVip={hasVip}
            hasGroupSales={hasGroupSales}
          />
        </div>
      ) : null}

      {expenses.length === 0 &&
      additionalRevenues.length === 0 &&
      totalRevenue === 0 ? (
        <EmptyState
          title="Financeiro em preparacao"
          description="Assim que custos e vendas forem lancados, esta area passa a consolidar caixa, lucro e pendencias."
          icon={Wallet}
        />
      ) : (
        <div className="grid gap-4 sm:gap-6">
          <div
            className={`grid gap-4 ${
              compact ? "xl:grid-cols-2" : "sm:grid-cols-2 2xl:grid-cols-3"
            }`}
          >
            <FinanceMetricCard
              label="Total vendido"
              value={formatCurrency(ticketRevenue)}
              rawValue={ticketRevenue}
              isCurrency
              icon={<Ticket className="h-5 w-5 text-white/60" />}
              cardClassName="bg-slate-950 text-white"
              valueClassName="text-[clamp(1.55rem,10vw,2.35rem)] leading-[0.95] text-white"
            />

            <FinanceMetricCard
              label="Vendas extras"
              value={formatCurrency(additionalRevenue)}
              rawValue={additionalRevenue}
              isCurrency
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              cardClassName="border border-emerald-200 bg-emerald-50 text-emerald-800"
              valueClassName="text-[clamp(1.55rem,10vw,2.35rem)] leading-[0.95] text-emerald-900"
            />

            <FinanceMetricCard
              label="Total arrecadado"
              value={formatCurrency(totalRevenue)}
              rawValue={totalRevenue}
              isCurrency
              icon={<CircleDollarSign className="h-5 w-5 text-white/60" />}
              cardClassName="bg-brand-700 text-white"
              valueClassName="text-[clamp(1.55rem,10vw,2.5rem)] leading-[0.95] text-white"
            />

            <FinanceMetricCard
              label="Total de despesas"
              value={formatCurrency(totalExpenses)}
              rawValue={totalExpenses}
              isCurrency
              icon={<ReceiptText className="h-5 w-5 text-rose-500" />}
              cardClassName="border border-rose-200 bg-rose-50/75 text-rose-700"
              valueClassName="text-[clamp(1.55rem,10vw,2.35rem)] leading-[0.95] text-rose-900"
            />

              <FinanceMetricCard
                label="Lucro estimado"
                value={formatCurrency(estimatedProfit)}
                rawValue={estimatedProfit}
                isCurrency
                icon={<Wallet className="h-5 w-5 text-brand-600" />}
                cardClassName={estimatedProfit < 0 ? "border border-rose-200 bg-rose-50 text-slate-500" : "bg-brand-50 text-slate-500"}
                valueClassName={`text-[clamp(1.55rem,10vw,2.35rem)] leading-[0.95] ${
                  estimatedProfit < 0 ? "text-rose-900" : estimatedProfit > 0 ? "text-emerald-900" : "text-slate-950"
                }`}
              />
          </div>

          {!compact ? (
            <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                    Fechamento da festa
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Visao final consolidada com totais financeiros e quebra comercial por tipo de ingresso.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                  Ultima base consolidada em {cashFlowRows.length > 0 ? formatShortDate(cashFlowRows[cashFlowRows.length - 1].date) : "tempo real"}
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <ClosingMetricCard label="Total vendido" value={financeTotals.grossSoldRevenue} />
                  <ClosingMetricCard label="Vendas extras" value={financeTotals.additionalRevenue} tone="positive" />
                  <ClosingMetricCard label="Total arrecadado" value={financeTotals.generalRevenue} tone="primary" />
                  <ClosingMetricCard label="Despesas totais" value={financeTotals.totalExpenses} tone="negative" />
                  <ClosingMetricCard
                    label="Lucro final"
                    value={financeTotals.estimatedProfit}
                    tone={
                      financeTotals.estimatedProfit > 0
                        ? "positive"
                        : financeTotals.estimatedProfit < 0
                          ? "negative"
                          : "neutral"
                    }
                    wide
                  />
                </div>

                <div className="rounded-[24px] border border-brand-100 bg-white/85 p-3 shadow-sm sm:p-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                          VIP
                        </span>
                        <span className="text-sm font-semibold text-amber-800">{ticketTypeMetrics.vip.percentage}% dos ingressos</span>
                      </div>
                      <div className="mt-3.5 space-y-1.5 text-sm text-slate-700">
                        <p><span className="font-semibold text-slate-900">{ticketTypeMetrics.vip.ticketsSold}</span> ingressos vendidos</p>
                        <p><span className="font-semibold text-slate-900">{formatCurrency(ticketTypeMetrics.vip.revenue)}</span> de receita</p>
                        <p><span className="font-semibold text-slate-900">{formatCurrency(ticketTypeMetrics.vip.averageTicket)}</span> de ticket medio</p>
                        <p><span className="font-semibold text-slate-900">{vipRevenueShare}%</span> da receita de ingressos</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white px-4 py-3.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="rounded-full border border-rose-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                          PISTA
                        </span>
                        <span className="text-sm font-semibold text-rose-800">{ticketTypeMetrics.pista.percentage}% dos ingressos</span>
                      </div>
                      <div className="mt-3.5 space-y-1.5 text-sm text-slate-700">
                        <p><span className="font-semibold text-slate-900">{ticketTypeMetrics.pista.ticketsSold}</span> ingressos vendidos</p>
                        <p><span className="font-semibold text-slate-900">{formatCurrency(ticketTypeMetrics.pista.revenue)}</span> de receita</p>
                        <p><span className="font-semibold text-slate-900">{formatCurrency(ticketTypeMetrics.pista.averageTicket)}</span> de ticket medio</p>
                        <p><span className="font-semibold text-slate-900">{pistaRevenueShare}%</span> da receita de ingressos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!compact ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <CategorySubtotalPanel
                title="Despesas por categoria"
                description="Subtotais para enxergar rapidamente onde o caixa da festa foi consumido."
                tone="expense"
                items={expenseCategories}
              />
              <CategorySubtotalPanel
                title="Arrecadacoes extras por categoria"
                description="Subtotais das entradas complementares alem das vendas de ingressos."
                tone="revenue"
                items={additionalRevenueCategories}
              />
            </div>
          ) : null}

          {!compact ? <CashFlowPanel rows={cashFlowRows} /> : null}

          <div className={`grid gap-6 ${compact ? "" : "xl:grid-cols-[0.95fr_1.05fr]"}`}>
            <div className="space-y-6">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Arrecadacoes adicionais</h3>
                    <p className="mt-1 text-sm text-slate-500">Entradas extras do evento alem dos ingressos.</p>
                  </div>
                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    {additionalRevenues.length} lancamentos
                  </span>
                </div>

                {additionalRevenues.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma arrecadacao adicional cadastrada ainda.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {additionalRevenues.map((revenue) => (
                      <article key={revenue.id} className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-slate-900">{revenue.title}</h4>
                              {revenue.category ? (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                  {revenue.category}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">Data: {revenue.date}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-[var(--font-heading)] text-xl font-bold text-emerald-700 sm:text-base sm:font-semibold">{formatCurrency(revenue.amount)}</p>
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
            </div>

            <div className="space-y-6">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Despesas da festa</h3>
                    <p className="mt-1 text-sm text-slate-500">Cada lancamento impacta o lucro estimado automaticamente.</p>
                  </div>
                  <span className="w-fit rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                    {expenses.length} lancamentos
                  </span>
                </div>

                {expenses.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma despesa cadastrada para esta festa.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {expenses.map((expense) => (
                      <article key={expense.id} className="rounded-2xl border border-rose-100 bg-white px-4 py-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-slate-900">{expense.title}</h4>
                              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                                {expense.category}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">Data: {expense.incurredAt}</p>
                            {expense.notes ? (
                              <p className="mt-2 text-sm leading-6 text-slate-500">{expense.notes}</p>
                            ) : null}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-[var(--font-heading)] text-xl font-bold text-rose-800 sm:text-base sm:font-semibold">{formatCurrency(expense.amount)}</p>
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
