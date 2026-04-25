"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { DEFAULT_EVENT_BATCH_PRESETS, EventBatch, EventBatchPreset } from "@/lib/types";

interface CommercialBatchDraft {
  id?: string;
  name: string;
  pistaPrice: string;
  vipPrice: string;
  isActive: boolean;
  sortOrder: number;
  hasSales?: boolean;
}

function toBatchDraft(
  preset: EventBatchPreset,
  index: number,
  hasVip: boolean
): CommercialBatchDraft {
  return {
    name: preset.name,
    pistaPrice: String(preset.pistaPrice),
    vipPrice: hasVip && preset.vipPrice ? String(preset.vipPrice) : "",
    isActive: preset.isActiveByDefault,
    sortOrder: index
  };
}

function createPresetDrafts(hasVip: boolean) {
  return DEFAULT_EVENT_BATCH_PRESETS.map((preset, index) => toBatchDraft(preset, index, hasVip));
}

function formatNumberish(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }

  return String(value);
}

export function CommercialConfigSection({
  mode,
  initialHasVip = true,
  initialHasGroupSales = true,
  initialBatches = [],
  allowReset = true
}: {
  mode: "create" | "edit";
  initialHasVip?: boolean;
  initialHasGroupSales?: boolean;
  initialBatches?: EventBatch[];
  allowReset?: boolean;
}) {
  const [hasVip, setHasVip] = useState(initialHasVip);
  const [hasGroupSales, setHasGroupSales] = useState(initialHasGroupSales);
  const [batches, setBatches] = useState<CommercialBatchDraft[]>(() => {
    if (initialBatches.length > 0) {
      return [...initialBatches]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt))
        .map((batch, index) => ({
          id: batch.id,
          name: batch.name,
          pistaPrice: formatNumberish(batch.pistaPrice),
          vipPrice: formatNumberish(batch.vipPrice),
          isActive: batch.isActive,
          sortOrder: batch.sortOrder ?? index
        }));
    }

    return createPresetDrafts(initialHasVip);
  });

  const activeCount = useMemo(() => batches.filter((batch) => batch.isActive).length, [batches]);

  function updateBatch(index: number, updates: Partial<CommercialBatchDraft>) {
    setBatches((current) =>
      current.map((batch, currentIndex) =>
        currentIndex === index
          ? {
              ...batch,
              ...updates
            }
          : batch
      )
    );
  }

  function addBatch() {
    setBatches((current) => [
      ...current,
      {
        name: `Lote ${current.length + 1}`,
        pistaPrice: "",
        vipPrice: "",
        isActive: true,
        sortOrder: current.length
      }
    ]);
  }

  function removeBatch(index: number) {
    setBatches((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((batch, currentIndex) => ({
          ...batch,
          sortOrder: currentIndex
        }));
    });
  }

  function resetToPresetModel() {
    setBatches(createPresetDrafts(hasVip));
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50/80 to-brand-50/40 p-4 shadow-soft sm:p-5">
      <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-800">
                Etapa comercial
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {mode === "create" ? "Nova festa" : "Edicao do evento"}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">Configuracao comercial</p>
            <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
              Defina o modelo de venda antes da operacao comecar
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brand-100 bg-brand-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">1. Tipos ativos</p>
                <p className="mt-1 text-sm text-slate-600">Decida se a festa trabalha com VIP e se existe venda em grupo.</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800">2. Lotes</p>
                <p className="mt-1 text-sm text-slate-600">Ative so os lotes que farão sentido para essa estrategia comercial.</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">3. Precos guia</p>
                <p className="mt-1 text-sm text-slate-600">Use os precos como referencia para sugestao e validacao nas vendas.</p>
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Defina como as vendas desta festa vao operar: lotes ativos, precos de referencia, VIP e vendas em grupo.
          </p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {allowReset ? (
              <button
                type="button"
                onClick={resetToPresetModel}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Usar modelo padrao
              </button>
            ) : null}
            <button
              type="button"
              onClick={addBatch}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200/70 transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Adicionar lote
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-4">
          <fieldset className="rounded-[24px] border border-brand-100 bg-gradient-to-br from-brand-50/90 via-white to-brand-50/40 p-4 shadow-sm">
            <legend className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Tipo de ingresso
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-2xl border border-white/80 bg-white/90 px-4 py-4 text-sm text-slate-600 shadow-sm transition hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-brand-100 has-[:checked]:via-white has-[:checked]:to-brand-50 has-[:checked]:text-brand-900 has-[:checked]:shadow-[0_20px_45px_-28px_rgba(20,184,166,0.7)]">
                <input
                  type="radio"
                  name="hasVip"
                  value="true"
                  checked={hasVip}
                  onChange={() => setHasVip(true)}
                  className="sr-only"
                />
                <span className="block font-semibold">VIP e PISTA</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Mostra os dois tipos no cadastro de venda e permite preco por tipo em cada lote.
                </span>
              </label>
              <label className="cursor-pointer rounded-2xl border border-white/80 bg-white/90 px-4 py-4 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 has-[:checked]:border-slate-900 has-[:checked]:bg-gradient-to-br has-[:checked]:from-slate-100 has-[:checked]:via-white has-[:checked]:to-slate-50 has-[:checked]:text-slate-900">
                <input
                  type="radio"
                  name="hasVip"
                  value="false"
                  checked={!hasVip}
                  onChange={() => setHasVip(false)}
                  className="sr-only"
                />
                <span className="block font-semibold">Somente PISTA</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Esconde VIP no fluxo de vendas e usa PISTA como padrao desta festa.
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/35 p-4 shadow-sm">
            <legend className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Venda em grupo
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-2xl border border-white/80 bg-white/90 px-4 py-4 text-sm text-slate-600 shadow-sm transition hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-brand-100 has-[:checked]:via-white has-[:checked]:to-brand-50 has-[:checked]:text-brand-900 has-[:checked]:shadow-[0_20px_45px_-28px_rgba(20,184,166,0.55)]">
                <input
                  type="radio"
                  name="hasGroupSales"
                  value="true"
                  checked={hasGroupSales}
                  onChange={() => setHasGroupSales(true)}
                  className="sr-only"
                />
                <span className="block font-semibold">Permitir grupo</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Mantem tipo de venda normal/grupo e os alertas de preco abaixo do padrao.
                </span>
              </label>
              <label className="cursor-pointer rounded-2xl border border-white/80 bg-white/90 px-4 py-4 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 has-[:checked]:border-slate-900 has-[:checked]:bg-gradient-to-br has-[:checked]:from-slate-100 has-[:checked]:via-white has-[:checked]:to-slate-50 has-[:checked]:text-slate-900">
                <input
                  type="radio"
                  name="hasGroupSales"
                  value="false"
                  checked={!hasGroupSales}
                  onChange={() => setHasGroupSales(false)}
                  className="sr-only"
                />
                <span className="block font-semibold">Somente venda normal</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Esconde grupo no cadastro e considera todas as vendas como normais.
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50/90 via-white to-brand-50/30 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Lotes e precos</p>
              <p className="mt-1 text-sm text-slate-500">
                {activeCount} lote(s) ativo(s). Os precos aqui servem como referencia e validacao para novas vendas.
              </p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Leitura rapida</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {hasVip ? "VIP + PISTA ativos" : "Somente PISTA"} • {hasGroupSales ? "Grupo ligado" : "Grupo desligado"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {batches.map((batch, index) => (
              <div
                key={batch.id ?? `batch-${index}`}
                className={`rounded-[24px] border p-4 shadow-sm transition ${
                  batch.isActive
                    ? "border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/35"
                    : "border-slate-200 bg-gradient-to-br from-white via-white to-slate-50"
                }`}
              >
                {batch.id ? <input type="hidden" name="batchIds" value={batch.id} /> : <input type="hidden" name="batchIds" value="" />}
                <input type="hidden" name="batchSortOrders" value={String(index)} />
                <input type="hidden" name="batchActiveStates" value={batch.isActive ? "true" : "false"} />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        #{index + 1}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          batch.isActive
                            ? "border border-brand-200 bg-brand-50 text-brand-800"
                            : "border border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                      >
                        {batch.isActive ? "Ativo" : "Inativo"}
                      </span>
                      {mode === "edit" && batch.id ? (
                        <span className="text-xs text-slate-400">Lotes com vendas antigas podem ser desativados sem perder historico.</span>
                      ) : null}
                    </div>
                    <label className="mt-3 grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nome do lote</span>
                      <input
                        name="batchNames"
                        value={batch.name}
                        onChange={(event) => updateBatch(index, { name: event.target.value })}
                        placeholder={`Lote ${index + 1}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
                        required={batch.isActive}
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateBatch(index, { isActive: !batch.isActive })}
                      className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        batch.isActive
                          ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                      }`}
                    >
                      {batch.isActive ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBatch(index)}
                      disabled={batches.length <= 1}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className={`mt-4 grid gap-3 ${hasVip ? "lg:grid-cols-2" : ""}`}>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preco PISTA</span>
                    <input
                      name="batchPistaPrices"
                      type="number"
                      min="0"
                      step="0.01"
                      value={batch.pistaPrice}
                      onChange={(event) => updateBatch(index, { pistaPrice: event.target.value })}
                      placeholder="0,00"
                      className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand-500"
                      required={batch.isActive}
                    />
                  </label>

                  {hasVip ? (
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preco VIP</span>
                      <input
                        name="batchVipPrices"
                        type="number"
                        min="0"
                        step="0.01"
                        value={batch.vipPrice}
                        onChange={(event) => updateBatch(index, { vipPrice: event.target.value })}
                        placeholder="0,00"
                        className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand-500"
                        required={batch.isActive}
                      />
                    </label>
                  ) : (
                    <input type="hidden" name="batchVipPrices" value="" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
