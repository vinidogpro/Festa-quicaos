export type MetricPaymentStatus = "paid" | "pending";

export interface MetricSale {
  sellerUserId: string;
  quantity: number;
  unitPrice: number;
  paymentStatus: MetricPaymentStatus;
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
  const occurrences = new Map<number, number>();

  for (const sale of sales) {
    if (!Number.isFinite(sale.unitPrice) || !Number.isFinite(sale.quantity) || sale.quantity <= 0) {
      continue;
    }

    occurrences.set(sale.unitPrice, (occurrences.get(sale.unitPrice) ?? 0) + sale.quantity);
  }

  let modePrice = 0;
  let modeCount = 0;

  for (const [unitPrice, count] of occurrences.entries()) {
    if (count > modeCount || (count === modeCount && count > 0 && unitPrice < modePrice)) {
      modePrice = unitPrice;
      modeCount = count;
    }
  }

  return {
    modePrice,
    modeCount
  };
}

export function calculateFinanceTotals({
  sales,
  expenses,
  additionalRevenues
}: {
  sales: Array<Pick<MetricSale, "quantity" | "unitPrice" | "paymentStatus">>;
  expenses: Array<Pick<MetricExpense, "amount">>;
  additionalRevenues?: Array<Pick<MetricAdditionalRevenue, "amount">>;
}) {
  const ticketRevenue = sales.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
  const additionalRevenue = (additionalRevenues ?? []).reduce((sum, revenue) => sum + revenue.amount, 0);
  const totalRevenue = ticketRevenue + additionalRevenue;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const estimatedProfit = totalRevenue - totalExpenses;
  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const pendingPaymentsCount = sales.filter((sale) => sale.paymentStatus === "pending").length;
  const confirmedPaymentsCount = sales.filter((sale) => sale.paymentStatus === "paid").length;
  const paidValue = sales
    .filter((sale) => sale.paymentStatus === "paid")
    .reduce((sum, sale) => sum + getSaleAmount(sale), 0);
  const pendingValue = sales
    .filter((sale) => sale.paymentStatus === "pending")
    .reduce((sum, sale) => sum + getSaleAmount(sale), 0);
  const { modePrice, modeCount } = calculateSalePriceMode(sales);

  return {
    grossSoldRevenue: ticketRevenue,
    ticketRevenue,
    averageTicket: calculateAverageTicket(ticketRevenue, totalTicketsSold),
    modeTicketPrice: modePrice,
    modeTicketPriceCount: modeCount,
    additionalRevenue,
    confirmedRevenue: paidValue,
    pendingRevenue: pendingValue,
    generalRevenue: totalRevenue,
    totalRevenue,
    totalExpenses,
    estimatedProfit,
    totalTicketsSold,
    pendingPaymentsCount,
    confirmedPaymentsCount,
    paidValue,
    pendingValue
  };
}

export function calculateSellerMetrics(
  sales: Array<Pick<MetricSale, "sellerUserId" | "quantity" | "unitPrice" | "paymentStatus">>
) {
  const metrics = new Map<
    string,
    {
      ticketsSold: number;
      revenue: number;
      pendingTransferAmount: number;
      confirmedValue: number;
    }
  >();

  for (const sale of sales) {
    const current = metrics.get(sale.sellerUserId) ?? {
      ticketsSold: 0,
      revenue: 0,
      pendingTransferAmount: 0,
      confirmedValue: 0
    };
    const saleAmount = getSaleAmount(sale);

    current.ticketsSold += sale.quantity;
    current.revenue += saleAmount;

    if (sale.paymentStatus === "pending") {
      current.pendingTransferAmount += saleAmount;
    } else {
      current.confirmedValue += saleAmount;
    }

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
