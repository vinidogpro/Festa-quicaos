"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleAlert, Pencil, Plus, Sparkles, Ticket, Trash2 } from "lucide-react";
import { initialSalesActionState } from "@/lib/actions/action-state";
import { createSaleAction, deleteSaleAction, updateSaleAction } from "@/lib/actions/event-management";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventBatch, SALE_TYPE_OPTIONS, SalesRecord, SellerOption, TicketType, ViewerPermissions } from "@/lib/types";
import { formatCurrency, formatSaleTypeLabel, formatTicketTypeLabel } from "@/lib/utils";
import { buildSalesChecklistSummary, getReferenceSalePrice, validateSaleDraft } from "@/lib/sales-validation";

interface SalesControlPanelProps {
  eventId: string;
  sales: SalesRecord[];
  permissions: ViewerPermissions;
  sellerOptions: SellerOption[];
  eventBatches: EventBatch[];
  hasVip: boolean;
  hasGroupSales: boolean;
  compact?: boolean;
}

function TicketTypeBadge({ ticketType }: { ticketType: TicketType }) {
  return (
    <span
      className={`ds-badge ${
        ticketType === "vip"
          ? "ds-badge-vip"
          : "ds-badge-pista"
      }`}
    >
      {formatTicketTypeLabel(ticketType)}
    </span>
  );
}

function SaleTypeBadge({ saleType }: { saleType: SalesRecord["saleType"] }) {
  return (
    <span className="ds-badge ds-badge-neutral">
      {formatSaleTypeLabel(saleType)}
    </span>
  );
}

function TicketTypeSelector({
  name,
  defaultValue = "pista",
  required = false,
  value,
  onChange
}: {
  name: string;
  defaultValue?: TicketType;
  required?: boolean;
  value?: TicketType;
  onChange?: (value: TicketType) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="ds-label text-slate-500">Tipo de ingresso</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50/40 has-[:checked]:border-amber-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-amber-100 has-[:checked]:via-yellow-100 has-[:checked]:to-amber-50 has-[:checked]:text-amber-950 has-[:checked]:shadow-[0_12px_32px_-18px_rgba(217,119,6,0.8)]">
          <input
            type="radio"
            name={name}
            value="vip"
            checked={value ? value === "vip" : undefined}
            defaultChecked={value ? undefined : defaultValue === "vip"}
            required={required}
            className="sr-only"
            onChange={() => onChange?.("vip")}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em]">VIP</p>
              <p className="mt-1 text-sm leading-6 opacity-80">Area premium com identificacao destacada.</p>
            </div>
            <span className="mt-1 h-3.5 w-3.5 rounded-full border border-current/25 bg-white/90 shadow-sm ring-4 ring-white/70" />
          </div>
        </label>

        <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50/40 has-[:checked]:border-rose-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-rose-100 has-[:checked]:via-fuchsia-50 has-[:checked]:to-rose-50 has-[:checked]:text-rose-950 has-[:checked]:shadow-[0_12px_32px_-18px_rgba(190,24,93,0.8)]">
          <input
            type="radio"
            name={name}
            value="pista"
            checked={value ? value === "pista" : undefined}
            defaultChecked={value ? undefined : defaultValue === "pista"}
            required={required}
            className="sr-only"
            onChange={() => onChange?.("pista")}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em]">PISTA</p>
              <p className="mt-1 text-sm leading-6 opacity-80">Ingresso geral da festa.</p>
            </div>
            <span className="mt-1 h-3.5 w-3.5 rounded-full border border-current/25 bg-white/90 shadow-sm ring-4 ring-white/70" />
          </div>
        </label>
      </div>
    </fieldset>
  );
}

function GuestNameFields({
  quantity,
  values = [],
  onChange
}: {
  quantity: number;
  values?: string[];
  onChange?: (index: number, value: string) => void;
}) {
  if (quantity <= 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Lista de entrada</p>
          <p className="mt-1 text-sm text-slate-500">Preencha os nomes ja confirmados para esta venda.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {values.filter(Boolean).length}/{quantity} nomes
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: quantity }).map((_, index) => (
          <input
            key={index}
            name="guestNames"
            value={values[index] ?? ""}
            placeholder={`Nome ${index + 1}`}
            className="ds-input"
            onChange={(event) => onChange?.(index, event.target.value)}
          />
        ))}
      </div>
    </div>
  );
}

function FormAlert({
  tone,
  children,
  actions
}: {
  tone: "warning" | "error";
  children: ReactNode;
  actions?: ReactNode;
}) {
  const palette =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${palette}`}>
      <div className="space-y-3">
        <div>{children}</div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function SalesChecklistCard({
  sales,
  eventBatches,
  hasGroupSales
}: {
  sales: SalesRecord[];
  eventBatches: EventBatch[];
  hasGroupSales: boolean;
}) {
  const summary = useMemo(() => buildSalesChecklistSummary(sales, eventBatches), [eventBatches, sales]);
  const items = [
    {
      label: "Nomes duplicados",
      value: summary.duplicateNamesCount,
      tone: summary.duplicateNamesCount > 0 ? "warning" : "neutral",
      helper: summary.duplicateNamesCount > 0 ? "Revisar nomes possivelmente repetidos" : "Nenhum duplicado detectado"
    },
    {
      label: "Nomes invalidos",
      value: summary.suspiciousNamesCount,
      tone: summary.suspiciousNamesCount > 0 ? "warning" : "neutral",
      helper: summary.suspiciousNamesCount > 0 ? "Existem nomes suspeitos para conferir" : "Nomes parecem consistentes"
    },
    {
      label: "Preco fora do padrao",
      value: summary.outOfStandardPriceCount,
      tone: summary.outOfStandardPriceCount > 0 ? "warning" : "neutral",
      helper: summary.outOfStandardPriceCount > 0 ? "Algumas vendas fogem do valor esperado" : "Precos alinhados com os lotes"
    },
    {
      label: "Possivel grupo",
      value: summary.possibleGroupCount,
      tone: summary.possibleGroupCount > 0 ? "warning" : "neutral",
      helper: summary.possibleGroupCount > 0 ? "Vendas abaixo do padrao ainda marcadas como normal" : "Nenhuma venda suspeita de grupo"
    },
    {
      label: "Inconsistencias",
      value: summary.inconsistentSalesCount,
      tone: summary.inconsistentSalesCount > 0 ? "error" : "neutral",
      helper: summary.inconsistentSalesCount > 0 ? "Quantidade e nomes precisam bater antes da festa" : "Quantidade e nomes estao alinhados"
    },
    {
      label: "Entradas manuais",
      value: "-",
      tone: "neutral",
      helper: "Revise na aba Lista para conferir nomes fora das vendas"
    }
  ] as const;

  return (
    <div className="mb-5 rounded-[28px] border border-slate-200 bg-white/85 p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Checklist pre-festa</p>
          <h3 className="mt-1 font-[var(--font-heading)] text-xl font-bold text-slate-950">
            Validacoes inteligentes da operacao
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Use este bloco para revisar nomes, preco, grupo e consistencia antes de fechar a lista.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.filter((item) => hasGroupSales || item.label !== "Possivel grupo").map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border px-4 py-4 ${
              item.tone === "error"
                ? "border-rose-200 bg-rose-50/70"
                : item.tone === "warning"
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-slate-200 bg-slate-50/80"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
          </div>
        ))}
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

function getSuggestedBatchPrice({
  eventBatches,
  batchId,
  fallbackBatchLabel,
  ticketType,
  hasVip
}: {
  eventBatches: EventBatch[];
  batchId: string;
  fallbackBatchLabel?: string;
  ticketType: TicketType;
  hasVip: boolean;
}) {
  const selectedBatch = eventBatches.find((batch) => batch.id === batchId);

  if (!selectedBatch) {
    return getReferenceSalePrice(eventBatches, fallbackBatchLabel ?? "", hasVip ? ticketType : "pista");
  }

  if (!hasVip) {
    return selectedBatch.pistaPrice ?? getReferenceSalePrice(eventBatches, selectedBatch.name, "pista");
  }

  return ticketType === "vip"
    ? selectedBatch.vipPrice ?? getReferenceSalePrice(eventBatches, selectedBatch.name, "vip")
    : selectedBatch.pistaPrice ?? getReferenceSalePrice(eventBatches, selectedBatch.name, "pista");
}

function InlineAdvisory({
  children,
  actions,
  tone = "warning"
}: {
  children: ReactNode;
  actions?: ReactNode;
  tone?: "warning" | "error";
}) {
  const palette =
    tone === "error"
      ? "border-rose-200/80 bg-rose-50/70 text-rose-800"
      : "border-amber-200/80 bg-amber-50/70 text-amber-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${palette}`}>
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-2">
          <div className="leading-6">{children}</div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SaleQuickForm({
  eventId,
  permissions,
  sellerOptions,
  eventBatches,
  sales,
  hasVip,
  hasGroupSales
}: Pick<
  SalesControlPanelProps,
  "eventId" | "permissions" | "sellerOptions" | "eventBatches" | "sales" | "hasVip" | "hasGroupSales"
>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitNonceRef = useRef(0);
  const handledSuccessNonceRef = useRef(0);
  const [state, action] = useFormState(createSaleAction, initialSalesActionState);
  const activeEventBatches = useMemo(
    () => eventBatches.filter((batch) => batch.isActive),
    [eventBatches]
  );
  const defaultBatchId = activeEventBatches[0]?.id ?? eventBatches[0]?.id ?? "";
  const [quantity, setQuantity] = useState("1");
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [saleType, setSaleType] = useState<SalesRecord["saleType"]>("normal");
  const [ticketType, setTicketType] = useState<TicketType>("pista");
  const [unitPrice, setUnitPrice] = useState(() => {
    const initialSuggestedPrice = getSuggestedBatchPrice({
      eventBatches,
      batchId: defaultBatchId,
      ticketType: "pista",
      hasVip
    });

    return initialSuggestedPrice !== null ? String(initialSuggestedPrice) : "";
  });
  const [guestNames, setGuestNames] = useState<string[]>([""]);
  const [confirmedNormalDiscount, setConfirmedNormalDiscount] = useState(false);
  const [localError, setLocalError] = useState("");

  const batchLabelMap = useMemo(
    () => new Map(eventBatches.map((batch) => [batch.id, batch.name])),
    [eventBatches]
  );
  const batchLabel = batchLabelMap.get(batchId) ?? "";
  const suggestedPrice = useMemo(
    () =>
      getSuggestedBatchPrice({
        eventBatches,
        batchId,
        fallbackBatchLabel: batchLabel,
        ticketType,
        hasVip
      }),
    [batchId, batchLabel, eventBatches, hasVip, ticketType]
  );

  const totalPreview = useMemo(() => {
    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = Number(unitPrice.replace(",", "."));

    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedUnitPrice)) {
      return 0;
    }

    return Math.max(parsedQuantity, 0) * Math.max(parsedUnitPrice, 0);
  }, [quantity, unitPrice]);
  const parsedQuantity = Math.max(Number(quantity) || 0, 0);
  const parsedUnitPrice = Number(unitPrice.replace(",", "."));
  const hasTypedUnitPrice = unitPrice.trim() !== "";
  const existingGuestNames = useMemo(
    () => sales.flatMap((sale) => sale.attendeeNames),
    [sales]
  );
  const validation = useMemo(
    () =>
      validateSaleDraft({
        quantity: parsedQuantity,
        unitPrice: Number.isFinite(parsedUnitPrice) ? parsedUnitPrice : 0,
        batchLabel,
        ticketType: hasVip ? ticketType : "pista",
        saleType,
        guestNames,
        existingGuestNames,
        eventBatches
      }),
    [parsedQuantity, parsedUnitPrice, batchLabel, ticketType, saleType, guestNames, existingGuestNames, eventBatches, hasVip]
  );
  const standardPriceLabel = validation.standardPrice !== null ? formatCurrency(validation.standardPrice) : null;

  useEffect(() => {
    setGuestNames((currentValues) => {
      const nextLength = Math.max(parsedQuantity, 0);

      if (nextLength === currentValues.length) {
        return currentValues;
      }

      if (nextLength < currentValues.length) {
        return currentValues.slice(0, nextLength);
      }

      return [...currentValues, ...Array.from({ length: nextLength - currentValues.length }, () => "")];
    });
  }, [parsedQuantity]);

  useEffect(() => {
    setConfirmedNormalDiscount(false);
  }, [batchId, ticketType, unitPrice]);

  useEffect(() => {
    if (!hasVip) {
      setTicketType("pista");
    }
  }, [hasVip]);

  useEffect(() => {
    if (!hasGroupSales) {
      setSaleType("normal");
    }
  }, [hasGroupSales]);

  useEffect(() => {
    const nextDefaultBatchId = activeEventBatches[0]?.id ?? eventBatches[0]?.id ?? "";

    if (!batchId || !eventBatches.some((batch) => batch.id === batchId)) {
      setBatchId(nextDefaultBatchId);
      const nextSuggestedPrice = getSuggestedBatchPrice({
        eventBatches,
        batchId: nextDefaultBatchId,
        ticketType: hasVip ? ticketType : "pista",
        hasVip
      });
      setUnitPrice(nextSuggestedPrice !== null ? String(nextSuggestedPrice) : "");
    }
  }, [activeEventBatches, batchId, eventBatches, hasVip, ticketType]);

  useEffect(() => {
    if (state.status === "success" && handledSuccessNonceRef.current < submitNonceRef.current) {
      handledSuccessNonceRef.current = submitNonceRef.current;
      formRef.current?.reset();
      setQuantity("1");
      setBatchId(defaultBatchId);
      setSaleType("normal");
      setTicketType("pista");
      const resetSuggestedPrice = getSuggestedBatchPrice({
        eventBatches,
        batchId: defaultBatchId,
        ticketType: "pista",
        hasVip
      });
      setUnitPrice(resetSuggestedPrice !== null ? String(resetSuggestedPrice) : "");
      setGuestNames([""]);
      setConfirmedNormalDiscount(false);
      setLocalError("");
      router.refresh();
    }
  }, [defaultBatchId, eventBatches, hasVip, router, state]);

  function updateGuestName(index: number, value: string) {
    setGuestNames((currentValues) => currentValues.map((name, currentIndex) => (currentIndex === index ? value : name)));
  }

  function applySuggestedUnitPrice(nextBatchId: string, nextTicketType: TicketType) {
    const nextSuggestedPrice = getSuggestedBatchPrice({
      eventBatches,
      batchId: nextBatchId,
      ticketType: hasVip ? nextTicketType : "pista",
      hasVip
    });

    setUnitPrice(nextSuggestedPrice !== null ? String(nextSuggestedPrice) : "");
  }

  function handleBatchChange(nextBatchId: string) {
    setBatchId(nextBatchId);
    applySuggestedUnitPrice(nextBatchId, ticketType);
  }

  function handleTicketTypeChange(nextTicketType: TicketType) {
    setTicketType(nextTicketType);
    applySuggestedUnitPrice(batchId, nextTicketType);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const filledNames = guestNames.map((name) => name.trim()).filter(Boolean);

    setLocalError("");

    if (filledNames.length !== parsedQuantity) {
      event.preventDefault();
      setLocalError("Quantidade de ingressos e nomes preenchidos precisam ser exatamente iguais.");
      return;
    }

    if (hasTypedUnitPrice && hasGroupSales && validation.isBelowStandardPrice && saleType !== "grupo" && !confirmedNormalDiscount) {
      const shouldKeepNormal = window.confirm(
        `Valor abaixo do padrão do ${batchLabel || "lote"}${standardPriceLabel ? ` (${standardPriceLabel})` : ""}. Deseja manter esta venda como normal?`
      );

      if (!shouldKeepNormal) {
        event.preventDefault();
        return;
      }
    }

    const confirmations: string[] = [];

    if (hasTypedUnitPrice && !validation.isBelowStandardPrice && validation.isPriceOutOfStandard && standardPriceLabel) {
      confirmations.push(`Este valor esta diferente do preco padrao deste lote (${standardPriceLabel}). Deseja continuar?`);
    }

    if (hasTypedUnitPrice && hasVip && validation.matchesOppositeTicketTypePrice) {
      confirmations.push("O valor informado parece corresponder ao outro tipo de ingresso. Deseja revisar antes de continuar?");
    }

    if (validation.isLargeSale) {
      confirmations.push(`Voce esta cadastrando ${parsedQuantity} ingressos. Deseja confirmar esta venda grande?`);
    }

    for (const message of confirmations) {
      if (!window.confirm(message)) {
        event.preventDefault();
        return;
      }
    }

    submitNonceRef.current += 1;
  }

  return (
    <div className="mb-5 overflow-hidden rounded-[28px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-slate-50">
      <div className="p-4 sm:p-5 lg:p-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200/60">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Registro rapido
              </p>
              <h3 className="mt-1 font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-950">
                Registrar venda em poucos segundos
              </h3>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Preencha so o essencial. Ao salvar, a venda entra automaticamente como paga e atualiza a lista e o ranking do evento.
          </p>

            <div className="mt-5 grid gap-3 rounded-[24px] border border-brand-100 bg-white/80 p-3 sm:grid-cols-3 sm:p-4">
            <div className="rounded-2xl bg-brand-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">1. Base da venda</p>
              <p className="mt-1 text-sm text-slate-600">Escolha vendedor, quantidade e valor unitario.</p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">2. Classifique</p>
              <p className="mt-1 text-sm text-slate-600">Defina lote e use apenas os tipos comerciais ativos desta festa.</p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">3. Feche rapido</p>
              <p className="mt-1 text-sm text-slate-600">Preencha os nomes, revise o total e adicione a venda.</p>
            </div>
          </div>

          <form ref={formRef} action={action} onSubmit={handleSubmit} className="mt-5 grid gap-5">
            <input type="hidden" name="eventId" value={eventId} />

            {permissions.sellerUserId ? (
              <input type="hidden" name="sellerId" value={permissions.sellerUserId} />
            ) : (
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vendedor</span>
                <select
                  name="sellerId"
                  required
                  defaultValue=""
                  className="ds-select min-h-12 py-4 text-base"
                >
                  <option value="" disabled>
                    Escolher vendedor
                  </option>
                  {sellerOptions.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="ds-label text-slate-500">Qtd.</span>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  required
                  defaultValue="1"
                  onChange={(event) => setQuantity(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-500"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Valor unitario
                </span>
                <input
                  name="unitPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-500"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lote</span>
                <select
                  name="batchId"
                  value={batchId}
                  required
                  onChange={(event) => {
                    handleBatchChange(event.target.value);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-950 outline-none transition focus:border-brand-500"
                >
                  {activeEventBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </label>
              {hasGroupSales ? (
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tipo da venda</span>
                  <select
                    name="saleType"
                    value={saleType}
                    onChange={(event) => setSaleType(event.target.value as SalesRecord["saleType"])}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-950 outline-none transition focus:border-brand-500"
                  >
                    {SALE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatSaleTypeLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="saleType" value="normal" />
              )}
            </div>

            {hasVip ? (
              <TicketTypeSelector
                name="ticketType"
                defaultValue="pista"
                value={ticketType}
                onChange={handleTicketTypeChange}
                required
              />
            ) : (
              <input type="hidden" name="ticketType" value="pista" />
            )}

            {hasTypedUnitPrice && validation.isBelowStandardPrice && standardPriceLabel ? (
              <InlineAdvisory
                actions={
                  hasGroupSales && saleType !== "grupo" ? (
                    <>
                    <button
                      type="button"
                      onClick={() => {
                        setSaleType("grupo");
                        setConfirmedNormalDiscount(false);
                      }}
                      className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Marcar como grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedNormalDiscount(true)}
                      className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                    >
                      Manter como normal
                    </button>
                    </>
                  ) : null
                }
              >
                Valor abaixo do preço padrão deste lote. Verifique se é uma venda em grupo ou desconto autorizado.
              </InlineAdvisory>
            ) : hasTypedUnitPrice && !validation.isBelowStandardPrice && validation.isPriceOutOfStandard && standardPriceLabel ? (
              <InlineAdvisory>
                Valor diferente do preço padrão deste lote ({standardPriceLabel})
                {hasVip && validation.matchesOppositeTicketTypePrice
                  ? ". Ele também corresponde ao outro tipo de ingresso selecionado."
                  : "."}
                {suggestedPrice !== null ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setUnitPrice(String(suggestedPrice))}
                      className="ml-1 inline-flex font-semibold text-amber-900 underline decoration-amber-300 underline-offset-2"
                    >
                      Usar preço padrão
                    </button>
                  </>
                ) : null}
              </InlineAdvisory>
            ) : hasTypedUnitPrice && hasVip && validation.matchesOppositeTicketTypePrice ? (
              <InlineAdvisory>
                O valor informado corresponde ao outro tipo de ingresso selecionado. Revise VIP/PISTA antes de salvar.
              </InlineAdvisory>
            ) : null}

            <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr] 2xl:items-start">
              <div className="grid gap-3">
                <GuestNameFields quantity={parsedQuantity} values={guestNames} onChange={updateGuestName} />
                {localError ? <FormAlert tone="error">{localError}</FormAlert> : null}
                {validation.hasQuantityMismatch ? (
                  <FormAlert tone="error">
                    Quantidade de ingressos e nomes preenchidos precisam bater exatamente para salvar a venda.
                  </FormAlert>
                ) : null}
                {validation.duplicateNamesInSale.length > 0 ? (
                  <InlineAdvisory>
                    Existem nomes repetidos nesta venda. Deseja revisar? {validation.duplicateNamesInSale.join(", ")}.
                  </InlineAdvisory>
                ) : null}
                {validation.duplicateNamesInEvent.length > 0 ? (
                  <InlineAdvisory>
                    Este nome ja esta na lista. Confirme antes de continuar: {validation.duplicateNamesInEvent.join(", ")}.
                  </InlineAdvisory>
                ) : null}
                {validation.suspiciousNames.length > 0 ? (
                  <InlineAdvisory>
                    Alguns nomes parecem invalidos ou genericos: {validation.suspiciousNames.join(", ")}.
                  </InlineAdvisory>
                ) : null}
                {validation.isLargeSale ? (
                  <InlineAdvisory>
                    Voce esta cadastrando {parsedQuantity} ingressos. Confirme com atencao antes de salvar.
                  </InlineAdvisory>
                ) : null}
              </div>

              <details className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                  Opcoes avancadas
                </summary>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Data</span>
                    <input
                      name="soldAt"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Observacoes
                    </span>
                    <input
                      name="notes"
                      placeholder="Opcional"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
                    />
                  </label>
                </div>
              </details>
            </div>

            <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Total desta venda</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(totalPreview)}</p>
              </div>

              <SubmitButton
                pendingLabel="Registrando..."
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-200/60 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                Adicionar venda
              </SubmitButton>
            </div>

            <ActionFeedback status={state.status} message={state.message} />
          </form>
        </div>
      </div>
    </div>
  );
}

function SaleDeleteForm({ eventId, saleId }: { eventId: string; saleId: string }) {
  const router = useRouter();
  const [state, action] = useFormState(deleteSaleAction, initialSalesActionState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Tem certeza que deseja excluir esta venda? Essa acao atualiza ranking, financeiro e insights.")) {
          event.preventDefault();
        }
      }}
      className="grid gap-3"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="saleId" value={saleId} />
      <SubmitButton
        pendingLabel="Excluindo..."
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </SubmitButton>
      <ActionFeedback status={state.status} message={state.message} />
    </form>
  );
}

export function SaleEditForm({
  eventId,
  row,
  permissions,
  sellerOptions,
  eventBatches,
  existingSales = [],
  hasVip,
  hasGroupSales
}: {
  eventId: string;
  row: SalesRecord;
  permissions: ViewerPermissions;
  sellerOptions: SellerOption[];
  eventBatches: EventBatch[];
  existingSales?: SalesRecord[];
  hasVip: boolean;
  hasGroupSales: boolean;
}) {
  const router = useRouter();
  const [state, action] = useFormState(updateSaleAction, initialSalesActionState);
  const [quantity, setQuantity] = useState(String(row.sold));
  const [unitPrice, setUnitPrice] = useState(String(row.unitPrice));
  const [batchId, setBatchId] = useState(row.batchId);
  const [saleType, setSaleType] = useState<SalesRecord["saleType"]>(row.saleType);
  const [ticketType, setTicketType] = useState<TicketType>(row.ticketType);
  const [guestNames, setGuestNames] = useState<string[]>(row.attendeeNames);
  const [confirmedNormalDiscount, setConfirmedNormalDiscount] = useState(false);
  const [localError, setLocalError] = useState("");
  const batchLabelMap = useMemo(
    () => new Map(eventBatches.map((batch) => [batch.id, batch.name])),
    [eventBatches]
  );
  const selectableBatches = useMemo(
    () => eventBatches.filter((batch) => batch.isActive || batch.id === row.batchId),
    [eventBatches, row.batchId]
  );
  const batchLabel = batchLabelMap.get(batchId) ?? row.batchLabel;
  const suggestedPrice = useMemo(
    () =>
      getSuggestedBatchPrice({
        eventBatches,
        batchId,
        fallbackBatchLabel: batchLabel,
        ticketType,
        hasVip
      }),
    [batchId, batchLabel, eventBatches, hasVip, ticketType]
  );
  const parsedQuantity = Math.max(Number(quantity) || 0, 0);
  const parsedUnitPrice = Number(unitPrice.replace(",", "."));
  const hasTypedUnitPrice = unitPrice.trim() !== "";
  const existingGuestNames = useMemo(
    () =>
      existingSales
        .filter((sale) => sale.id !== row.id)
        .flatMap((sale) => sale.attendeeNames),
    [existingSales, row.id]
  );
  const validation = useMemo(
    () =>
      validateSaleDraft({
        quantity: parsedQuantity,
        unitPrice: Number.isFinite(parsedUnitPrice) ? parsedUnitPrice : 0,
        batchLabel,
        ticketType: hasVip ? ticketType : "pista",
        saleType,
        guestNames,
        existingGuestNames,
        eventBatches
      }),
    [parsedQuantity, parsedUnitPrice, batchLabel, ticketType, saleType, guestNames, existingGuestNames, eventBatches, hasVip]
  );
  const standardPriceLabel = validation.standardPrice !== null ? formatCurrency(validation.standardPrice) : null;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  useEffect(() => {
    setGuestNames((currentValues) => {
      const nextLength = Math.max(parsedQuantity, 0);

      if (nextLength === currentValues.length) {
        return currentValues;
      }

      if (nextLength < currentValues.length) {
        return currentValues.slice(0, nextLength);
      }

      return [...currentValues, ...Array.from({ length: nextLength - currentValues.length }, () => "")];
    });
  }, [parsedQuantity]);

  useEffect(() => {
    setConfirmedNormalDiscount(false);
  }, [batchId, ticketType, unitPrice]);

  useEffect(() => {
    if (!hasVip) {
      setTicketType("pista");
    }
  }, [hasVip]);

  useEffect(() => {
    if (!hasGroupSales) {
      setSaleType("normal");
    }
  }, [hasGroupSales]);

  function updateGuestName(index: number, value: string) {
    setGuestNames((currentValues) => currentValues.map((name, currentIndex) => (currentIndex === index ? value : name)));
  }

  function applySuggestedUnitPrice(nextBatchId: string, nextTicketType: TicketType) {
    const nextSuggestedPrice = getSuggestedBatchPrice({
      eventBatches,
      batchId: nextBatchId,
      fallbackBatchLabel: batchLabelMap.get(nextBatchId) ?? row.batchLabel,
      ticketType: hasVip ? nextTicketType : "pista",
      hasVip
    });

    setUnitPrice(nextSuggestedPrice !== null ? String(nextSuggestedPrice) : "");
  }

  function handleBatchChange(nextBatchId: string) {
    setBatchId(nextBatchId);
    applySuggestedUnitPrice(nextBatchId, ticketType);
  }

  function handleTicketTypeChange(nextTicketType: TicketType) {
    setTicketType(nextTicketType);
    applySuggestedUnitPrice(batchId, nextTicketType);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const filledNames = guestNames.map((name) => name.trim()).filter(Boolean);

    setLocalError("");

    if (filledNames.length !== parsedQuantity) {
      event.preventDefault();
      setLocalError("Quantidade e nomes precisam permanecer alinhados para salvar a venda.");
      return;
    }

    if (hasTypedUnitPrice && hasGroupSales && validation.isBelowStandardPrice && saleType !== "grupo" && !confirmedNormalDiscount) {
      const shouldKeepNormal = window.confirm(
        `Valor abaixo do padrão do ${batchLabel || "lote"}${standardPriceLabel ? ` (${standardPriceLabel})` : ""}. Deseja manter esta venda como normal?`
      );

      if (!shouldKeepNormal) {
        event.preventDefault();
        return;
      }
    }

    const criticalChanges =
      unitPrice !== String(row.unitPrice) || batchId !== row.batchId || ticketType !== row.ticketType;

    if (criticalChanges) {
      const confirmed = window.confirm(
        "Essa alteracao impactara o financeiro, ranking e relatorios. Deseja continuar?"
      );

      if (!confirmed) {
        event.preventDefault();
        return;
      }
    }

    if (hasTypedUnitPrice && !validation.isBelowStandardPrice && validation.isPriceOutOfStandard && standardPriceLabel) {
      const confirmed = window.confirm(
        `Este valor esta diferente do preco padrao deste lote (${standardPriceLabel}). Deseja continuar?`
      );

      if (!confirmed) {
        event.preventDefault();
        return;
      }
    }

    if (hasTypedUnitPrice && validation.matchesOppositeTicketTypePrice) {
      const confirmed = window.confirm(
        "O valor informado parece corresponder ao outro tipo de ingresso. Deseja continuar mesmo assim?"
      );

      if (!confirmed) {
        event.preventDefault();
      }
    }
  }

  return (
    <details data-sale-edit className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <Pencil className="h-4 w-4" />
        Editar venda
      </summary>
      <form action={action} onSubmit={handleSubmit} className="mt-3 grid gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="saleId" value={row.id} />
        {permissions.canManageOwnSalesOnly ? (
          <input type="hidden" name="sellerId" value={row.sellerUserId} />
        ) : (
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vendedor</span>
            <select
              name="sellerId"
              defaultValue={row.sellerUserId}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            >
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Qtd.</span>
            <input
              name="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Valor unitario</span>
            <input
              name="unitPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lote</span>
            <select
              name="batchId"
              value={batchId}
              required
              onChange={(event) => {
                handleBatchChange(event.target.value);
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand-500"
            >
              {selectableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </label>
          {hasGroupSales ? (
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tipo da venda</span>
              <select
                name="saleType"
                value={saleType}
                onChange={(event) => setSaleType(event.target.value as SalesRecord["saleType"])}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand-500"
              >
                {SALE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatSaleTypeLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="saleType" value="normal" />
          )}
        </div>

        {hasVip ? (
          <TicketTypeSelector
            name="ticketType"
            defaultValue={row.ticketType}
            value={ticketType}
            onChange={handleTicketTypeChange}
            required
          />
        ) : (
          <input type="hidden" name="ticketType" value="pista" />
        )}

        {hasTypedUnitPrice && validation.isBelowStandardPrice && standardPriceLabel ? (
          <InlineAdvisory
            actions={
              hasGroupSales && saleType !== "grupo" ? (
                <>
                <button
                  type="button"
                  onClick={() => {
                    setSaleType("grupo");
                    setConfirmedNormalDiscount(false);
                  }}
                  className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Marcar como grupo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmedNormalDiscount(true)}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                >
                  Manter como normal
                </button>
                </>
              ) : null
            }
          >
            Valor abaixo do preço padrão deste lote. Verifique se é uma venda em grupo ou desconto autorizado.
          </InlineAdvisory>
        ) : hasTypedUnitPrice && !validation.isBelowStandardPrice && validation.isPriceOutOfStandard && standardPriceLabel ? (
          <InlineAdvisory>
            Valor diferente do preço padrão deste lote ({standardPriceLabel})
            {hasVip && validation.matchesOppositeTicketTypePrice
              ? ". Ele também corresponde ao outro tipo de ingresso selecionado."
              : "."}
            {suggestedPrice !== null ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setUnitPrice(String(suggestedPrice))}
                  className="ml-1 inline-flex font-semibold text-amber-900 underline decoration-amber-300 underline-offset-2"
                >
                  Usar preço padrão
                </button>
              </>
            ) : null}
          </InlineAdvisory>
        ) : hasTypedUnitPrice && hasVip && validation.matchesOppositeTicketTypePrice ? (
          <InlineAdvisory>
            O valor informado corresponde ao outro tipo de ingresso selecionado. Revise VIP/PISTA antes de salvar.
          </InlineAdvisory>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Data</span>
            <input
              name="soldAt"
              type="date"
              defaultValue={row.soldAt}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Observacoes</span>
            <input
              name="notes"
              defaultValue={row.notes ?? ""}
              placeholder="Opcional"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
        </div>

        <GuestNameFields quantity={parsedQuantity} values={guestNames} onChange={updateGuestName} />
        {localError ? <FormAlert tone="error">{localError}</FormAlert> : null}
        {validation.hasQuantityMismatch ? (
          <FormAlert tone="error">
            Quantidade de ingressos e nomes preenchidos precisam bater exatamente.
          </FormAlert>
        ) : null}
        {validation.duplicateNamesInSale.length > 0 ? (
          <InlineAdvisory>
            Existem nomes repetidos nesta venda. Deseja revisar? {validation.duplicateNamesInSale.join(", ")}.
          </InlineAdvisory>
        ) : null}
        {validation.duplicateNamesInEvent.length > 0 ? (
          <InlineAdvisory>
            Este nome ja esta na lista. Confirme antes de continuar: {validation.duplicateNamesInEvent.join(", ")}.
          </InlineAdvisory>
        ) : null}
        {validation.suspiciousNames.length > 0 ? (
          <InlineAdvisory>
            Alguns nomes parecem invalidos ou genericos: {validation.suspiciousNames.join(", ")}.
          </InlineAdvisory>
        ) : null}
        <SubmitButton
          pendingLabel="Salvando..."
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salvar venda
        </SubmitButton>
        <ActionFeedback status={state.status} message={state.message} />
      </form>
    </details>
  );
}

export function SalesControlPanel({
  eventId,
  sales,
  permissions,
  sellerOptions,
  eventBatches,
  hasVip,
  hasGroupSales,
  compact = false
}: SalesControlPanelProps) {
  const visibleSales = sales.slice(0, compact ? 4 : sales.length);

  return (
    <SectionCard
      title="Controle de vendas"
      description="Registre vendas com rapidez e mantenha o comercial atualizado em tempo real."
    >
      {!compact ? <SalesChecklistCard sales={sales} eventBatches={eventBatches} hasGroupSales={hasGroupSales} /> : null}

      {permissions.canManageSales && !compact ? (
        <SaleQuickForm
          eventId={eventId}
          permissions={permissions}
          sellerOptions={sellerOptions}
          eventBatches={eventBatches}
          hasVip={hasVip}
          hasGroupSales={hasGroupSales}
          sales={sales}
        />
      ) : null}

      {visibleSales.length === 0 ? (
        <EmptyState
          title="Sem vendas registradas"
          description="As novas vendas cadastradas pela equipe aparecerao aqui com impacto no ranking e atualizacao automatica."
          icon={Plus}
        />
      ) : (
        <div className="space-y-4">
          {visibleSales.map((row) => {
            const canEdit = permissions.canManageSales && (row.isOwnedByViewer || !permissions.canManageOwnSalesOnly);

            return (
              <div key={row.id} data-sale-card className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`flex flex-col gap-4 ${compact ? "" : "lg:flex-row lg:items-start lg:justify-between"}`}>
                  <div className="flex-1 space-y-4">
                    <div className={`${compact ? "grid gap-3" : "flex flex-wrap items-start justify-between gap-3"}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Venda #{row.saleNumber}
                          </p>
                          <TicketTypeBadge ticketType={row.ticketType} />
                          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800">
                            {row.batchLabel}
                          </span>
                          <SaleTypeBadge saleType={row.saleType} />
                        </div>
                        <p className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-950">
                          {row.seller}
                        </p>
                      </div>
                      <div className={compact ? "rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left" : "text-right"}>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {compact ? "Venda registrada" : "Total"}
                        </p>
                        <p className={`mt-2 font-[var(--font-heading)] font-bold text-slate-950 ${compact ? "text-3xl leading-none" : "text-2xl"}`}>
                          {formatCurrency(row.amount)}
                        </p>
                        {compact ? (
                          <p className="mt-2 text-sm text-slate-500">
                            {row.sold} ingresso{row.sold > 1 ? "s" : ""} em {row.soldAt}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className={`grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 2xl:grid-cols-5"}`}>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quantidade</p>
                        <p className="mt-1 font-semibold text-slate-900">{row.sold} ingressos</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Valor unitario</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(row.unitPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Data</p>
                        <p className="mt-1 font-semibold text-slate-900">{row.soldAt}</p>
                      </div>
                      <div className={compact ? "hidden" : ""}>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tipo</p>
                        <div className="mt-1">
                          <TicketTypeBadge ticketType={row.ticketType} />
                        </div>
                      </div>
                      <div className={compact ? "hidden" : ""}>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Classificacao</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {row.batchLabel} • {formatSaleTypeLabel(row.saleType).toLowerCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <details className="group w-full sm:w-auto">
                        <summary
                          className={`flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] sm:w-auto sm:justify-start sm:rounded-full sm:py-1 ${
                            row.missingAttendeeCount > 0
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : "bg-white text-slate-500"
                          }`}
                        >
                          {row.attendeeCount} nomes cadastrados
                          {row.missingAttendeeCount > 0 ? ` | faltam ${row.missingAttendeeCount}` : ""}
                          <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                        </summary>
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          {row.attendeeCount === 0 ? (
                            <p className="text-sm text-slate-500">Nenhum nome preenchido ainda.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {row.attendeeNames.map((name) => (
                                <span key={name} className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-700">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  {canEdit && !compact ? (
                    <div className="flex w-full flex-col gap-3 lg:w-[26rem]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            const details = (event.currentTarget.closest("[data-sale-card]") as HTMLElement | null)
                              ?.querySelector("[data-sale-edit]") as HTMLDetailsElement | null;
                            if (details) {
                              details.open = !details.open;
                            }
                          }}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <SaleDeleteForm eventId={eventId} saleId={row.id} />
                      </div>
                      <SaleEditForm
                        eventId={eventId}
                        row={row}
                        permissions={permissions}
                        sellerOptions={sellerOptions}
                        eventBatches={eventBatches}
                        existingSales={sales}
                        hasVip={hasVip}
                        hasGroupSales={hasGroupSales}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!compact && permissions.canManageOwnSalesOnly ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Como vendedor, voce pode registrar, editar e excluir apenas os seus proprios lancamentos.
        </div>
      ) : null}
    </SectionCard>
  );
}
