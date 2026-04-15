import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAverageTicket,
  calculateFinanceTotals,
  calculateGoalProgress,
  calculateGuestListStats,
  calculateSalePriceMode,
  calculateSalePriceRanking,
  calculateSellerMetrics
} from "../lib/event-metrics.ts";

test("calculateFinanceTotals inclui ingressos, extras, despesas e pagamentos", () => {
  const totals = calculateFinanceTotals({
    sales: [
      { quantity: 2, unitPrice: 50 },
      { quantity: 1, unitPrice: 80 }
    ],
    expenses: [{ amount: 60 }],
    additionalRevenues: [{ amount: 40 }]
  });

  assert.deepEqual(totals, {
    grossSoldRevenue: 180,
    ticketRevenue: 180,
    averageTicket: 60,
    modeTicketPrice: 50,
    modeTicketPriceCount: 2,
    additionalRevenue: 40,
    generalRevenue: 220,
    totalRevenue: 220,
    totalExpenses: 60,
    estimatedProfit: 160,
    totalTicketsSold: 3
  });
});

test("calculateSellerMetrics agrega faturamento por vendedor", () => {
  const metrics = calculateSellerMetrics([
    { sellerUserId: "seller-1", quantity: 2, unitPrice: 50 },
    { sellerUserId: "seller-1", quantity: 1, unitPrice: 70 },
    { sellerUserId: "seller-2", quantity: 3, unitPrice: 40 }
  ]);

  assert.deepEqual(metrics.get("seller-1"), {
    ticketsSold: 3,
    revenue: 170
  });
  assert.deepEqual(metrics.get("seller-2"), {
    ticketsSold: 3,
    revenue: 120
  });
});

test("calculateGuestListStats informa faltas corretamente", () => {
  const stats = calculateGuestListStats([
    { quantity: 3, attendeeCount: 2 },
    { quantity: 2, attendeeCount: 2 },
    { quantity: 1, attendeeCount: 0 }
  ]);

  assert.deepEqual(stats, {
    totalExpectedNames: 6,
    totalRegisteredNames: 4,
    missingNames: 2
  });
});

test("calculateGoalProgress usa a mesma regra em todos os contextos", () => {
  assert.equal(calculateGoalProgress(450, 1000), 45);
  assert.equal(calculateGoalProgress(1250, 1000), 125);
  assert.equal(calculateGoalProgress(50, 0), 0);
});

test("calculateAverageTicket evita divisao por zero e calcula o ticket medio corretamente", () => {
  assert.equal(calculateAverageTicket(900, 20), 45);
  assert.equal(calculateAverageTicket(0, 0), 0);
  assert.equal(calculateAverageTicket(900, 0), 0);
});

test("calculateSalePriceMode considera o peso da quantidade vendida", () => {
  assert.deepEqual(
    calculateSalePriceMode([
      { quantity: 5, unitPrice: 40 },
      { quantity: 1, unitPrice: 50 },
      { quantity: 2, unitPrice: 45 }
    ]),
    {
      modePrice: 40,
      modeCount: 5
    }
  );

  assert.deepEqual(calculateSalePriceMode([]), {
    modePrice: 0,
    modeCount: 0
  });
});

test("calculateSalePriceRanking ordena os precos do mais vendido para o menos vendido", () => {
  assert.deepEqual(
    calculateSalePriceRanking([
      { quantity: 5, unitPrice: 40 },
      { quantity: 1, unitPrice: 50 },
      { quantity: 2, unitPrice: 45 },
      { quantity: 2, unitPrice: 50 }
    ]),
    [
      { unitPrice: 40, ticketsSold: 5 },
      { unitPrice: 50, ticketsSold: 3 },
      { unitPrice: 45, ticketsSold: 2 }
    ]
  );
});
