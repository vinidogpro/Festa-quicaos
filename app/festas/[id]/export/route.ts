import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";
import { formatCurrency } from "@/lib/utils";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
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

  const [{ data: event }, { data: profile }] = await Promise.all([
    supabase.from("events").select("*").eq("slug", params.id).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single()
  ]);

  if (!event) {
    return NextResponse.json({ error: "Evento nao encontrado." }, { status: 404 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Perfil do usuario nao encontrado." }, { status: 403 });
  }

  const [{ data: memberships }, { data: sales }, { data: expenses }] = await Promise.all([
    supabase.from("event_memberships").select("*").eq("event_id", event.id),
    supabase.from("sales").select("*").eq("event_id", event.id).order("sold_at", { ascending: true }),
    supabase.from("expenses").select("*").eq("event_id", event.id).order("incurred_at", { ascending: true })
  ]);

  const membershipRows = ((memberships ?? []) as MembershipRow[]) ?? [];
  const salesRows = ((sales ?? []) as SaleRow[]) ?? [];
  const expenseRows = ((expenses ?? []) as ExpenseRow[]) ?? [];
  const viewerMembership = membershipRows.find((membership) => membership.user_id === user.id);

  if (!viewerMembership && profile.role !== "host") {
    return NextResponse.json({ error: "Voce nao tem acesso a este evento." }, { status: 403 });
  }

  const isManager = profile.role === "host" || viewerMembership?.role === "host" || viewerMembership?.role === "organizer";
  const visibleSales = isManager ? salesRows : salesRows.filter((sale) => sale.seller_user_id === user.id);

  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const { data: relatedProfiles } = await supabase.from("profiles").select("*").in("id", profileIds);
  const profileMap = new Map(((relatedProfiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));

  const totalRevenue = visibleSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
  const totalExpenses = isManager ? expenseRows.reduce((sum, expense) => sum + expense.amount, 0) : 0;
  const estimatedProfit = totalRevenue - totalExpenses;
  const pendingSales = visibleSales.filter((sale) => sale.payment_status === "pending");
  const paidSales = visibleSales.filter((sale) => sale.payment_status === "paid");
  const pendingValue = pendingSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
  const paidValue = paidSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
  const totalTicketsSold = visibleSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const percentGoal = event.goal_value > 0 ? Math.round((totalRevenue / event.goal_value) * 100) : 0;

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
    ["Escopo da exportacao", isManager ? "Visao completa do evento" : "Visao individual do vendedor"],
    [""],
    ["Resumo financeiro"],
    ["Total arrecadado", formatCurrency(totalRevenue)],
    ["Total de despesas", formatCurrency(totalExpenses)],
    ["Lucro estimado", formatCurrency(estimatedProfit)],
    ["Meta de vendas", formatCurrency(event.goal_value)],
    ["Meta atingida", `${percentGoal}%`],
    ["Ingressos vendidos", totalTicketsSold],
    ["Valores pagos", formatCurrency(paidValue)],
    ["Valores pendentes", formatCurrency(pendingValue)],
    ["Pagamentos confirmados", paidSales.length],
    ["Pagamentos pendentes", pendingSales.length],
    [""],
    ["Ranking de vendedores"]
  ];

  rankingRows.forEach((row, index) => {
    csvRows.push([index + 1, row.name, row.tickets, formatCurrency(row.revenue), formatCurrency(row.pending)]);
  });

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
