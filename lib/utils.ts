import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EventStatus, SaleType, TicketType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatCurrencyParts(value: number) {
  const absoluteFormatted = formatCurrency(Math.abs(value));
  const [currencyLabel, amountLabel] = absoluteFormatted.split(/\s(.+)/);
  const normalizedAmountLabel = amountLabel ?? absoluteFormatted;

  return {
    isNegative: value < 0,
    currencyLabel: currencyLabel ?? "R$",
    amountLabel: value < 0 ? `-${normalizedAmountLabel}` : normalizedAmountLabel
  };
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function getEventStatusLabel(status: EventStatus) {
  return {
    current: "Festa atual",
    upcoming: "Proxima festa",
    past: "Festa passada"
  }[status];
}

export function formatTicketTypeLabel(ticketType: TicketType) {
  return ticketType === "vip" ? "VIP" : "PISTA";
}

export function formatSaleTypeLabel(saleType: SaleType) {
  return saleType === "grupo" ? "Grupo" : "Normal";
}

function normalizeLooseText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/a[º°]/g, "o")
    .replace(/[º°]/g, "o")
    .replace(/\s+/g, " ");
}

function titleCaseLabel(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNormalizedBatchNumber(normalized: string) {
  const patterns = [
    /(?:^|\s)0*(\d+)\s*(?:o)?\s*lote(?:\s|$)/,
    /lote\s*0*(\d+)(?:\s*(?:o))?(?:\s|$)/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return null;
}

export function getNormalizedBatchKey(batchLabel?: string | null) {
  const normalized = normalizeLooseText(batchLabel ?? "");

  if (!normalized) {
    return "sem-lote";
  }

  if (normalized.includes("comissao")) {
    return "comissao";
  }

  if (normalized.includes("promocional")) {
    return "lote-promocional";
  }

  if (normalized.includes("santo lote") || normalized.includes("lote santo")) {
    return "santo-lote";
  }

  const batchNumber = getNormalizedBatchNumber(normalized);

  if (batchNumber !== null) {
    return `lote-${batchNumber}`;
  }

  return normalized.replace(/\s+/g, "-");
}

export function formatBatchLabel(batchLabel?: string | null) {
  const normalized = normalizeLooseText(batchLabel ?? "");
  const key = getNormalizedBatchKey(batchLabel);

  if (key === "sem-lote") {
    return "Sem lote";
  }

  if (key === "comissao") {
    return "Comissão";
  }

  if (key === "lote-promocional") {
    return "Lote promocional";
  }

  if (key === "santo-lote") {
    return "Santo lote";
  }

  if (key.startsWith("lote-")) {
    const batchNumber = key.replace("lote-", "");
    return `${batchNumber}º lote`;
  }

  return titleCaseLabel(normalized);
}
