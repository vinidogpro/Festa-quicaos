import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";

type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
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

  const [{ data: event }, { data: profile }] = await Promise.all([
    supabase.from("events").select("*").eq("slug", params.id).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single()
  ]);

  if (!event || !profile) {
    return NextResponse.json({ error: "Nao foi possivel carregar os dados da exportacao." }, { status: 404 });
  }

  const [{ data: memberships }, { data: attendees }] = await Promise.all([
    supabase.from("event_memberships").select("*").eq("event_id", event.id),
    supabase.from("sale_attendees").select("*").eq("event_id", event.id).order("guest_name", { ascending: true })
  ]);

  const membershipRows = (memberships ?? []) as MembershipRow[];
  const attendeeRows = (attendees ?? []) as SaleAttendeeRow[];
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
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", profileIds);
  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));

  const rows = [
    ["Lista de entrada", event.name],
    [""],
    ["Nome", "Vendedor", "Venda", "Check-in"],
    ...visibleAttendees.map((entry) => [
      entry.guest_name,
      profileMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
      entry.sale_id,
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
