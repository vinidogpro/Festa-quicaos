import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";

type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function csvEscape(value: string | number) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
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
    supabase.from("events").select("id, name, slug").eq("slug", params.id).single(),
    supabase.from("profiles").select("id, role").eq("id", user.id).single()
  ]);

  if (eventError || profileError || !event || !profile) {
    return NextResponse.json({ error: "Nao foi possivel carregar os dados da exportacao." }, { status: 404 });
  }

  const [
    { data: memberships, error: membershipsError },
    { data: attendees, error: attendeesError },
    { data: sales, error: salesError }
  ] = await Promise.all([
    supabase.from("event_memberships").select("user_id, role").eq("event_id", event.id),
    supabase
      .from("sale_attendees")
      .select("id, event_id, sale_id, seller_user_id, guest_name, checked_in_at, created_at")
      .eq("event_id", event.id)
      .order("guest_name", { ascending: true }),
    supabase
      .from("sales")
      .select("id, unit_price, payment_status, created_at")
      .eq("event_id", event.id)
  ]);

  if (membershipsError || attendeesError || salesError) {
    return NextResponse.json(
      {
        error:
          membershipsError?.message ||
          attendeesError?.message ||
          salesError?.message ||
          "Nao foi possivel carregar a lista de entrada para exportacao."
      },
      { status: 500 }
    );
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];
  const attendeeRows = (attendees ?? []) as SaleAttendeeRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const viewerMembership = membershipRows.find((membership) => membership.user_id === user.id);

  if (!viewerMembership && profile.role !== "host") {
    return NextResponse.json({ error: "Voce nao tem acesso a este evento." }, { status: 403 });
  }

  const canViewFullList =
    profile.role === "host" || viewerMembership?.role === "host" || viewerMembership?.role === "organizer";

  const visibleAttendees = canViewFullList
    ? attendeeRows
    : attendeeRows.filter((entry) => entry.seller_user_id === user.id);

  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));
  const saleSequenceMap = new Map(
    [...salesRows]
      .sort((left, right) => {
        const createdDiff = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

        if (createdDiff !== 0) {
          return createdDiff;
        }

        return left.id.localeCompare(right.id);
      })
      .map((sale, index) => [sale.id, index + 1] as const)
  );
  const salesById = new Map(salesRows.map((sale) => [sale.id, sale]));

  const rows = [
    ["Lista de entrada", event.name],
    [""],
    ["Nome", "Vendedor", "Venda", "Valor por ingresso", "Pagamento", "Check-in"],
    ...visibleAttendees.map((entry) => [
      entry.guest_name,
      profileMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
      `Venda #${saleSequenceMap.get(entry.sale_id) ?? 0}`,
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        salesById.get(entry.sale_id)?.unit_price ?? 0
      ),
      salesById.get(entry.sale_id)?.payment_status === "paid" ? "Pago" : "Pendente",
      entry.checked_in_at ? "Sim" : "Nao"
    ])
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(";")).join("\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lista-${event.slug}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
