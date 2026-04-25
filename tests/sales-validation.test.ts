import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSalesChecklistSummary,
  getStandardSalePrice,
  validateSaleDraft
} from "../lib/sales-validation.ts";

test("getStandardSalePrice respeita a tabela de lote e tipo", () => {
  assert.equal(getStandardSalePrice("Lote promocional", "pista"), 35);
  assert.equal(getStandardSalePrice("1º lote", "vip"), 65);
  assert.equal(getStandardSalePrice("lote 3", "pista"), 55);
  assert.equal(getStandardSalePrice("Comissao", "pista"), null);
});

test("getStandardSalePrice reutiliza normalizacao central de lotes equivalentes", () => {
  assert.equal(getStandardSalePrice("Lote 01", "pista"), 45);
  assert.equal(getStandardSalePrice("01 lote", "pista"), 45);
  assert.equal(getStandardSalePrice("1o lote", "vip"), 65);
  assert.equal(getStandardSalePrice("2 lote", "pista"), 50);
  assert.equal(getStandardSalePrice("2Âº lote", "vip"), 70);
});

test("validateSaleDraft detecta preco fora do padrao, possivel grupo e inconsistencias de nomes", () => {
  const result = validateSaleDraft({
    quantity: 2,
    unitPrice: 45,
    batchLabel: "lote 3",
    ticketType: "pista",
    saleType: "normal",
    guestNames: ["Ana Clara", "ok"],
    existingGuestNames: ["ana clara", "Bruno"]
  });

  assert.equal(result.standardPrice, 55);
  assert.equal(result.isPriceOutOfStandard, true);
  assert.equal(result.isBelowStandardPrice, true);
  assert.equal(result.matchesOppositeTicketTypePrice, false);
  assert.deepEqual(result.duplicateNamesInEvent, ["Ana Clara"]);
  assert.deepEqual(result.suspiciousNames, ["ok"]);
  assert.equal(result.hasQuantityMismatch, false);
});

test("validateSaleDraft detecta nomes repetidos na mesma venda e quantidade divergente", () => {
  const result = validateSaleDraft({
    quantity: 3,
    unitPrice: 70,
    batchLabel: "lote 2",
    ticketType: "vip",
    saleType: "grupo",
    guestNames: ["Carlos", "Carlos", ""],
    existingGuestNames: []
  });

  assert.deepEqual(result.duplicateNamesInSale, ["Carlos"]);
  assert.equal(result.hasQuantityMismatch, true);
});

test("buildSalesChecklistSummary consolida alertas importantes", () => {
  const summary = buildSalesChecklistSummary([
    {
      id: "sale-1",
      saleNumber: 1,
      sellerUserId: "seller-1",
      seller: "Seller One",
      batchId: "batch-1",
      batchLabel: "lote 2",
      saleType: "normal",
      ticketType: "pista",
      sold: 2,
      unitPrice: 35,
      soldAt: "2026-04-24",
      createdAt: "2026-04-24T10:00:00.000Z",
      amount: 70,
      attendeeNames: ["Ana", "Ana"],
      attendeeCount: 2,
      missingAttendeeCount: 0,
      isOwnedByViewer: true
    },
    {
      id: "sale-2",
      saleNumber: 2,
      sellerUserId: "seller-2",
      seller: "Seller Two",
      batchId: "batch-2",
      batchLabel: "lote 1",
      saleType: "normal",
      ticketType: "vip",
      sold: 2,
      unitPrice: 65,
      soldAt: "2026-04-24",
      createdAt: "2026-04-24T11:00:00.000Z",
      amount: 130,
      attendeeNames: ["ok"],
      attendeeCount: 1,
      missingAttendeeCount: 1,
      isOwnedByViewer: false
    }
  ]);

  assert.equal(summary.duplicateNamesCount, 1);
  assert.equal(summary.suspiciousNamesCount, 1);
  assert.equal(summary.outOfStandardPriceCount, 1);
  assert.equal(summary.possibleGroupCount, 1);
  assert.equal(summary.inconsistentSalesCount, 1);
});
