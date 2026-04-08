import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAverageTicket,
  calculateFinanceTotals,
  calculateGoalProgress,
  calculateGuestListStats,
  calculateSalePriceMode,
  calculateSellerMetrics
} from "../lib/event-metrics.ts";

test("calculateFinanceTotals inclui ingressos, extras, despesas e pagamentos", () => {
  const totals = calculateFinanceTotals({
    sales: [
      { quantity: 2, unitPrice: 50, paymentStatus: "paid" },
      { quantity: 1, unitPrice: 80, paymentStatus: "pending" }
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
    confirmedRevenue: 100,
    pendingRevenue: 80,
    generalRevenue: 220,
    totalRevenue: 220,
    totalExpenses: 60,
    estimatedProfit: 160,
    totalTicketsSold: 3,
    pendingPaymentsCount: 1,
    confirmedPaymentsCount: 1,
    paidValue: 100,
    pendingValue: 80
  });
});

test("calculateSellerMetrics agrega faturamento e repasse por vendedor", () => {
  const metrics = calculateSellerMetrics([
    { sellerUserId: "seller-1", quantity: 2, unitPrice: 50, paymentStatus: "paid" },
    { sellerUserId: "seller-1", quantity: 1, unitPrice: 70, paymentStatus: "pending" },
    { sellerUserId: "seller-2", quantity: 3, unitPrice: 40, paymentStatus: "pending" }
  ]);

  assert.deepEqual(metrics.get("seller-1"), {
    ticketsSold: 3,
    revenue: 170,
    pendingTransferAmount: 70,
    confirmedValue: 100
  });
  assert.deepEqual(metrics.get("seller-2"), {
    ticketsSold: 3,
    revenue: 120,
    pendingTransferAmount: 120,
    confirmedValue: 0
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
