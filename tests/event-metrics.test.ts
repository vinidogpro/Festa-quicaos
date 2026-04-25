import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAverageTicket,
  calculateBatchMetrics,
  calculateCashFlowByDate,
  calculateCategoryBreakdown,
  calculateExpenseCategoryInsights,
  calculateFinanceTotals,
  calculateGoalProgress,
  calculateGuestListStats,
  calculateMostEfficientPrice,
  calculateOperationalTimeline,
  calculatePeriodComparison,
  calculatePostEventReport,
  calculateSalePriceConversion,
  calculateSalePriceMode,
  calculateSalePriceRanking,
  calculateSaleTypeMetrics,
  calculateSellerMetrics,
  calculateTicketTypeMetrics
} from "../lib/event-metrics.ts";
import { formatBatchLabel, getNormalizedBatchKey } from "../lib/utils.ts";

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

test("calculateSalePriceConversion calcula percentual por faixa de preco", () => {
  assert.deepEqual(
    calculateSalePriceConversion([
      { quantity: 5, unitPrice: 40 },
      { quantity: 3, unitPrice: 50 },
      { quantity: 2, unitPrice: 45 }
    ]),
    [
      { unitPrice: 40, ticketsSold: 5, percentage: 50 },
      { unitPrice: 50, ticketsSold: 3, percentage: 30 },
      { unitPrice: 45, ticketsSold: 2, percentage: 20 }
    ]
  );
});

test("calculatePeriodComparison compara hoje, ontem e ultimos 7 dias", () => {
  const referenceDate = new Date("2026-04-22T12:00:00.000Z");

  const comparison = calculatePeriodComparison(
    [
      { quantity: 4, unitPrice: 50, createdAt: "2026-04-22T09:00:00.000Z" },
      { quantity: 2, unitPrice: 60, createdAt: "2026-04-21T15:00:00.000Z" },
      { quantity: 3, unitPrice: 40, createdAt: "2026-04-20T10:00:00.000Z" },
      { quantity: 5, unitPrice: 30, createdAt: "2026-04-16T10:00:00.000Z" },
      { quantity: 6, unitPrice: 35, createdAt: "2026-04-15T10:00:00.000Z" }
    ],
    referenceDate
  );

  assert.deepEqual(comparison.today, {
    ticketsSold: 4,
    revenue: 200
  });
  assert.deepEqual(comparison.yesterday, {
    ticketsSold: 2,
    revenue: 120
  });
  assert.deepEqual(comparison.last7Days, {
    ticketsSold: 14,
    revenue: 590
  });
  assert.deepEqual(comparison.previous7Days, {
    ticketsSold: 6,
    revenue: 210
  });
  assert.equal(comparison.variations.todayVsYesterdayTickets, 100);
  assert.equal(comparison.variations.last7VsPrevious7Tickets, 133);
});

test("calculateTicketTypeMetrics separa VIP e PISTA e mantem consistencia com o total", () => {
  const metrics = calculateTicketTypeMetrics([
    { quantity: 3, unitPrice: 80, ticketType: "vip" },
    { quantity: 2, unitPrice: 50, ticketType: "pista" },
    { quantity: 1, unitPrice: 100, ticketType: "vip" }
  ]);

  assert.deepEqual(metrics, {
    vip: {
      ticketsSold: 4,
      revenue: 340,
      averageTicket: 85,
      percentage: 67
    },
    pista: {
      ticketsSold: 2,
      revenue: 100,
      averageTicket: 50,
      percentage: 33
    }
  });
});

test("calculateTicketTypeMetrics lida com cenarios apenas VIP, apenas PISTA e divisao por zero", () => {
  assert.deepEqual(calculateTicketTypeMetrics([{ quantity: 2, unitPrice: 120, ticketType: "vip" }]), {
    vip: {
      ticketsSold: 2,
      revenue: 240,
      averageTicket: 120,
      percentage: 100
    },
    pista: {
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0,
      percentage: 0
    }
  });

  assert.deepEqual(calculateTicketTypeMetrics([{ quantity: 4, unitPrice: 60, ticketType: "pista" }]), {
    vip: {
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0,
      percentage: 0
    },
    pista: {
      ticketsSold: 4,
      revenue: 240,
      averageTicket: 60,
      percentage: 100
    }
  });

  assert.deepEqual(calculateTicketTypeMetrics([]), {
    vip: {
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0,
      percentage: 0
    },
    pista: {
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0,
      percentage: 0
    }
  });
});

test("calculateCategoryBreakdown agrupa categorias, subtotal e percentual corretamente", () => {
  assert.deepEqual(
    calculateCategoryBreakdown([
      { category: "Bebida", amount: 3000 },
      { category: "Seguranca", amount: 1200 },
      { category: "Bebida", amount: 500 },
      { category: "", amount: 300 }
    ]),
    [
      { category: "Bebida", total: 3500, count: 2, percentage: 70 },
      { category: "Seguranca", total: 1200, count: 1, percentage: 24 },
      { category: "Sem categoria", total: 300, count: 1, percentage: 6 }
    ]
  );
});

test("calculateCashFlowByDate consolida entradas, saidas e saldo acumulado por dia", () => {
  assert.deepEqual(
    calculateCashFlowByDate({
      sales: [
        { quantity: 2, unitPrice: 50, createdAt: "2026-05-01T10:00:00.000Z" },
        { quantity: 1, unitPrice: 80, createdAt: "2026-05-02T12:00:00.000Z" }
      ],
      additionalRevenues: [{ amount: 120, date: "2026-05-02" }],
      expenses: [
        { amount: 40, incurredAt: "2026-05-01" },
        { amount: 70, incurredAt: "2026-05-02" }
      ]
    }),
    [
      {
        date: "2026-05-01",
        inflow: 100,
        outflow: 40,
        balance: 60,
        cumulativeBalance: 60
      },
      {
        date: "2026-05-02",
        inflow: 200,
        outflow: 70,
        balance: 130,
        cumulativeBalance: 190
      }
    ]
  );
});

test("calculateBatchMetrics consolida quantidade, receita, ticket medio e percentual por lote", () => {
  assert.deepEqual(
    calculateBatchMetrics([
      { quantity: 5, unitPrice: 40, batchLabel: "Lote promocional" },
      { quantity: 3, unitPrice: 45, batchLabel: "1º lote" },
      { quantity: 2, unitPrice: 50, batchLabel: "1 lote" },
      { quantity: 4, unitPrice: 55, batchLabel: "Lote 02" }
    ]),
    [
      { batchLabel: "1º lote", ticketsSold: 5, revenue: 235, averageTicket: 47, percentage: 36 },
      { batchLabel: "Lote promocional", ticketsSold: 5, revenue: 200, averageTicket: 40, percentage: 36 },
      { batchLabel: "2º lote", ticketsSold: 4, revenue: 220, averageTicket: 55, percentage: 29 }
    ]
  );
});

test("calculateBatchMetrics lida com lote unico e sem vendas", () => {
  assert.deepEqual(calculateBatchMetrics([{ quantity: 4, unitPrice: 60, batchLabel: "3º lote" }]), [
    { batchLabel: "3º lote", ticketsSold: 4, revenue: 240, averageTicket: 60, percentage: 100 }
  ]);

  assert.deepEqual(calculateBatchMetrics([]), []);
});

test("normaliza variacoes do mesmo lote para a mesma chave e exibicao", () => {
  const batchLabels = ["Lote 1", "1 lote", "1º lote", "1o lote", "1° lote", "Lote 01", "01 lote"];

  assert.deepEqual(
    batchLabels.map((label) => getNormalizedBatchKey(label)),
    Array(batchLabels.length).fill("lote-1")
  );
  assert.deepEqual(
    batchLabels.map((label) => formatBatchLabel(label)),
    Array(batchLabels.length).fill("1º lote")
  );
});

test("normaliza lote 2 e preserva lote promocional e comissao separados", () => {
  assert.deepEqual(
    ["Lote 2", "2 lote", "2º lote", "Lote 02"].map((label) => getNormalizedBatchKey(label)),
    Array(4).fill("lote-2")
  );
  assert.equal(formatBatchLabel("Lote promocional"), "Lote promocional");
  assert.equal(formatBatchLabel("Comissão"), "Comissão");
});

test("calculateSaleTypeMetrics compara normal e grupo sem quebrar divisao por zero", () => {
  assert.deepEqual(
    calculateSaleTypeMetrics([
      { quantity: 4, unitPrice: 40, saleType: "normal" },
      { quantity: 2, unitPrice: 35, saleType: "grupo" },
      { quantity: 3, unitPrice: 50, saleType: "grupo" }
    ]),
    {
      normal: {
        ticketsSold: 4,
        revenue: 160,
        averageTicket: 40,
        percentage: 44
      },
      grupo: {
        ticketsSold: 5,
        revenue: 220,
        averageTicket: 44,
        percentage: 56
      }
    }
  );

  assert.deepEqual(calculateSaleTypeMetrics([]), {
    normal: {
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0,
      percentage: 0
    },
    grupo: {
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0,
      percentage: 0
    }
  });
});

test("calculateExpenseCategoryInsights calcula media por festa e peso sobre a receita", () => {
  assert.deepEqual(
    calculateExpenseCategoryInsights(
      [
        { category: "Bebida", amount: 3000 },
        { category: "Bebida", amount: 1000 },
        { category: "Marketing", amount: 800 }
      ],
      10000,
      4
    ),
    [
      { category: "Bebida", total: 4000, count: 2, percentage: 83, averagePerEvent: 1000, revenueShare: 40 },
      { category: "Marketing", total: 800, count: 1, percentage: 17, averagePerEvent: 200, revenueShare: 8 }
    ]
  );
});

test("calculateMostEfficientPrice escolhe o preco com maior arrecadacao", () => {
  assert.deepEqual(
    calculateMostEfficientPrice([
      { quantity: 10, unitPrice: 40 },
      { quantity: 5, unitPrice: 60 },
      { quantity: 6, unitPrice: 55 }
    ]),
    {
      unitPrice: 40,
      ticketsSold: 10,
      revenue: 400
    }
  );
});

test("calculatePostEventReport consolida leitura executiva da festa", () => {
  const report = calculatePostEventReport({
    eventId: "festa-1",
    eventName: "Festa teste",
    eventDate: "2026-05-10",
    status: "past",
    sales: [
      { quantity: 5, unitPrice: 40, batchLabel: "1 lote", saleType: "normal", ticketType: "pista" },
      { quantity: 2, unitPrice: 80, batchLabel: "VIP antecipado", saleType: "grupo", ticketType: "vip" }
    ],
    expenses: [
      { amount: 300, category: "DJ" },
      { amount: 200, category: "Marketing" }
    ],
    additionalRevenues: [{ amount: 100, category: "Bar" }],
    peerAverageTicket: 45
  });

  assert.deepEqual(report.overview, {
    totalRevenue: 460,
    ticketRevenue: 360,
    additionalRevenue: 100,
    totalExpenses: 500,
    estimatedProfit: -40,
    averageTicket: 51.42857142857143,
    totalTicketsSold: 7
  });
  assert.equal(report.commercial.bestBatchLabel, "1º lote");
  assert.equal(report.commercial.dominantTicketType, "pista");
  assert.equal(report.commercial.mostEfficientPrice, 40);
  assert.equal(report.financial.heaviestExpenseCategory?.category, "DJ");
  assert.equal(report.financial.expenseRatio, 109);
  assert.equal(report.insights.length, 4);
});

test("calculateOperationalTimeline detecta inicio, pico, aceleracao e custos", () => {
  const timeline = calculateOperationalTimeline({
    sales: [
      { quantity: 2, unitPrice: 40, createdAt: "2026-04-18" },
      { quantity: 3, unitPrice: 40, createdAt: "2026-04-19" },
      { quantity: 12, unitPrice: 45, createdAt: "2026-04-20" },
      { quantity: 4, unitPrice: 50, createdAt: "2026-04-22" }
    ],
    additionalRevenues: [{ amount: 300, date: "2026-04-20" }],
    expenses: [
      { amount: 200, incurredAt: "2026-04-17", category: "Marketing", title: "Impulsionamento" },
      { amount: 3000, incurredAt: "2026-04-21", category: "Estrutura", title: "Palco" }
    ]
  });

  assert.equal(timeline[0]?.title, "Inicio dos custos");
  assert.ok(timeline.some((item) => item.title === "Inicio das vendas"));
  assert.ok(timeline.some((item) => item.title === "Pico de vendas"));
  assert.ok(timeline.some((item) => item.title === "Aceleracao de vendas"));
  assert.ok(timeline.some((item) => item.title === "Pico de arrecadacao"));
  assert.ok(timeline.some((item) => item.title === "Aumento de custos"));
  assert.ok(timeline.some((item) => item.description.includes("Estrutura") || item.description.includes("21/04")));
});

test("calculateOperationalTimeline retorna vazio sem dados operacionais", () => {
  assert.deepEqual(
    calculateOperationalTimeline({
      sales: [],
      additionalRevenues: [],
      expenses: []
    }),
    []
  );
});

test("calculateBatchMetrics detalha VIP e PISTA dentro de cada lote", () => {
  const metrics = calculateBatchMetrics([
    { quantity: 3, unitPrice: 80, batchLabel: "Lote 1", ticketType: "vip" },
    { quantity: 2, unitPrice: 40, batchLabel: "1 lote", ticketType: "pista" },
    { quantity: 5, unitPrice: 50, batchLabel: "Lote 2", ticketType: "pista" }
  ]);
  const firstBatch = metrics.find((item) => item.batchLabel === "1º lote");

  assert.ok(firstBatch);
  assert.equal(firstBatch.ticketsSold, 5);
  assert.equal(firstBatch.revenue, 320);
  assert.equal(firstBatch.averageTicket, 64);
  assert.equal(firstBatch.revenuePercentage, 56);
  assert.deepEqual(firstBatch.ticketTypes.vip, {
    ticketsSold: 3,
    revenue: 240,
    averageTicket: 80,
    revenuePercentage: 75
  });
  assert.deepEqual(firstBatch.ticketTypes.pista, {
    ticketsSold: 2,
    revenue: 80,
    averageTicket: 40,
    revenuePercentage: 25
  });
});
