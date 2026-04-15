export interface MetricSale {
  sellerUserId: string;
  quantity: number;
  unitPrice: number;
  attendeeCount?: number;
}

export interface MetricExpense {
  amount: number;
}

export interface MetricAdditionalRevenue {
  amount: number;
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
