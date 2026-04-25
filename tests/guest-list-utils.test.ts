import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGuestListEntries,
  buildGuestListExportRows,
  buildPortariaExportRows,
  buildSaleSequenceMap
} from "../lib/guest-list-utils.ts";

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
  const batchNameMap = new Map([
    ["batch-1", "1º lote"],
    ["batch-2", "2º lote"]
  ]);

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
      {
        id: "sale-1",
        seller_user_id: "seller-1",
        batch_id: "batch-1",
        sale_type: "normal",
        quantity: 1,
        unit_price: 40,
        ticket_type: "pista",
        sold_at: "2026-04-10",
        notes: null,
        created_at: "2026-04-10T09:00:00.000Z"
      },
      {
        id: "sale-2",
        seller_user_id: "seller-2",
        batch_id: "batch-2",
        sale_type: "grupo",
        quantity: 1,
        unit_price: 50,
        ticket_type: "vip",
        sold_at: "2026-04-11",
        notes: null,
        created_at: "2026-04-11T09:00:00.000Z"
      }
    ],
    manualGuestEntryRows: [
      {
        id: "manual-1",
        guest_name: "Convidado host",
        notes: "VIP",
        created_at: "2026-04-12T10:00:00.000Z"
      }
    ],
    batchNameMap,
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
  assert.equal(entries[0]?.ticketType, "pista");
  assert.equal(entries[0]?.batchLabel, "1º lote");
  assert.equal(entries[0]?.saleType, "normal");
  assert.equal(entries[0]?.sourceType, "sale");
});

test("buildGuestListEntries inclui nomes manuais apenas quando permitido", () => {
  const batchNameMap = new Map([["batch-promo", "Lote promocional"]]);

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
    salesRows: [
      {
        id: "sale-1",
        seller_user_id: "seller-1",
        batch_id: "batch-promo",
        sale_type: "grupo",
        quantity: 1,
        unit_price: 45,
        ticket_type: "vip",
        sold_at: "2026-04-10",
        notes: null,
        created_at: "2026-04-10T09:00:00.000Z"
      }
    ],
    manualGuestEntryRows: [
      {
        id: "manual-1",
        guest_name: "Convidada Manual",
        notes: "Cortesia",
        created_at: "2026-04-09T08:00:00.000Z"
      }
    ],
    batchNameMap,
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
  assert.equal(entries.find((entry) => entry.sourceType === "sale")?.ticketType, "vip");
  assert.equal(entries.find((entry) => entry.sourceType === "sale")?.batchLabel, "Lote promocional");
  assert.equal(entries.find((entry) => entry.sourceType === "sale")?.saleType, "grupo");
});

test("buildGuestListEntries preserva venda com multiplos nomes na lista", () => {
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
        sale_id: "sale-1",
        seller_user_id: "seller-1",
        guest_name: "Bruno",
        created_at: "2026-04-10T10:01:00.000Z"
      },
      {
        id: "attendee-3",
        sale_id: "sale-1",
        seller_user_id: "seller-1",
        guest_name: "Carla",
        created_at: "2026-04-10T10:02:00.000Z"
      }
    ],
    salesRows: [
      {
        id: "sale-1",
        seller_user_id: "seller-1",
        batch_id: "batch-1",
        sale_type: "grupo",
        quantity: 3,
        unit_price: 37,
        ticket_type: "pista",
        sold_at: "2026-04-10",
        notes: null,
        created_at: "2026-04-10T09:00:00.000Z"
      }
    ],
    manualGuestEntryRows: [],
    batchNameMap: new Map([["batch-1", "Lote 2"]]),
    profilesMap: new Map([["seller-1", { full_name: "Seller One" }]]),
    viewerId: "host-user",
    canManageOwnSalesOnly: false,
    canViewManualGuests: true
  });

  assert.deepEqual(entries.map((entry) => entry.guestName), ["Ana", "Bruno", "Carla"]);
  assert.equal(entries.every((entry) => entry.saleId === "sale-1"), true);
  assert.equal(entries.every((entry) => entry.sold === 3), true);
  assert.equal(entries.every((entry) => entry.attendeeCount === 3), true);
  assert.equal(entries.every((entry) => entry.unitPrice === 37), true);
  assert.equal(entries.every((entry) => entry.saleType === "grupo"), true);
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
    salesRows: [{ id: "sale-1", batch_id: "batch-3", sale_type: "grupo", unit_price: 55, ticket_type: "vip", created_at: "2026-04-10T09:00:00.000Z" }],
    batchNameMap: new Map([["batch-3", "3º lote"]])
  });

  const header = rows[2];
  const attendeeRow = rows[3];
  const manualRow = rows[4];

  assert.equal(header?.length, 9);
  assert.equal(attendeeRow?.length, 9);
  assert.equal(manualRow?.length, 9);
  assert.equal(attendeeRow?.[2], "VIP");
  assert.equal(attendeeRow?.[3], "3º lote");
  assert.equal(attendeeRow?.[4], "Grupo");
  assert.equal(manualRow?.[2], "MANUAL");
  assert.equal(manualRow?.[8], "Observacao");
});

test("buildPortariaExportRows ordena alfabeticamente e usa PISTA como padrao para entradas manuais", () => {
  const rows = buildPortariaExportRows({
    attendees: [
      {
        id: "attendee-1",
        sale_id: "sale-1",
        seller_user_id: "seller-1",
        guest_name: "Zeca",
        created_at: "2026-04-10T10:00:00.000Z"
      },
      {
        id: "attendee-2",
        sale_id: "sale-2",
        seller_user_id: "seller-1",
        guest_name: "Ana",
        created_at: "2026-04-10T10:00:00.000Z"
      }
    ],
    manualEntries: [
      {
        id: "manual-1",
        guest_name: "Bruna",
        created_at: "2026-04-10T10:00:00.000Z"
      }
    ],
    salesRows: [
      { id: "sale-1", ticket_type: "pista" },
      { id: "sale-2", ticket_type: "vip" }
    ]
  });

  assert.deepEqual(rows, [
    { guestName: "Ana", ticketType: "VIP" },
    { guestName: "Bruna", ticketType: "PISTA" },
    { guestName: "Zeca", ticketType: "PISTA" }
  ]);
});
