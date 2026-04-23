import type { GuestListEntry, SaleBatchLabel, SaleType, TicketType } from "./types.ts";

export interface GuestListSaleLike {
  id: string;
  seller_user_id: string;
  batch_id: string;
  sale_type: SaleType;
  unit_price: number;
  ticket_type: TicketType;
  created_at: string;
}

export interface GuestListAttendeeLike {
  id: string;
  sale_id: string;
  seller_user_id: string;
  guest_name: string;
  checked_in_at?: string | null;
  created_at: string;
}

export interface ManualGuestEntryLike {
  id: string;
  guest_name: string;
  notes?: string | null;
  created_at: string;
}

export interface GuestListExportProfileLike {
  id: string;
  full_name: string;
}

function formatGuestTicketType(ticketType: TicketType) {
  return ticketType === "vip" ? "VIP" : "PISTA";
}

function resolveBatchLabel(batchId: string | null | undefined, batchNameMap: Map<string, string>): SaleBatchLabel {
  if (!batchId) {
    return "Sem lote";
  }

  return batchNameMap.get(batchId) ?? "Sem lote";
}

export function buildSaleSequenceMap(salesRows: Array<Pick<GuestListSaleLike, "id" | "created_at">>) {
  return new Map(
    [...salesRows]
      .sort((left, right) => {
        const createdDiff = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

        if (createdDiff !== 0) {
          return createdDiff;
        }

        return left.id.localeCompare(right.id);
      })
      .map((sale, index) => [sale.id, index + 1] as const)
  );
}

export function buildGuestListEntries({
  saleAttendeeRows,
  salesRows,
  manualGuestEntryRows,
  batchNameMap,
  profilesMap,
  viewerId,
  canManageOwnSalesOnly,
  canViewManualGuests
}: {
  saleAttendeeRows: GuestListAttendeeLike[];
  salesRows: GuestListSaleLike[];
  manualGuestEntryRows: ManualGuestEntryLike[];
  batchNameMap: Map<string, string>;
  profilesMap: Map<string, { full_name?: string | null }>;
  viewerId: string;
  canManageOwnSalesOnly: boolean;
  canViewManualGuests: boolean;
}): GuestListEntry[] {
  const saleSequenceMap = buildSaleSequenceMap(salesRows);
  const salesById = new Map(salesRows.map((sale) => [sale.id, sale]));

  const saleGuestEntries: GuestListEntry[] = saleAttendeeRows
    .filter((entry) => !canManageOwnSalesOnly || entry.seller_user_id === viewerId)
    .map((entry) => {
      const sale = salesById.get(entry.sale_id);

      return {
        id: entry.id,
        saleId: entry.sale_id,
        saleNumber: saleSequenceMap.get(entry.sale_id) ?? 0,
        sellerUserId: entry.seller_user_id,
        sellerName: profilesMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
        guestName: entry.guest_name,
        batchLabel: resolveBatchLabel(sale?.batch_id, batchNameMap),
        saleType: sale?.sale_type ?? "normal",
        ticketType: sale?.ticket_type ?? "pista",
        unitPrice: sale?.unit_price ?? 0,
        checkedInAt: entry.checked_in_at ?? undefined,
        createdAt: entry.created_at,
        isOwnedByViewer: entry.seller_user_id === viewerId,
        sourceType: "sale"
      };
    });

  const manualGuestListEntries: GuestListEntry[] = canViewManualGuests
    ? manualGuestEntryRows.map((entry) => ({
        id: entry.id,
        sellerName: "Entrada manual",
        guestName: entry.guest_name,
        createdAt: entry.created_at,
        isOwnedByViewer: false,
        notes: entry.notes ?? undefined,
        sourceType: "manual"
      }))
    : [];

  return [...saleGuestEntries, ...manualGuestListEntries].sort((left, right) =>
    left.guestName.localeCompare(right.guestName)
  );
}

export function buildGuestListExportRows({
  eventName,
  attendees,
  manualEntries,
  profileMap,
  salesRows,
  batchNameMap
}: {
  eventName: string;
  attendees: GuestListAttendeeLike[];
  manualEntries: ManualGuestEntryLike[];
  profileMap: Map<string, GuestListExportProfileLike>;
  salesRows: Array<Pick<GuestListSaleLike, "id" | "batch_id" | "sale_type" | "unit_price" | "ticket_type" | "created_at">>;
  batchNameMap: Map<string, string>;
}) {
  const saleSequenceMap = buildSaleSequenceMap(salesRows);
  const salesById = new Map(salesRows.map((sale) => [sale.id, sale]));

  return [
    ["Lista de entrada", eventName],
    [""],
    ["Nome", "Origem", "Tipo ingresso", "Lote", "Tipo da venda", "Venda", "Valor por ingresso", "Check-in", "Observacao"],
    ...attendees.map((entry) => {
      const sale = salesById.get(entry.sale_id);

      return [
        entry.guest_name,
        profileMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
        formatGuestTicketType(sale?.ticket_type ?? "pista"),
        resolveBatchLabel(sale?.batch_id, batchNameMap),
        sale?.sale_type === "grupo" ? "Grupo" : "Normal",
        `Venda #${saleSequenceMap.get(entry.sale_id) ?? 0}`,
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sale?.unit_price ?? 0),
        entry.checked_in_at ? "Sim" : "Nao",
        ""
      ];
    }),
    ...manualEntries.map((entry) => [
      entry.guest_name,
      "Entrada manual",
      "MANUAL",
      "",
      "",
      "",
      "",
      "",
      entry.notes ?? ""
    ])
  ];
}
