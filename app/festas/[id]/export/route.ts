import { NextResponse } from "next/server";
import { calculateFinanceTotals, calculateGoalProgress } from "@/lib/event-metrics";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";
import { formatCurrency } from "@/lib/utils";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type AdditionalRevenueRow = Database["public"]["Tables"]["additional_revenues"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function csvEscape(value: string | number) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Array<Array<string | number>>) {
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(";")).join("\n")}`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseRouteClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessao expirada. Entre novamente para exportar." }, { status: 401 });
  }

  const [{ data: event, error: eventError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("events").select("id, name, slug, venue, event_date, goal_value").eq("slug", params.id).single(),
    supabase.from("profiles").select("id, role").eq("id", user.id).single()
  ]);

  if (eventError || !event) {
    return NextResponse.json({ error: "Evento nao encontrado." }, { status: 404 });
  }

  if (profileError || !profile) {
    return NextResponse.json({ error: "Perfil do usuario nao encontrado." }, { status: 403 });
  }

  const [
    { data: memberships, error: membershipsError },
    { data: sales, error: salesError },
    { data: expenses, error: expensesError },
    { data: additionalRevenues, error: additionalRevenuesError }
  ] = await Promise.all([
    supabase.from("event_memberships").select("id, user_id, role").eq("event_id", event.id),
    supabase
      .from("sales")
      .select("id, seller_user_id, quantity, unit_price, payment_status")
      .eq("event_id", event.id)
      .order("sold_at", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, title, category, amount, incurred_at, notes")
      .eq("event_id", event.id)
      .order("incurred_at", { ascending: true }),
    supabase
      .from("additional_revenues")
      .select("id, title, category, amount, date")
      .eq("event_id", event.id)
      .order("date", { ascending: true })
  ]);

  if (membershipsError || salesError || expensesError || additionalRevenuesError) {
    return NextResponse.json(
      {
        error:
          membershipsError?.message ||
          salesError?.message ||
          expensesError?.message ||
          additionalRevenuesError?.message ||
          "Nao foi possivel carregar os dados da exportacao."
      },
      { status: 500 }
    );
  }

  const membershipRows = ((memberships ?? []) as MembershipRow[]) ?? [];
  const salesRows = ((sales ?? []) as SaleRow[]) ?? [];
  const expenseRows = ((expenses ?? []) as ExpenseRow[]) ?? [];
  const additionalRevenueRows = ((additionalRevenues ?? []) as AdditionalRevenueRow[]) ?? [];
  const viewerMembership = membershipRows.find((membership) => membership.user_id === user.id);

  if (!viewerMembership && profile.role !== "host") {
    return NextResponse.json({ error: "Voce nao tem acesso a este evento." }, { status: 403 });
  }

  const isManager = profile.role === "host" || viewerMembership?.role === "host" || viewerMembership?.role === "organizer";
  const visibleSales = salesRows;

  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const { data: relatedProfiles, error: relatedProfilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (relatedProfilesError) {
    return NextResponse.json({ error: relatedProfilesError.message }, { status: 500 });
  }

  const profileMap = new Map(((relatedProfiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));

  const financeTotals = calculateFinanceTotals({
    sales: visibleSales.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      paymentStatus: sale.payment_status
    })),
    expenses: expenseRows.map((expense) => ({ amount: expense.amount })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({ amount: revenue.amount }))
  });
  const pendingSales = visibleSales.filter((sale) => sale.payment_status === "pending");
  const paidSales = visibleSales.filter((sale) => sale.payment_status === "paid");
  const percentGoal = calculateGoalProgress(financeTotals.generalRevenue, event.goal_value);

  const rankingSource = membershipRows.filter((membership) =>
    isManager ? membership.role === "seller" : membership.user_id === user.id
  );

  const rankingRows = rankingSource
    .map((membership) => {
      const sellerSales = visibleSales.filter((sale) => sale.seller_user_id === membership.user_id);
      const revenue = sellerSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
      const tickets = sellerSales.reduce((sum, sale) => sum + sale.quantity, 0);

      return {
        name: profileMap.get(membership.user_id)?.full_name ?? "Vendedor",
        tickets,
        revenue,
        pending: sellerSales
          .filter((sale) => sale.payment_status === "pending")
          .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0)
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

  const csvRows: Array<Array<string | number>> = [
    ["Resumo do evento", event.name],
    ["Data do evento", event.event_date],
    ["Local", event.venue],
    ["Escopo da exportacao", isManager ? "Visao completa do evento" : "Visao global em leitura"],
    [""],
    ["Resumo financeiro"],
    ["Total vendido", formatCurrency(financeTotals.grossSoldRevenue)],
    ["Vendas extras", formatCurrency(financeTotals.additionalRevenue)],
    ["Receita confirmada", formatCurrency(financeTotals.confirmedRevenue)],
    ["Receita pendente", formatCurrency(financeTotals.pendingRevenue)],
    ["Total arrecadado", formatCurrency(financeTotals.generalRevenue)],
    ["Total de despesas", formatCurrency(financeTotals.totalExpenses)],
    ["Lucro estimado", formatCurrency(financeTotals.estimatedProfit)],
    ["Meta de vendas", formatCurrency(event.goal_value)],
    ["Meta atingida", `${percentGoal}%`],
    ["Ingressos vendidos", financeTotals.totalTicketsSold],
    ["Valores pagos", formatCurrency(financeTotals.confirmedRevenue)],
    ["Valores pendentes", formatCurrency(financeTotals.pendingRevenue)],
    ["Pagamentos confirmados", paidSales.length],
    ["Pagamentos pendentes", pendingSales.length],
    [""],
    ["Ranking de vendedores"]
  ];

  rankingRows.forEach((row, index) => {
    csvRows.push([index + 1, row.name, row.tickets, formatCurrency(row.revenue), formatCurrency(row.pending)]);
  });

  if (additionalRevenueRows.length > 0) {
    csvRows.push([""], ["Arrecadacoes adicionais"]);
    additionalRevenueRows.forEach((revenue) => {
      csvRows.push([
        revenue.title,
        revenue.category ?? "",
        formatCurrency(revenue.amount),
        revenue.date
      ]);
    });
  }

  if (isManager) {
    csvRows.push([""], ["Despesas"]);
    expenseRows.forEach((expense) => {
      csvRows.push([
        expense.title,
        expense.category,
        formatCurrency(expense.amount),
        expense.incurred_at,
        expense.notes ?? ""
      ]);
    });
  }

  const safeSlug = ((event as EventRow).slug || "evento").replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  const csv = buildCsv(csvRows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resumo-${safeSlug}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
