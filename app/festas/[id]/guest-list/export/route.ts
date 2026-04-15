import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { buildGuestListExportRows } from "@/lib/guest-list-utils";
import { Database } from "@/lib/supabase/database.types";

type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type ManualGuestEntryRow = Database["public"]["Tables"]["manual_guest_entries"]["Row"];
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

  const [{ data: memberships, error: membershipsError }, { data: sales, error: salesError }] = await Promise.all([
    supabase.from("event_memberships").select("user_id, role").eq("event_id", event.id),
    supabase
      .from("sales")
      .select("id, unit_price, created_at")
      .eq("event_id", event.id)
  ]);

  if (membershipsError || salesError) {
    return NextResponse.json(
      {
        error:
          membershipsError?.message ||
          salesError?.message ||
          "Nao foi possivel carregar a lista de entrada para exportacao."
      },
      { status: 500 }
    );
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const viewerMembership = membershipRows.find((membership) => membership.user_id === user.id);

  if (!viewerMembership && profile.role !== "host") {
    return NextResponse.json({ error: "Voce nao tem acesso a este evento." }, { status: 403 });
  }

  const canViewFullList =
    profile.role === "host" || viewerMembership?.role === "host" || viewerMembership?.role === "organizer";
  const canViewManualEntries = profile.role === "host" || viewerMembership?.role === "host";

  const attendeesQuery = supabase
    .from("sale_attendees")
    .select("id, event_id, sale_id, seller_user_id, guest_name, checked_in_at, created_at")
    .eq("event_id", event.id)
    .order("guest_name", { ascending: true });

  if (!canViewFullList) {
    attendeesQuery.eq("seller_user_id", user.id);
  }

  const [{ data: attendees, error: attendeesError }, manualEntriesResult] = await Promise.all([
    attendeesQuery,
    canViewManualEntries
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
          "Nao foi possivel carregar a lista de entrada para exportacao."
      },
      { status: 500 }
    );
  }

  const attendeeRows = (attendees ?? []) as SaleAttendeeRow[];
  const manualGuestRows = (manualEntriesResult.data ?? []) as ManualGuestEntryRow[];

  const visibleAttendees = attendeeRows;
  const visibleManualEntries = canViewManualEntries ? manualGuestRows : [];

  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));
  const rows = buildGuestListExportRows({
    eventName: event.name,
    attendees: visibleAttendees,
    manualEntries: visibleManualEntries,
    profileMap,
    salesRows
  });

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
