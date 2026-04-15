import type { GuestListEntry } from "./types.ts";

export interface GuestListSaleLike {
  id: string;
  seller_user_id: string;
  unit_price: number;
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
  profilesMap,
  viewerId,
  canManageOwnSalesOnly,
  canViewManualGuests
}: {
  saleAttendeeRows: GuestListAttendeeLike[];
  salesRows: GuestListSaleLike[];
  manualGuestEntryRows: ManualGuestEntryLike[];
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
  salesRows
}: {
  eventName: string;
  attendees: GuestListAttendeeLike[];
  manualEntries: ManualGuestEntryLike[];
  profileMap: Map<string, GuestListExportProfileLike>;
  salesRows: Array<Pick<GuestListSaleLike, "id" | "unit_price" | "created_at">>;
}) {
  const saleSequenceMap = buildSaleSequenceMap(salesRows);
  const salesById = new Map(salesRows.map((sale) => [sale.id, sale]));

  return [
    ["Lista de entrada", eventName],
    [""],
    ["Nome", "Origem", "Venda", "Valor por ingresso", "Check-in", "Observacao"],
    ...attendees.map((entry) => [
      entry.guest_name,
      profileMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
      `Venda #${saleSequenceMap.get(entry.sale_id) ?? 0}`,
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        salesById.get(entry.sale_id)?.unit_price ?? 0
      ),
      entry.checked_in_at ? "Sim" : "Nao",
      ""
    ]),
    ...manualEntries.map((entry) => [
      entry.guest_name,
      "Entrada manual",
      "",
      "",
      "",
      entry.notes ?? ""
    ])
  ];
}
