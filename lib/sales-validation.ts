import type { EventBatch, SalesRecord, TicketType, SaleType } from "./types";
import { getNormalizedBatchKey } from "./utils";

const GENERIC_INVALID_NAMES = new Set([".", "ok", "teste"]);

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeBatchLabel(value: string) {
  const normalized = getNormalizedBatchKey(value);

  if (normalized === "lote-promocional") {
    return "promo";
  }

  if (normalized === "lote-1" || normalized === "lote-2" || normalized === "lote-3" || normalized === "lote-4") {
    return normalized;
  }

  return normalized;
}

const STANDARD_PRICE_MATRIX: Record<string, Partial<Record<TicketType, number>>> = {
  promo: { pista: 35 },
  "lote-1": { pista: 45, vip: 65 },
  "lote-2": { pista: 50, vip: 70 },
  "lote-3": { pista: 55, vip: 75 },
  "lote-4": { pista: 60, vip: 80 }
};

export function getStandardSalePrice(batchLabel: string, ticketType: TicketType) {
  const normalizedBatch = normalizeBatchLabel(batchLabel);
  return STANDARD_PRICE_MATRIX[normalizedBatch]?.[ticketType] ?? null;
}

export function getConfiguredBatchPrice(
  eventBatches: EventBatch[] | undefined,
  batchLabel: string,
  ticketType: TicketType
) {
  if (!eventBatches || eventBatches.length === 0) {
    return null;
  }

  const normalizedLabel = normalizeBatchLabel(batchLabel);
  const matchedBatch = eventBatches.find((batch) => normalizeBatchLabel(batch.name) === normalizedLabel);

  if (!matchedBatch) {
    return null;
  }

  if (ticketType === "vip") {
    return matchedBatch.vipPrice ?? null;
  }

  return matchedBatch.pistaPrice ?? null;
}

export function getReferenceSalePrice(
  eventBatches: EventBatch[] | undefined,
  batchLabel: string,
  ticketType: TicketType
) {
  return getConfiguredBatchPrice(eventBatches, batchLabel, ticketType) ?? getStandardSalePrice(batchLabel, ticketType);
}

export function getOppositeTicketType(ticketType: TicketType): TicketType {
  return ticketType === "vip" ? "pista" : "vip";
}

export function normalizeGuestName(value: string) {
  return normalizeText(value);
}

export function isSuspiciousGuestName(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return false;
  }

  return normalized.length < 3 || GENERIC_INVALID_NAMES.has(normalized);
}

export interface SaleValidationDraft {
  quantity: number;
  unitPrice: number;
  batchLabel: string;
  ticketType: TicketType;
  saleType: SaleType;
  guestNames: string[];
  existingGuestNames: string[];
  eventBatches?: EventBatch[];
}

export interface SaleValidationResult {
  standardPrice: number | null;
  isPriceOutOfStandard: boolean;
  isBelowStandardPrice: boolean;
  matchesOppositeTicketTypePrice: boolean;
  duplicateNamesInSale: string[];
  duplicateNamesInEvent: string[];
  suspiciousNames: string[];
  hasQuantityMismatch: boolean;
  isLargeSale: boolean;
}

export function validateSaleDraft({
  quantity,
  unitPrice,
  batchLabel,
  ticketType,
  guestNames,
  existingGuestNames,
  eventBatches
}: SaleValidationDraft): SaleValidationResult {
  const trimmedNames = guestNames.map((name) => name.trim()).filter(Boolean);
  const standardPrice = getReferenceSalePrice(eventBatches, batchLabel, ticketType);
  const oppositeStandardPrice = getReferenceSalePrice(eventBatches, batchLabel, getOppositeTicketType(ticketType));
  const normalizedNames = trimmedNames.map(normalizeGuestName);
  const duplicateNamesInSale = Array.from(
    new Set(
      trimmedNames.filter((name, index) => {
        const normalized = normalizedNames[index];
        return normalized && normalizedNames.indexOf(normalized) !== index;
      })
    )
  );
  const existingNameSet = new Set(existingGuestNames.map(normalizeGuestName));
  const duplicateNamesInEvent = Array.from(
    new Set(trimmedNames.filter((name) => existingNameSet.has(normalizeGuestName(name))))
  );
  const suspiciousNames = Array.from(new Set(trimmedNames.filter(isSuspiciousGuestName)));

  return {
    standardPrice,
    isPriceOutOfStandard: standardPrice !== null ? unitPrice !== standardPrice : false,
    isBelowStandardPrice: standardPrice !== null ? unitPrice < standardPrice : false,
    matchesOppositeTicketTypePrice: oppositeStandardPrice !== null ? unitPrice === oppositeStandardPrice : false,
    duplicateNamesInSale,
    duplicateNamesInEvent,
    suspiciousNames,
    hasQuantityMismatch: trimmedNames.length !== quantity,
    isLargeSale: quantity > 5
  };
}

export interface SalesChecklistSummary {
  duplicateNamesCount: number;
  suspiciousNamesCount: number;
  outOfStandardPriceCount: number;
  possibleGroupCount: number;
  inconsistentSalesCount: number;
}

export function buildSalesChecklistSummary(sales: SalesRecord[], eventBatches?: EventBatch[]): SalesChecklistSummary {
  const allNames = sales.flatMap((sale) => sale.attendeeNames);
  const normalizedCounts = new Map<string, number>();

  for (const name of allNames) {
    const normalized = normalizeGuestName(name);

    if (!normalized) {
      continue;
    }

    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) ?? 0) + 1);
  }

  const duplicateNamesCount = Array.from(normalizedCounts.values()).filter((count) => count > 1).length;
  const suspiciousNamesCount = allNames.filter(isSuspiciousGuestName).length;
  const outOfStandardPriceCount = sales.filter((sale) => {
    const standardPrice = getReferenceSalePrice(eventBatches, sale.batchLabel, sale.ticketType);
    return standardPrice !== null && sale.unitPrice !== standardPrice;
  }).length;
  const possibleGroupCount = sales.filter((sale) => {
    const standardPrice = getReferenceSalePrice(eventBatches, sale.batchLabel, sale.ticketType);
    return standardPrice !== null && sale.unitPrice < standardPrice && sale.saleType !== "grupo";
  }).length;
  const inconsistentSalesCount = sales.filter(
    (sale) => sale.attendeeCount !== sale.sold || sale.missingAttendeeCount > 0
  ).length;

  return {
    duplicateNamesCount,
    suspiciousNamesCount,
    outOfStandardPriceCount,
    possibleGroupCount,
    inconsistentSalesCount
  };
}
