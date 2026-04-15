import test from "node:test";
import assert from "node:assert/strict";
import { buildGuestListEntries, buildGuestListExportRows, buildSaleSequenceMap } from "../lib/guest-list-utils.ts";

test("buildSaleSequenceMap gera numeracao amigavel por created_at com desempate por id", () => {
  const sequenceMap = buildSaleSequenceMap([
    { id: "sale-b", created_at: "2026-04-10T10:00:00.000Z" },
    { id: "sale-a", created_at: "2026-04-10T10:00:00.000Z" },
    { id: "sale-c", created_at: "2026-04-11T10:00:00.000Z" }
  ]);

  assert.equal(sequenceMap.get("sale-a"), 1);
  assert.equal(sequenceMap.get("sale-b"), 2);
  assert.equal(sequenceMap.get("sale-c"), 3);
});

test("buildGuestListEntries restringe seller ao proprio escopo e remove nomes manuais", () => {
  const entries = buildGuestListEntries({
    saleAttendeeRows: [
      {
        id: "attendee-1",
        sale_id: "sale-1",
        seller_user_id: "seller-1",
        guest_name: "Ana",
        created_at: "2026-04-10T10:00:00.000Z"
      },
      {
        id: "attendee-2",
        sale_id: "sale-2",
        seller_user_id: "seller-2",
        guest_name: "Bruno",
        created_at: "2026-04-11T10:00:00.000Z"
      }
    ],
    salesRows: [
      { id: "sale-1", seller_user_id: "seller-1", unit_price: 40, created_at: "2026-04-10T09:00:00.000Z" },
      { id: "sale-2", seller_user_id: "seller-2", unit_price: 50, created_at: "2026-04-11T09:00:00.000Z" }
    ],
    manualGuestEntryRows: [
      {
        id: "manual-1",
        guest_name: "Convidado host",
        notes: "VIP",
        created_at: "2026-04-12T10:00:00.000Z"
      }
    ],
    profilesMap: new Map([
      ["seller-1", { full_name: "Seller One" }],
      ["seller-2", { full_name: "Seller Two" }]
    ]),
    viewerId: "seller-1",
    canManageOwnSalesOnly: true,
    canViewManualGuests: false
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.guestName, "Ana");
  assert.equal(entries[0]?.sellerName, "Seller One");
  assert.equal(entries[0]?.saleNumber, 1);
  assert.equal(entries[0]?.sourceType, "sale");
});

test("buildGuestListEntries inclui nomes manuais apenas quando permitido", () => {
  const entries = buildGuestListEntries({
    saleAttendeeRows: [
      {
        id: "attendee-1",
        sale_id: "sale-1",
        seller_user_id: "seller-1",
        guest_name: "Carlos",
        created_at: "2026-04-10T10:00:00.000Z"
      }
    ],
    salesRows: [{ id: "sale-1", seller_user_id: "seller-1", unit_price: 45, created_at: "2026-04-10T09:00:00.000Z" }],
    manualGuestEntryRows: [
      {
        id: "manual-1",
        guest_name: "Convidada Manual",
        notes: "Cortesia",
        created_at: "2026-04-09T08:00:00.000Z"
      }
    ],
    profilesMap: new Map([["seller-1", { full_name: "Seller One" }]]),
    viewerId: "host-user",
    canManageOwnSalesOnly: false,
    canViewManualGuests: true
  });

  assert.deepEqual(
    entries.map((entry) => ({
      guestName: entry.guestName,
      sourceType: entry.sourceType
    })),
    [
      { guestName: "Carlos", sourceType: "sale" },
      { guestName: "Convidada Manual", sourceType: "manual" }
    ].sort((left, right) => left.guestName.localeCompare(right.guestName))
  );
});

test("buildGuestListExportRows mantem o mesmo numero de colunas para vendas e entradas manuais", () => {
  const rows = buildGuestListExportRows({
    eventName: "Festa Teste",
    attendees: [
      {
        id: "attendee-1",
        sale_id: "sale-1",
        seller_user_id: "seller-1",
        guest_name: "Debora",
        checked_in_at: null,
        created_at: "2026-04-10T10:00:00.000Z"
      }
    ],
    manualEntries: [
      {
        id: "manual-1",
        guest_name: "Entrada Manual",
        notes: "Observacao",
        created_at: "2026-04-11T10:00:00.000Z"
      }
    ],
    profileMap: new Map([["seller-1", { id: "seller-1", full_name: "Seller One" }]]),
    salesRows: [{ id: "sale-1", unit_price: 55, created_at: "2026-04-10T09:00:00.000Z" }]
  });

  const header = rows[2];
  const attendeeRow = rows[3];
  const manualRow = rows[4];

  assert.equal(header?.length, 6);
  assert.equal(attendeeRow?.length, 6);
  assert.equal(manualRow?.length, 6);
  assert.equal(manualRow?.[5], "Observacao");
});
