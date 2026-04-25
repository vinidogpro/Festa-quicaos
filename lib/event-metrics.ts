import { formatBatchLabel, getNormalizedBatchKey } from "./utils";

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

export interface MetricExpenseTimelineInput extends MetricExpenseWithDate {
  title?: string;
  category?: string | null;
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
  revenuePercentage: number;
  ticketTypes: Record<
    "vip" | "pista",
    {
      ticketsSold: number;
      revenue: number;
      averageTicket: number;
      revenuePercentage: number;
    }
  >;
}

export interface SaleTypeMetricSnapshot {
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
  percentage: number;
}

export interface OperationalTimelineEvent {
  id: string;
  date: string;
  category: "sales" | "revenue" | "expense" | "attention";
  title: string;
  description: string;
}

interface SalesAccelerationCandidate {
  date: string;
  tickets: number;
  baseline: number;
  score: number;
}

export interface PortfolioExpenseCategoryInsight extends CategoryBreakdownItem {
  averagePerEvent: number;
  revenueShare: number;
}

export interface PostEventReportMetricInput {
  eventId: string;
  eventName: string;
  eventDate: string;
  status: "current" | "upcoming" | "past";
  goalValue?: number;
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "batchLabel" | "saleType" | "ticketType">>;
  expenses: Array<Pick<MetricExpense, "amount"> & { category?: string | null }>;
  additionalRevenues?: Array<Pick<MetricAdditionalRevenue, "amount" | "category">>;
  peerAverageTicket?: number;
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
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "batchLabel"> & Partial<Pick<MetricSale, "ticketType">>>
) {
  const ranking = new Map<
    string,
    {
      batchLabel: string;
      ticketsSold: number;
      revenue: number;
      ticketTypes: Record<"vip" | "pista", { ticketsSold: number; revenue: number }>;
    }
  >();

  for (const sale of sales) {
    const batchKey = getNormalizedBatchKey(sale.batchLabel);
    const batchLabel = formatBatchLabel(sale.batchLabel);
    const current =
      ranking.get(batchKey) ?? {
        batchLabel,
        ticketsSold: 0,
        revenue: 0,
        ticketTypes: {
          vip: { ticketsSold: 0, revenue: 0 },
          pista: { ticketsSold: 0, revenue: 0 }
        }
      };
    const ticketType = sale.ticketType === "vip" ? "vip" : "pista";
    const amount = getSaleAmount(sale);

    current.ticketsSold += sale.quantity;
    current.revenue += amount;
    current.ticketTypes[ticketType].ticketsSold += sale.quantity;
    current.ticketTypes[ticketType].revenue += amount;
    ranking.set(batchKey, current);
  }

  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + getSaleAmount(sale), 0);

  return Array.from(ranking.values())
    .map((item) => {
      const vipRevenue = item.ticketTypes.vip.revenue;
      const pistaRevenue = item.ticketTypes.pista.revenue;

      const metric = {
        batchLabel: item.batchLabel,
        ticketsSold: item.ticketsSold,
        revenue: item.revenue,
        averageTicket: calculateAverageTicket(item.revenue, item.ticketsSold),
        percentage: totalTicketsSold > 0 ? Math.round((item.ticketsSold / totalTicketsSold) * 100) : 0
      };

      Object.defineProperties(metric, {
        revenuePercentage: {
          value: totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0,
          enumerable: false
        },
        ticketTypes: {
          value: {
            vip: {
              ticketsSold: item.ticketTypes.vip.ticketsSold,
              revenue: vipRevenue,
              averageTicket: calculateAverageTicket(vipRevenue, item.ticketTypes.vip.ticketsSold),
              revenuePercentage: item.revenue > 0 ? Math.round((vipRevenue / item.revenue) * 100) : 0
            },
            pista: {
              ticketsSold: item.ticketTypes.pista.ticketsSold,
              revenue: pistaRevenue,
              averageTicket: calculateAverageTicket(pistaRevenue, item.ticketTypes.pista.ticketsSold),
              revenuePercentage: item.revenue > 0 ? Math.round((pistaRevenue / item.revenue) * 100) : 0
            }
          },
          enumerable: false
        }
      });

      return metric as BatchMetricItem;
    })
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

function formatTimelineDateLabel(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}`;
}

function buildRangeKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  let cursor = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);

  while (cursor <= end) {
    keys.push(formatLocalDateKey(cursor));
    cursor = shiftDays(cursor, 1);
  }

  return keys;
}

export function calculateOperationalTimeline({
  sales,
  additionalRevenues = [],
  expenses = []
}: {
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "createdAt">>;
  additionalRevenues?: Array<Pick<MetricAdditionalRevenueWithDate, "amount" | "date">>;
  expenses?: Array<MetricExpenseTimelineInput>;
}) {
  const salesByDate = new Map<string, { tickets: number; revenue: number }>();
  const inflowByDate = new Map<string, number>();
  const expenseByDate = new Map<string, { amount: number; topCategory?: string | null; topTitle?: string }>();

  for (const sale of sales) {
    const date = normalizeMetricDate(sale.createdAt);

    if (!date) {
      continue;
    }

    const amount = getSaleAmount(sale);
    const currentSale = salesByDate.get(date) ?? { tickets: 0, revenue: 0 };

    currentSale.tickets += sale.quantity;
    currentSale.revenue += amount;
    salesByDate.set(date, currentSale);
    inflowByDate.set(date, (inflowByDate.get(date) ?? 0) + amount);
  }

  for (const additionalRevenue of additionalRevenues) {
    const date = normalizeMetricDate(additionalRevenue.date);

    if (!date || !Number.isFinite(additionalRevenue.amount) || additionalRevenue.amount <= 0) {
      continue;
    }

    inflowByDate.set(date, (inflowByDate.get(date) ?? 0) + additionalRevenue.amount);
  }

  for (const expense of expenses) {
    const date = normalizeMetricDate(expense.incurredAt);

    if (!date || !Number.isFinite(expense.amount) || expense.amount <= 0) {
      continue;
    }

    const currentExpense = expenseByDate.get(date) ?? { amount: 0, topCategory: null, topTitle: undefined };
    currentExpense.amount += expense.amount;

    const currentTopValue = currentExpense.topTitle || currentExpense.topCategory ? currentExpense.amount - expense.amount : 0;
    if (expense.amount >= currentTopValue) {
      currentExpense.topCategory = expense.category?.trim() || null;
      currentExpense.topTitle = expense.title?.trim() || undefined;
    }

    expenseByDate.set(date, currentExpense);
  }

  const salesDays = Array.from(salesByDate.entries())
    .map(([date, snapshot]) => ({ date, ...snapshot }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const inflowDays = Array.from(inflowByDate.entries())
    .map(([date, inflow]) => ({ date, inflow }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const expenseDays = Array.from(expenseByDate.entries())
    .map(([date, snapshot]) => ({ date, ...snapshot }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const events: OperationalTimelineEvent[] = [];
  const pushEvent = (event: OperationalTimelineEvent | null) => {
    if (!event || events.some((existing) => existing.id === event.id)) {
      return;
    }

    events.push(event);
  };

  const firstSaleDay = salesDays[0];
  if (firstSaleDay) {
    pushEvent({
      id: `sales-start-${firstSaleDay.date}`,
      date: firstSaleDay.date,
      category: "sales",
      title: "Inicio das vendas",
      description: `${formatTimelineDateLabel(firstSaleDay.date)} marcou as primeiras ${firstSaleDay.tickets} entrada(s) vendidas.`
    });
  }

  const peakSalesDay = salesDays.reduce<typeof salesDays[number] | null>((best, current) => {
    if (!best || current.tickets > best.tickets || (current.tickets === best.tickets && current.date < best.date)) {
      return current;
    }

    return best;
  }, null);

  if (peakSalesDay) {
    pushEvent({
      id: `sales-peak-${peakSalesDay.date}`,
      date: peakSalesDay.date,
      category: "sales",
      title: "Pico de vendas",
      description: `${peakSalesDay.tickets} ingresso(s) vendidos em ${formatTimelineDateLabel(peakSalesDay.date)}.`
    });
  }

  let accelerationCandidate: SalesAccelerationCandidate | undefined;
  let historicalTicketsTotal = 0;

  salesDays.forEach((day, index) => {
    if (index === 0) {
      historicalTicketsTotal += day.tickets;
      return;
    }

    const baseline = historicalTicketsTotal / index;
    const threshold = Math.max(Math.ceil(baseline * 1.6), Math.ceil(baseline) + 3);

    if (baseline > 0 && day.tickets >= threshold) {
      const score = day.tickets - baseline;
      if (
        !accelerationCandidate ||
        score > accelerationCandidate.score ||
        (score === accelerationCandidate.score && day.date < accelerationCandidate.date)
      ) {
        accelerationCandidate = {
          date: day.date,
          tickets: day.tickets,
          baseline,
          score
        };
      }
    }

    historicalTicketsTotal += day.tickets;
  });

  if (accelerationCandidate) {
    pushEvent({
      id: `sales-acceleration-${accelerationCandidate.date}`,
      date: accelerationCandidate.date,
      category: "sales",
      title: "Aceleracao de vendas",
      description: `${accelerationCandidate.tickets} ingresso(s) vendidos em ${formatTimelineDateLabel(
        accelerationCandidate.date
      )}, acima da media anterior de ${Math.round(accelerationCandidate.baseline)}.`
    });
  }

  const peakRevenueDay = inflowDays.reduce<typeof inflowDays[number] | null>((best, current) => {
    if (!best || current.inflow > best.inflow || (current.inflow === best.inflow && current.date < best.date)) {
      return current;
    }

    return best;
  }, null);

  if (peakRevenueDay) {
    pushEvent({
      id: `revenue-peak-${peakRevenueDay.date}`,
      date: peakRevenueDay.date,
      category: "revenue",
      title: "Pico de arrecadacao",
      description: `${formatTimelineDateLabel(peakRevenueDay.date)} gerou ${peakRevenueDay.inflow.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })} em receita.`
    });
  }

  const firstExpenseDay = expenseDays[0];
  if (firstExpenseDay) {
    pushEvent({
      id: `expense-start-${firstExpenseDay.date}`,
      date: firstExpenseDay.date,
      category: "expense",
      title: "Inicio dos custos",
      description: `As primeiras despesas apareceram em ${formatTimelineDateLabel(firstExpenseDay.date)}.`
    });
  }

  const positiveExpenseDays = expenseDays.filter((day) => day.amount > 0);
  const averageExpense = positiveExpenseDays.length
    ? positiveExpenseDays.reduce((sum, day) => sum + day.amount, 0) / positiveExpenseDays.length
    : 0;
  const expenseSpike = positiveExpenseDays.reduce<typeof positiveExpenseDays[number] | null>((best, current) => {
    const threshold = Math.max(averageExpense * 1.7, 1000);

    if (current.amount < threshold) {
      return best;
    }

    if (!best || current.amount > best.amount || (current.amount === best.amount && current.date < best.date)) {
      return current;
    }

    return best;
  }, null);

  if (expenseSpike) {
    const expenseContext = expenseSpike.topCategory || expenseSpike.topTitle
      ? ` em ${expenseSpike.topCategory ?? expenseSpike.topTitle}`
      : "";

    pushEvent({
      id: `expense-spike-${expenseSpike.date}`,
      date: expenseSpike.date,
      category: "expense",
      title: "Aumento de custos",
      description: `Despesa alta de ${expenseSpike.amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })}${expenseContext} em ${formatTimelineDateLabel(expenseSpike.date)}.`
    });
  }

  const firstActivityDate = [salesDays[0]?.date, inflowDays[0]?.date].filter(Boolean).sort()[0];
  const lastActivityDate = [salesDays.at(-1)?.date, inflowDays.at(-1)?.date].filter(Boolean).sort().at(-1);

  if (firstActivityDate && lastActivityDate && firstActivityDate < lastActivityDate) {
    const dateRange = buildRangeKeys(firstActivityDate, lastActivityDate);
    let bestGap: { start: string; end: string; length: number } | null = null;
    let currentGapStart: string | null = null;
    let currentGapLength = 0;

    for (const date of dateRange) {
      const hasSales = (salesByDate.get(date)?.tickets ?? 0) > 0;
      const hasInflow = (inflowByDate.get(date) ?? 0) > 0;

      if (!hasSales && !hasInflow) {
        currentGapStart ??= date;
        currentGapLength += 1;
        continue;
      }

      if (currentGapStart && currentGapLength >= 2) {
        const previousDateKey = formatLocalDateKey(shiftDays(new Date(`${date}T12:00:00`), -1));
        const currentGap = {
          start: currentGapStart,
          end: previousDateKey,
          length: currentGapLength
        };

        if (!bestGap || currentGap.length > bestGap.length) {
          bestGap = currentGap;
        }
      }

      currentGapStart = null;
      currentGapLength = 0;
    }

    if (currentGapStart && currentGapLength >= 2) {
      const currentGap = {
        start: currentGapStart,
        end: dateRange[dateRange.length - 1],
        length: currentGapLength
      };

      if (!bestGap || currentGap.length > bestGap.length) {
        bestGap = currentGap;
      }
    }

    if (bestGap) {
      pushEvent({
        id: `quiet-period-${bestGap.start}-${bestGap.end}`,
        date: bestGap.start,
        category: "attention",
        title: "Periodo de baixa atividade",
        description: `${bestGap.length} dia(s) seguidos sem venda relevante entre ${formatTimelineDateLabel(
          bestGap.start
        )} e ${formatTimelineDateLabel(bestGap.end)}.`
      });
    }
  }

  return events.sort((left, right) => left.date.localeCompare(right.date));
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

export function calculateExpenseCategoryInsights(
  items: MetricCategorizedAmount[],
  totalRevenue: number,
  eventCount: number,
  fallbackLabel = "Sem categoria"
) {
  return calculateCategoryBreakdown(items, fallbackLabel).map((item) => ({
    ...item,
    averagePerEvent: eventCount > 0 ? Math.round((item.total / eventCount) * 100) / 100 : 0,
    revenueShare: totalRevenue > 0 ? Math.round((item.total / totalRevenue) * 100) : 0
  })) satisfies PortfolioExpenseCategoryInsight[];
}

export function calculateMostEfficientPrice(
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice">>
) {
  const ranking = calculateSalePriceRanking(sales);

  if (ranking.length === 0) {
    return {
      unitPrice: 0,
      revenue: 0,
      ticketsSold: 0
    };
  }

  const pricedRows = ranking.map((entry) => ({
    unitPrice: entry.unitPrice,
    ticketsSold: entry.ticketsSold,
    revenue: entry.unitPrice * entry.ticketsSold
  }));

  pricedRows.sort((left, right) => {
    if (right.revenue !== left.revenue) {
      return right.revenue - left.revenue;
    }

    if (right.ticketsSold !== left.ticketsSold) {
      return right.ticketsSold - left.ticketsSold;
    }

    return left.unitPrice - right.unitPrice;
  });

  return pricedRows[0];
}

export function calculatePostEventReport(input: PostEventReportMetricInput) {
  const financeTotals = calculateFinanceTotals({
    sales: input.sales,
    expenses: input.expenses,
    additionalRevenues: input.additionalRevenues ?? []
  });
  const batchMetrics = calculateBatchMetrics(input.sales);
  const ticketTypeMetrics = calculateTicketTypeMetrics(input.sales);
  const saleTypeMetrics = calculateSaleTypeMetrics(input.sales);
  const expenseCategoryInsights = calculateExpenseCategoryInsights(
    input.expenses.map((expense) => ({
      category: expense.category,
      amount: expense.amount
    })),
    financeTotals.generalRevenue,
    1
  );
  const mostEfficientPrice = calculateMostEfficientPrice(input.sales);
  const bestBatch = batchMetrics[0] ?? {
    batchLabel: "Sem lote",
    ticketsSold: 0,
    revenue: 0,
    averageTicket: 0,
    percentage: 0
  };
  const dominantTicketType: "vip" | "pista" =
    ticketTypeMetrics.vip.revenue >= ticketTypeMetrics.pista.revenue ? "vip" : "pista";
  const dominantSaleType: "normal" | "grupo" =
    saleTypeMetrics.grupo.ticketsSold > saleTypeMetrics.normal.ticketsSold ? "grupo" : "normal";
  const dominantTicketRevenue =
    dominantTicketType === "vip" ? ticketTypeMetrics.vip.revenue : ticketTypeMetrics.pista.revenue;
  const dominantTicketRevenueShare =
    dominantTicketType === "vip"
      ? Math.round(
          financeTotals.ticketRevenue > 0 ? (ticketTypeMetrics.vip.revenue / financeTotals.ticketRevenue) * 100 : 0
        )
      : Math.round(
          financeTotals.ticketRevenue > 0 ? (ticketTypeMetrics.pista.revenue / financeTotals.ticketRevenue) * 100 : 0
        );
  const dominantSaleTypeShare =
    dominantSaleType === "grupo" ? saleTypeMetrics.grupo.percentage : saleTypeMetrics.normal.percentage;
  const marginPercentage =
    financeTotals.generalRevenue > 0 ? Math.round((financeTotals.estimatedProfit / financeTotals.generalRevenue) * 100) : 0;
  const expenseRatio =
    financeTotals.generalRevenue > 0 ? Math.round((financeTotals.totalExpenses / financeTotals.generalRevenue) * 100) : 0;
  const heaviestExpenseCategory = expenseCategoryInsights[0];
  const peerAverageTicket =
    typeof input.peerAverageTicket === "number" && Number.isFinite(input.peerAverageTicket)
      ? Math.round(input.peerAverageTicket * 100) / 100
      : null;
  const averageTicketDirection =
    peerAverageTicket === null
      ? null
      : financeTotals.averageTicket >= peerAverageTicket
        ? "acima"
        : "abaixo";

  const insights = [
    bestBatch.ticketsSold > 0
      ? `${bestBatch.batchLabel} foi responsavel por ${bestBatch.percentage}% das vendas.`
      : "Ainda nao existe um lote campeao para esta festa.",
    `${dominantTicketType === "vip" ? "VIP" : "PISTA"} concentrou ${dominantTicketRevenueShare}% da receita de ingressos.`,
    `As despesas consumiram ${expenseRatio}% da arrecadacao total.`,
    peerAverageTicket !== null
      ? `O ticket medio ficou ${averageTicketDirection} da media das outras festas (${peerAverageTicket.toFixed(2)}).`
      : "Ainda nao ha base suficiente para comparar o ticket medio com outras festas."
  ];

  return {
    overview: {
      totalRevenue: financeTotals.generalRevenue,
      ticketRevenue: financeTotals.ticketRevenue,
      additionalRevenue: financeTotals.additionalRevenue,
      totalExpenses: financeTotals.totalExpenses,
      estimatedProfit: financeTotals.estimatedProfit,
      averageTicket: financeTotals.averageTicket,
      totalTicketsSold: financeTotals.totalTicketsSold
    },
    commercial: {
      bestBatchLabel: bestBatch.batchLabel,
      bestBatchRevenue: bestBatch.revenue,
      bestBatchShare: bestBatch.percentage,
      dominantTicketType,
      dominantTicketRevenue,
      dominantTicketRevenueShare,
      dominantSaleType,
      dominantSaleTypeShare,
      mostEfficientPrice: mostEfficientPrice.unitPrice,
      mostEfficientPriceRevenue: mostEfficientPrice.revenue
    },
    financial: {
      topExpenseCategories: expenseCategoryInsights.slice(0, 3).map((item) => ({
        category: item.category,
        total: item.total
      })),
      heaviestExpenseCategory: heaviestExpenseCategory
        ? { category: heaviestExpenseCategory.category, total: heaviestExpenseCategory.total }
        : undefined,
      marginPercentage,
      expenseRatio
    },
    insights
  };
}
