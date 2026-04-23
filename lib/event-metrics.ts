export interface MetricSale {
  sellerUserId: string;
  quantity: number;
  unitPrice: number;
  batchLabel?: string;
  saleType?: "normal" | "grupo";
  ticketType?: "vip" | "pista";
  attendeeCount?: number;
  createdAt?: string;
}

export interface MetricExpense {
  amount: number;
}

export interface MetricAdditionalRevenue {
  amount: number;
  category?: string | null;
  date?: string;
}

export interface MetricCategorizedAmount {
  amount: number;
  category?: string | null;
}

export interface MetricExpenseWithDate extends MetricExpense {
  incurredAt?: string;
}

export interface MetricAdditionalRevenueWithDate extends MetricAdditionalRevenue {
  date?: string;
}

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface CashFlowPoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
  cumulativeBalance: number;
}

export interface BatchMetricItem {
  batchLabel: string;
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
  percentage: number;
}

export interface SaleTypeMetricSnapshot {
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
  percentage: number;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftDays(date: Date, days: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function emptyPeriodMetricSnapshot() {
  return {
    ticketsSold: 0,
    revenue: 0
  };
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateVariation(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function calculateGoalProgress(currentValue: number, goalValue: number) {
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((currentValue / goalValue) * 100));
}

export function getSaleAmount(sale: Pick<MetricSale, "quantity" | "unitPrice">) {
  return sale.quantity * sale.unitPrice;
}

export function calculateAverageTicket(totalTicketRevenue: number, totalTicketsSold: number) {
  if (!Number.isFinite(totalTicketRevenue) || !Number.isFinite(totalTicketsSold) || totalTicketsSold <= 0) {
    return 0;
  }

  return totalTicketRevenue / totalTicketsSold;
}

export function calculateSalePriceMode(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice">>
) {
  const occurrences = calculateSalePriceRanking(sales);

  let modePrice = 0;
  let modeCount = 0;

  for (const entry of occurrences) {
    if (
      entry.ticketsSold > modeCount ||
      (entry.ticketsSold === modeCount && entry.ticketsSold > 0 && entry.unitPrice < modePrice)
    ) {
      modePrice = entry.unitPrice;
      modeCount = entry.ticketsSold;
    }
  }

  return {
    modePrice,
    modeCount
  };
}

export function calculateSalePriceRanking(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice">>
) {
  const occurrences = new Map<number, number>();

  for (const sale of sales) {
    if (!Number.isFinite(sale.unitPrice) || !Number.isFinite(sale.quantity) || sale.quantity <= 0) {
      continue;
    }

    occurrences.set(sale.unitPrice, (occurrences.get(sale.unitPrice) ?? 0) + sale.quantity);
  }

  return Array.from(occurrences.entries())
    .map(([unitPrice, ticketsSold]) => ({ unitPrice, ticketsSold }))
    .sort((left, right) => {
      if (right.ticketsSold !== left.ticketsSold) {
        return right.ticketsSold - left.ticketsSold;
      }

      return left.unitPrice - right.unitPrice;
    });
}

export function calculateFinanceTotals({
  sales,
  expenses,
  additionalRevenues
}: {
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice">>;
  expenses: Array<Pick<MetricExpense, "amount">>;
  additionalRevenues?: Array<Pick<MetricAdditionalRevenue, "amount">>;
}) {
  const ticketRevenue = sales.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
  const additionalRevenue = (additionalRevenues ?? []).reduce((sum, revenue) => sum + revenue.amount, 0);
  const totalRevenue = ticketRevenue + additionalRevenue;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const estimatedProfit = totalRevenue - totalExpenses;
  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const { modePrice, modeCount } = calculateSalePriceMode(sales);

  return {
    grossSoldRevenue: ticketRevenue,
    ticketRevenue,
    averageTicket: calculateAverageTicket(ticketRevenue, totalTicketsSold),
    modeTicketPrice: modePrice,
    modeTicketPriceCount: modeCount,
    additionalRevenue,
    generalRevenue: totalRevenue,
    totalRevenue,
    totalExpenses,
    estimatedProfit,
    totalTicketsSold
  };
}

export function calculateSellerMetrics(
  sales: Array<Pick<MetricSale, "sellerUserId" | "quantity" | "unitPrice">>
) {
  const metrics = new Map<
    string,
    {
      ticketsSold: number;
      revenue: number;
    }
  >();

  for (const sale of sales) {
    const current = metrics.get(sale.sellerUserId) ?? {
      ticketsSold: 0,
      revenue: 0
    };
    const saleAmount = getSaleAmount(sale);

    current.ticketsSold += sale.quantity;
    current.revenue += saleAmount;

    metrics.set(sale.sellerUserId, current);
  }

  return metrics;
}

export function calculateTicketTypeMetrics(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "ticketType">>
) {
  const initial = {
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
    };

  for (const sale of sales) {
    const ticketType = sale.ticketType === "vip" ? "vip" : "pista";
    const amount = getSaleAmount(sale);

    initial[ticketType].ticketsSold += sale.quantity;
    initial[ticketType].revenue += amount;
  }

  const totalTicketsSold = initial.vip.ticketsSold + initial.pista.ticketsSold;
  initial.vip.averageTicket = calculateAverageTicket(initial.vip.revenue, initial.vip.ticketsSold);
  initial.pista.averageTicket = calculateAverageTicket(initial.pista.revenue, initial.pista.ticketsSold);
  initial.vip.percentage = totalTicketsSold > 0 ? Math.round((initial.vip.ticketsSold / totalTicketsSold) * 100) : 0;
  initial.pista.percentage =
    totalTicketsSold > 0 ? Math.round((initial.pista.ticketsSold / totalTicketsSold) * 100) : 0;

  return initial;
}

export function calculatePeriodComparison(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "createdAt">>,
  now = new Date()
) {
  const todayDate = startOfDay(now);
  const todayKey = formatLocalDateKey(todayDate);
  const yesterdayKey = formatLocalDateKey(shiftDays(todayDate, -1));
  const last3StartKey = formatLocalDateKey(shiftDays(todayDate, -2));
  const previous3StartKey = formatLocalDateKey(shiftDays(todayDate, -5));
  const previous3EndKey = formatLocalDateKey(shiftDays(todayDate, -3));
  const last7StartKey = formatLocalDateKey(shiftDays(todayDate, -6));
  const previous7StartKey = formatLocalDateKey(shiftDays(todayDate, -13));
  const previous7EndKey = formatLocalDateKey(shiftDays(todayDate, -7));

  const today = emptyPeriodMetricSnapshot();
  const yesterday = emptyPeriodMetricSnapshot();
  const last3Days = emptyPeriodMetricSnapshot();
  const previous3Days = emptyPeriodMetricSnapshot();
  const last7Days = emptyPeriodMetricSnapshot();
  const previous7Days = emptyPeriodMetricSnapshot();

  for (const sale of sales) {
    if (!sale.createdAt) {
      continue;
    }

    const saleDateKey = normalizeMetricDate(sale.createdAt);

    if (!saleDateKey) {
      continue;
    }

    const amount = getSaleAmount(sale);

    if (saleDateKey === todayKey) {
      today.ticketsSold += sale.quantity;
      today.revenue += amount;
    }

    if (saleDateKey === yesterdayKey) {
      yesterday.ticketsSold += sale.quantity;
      yesterday.revenue += amount;
    }

    if (saleDateKey >= last3StartKey && saleDateKey <= todayKey) {
      last3Days.ticketsSold += sale.quantity;
      last3Days.revenue += amount;
    }

    if (saleDateKey >= previous3StartKey && saleDateKey <= previous3EndKey) {
      previous3Days.ticketsSold += sale.quantity;
      previous3Days.revenue += amount;
    }

    if (saleDateKey >= last7StartKey && saleDateKey <= todayKey) {
      last7Days.ticketsSold += sale.quantity;
      last7Days.revenue += amount;
    }

    if (saleDateKey >= previous7StartKey && saleDateKey <= previous7EndKey) {
      previous7Days.ticketsSold += sale.quantity;
      previous7Days.revenue += amount;
    }
  }

  return {
    today,
    yesterday,
    last3Days,
    previous3Days,
    last7Days,
    previous7Days,
    variations: {
      todayVsYesterdayTickets: calculateVariation(today.ticketsSold, yesterday.ticketsSold),
      todayVsYesterdayRevenue: calculateVariation(today.revenue, yesterday.revenue),
      last7VsPrevious7Tickets: calculateVariation(last7Days.ticketsSold, previous7Days.ticketsSold),
      last7VsPrevious7Revenue: calculateVariation(last7Days.revenue, previous7Days.revenue)
    }
  };
}

export function calculateSalePriceConversion(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice">>
) {
  const ranking = calculateSalePriceRanking(sales);
  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  return ranking.map((entry) => ({
    ...entry,
    percentage: totalTicketsSold > 0 ? Math.round((entry.ticketsSold / totalTicketsSold) * 100) : 0
  }));
}

export function calculateCategoryBreakdown(
  items: MetricCategorizedAmount[],
  fallbackLabel = "Sem categoria"
) {
  const totals = new Map<string, { total: number; count: number }>();

  for (const item of items) {
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      continue;
    }

    const category = item.category?.trim() || fallbackLabel;
    const current = totals.get(category) ?? { total: 0, count: 0 };

    current.total += item.amount;
    current.count += 1;
    totals.set(category, current);
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, item) => sum + item.total, 0);

  return Array.from(totals.entries())
    .map(([category, item]) => ({
      category,
      total: item.total,
      count: item.count,
      percentage: grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0
    }))
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }

      return left.category.localeCompare(right.category);
    });
}

function normalizeMetricDate(value?: string) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatLocalDateKey(parsed);
}

export function calculateCashFlowByDate({
  sales,
  additionalRevenues,
  expenses
}: {
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "createdAt">>;
  additionalRevenues: Array<Pick<MetricAdditionalRevenueWithDate, "amount" | "date">>;
  expenses: Array<Pick<MetricExpenseWithDate, "amount" | "incurredAt">>;
}) {
  const dailyMap = new Map<string, { inflow: number; outflow: number }>();

  function ensureDay(date: string) {
    const current = dailyMap.get(date) ?? { inflow: 0, outflow: 0 };
    dailyMap.set(date, current);
    return current;
  }

  for (const sale of sales) {
    const date = normalizeMetricDate(sale.createdAt);

    if (!date) {
      continue;
    }

    ensureDay(date).inflow += getSaleAmount(sale);
  }

  for (const revenue of additionalRevenues) {
    const date = normalizeMetricDate(revenue.date);

    if (!date || !Number.isFinite(revenue.amount) || revenue.amount <= 0) {
      continue;
    }

    ensureDay(date).inflow += revenue.amount;
  }

  for (const expense of expenses) {
    const date = normalizeMetricDate(expense.incurredAt);

    if (!date || !Number.isFinite(expense.amount) || expense.amount <= 0) {
      continue;
    }

    ensureDay(date).outflow += expense.amount;
  }

  let cumulativeBalance = 0;

  return Array.from(dailyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, snapshot]) => {
      const balance = snapshot.inflow - snapshot.outflow;
      cumulativeBalance += balance;

      return {
        date,
        inflow: snapshot.inflow,
        outflow: snapshot.outflow,
        balance,
        cumulativeBalance
      } satisfies CashFlowPoint;
    });
}

export function calculateBatchMetrics(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "batchLabel">>
) {
  const ranking = new Map<string, { ticketsSold: number; revenue: number }>();

  for (const sale of sales) {
    const batchLabel = sale.batchLabel?.trim() || "Sem lote";
    const current = ranking.get(batchLabel) ?? { ticketsSold: 0, revenue: 0 };

    current.ticketsSold += sale.quantity;
    current.revenue += getSaleAmount(sale);
    ranking.set(batchLabel, current);
  }

  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  return Array.from(ranking.entries())
    .map(([batchLabel, item]) => ({
      batchLabel,
      ticketsSold: item.ticketsSold,
      revenue: item.revenue,
      averageTicket: calculateAverageTicket(item.revenue, item.ticketsSold),
      percentage: totalTicketsSold > 0 ? Math.round((item.ticketsSold / totalTicketsSold) * 100) : 0
    }))
    .sort((left, right) => {
      if (right.ticketsSold !== left.ticketsSold) {
        return right.ticketsSold - left.ticketsSold;
      }

      return left.batchLabel.localeCompare(right.batchLabel);
    });
}

export function calculateSaleTypeMetrics(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "saleType">>
) {
  const initial: Record<"normal" | "grupo", SaleTypeMetricSnapshot> = {
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
  };

  for (const sale of sales) {
    const saleType = sale.saleType === "grupo" ? "grupo" : "normal";
    const amount = getSaleAmount(sale);

    initial[saleType].ticketsSold += sale.quantity;
    initial[saleType].revenue += amount;
  }

  const totalTicketsSold = initial.normal.ticketsSold + initial.grupo.ticketsSold;
  initial.normal.averageTicket = calculateAverageTicket(initial.normal.revenue, initial.normal.ticketsSold);
  initial.grupo.averageTicket = calculateAverageTicket(initial.grupo.revenue, initial.grupo.ticketsSold);
  initial.normal.percentage =
    totalTicketsSold > 0 ? Math.round((initial.normal.ticketsSold / totalTicketsSold) * 100) : 0;
  initial.grupo.percentage =
    totalTicketsSold > 0 ? Math.round((initial.grupo.ticketsSold / totalTicketsSold) * 100) : 0;

  return initial;
}

export function calculateGuestListStats(
  sales: Array<Pick<MetricSale, "quantity" | "attendeeCount">>
) {
  const totalExpectedNames = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalRegisteredNames = sales.reduce((sum, sale) => sum + (sale.attendeeCount ?? 0), 0);

  return {
    totalExpectedNames,
    totalRegisteredNames,
    missingNames: Math.max(totalExpectedNames - totalRegisteredNames, 0)
  };
}
