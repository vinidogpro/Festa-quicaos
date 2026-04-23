import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  calculateBatchMetrics,
  calculateCashFlowByDate,
  calculateCategoryBreakdown,
  calculateFinanceTotals,
  calculateGoalProgress,
  calculatePostEventReport,
  calculateTicketTypeMetrics
} from "@/lib/event-metrics";
import { buildGuestListEntries, buildSaleSequenceMap } from "@/lib/guest-list-utils";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatSaleTypeLabel, formatTicketTypeLabel } from "@/lib/utils";

export const runtime = "nodejs";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type EventBatchRow = Database["public"]["Tables"]["event_batches"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type AdditionalRevenueRow = Database["public"]["Tables"]["additional_revenues"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
type ManualGuestEntryRow = Database["public"]["Tables"]["manual_guest_entries"]["Row"];

const HEADER_FILL = "1E293B";
const HEADER_FONT = "FFFFFF";
const BORDER_COLOR = "CBD5E1";
const ZEBRA_FILL = "F8FAFC";
const TOTAL_FILL = "E2E8F0";
const SUMMARY_FILL = "F1F5F9";
const POSITIVE_FONT = "166534";
const NEGATIVE_FONT = "881337";
const EXPENSE_FONT = "9F1239";
const VIP_FILL = "FEF3C7";
const VIP_FONT = "92400E";
const PISTA_FILL = "881337";
const PISTA_FONT = "FFFFFF";
const MANUAL_FILL = "E2E8F0";
const MANUAL_FONT = "334155";

function csvEscape(value: string | number) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function formatShortDate(date?: string | null) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}

function applyBorders(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } }
    };
  });
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL }
    };
    cell.font = {
      color: { argb: HEADER_FONT },
      bold: true
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center"
    };
  });
  applyBorders(row);
}

function styleBodyRow(row: ExcelJS.Row, rowIndex: number) {
  if (rowIndex % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: ZEBRA_FILL }
      };
    });
  }

  row.eachCell((cell) => {
    cell.font = cell.font ?? { color: { argb: "0F172A" } };
    cell.alignment = cell.alignment ?? { vertical: "top", horizontal: "left", wrapText: true };
  });

  applyBorders(row);
}

function styleTotalRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: TOTAL_FILL }
    };
    cell.font = {
      ...(cell.font ?? {}),
      bold: true,
      color: { argb: "0F172A" }
    };
  });
  applyBorders(row);
}

function styleSectionLabelRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SUMMARY_FILL }
    };
    cell.font = {
      bold: true,
      color: { argb: "0F172A" }
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left"
    };
  });
  applyBorders(row);
}

function styleCurrencyCell(cell: ExcelJS.Cell, tone: "default" | "positive" | "negative" | "expense" = "default") {
  cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
  cell.alignment = {
    vertical: "middle",
    horizontal: "right"
  };

  if (tone === "positive") {
    cell.font = { ...(cell.font ?? {}), color: { argb: POSITIVE_FONT } };
  } else if (tone === "negative") {
    cell.font = { ...(cell.font ?? {}), color: { argb: NEGATIVE_FONT } };
  } else if (tone === "expense") {
    cell.font = { ...(cell.font ?? {}), color: { argb: EXPENSE_FONT } };
  }
}

function styleNumericCell(cell: ExcelJS.Cell) {
  cell.alignment = {
    vertical: "middle",
    horizontal: "right"
  };
}

function styleCenteredCell(cell: ExcelJS.Cell) {
  cell.alignment = {
    vertical: "middle",
    horizontal: "center"
  };
}

function styleTextCell(cell: ExcelJS.Cell) {
  cell.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true
  };
}

function styleTicketTypeCell(cell: ExcelJS.Cell) {
  const value = String(cell.value ?? "").toUpperCase();

  if (value === "VIP") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VIP_FILL } };
    cell.font = { ...(cell.font ?? {}), color: { argb: VIP_FONT }, bold: true };
  } else if (value === "PISTA") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PISTA_FILL } };
    cell.font = { ...(cell.font ?? {}), color: { argb: PISTA_FONT }, bold: true };
  } else if (value === "MANUAL") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MANUAL_FILL } };
    cell.font = { ...(cell.font ?? {}), color: { argb: MANUAL_FONT }, bold: true };
  }

  styleCenteredCell(cell);
}

function autoFitColumns(worksheet: ExcelJS.Worksheet, minimumWidth = 12, maximumWidth = 36) {
  worksheet.columns = worksheet.columns.map((column) => {
    let maxLength = minimumWidth;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      let text = "";

      if (typeof value === "object" && value && "richText" in value) {
        text = value.richText.map((item) => item.text).join("");
      } else {
        text = value == null ? "" : String(value);
      }

      maxLength = Math.max(maxLength, text.length + 2);
    });

    column.width = Math.min(Math.max(maxLength, minimumWidth), maximumWidth);
    return column;
  });
}

function buildCsv(rows: Array<Array<string | number>>) {
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(";")).join("\n")}`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const supabase = createSupabaseRouteClient() as any;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessao expirada. Entre novamente para exportar." }, { status: 401 });
  }

  const [{ data: event, error: eventError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("events").select("id, name, slug, status, venue, event_date, goal_value").eq("slug", params.id).single(),
    supabase.from("profiles").select("id, role").eq("id", user.id).single()
  ]);

  if (eventError || profileError || !event || !profile) {
    return NextResponse.json({ error: "Nao foi possivel carregar os dados da exportacao." }, { status: 404 });
  }

  const [
    { data: memberships, error: membershipsError },
    { data: eventBatches, error: eventBatchesError },
    { data: sales, error: salesError }
  ] = await Promise.all([
    supabase.from("event_memberships").select("user_id, role").eq("event_id", event.id),
    supabase.from("event_batches").select("id, name, created_at").eq("event_id", event.id),
    supabase
      .from("sales")
      .select(
        "id, seller_user_id, batch_id, sale_type, quantity, unit_price, ticket_type, sold_at, created_at, notes"
      )
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
  ]);

  if (membershipsError || eventBatchesError || salesError) {
    return NextResponse.json(
      {
        error:
          membershipsError?.message ||
          eventBatchesError?.message ||
          salesError?.message ||
          "Nao foi possivel carregar os dados da exportacao."
      },
      { status: 500 }
    );
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];
  const eventBatchRows = (eventBatches ?? []) as EventBatchRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const batchNameMap = new Map(eventBatchRows.map((batch) => [batch.id, batch.name]));
  const viewerMembership = membershipRows.find((membership) => membership.user_id === user.id);

  if (!viewerMembership && profile.role !== "host") {
    return NextResponse.json({ error: "Voce nao tem acesso a este evento." }, { status: 403 });
  }

  const isManager = profile.role === "host" || viewerMembership?.role === "host" || viewerMembership?.role === "organizer";
  const canViewManualGuests = profile.role === "host" || viewerMembership?.role === "host";

  const [{ data: expenses, error: expensesError }, { data: additionalRevenues, error: additionalRevenuesError }] =
    await Promise.all([
      isManager
        ? supabase
            .from("expenses")
            .select("id, title, amount, category, incurred_at, notes")
            .eq("event_id", event.id)
            .order("incurred_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      isManager
        ? supabase
            .from("additional_revenues")
            .select("id, title, amount, category, date, created_at")
            .eq("event_id", event.id)
            .order("date", { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

  if (expensesError || additionalRevenuesError) {
    return NextResponse.json(
      {
        error:
          expensesError?.message ||
          additionalRevenuesError?.message ||
          "Nao foi possivel carregar os dados financeiros da exportacao."
      },
      { status: 500 }
    );
  }

  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const additionalRevenueRows = (additionalRevenues ?? []) as AdditionalRevenueRow[];

  const profileIds = [...new Set(salesRows.map((sale) => sale.seller_user_id).filter(Boolean).concat(user.id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));
  const summarySales = salesRows;
  const detailSales = isManager ? salesRows : salesRows.filter((sale) => sale.seller_user_id === user.id);

  const financeTotals = calculateFinanceTotals({
    sales: summarySales.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price
    })),
    expenses: expenseRows.map((expense) => ({
      amount: expense.amount
    })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({
      amount: revenue.amount
    }))
  });

  const ticketTypeMetrics = calculateTicketTypeMetrics(
    summarySales.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      ticketType: sale.ticket_type
    }))
  );
  const percentGoal = calculateGoalProgress(financeTotals.generalRevenue, event.goal_value ?? 0);
  const postEventReport = calculatePostEventReport({
    eventId: event.slug,
    eventName: event.name,
    eventDate: event.event_date,
    status: event.status,
    goalValue: event.goal_value,
    sales: summarySales.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      batchLabel: batchNameMap.get(sale.batch_id) ?? "Sem lote",
      saleType: sale.sale_type,
      ticketType: sale.ticket_type
    })),
    expenses: expenseRows.map((expense) => ({
      amount: expense.amount,
      category: expense.category
    })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({
      amount: revenue.amount,
      category: revenue.category
    }))
  });
  const expenseCategories = calculateCategoryBreakdown(
    expenseRows.map((expense) => ({
      category: expense.category,
      amount: expense.amount
    })),
    "Sem categoria"
  );
  const additionalRevenueCategories = calculateCategoryBreakdown(
    additionalRevenueRows.map((revenue) => ({
      category: revenue.category,
      amount: revenue.amount
    })),
    "Sem categoria"
  );
  const cashFlowRows = calculateCashFlowByDate({
    sales: summarySales.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      createdAt: sale.sold_at || sale.created_at
    })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({
      amount: revenue.amount,
      date: revenue.date || revenue.created_at
    })),
    expenses: expenseRows.map((expense) => ({
      amount: expense.amount,
      incurredAt: expense.incurred_at
    }))
  });

  if (format === "csv") {
    const rows: Array<Array<string | number>> = [
      ["Resumo financeiro", event.name],
      ["Evento", event.name],
      ["Local", event.venue ?? "-"],
      ["Data", event.event_date ? formatDate(event.event_date) : "-"],
      [""],
      ["Indicador", "Valor"],
      ["Total vendido", formatCurrency(financeTotals.grossSoldRevenue)],
      ["Vendas extras", formatCurrency(financeTotals.additionalRevenue)],
      ["Total arrecadado", formatCurrency(financeTotals.generalRevenue)],
      ["Despesas", formatCurrency(financeTotals.totalExpenses)],
      ["Lucro final", formatCurrency(financeTotals.estimatedProfit)],
      ["Ticket medio geral", formatCurrency(financeTotals.averageTicket)],
      ["Meta atingida", `${percentGoal}%`],
      [""],
      ["Relatorio pos-evento", ""],
      ["Lote campeao", postEventReport.commercial.bestBatchLabel],
      ["Tipo dominante", postEventReport.commercial.dominantTicketType === "vip" ? "VIP" : "PISTA"],
      ["Preco mais eficiente", formatCurrency(postEventReport.commercial.mostEfficientPrice)],
      ["Margem", `${postEventReport.financial.marginPercentage}%`],
      [""],
      ["Tipo ingresso", "Ingressos", "Receita", "Ticket medio"],
      [
        "VIP",
        ticketTypeMetrics.vip.ticketsSold,
        formatCurrency(ticketTypeMetrics.vip.revenue),
        formatCurrency(ticketTypeMetrics.vip.averageTicket)
      ],
      [
        "PISTA",
        ticketTypeMetrics.pista.ticketsSold,
        formatCurrency(ticketTypeMetrics.pista.revenue),
        formatCurrency(ticketTypeMetrics.pista.averageTicket)
      ]
    ];

    if (isManager) {
      rows.push(
        [""],
        ["Categoria despesa", "Subtotal"],
        ...expenseCategories.map((item) => [item.category, formatCurrency(item.total)]),
        [""],
        ["Categoria arrecadacao extra", "Subtotal"],
        ...additionalRevenueCategories.map((item) => [item.category, formatCurrency(item.total)]),
        [""],
        ["Fluxo de caixa", ""],
        ["Data", "Entradas", "Saidas", "Saldo", "Saldo acumulado"],
        ...cashFlowRows.map((item) => [
          formatShortDate(item.date),
          formatCurrency(item.inflow),
          formatCurrency(item.outflow),
          formatCurrency(item.balance),
          formatCurrency(item.cumulativeBalance)
        ])
      );
    }

    const csv = buildCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="resumo-${event.slug}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  }

  const [{ data: attendees, error: attendeesError }, manualEntriesResult] = await Promise.all([
    supabase
      .from("sale_attendees")
      .select("id, sale_id, seller_user_id, guest_name, checked_in_at, created_at")
      .eq("event_id", event.id)
      .order("guest_name", { ascending: true }),
    canViewManualGuests
      ? supabase
          .from("manual_guest_entries")
          .select("id, guest_name, notes, created_at")
          .eq("event_id", event.id)
          .order("guest_name", { ascending: true })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (attendeesError || manualEntriesResult.error) {
    return NextResponse.json(
      {
        error:
          attendeesError?.message ||
          manualEntriesResult.error?.message ||
          "Nao foi possivel carregar os nomes da exportacao."
      },
      { status: 500 }
    );
  }

  const attendeeRows = (attendees ?? []) as SaleAttendeeRow[];
  const manualGuestRows = (manualEntriesResult.data ?? []) as ManualGuestEntryRow[];

  const guestListEntries = buildGuestListEntries({
    saleAttendeeRows: attendeeRows,
    salesRows: salesRows.map((sale) => ({
      id: sale.id,
      seller_user_id: sale.seller_user_id,
      batch_id: sale.batch_id,
      sale_type: sale.sale_type,
      unit_price: sale.unit_price,
      ticket_type: sale.ticket_type,
      created_at: sale.created_at
    })),
    manualGuestEntryRows: manualGuestRows.map((entry) => ({
      id: entry.id,
      guest_name: entry.guest_name,
      notes: entry.notes,
      created_at: entry.created_at
    })),
    batchNameMap,
    profilesMap: new Map(Array.from(profileMap.entries()).map(([id, item]) => [id, { full_name: item.full_name }])),
    viewerId: user.id,
    canManageOwnSalesOnly: !isManager,
    canViewManualGuests
  });

  const saleSequenceMap = buildSaleSequenceMap(
    summarySales.map((sale) => ({
      id: sale.id,
      created_at: sale.created_at
    }))
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FESTAS";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Resumo financeiro", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  const summaryHeader = summarySheet.addRow(["Indicador", "Valor"]);
  styleHeaderRow(summaryHeader);

  const summaryRows: Array<[string, string | number, "currency" | "percent" | "text", "default" | "positive" | "negative" | "expense"]> =
    [
      ["Evento", event.name, "text", "default"],
      ["Local", event.venue ?? "-", "text", "default"],
      ["Data da festa", event.event_date ? formatDate(event.event_date) : "-", "text", "default"],
      ["Total vendido", financeTotals.grossSoldRevenue, "currency", "default"],
      ["Vendas extras", financeTotals.additionalRevenue, "currency", "positive"],
      ["Total arrecadado", financeTotals.generalRevenue, "currency", "positive"],
      ["Despesas totais", financeTotals.totalExpenses, "currency", "expense"],
      [
        "Lucro final",
        financeTotals.estimatedProfit,
        "currency",
        financeTotals.estimatedProfit > 0 ? "positive" : financeTotals.estimatedProfit < 0 ? "negative" : "default"
      ],
      ["Ticket medio geral", financeTotals.averageTicket, "currency", "default"],
      ["Meta atingida", `${percentGoal}%`, "text", "default"]
    ];

  summaryRows.forEach((item, index) => {
    const row = summarySheet.addRow([item[0], item[1]]);
    styleBodyRow(row, index + 1);
    styleTextCell(row.getCell(1));

    if (item[2] === "currency" && typeof item[1] === "number") {
      styleCurrencyCell(row.getCell(2), item[3]);
    } else {
      styleTextCell(row.getCell(2));
    }
  });

  const summaryTotalRow = summarySheet.addRow(["Resultado consolidado", financeTotals.generalRevenue - financeTotals.totalExpenses]);
  styleTotalRow(summaryTotalRow);
  styleTextCell(summaryTotalRow.getCell(1));
  styleCurrencyCell(
    summaryTotalRow.getCell(2),
    financeTotals.estimatedProfit > 0 ? "positive" : financeTotals.estimatedProfit < 0 ? "negative" : "default"
  );

  summarySheet.addRow([]);
  const ticketTypeLabelRow = summarySheet.addRow(["VIP vs PISTA", ""]);
  styleSectionLabelRow(ticketTypeLabelRow);
  const ticketTypeHeader = summarySheet.addRow(["Tipo", "Ingressos", "Receita", "Ticket medio"]);
  styleHeaderRow(ticketTypeHeader);

  [
    ["VIP", ticketTypeMetrics.vip.ticketsSold, ticketTypeMetrics.vip.revenue, ticketTypeMetrics.vip.averageTicket],
    ["PISTA", ticketTypeMetrics.pista.ticketsSold, ticketTypeMetrics.pista.revenue, ticketTypeMetrics.pista.averageTicket]
  ].forEach((item, index) => {
    const row = summarySheet.addRow(item);
    styleBodyRow(row, index + 1);
    styleTicketTypeCell(row.getCell(1));
    styleCenteredCell(row.getCell(2));
    styleCurrencyCell(row.getCell(3), "default");
    styleCurrencyCell(row.getCell(4), "default");
  });

  summarySheet.addRow([]);
  const postEventLabelRow = summarySheet.addRow(["Relatorio pos-evento", ""]);
  styleSectionLabelRow(postEventLabelRow);
  const postEventHeader = summarySheet.addRow(["Leitura", "Valor"]);
  styleHeaderRow(postEventHeader);

  [
    ["Lote campeao", postEventReport.commercial.bestBatchLabel],
    ["Tipo dominante", postEventReport.commercial.dominantTicketType === "vip" ? "VIP" : "PISTA"],
    ["Preco mais eficiente", postEventReport.commercial.mostEfficientPrice],
    ["Tipo de venda dominante", postEventReport.commercial.dominantSaleType === "grupo" ? "Grupo" : "Normal"],
    ["Margem da festa", `${postEventReport.financial.marginPercentage}%`],
    ["Despesas sobre receita", `${postEventReport.financial.expenseRatio}%`]
  ].forEach(([label, value], index) => {
    const row = summarySheet.addRow([label, value]);
    styleBodyRow(row, index + 1);
    styleTextCell(row.getCell(1));
    if (typeof value === "number") {
      styleCurrencyCell(row.getCell(2), "default");
    } else {
      styleTextCell(row.getCell(2));
    }
  });

  if (isManager) {
    summarySheet.addRow([]);
    const expenseLabelRow = summarySheet.addRow(["Categorias de despesas", ""]);
    styleSectionLabelRow(expenseLabelRow);
    const expenseHeader = summarySheet.addRow(["Categoria", "Subtotal", "Participacao"]);
    styleHeaderRow(expenseHeader);

    expenseCategories.forEach((item, index) => {
      const row = summarySheet.addRow([item.category, item.total, `${item.percentage}%`]);
      styleBodyRow(row, index + 1);
      styleTextCell(row.getCell(1));
      styleCurrencyCell(row.getCell(2), "expense");
      styleCenteredCell(row.getCell(3));
    });

    if (expenseCategories.length > 0) {
      const row = summarySheet.addRow(["Total despesas", financeTotals.totalExpenses, "100%"]);
      styleTotalRow(row);
      styleTextCell(row.getCell(1));
      styleCurrencyCell(row.getCell(2), "expense");
      styleCenteredCell(row.getCell(3));
    }

    summarySheet.addRow([]);
    const additionalLabelRow = summarySheet.addRow(["Categorias de arrecadacao extra", ""]);
    styleSectionLabelRow(additionalLabelRow);
    const additionalHeader = summarySheet.addRow(["Categoria", "Subtotal", "Participacao"]);
    styleHeaderRow(additionalHeader);

    additionalRevenueCategories.forEach((item, index) => {
      const row = summarySheet.addRow([item.category, item.total, `${item.percentage}%`]);
      styleBodyRow(row, index + 1);
      styleTextCell(row.getCell(1));
      styleCurrencyCell(row.getCell(2), "positive");
      styleCenteredCell(row.getCell(3));
    });

    if (additionalRevenueCategories.length > 0) {
      const row = summarySheet.addRow(["Total arrecadacao extra", financeTotals.additionalRevenue, "100%"]);
      styleTotalRow(row);
      styleTextCell(row.getCell(1));
      styleCurrencyCell(row.getCell(2), "positive");
      styleCenteredCell(row.getCell(3));
    }

    summarySheet.addRow([]);
    const cashFlowLabelRow = summarySheet.addRow(["Fluxo de caixa por data", ""]);
    styleSectionLabelRow(cashFlowLabelRow);
    const cashFlowHeader = summarySheet.addRow(["Data", "Entradas", "Saidas", "Saldo do dia", "Saldo acumulado"]);
    styleHeaderRow(cashFlowHeader);

    cashFlowRows.forEach((item, index) => {
      const row = summarySheet.addRow([formatShortDate(item.date), item.inflow, item.outflow, item.balance, item.cumulativeBalance]);
      styleBodyRow(row, index + 1);
      styleTextCell(row.getCell(1));
      styleCurrencyCell(row.getCell(2), "positive");
      styleCurrencyCell(row.getCell(3), "expense");
      styleCurrencyCell(row.getCell(4), item.balance < 0 ? "negative" : item.balance > 0 ? "positive" : "default");
      styleCurrencyCell(
        row.getCell(5),
        item.cumulativeBalance < 0 ? "negative" : item.cumulativeBalance > 0 ? "positive" : "default"
      );
    });
  }

  summarySheet.getColumn(1).width = 26;
  summarySheet.getColumn(2).width = 22;
  summarySheet.getColumn(3).width = 18;
  summarySheet.getColumn(4).width = 18;
  summarySheet.getColumn(5).width = 18;

  const salesSheet = workbook.addWorksheet("Lista de vendas", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  const salesHeader = salesSheet.addRow([
    "Venda #",
    "Vendedor",
    "Lote",
    "Tipo da venda",
    "Tipo ingresso",
    "Quantidade",
    "Valor unitario",
    "Valor total",
    "Data",
    "Observacoes"
  ]);
  styleHeaderRow(salesHeader);

  detailSales.forEach((sale, index) => {
    const row = salesSheet.addRow([
      saleSequenceMap.get(sale.id) ?? 0,
      profileMap.get(sale.seller_user_id)?.full_name ?? "Vendedor",
      batchNameMap.get(sale.batch_id) ?? "Sem lote",
      formatSaleTypeLabel(sale.sale_type),
      formatTicketTypeLabel(sale.ticket_type),
      sale.quantity,
      sale.unit_price,
      sale.quantity * sale.unit_price,
      formatShortDate(sale.sold_at || sale.created_at),
      sale.notes ?? ""
    ]);

    styleBodyRow(row, index + 1);
    styleCenteredCell(row.getCell(1));
    styleTextCell(row.getCell(2));
    styleTextCell(row.getCell(3));
    styleCenteredCell(row.getCell(4));
    styleTicketTypeCell(row.getCell(5));
    styleCenteredCell(row.getCell(6));
    styleCurrencyCell(row.getCell(7), "default");
    styleCurrencyCell(row.getCell(8), "positive");
    styleCenteredCell(row.getCell(9));
    styleTextCell(row.getCell(10));
  });

  if (detailSales.length > 0) {
    const totalRow = salesSheet.addRow([
      "",
      "TOTAL",
      "",
      "",
      "",
      detailSales.reduce((sum, sale) => sum + sale.quantity, 0),
      "",
      detailSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0),
      "",
      ""
    ]);
    styleTotalRow(totalRow);
    styleTextCell(totalRow.getCell(2));
    styleCenteredCell(totalRow.getCell(6));
    styleCurrencyCell(totalRow.getCell(8), "positive");
  }

  autoFitColumns(salesSheet, 12, 28);

  const reportSheet = workbook.addWorksheet("Relatorio pos-evento", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  styleHeaderRow(reportSheet.addRow(["Bloco", "Indicador", "Valor"]));

  const reportRows: Array<[string, string, string | number, "currency" | "text"]> = [
    ["Resumo geral", "Total arrecadado", postEventReport.overview.totalRevenue, "currency"],
    ["Resumo geral", "Despesas", postEventReport.overview.totalExpenses, "currency"],
    ["Resumo geral", "Lucro final", postEventReport.overview.estimatedProfit, "currency"],
    ["Resumo geral", "Ticket medio", postEventReport.overview.averageTicket, "currency"],
    ["Resumo geral", "Ingressos vendidos", postEventReport.overview.totalTicketsSold, "text"],
    ["Analise comercial", "Lote campeao", postEventReport.commercial.bestBatchLabel, "text"],
    [
      "Analise comercial",
      "Tipo mais forte",
      postEventReport.commercial.dominantTicketType === "vip" ? "VIP" : "PISTA",
      "text"
    ],
    ["Analise comercial", "Preco mais eficiente", postEventReport.commercial.mostEfficientPrice, "currency"],
    ["Analise financeira", "Margem", `${postEventReport.financial.marginPercentage}%`, "text"],
    [
      "Analise financeira",
      "Categoria que mais impactou",
      postEventReport.financial.heaviestExpenseCategory?.category ?? "Sem categoria dominante",
      "text"
    ],
    [
      "Analise financeira",
      "Principal despesa",
      postEventReport.financial.heaviestExpenseCategory?.total ?? 0,
      "currency"
    ]
  ];

  reportRows.forEach(([block, label, value, valueType], index) => {
    const row = reportSheet.addRow([block, label, value]);
    styleBodyRow(row, index + 1);
    styleTextCell(row.getCell(1));
    styleTextCell(row.getCell(2));
    if (valueType === "currency" && typeof value === "number") {
      styleCurrencyCell(
        row.getCell(3),
        label === "Despesas" || label === "Principal despesa"
          ? "expense"
          : label === "Lucro final" && value < 0
            ? "negative"
            : label === "Lucro final" && value > 0
              ? "positive"
              : "default"
      );
    } else {
      styleTextCell(row.getCell(3));
    }
  });

  reportSheet.addRow([]);
  const insightLabelRow = reportSheet.addRow(["Insights automaticos", "", ""]);
  styleSectionLabelRow(insightLabelRow);
  styleHeaderRow(reportSheet.addRow(["#", "Insight", "Base"]));

  postEventReport.insights.forEach((insight, index) => {
    const row = reportSheet.addRow([index + 1, insight, event.name]);
    styleBodyRow(row, index + 1);
    styleCenteredCell(row.getCell(1));
    styleTextCell(row.getCell(2));
    styleTextCell(row.getCell(3));
  });

  autoFitColumns(reportSheet, 12, 34);

  const guestListSheet = workbook.addWorksheet("Lista de nomes", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  const guestListHeader = guestListSheet.addRow([
    "Nome",
    "Venda #",
    "Tipo ingresso",
    "Lote",
    "Tipo da venda",
    "Vendedor",
    "Valor por ingresso",
    "Origem",
    "Observacao"
  ]);
  styleHeaderRow(guestListHeader);

  guestListEntries.forEach((entry, index) => {
    const ticketTypeValue = entry.sourceType === "manual" ? "MANUAL" : formatTicketTypeLabel(entry.ticketType ?? "pista");
    const row = guestListSheet.addRow([
      entry.guestName,
      entry.saleNumber ? `Venda #${entry.saleNumber}` : "",
      ticketTypeValue,
      entry.batchLabel ?? "",
      entry.saleType ? formatSaleTypeLabel(entry.saleType) : "",
      entry.sellerName,
      entry.sourceType === "sale" ? entry.unitPrice ?? 0 : "",
      entry.sourceType === "manual" ? "Manual" : "Venda",
      entry.notes ?? ""
    ]);

    styleBodyRow(row, index + 1);
    styleTextCell(row.getCell(1));
    styleCenteredCell(row.getCell(2));
    styleTicketTypeCell(row.getCell(3));
    styleTextCell(row.getCell(4));
    styleCenteredCell(row.getCell(5));
    styleTextCell(row.getCell(6));

    if (entry.sourceType === "sale") {
      styleCurrencyCell(row.getCell(7), "default");
    } else {
      styleTextCell(row.getCell(7));
    }

    styleCenteredCell(row.getCell(8));
    styleTextCell(row.getCell(9));
  });

  if (guestListEntries.length > 0) {
    const totalRow = guestListSheet.addRow(["TOTAL", "", "", "", "", guestListEntries.length, "", "", ""]);
    styleTotalRow(totalRow);
    styleTextCell(totalRow.getCell(1));
    styleCenteredCell(totalRow.getCell(6));
  }

  autoFitColumns(guestListSheet, 12, 30);

  if (isManager) {
    const expensesSheet = workbook.addWorksheet("Despesas", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    const expensesHeader = expensesSheet.addRow(["Descricao", "Categoria", "Valor", "Data", "Observacoes"]);
    styleHeaderRow(expensesHeader);

    expenseRows.forEach((expense, index) => {
      const row = expensesSheet.addRow([
        expense.title,
        expense.category ?? "Sem categoria",
        expense.amount,
        formatShortDate(expense.incurred_at),
        expense.notes ?? ""
      ]);
      styleBodyRow(row, index + 1);
      styleTextCell(row.getCell(1));
      styleTextCell(row.getCell(2));
      styleCurrencyCell(row.getCell(3), "expense");
      styleCenteredCell(row.getCell(4));
      styleTextCell(row.getCell(5));
    });

    if (expenseRows.length > 0) {
      const totalRow = expensesSheet.addRow(["TOTAL", "", financeTotals.totalExpenses, "", ""]);
      styleTotalRow(totalRow);
      styleTextCell(totalRow.getCell(1));
      styleCurrencyCell(totalRow.getCell(3), "expense");
    }

    autoFitColumns(expensesSheet, 12, 28);

    const extrasSheet = workbook.addWorksheet("Arrecadacoes extras", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    const extrasHeader = extrasSheet.addRow(["Descricao", "Categoria", "Valor", "Data"]);
    styleHeaderRow(extrasHeader);

    additionalRevenueRows.forEach((revenue, index) => {
      const row = extrasSheet.addRow([
        revenue.title,
        revenue.category ?? "Sem categoria",
        revenue.amount,
        formatShortDate(revenue.date || revenue.created_at)
      ]);
      styleBodyRow(row, index + 1);
      styleTextCell(row.getCell(1));
      styleTextCell(row.getCell(2));
      styleCurrencyCell(row.getCell(3), "positive");
      styleCenteredCell(row.getCell(4));
    });

    if (additionalRevenueRows.length > 0) {
      const totalRow = extrasSheet.addRow(["TOTAL", "", financeTotals.additionalRevenue, ""]);
      styleTotalRow(totalRow);
      styleTextCell(totalRow.getCell(1));
      styleCurrencyCell(totalRow.getCell(3), "positive");
    }

    autoFitColumns(extrasSheet, 12, 28);
  }

  const workbookBuffer = await workbook.xlsx.writeBuffer();
  const xlsxBuffer = Buffer.isBuffer(workbookBuffer) ? workbookBuffer : Buffer.from(workbookBuffer);

  return new NextResponse(xlsxBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="resumo-${event.slug}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
