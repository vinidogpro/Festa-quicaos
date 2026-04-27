import { NextResponse } from "next/server";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "evento";
}

async function fetchTableRows<T>(
  supabase: any,
  table: string,
  eventId: string,
  orderColumn = "created_at"
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("event_id", eventId)
    .order(orderColumn, { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar ${table}: ${error.message}`);
  }

  return (data ?? []) as T[];
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseRouteClient() as any;
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Sessao expirada. Entre novamente para exportar o backup." }, { status: 401 });
    }

    const [{ data: event, error: eventError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("events").select("*").eq("slug", params.id).single(),
      supabase.from("profiles").select("*").eq("id", user.id).single()
    ]);

    if (eventError || profileError || !event || !profile) {
      return NextResponse.json({ error: "Nao foi possivel carregar a festa para backup." }, { status: 404 });
    }

    const eventRow = event as EventRow;
    const profileRow = profile as ProfileRow;
    const { data: viewerMembership, error: viewerMembershipError } = await supabase
      .from("event_memberships")
      .select("*")
      .eq("event_id", eventRow.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (viewerMembershipError) {
      return NextResponse.json({ error: viewerMembershipError.message }, { status: 500 });
    }

    const viewerRole = (viewerMembership as MembershipRow | null)?.role;
    const canExportBackup = profileRow.role === "host" || viewerRole === "host" || viewerRole === "organizer";

    if (!canExportBackup) {
      return NextResponse.json({ error: "Apenas host ou organizador podem exportar o backup completo." }, { status: 403 });
    }

    const [
      memberships,
      batches,
      sales,
      saleAttendees,
      manualGuestEntries,
      expenses,
      additionalRevenues,
      tasks,
      announcements,
      activityLogs
    ] = await Promise.all([
      fetchTableRows(supabase, "event_memberships", eventRow.id),
      fetchTableRows(supabase, "event_batches", eventRow.id, "sort_order"),
      fetchTableRows(supabase, "sales", eventRow.id),
      fetchTableRows(supabase, "sale_attendees", eventRow.id, "guest_name"),
      fetchTableRows(supabase, "manual_guest_entries", eventRow.id, "guest_name"),
      fetchTableRows(supabase, "expenses", eventRow.id, "incurred_at"),
      fetchTableRows(supabase, "additional_revenues", eventRow.id, "date"),
      fetchTableRows(supabase, "tasks", eventRow.id),
      fetchTableRows(supabase, "announcements", eventRow.id),
      fetchTableRows(supabase, "activity_logs", eventRow.id)
    ]);

    const relatedProfileIds = new Set<string>();
    for (const row of memberships as Array<{ user_id?: string }>) {
      if (row.user_id) relatedProfileIds.add(row.user_id);
    }
    for (const row of sales as Array<{ seller_user_id?: string; created_by?: string }>) {
      if (row.seller_user_id) relatedProfileIds.add(row.seller_user_id);
      if (row.created_by) relatedProfileIds.add(row.created_by);
    }
    for (const row of activityLogs as Array<{ actor_user_id?: string }>) {
      if (row.actor_user_id) relatedProfileIds.add(row.actor_user_id);
    }

    const { data: relatedProfiles, error: relatedProfilesError } = relatedProfileIds.size
      ? await supabase.from("profiles").select("id, full_name, avatar_label, role, created_at, updated_at").in("id", Array.from(relatedProfileIds))
      : { data: [], error: null };

    if (relatedProfilesError) {
      return NextResponse.json({ error: relatedProfilesError.message }, { status: 500 });
    }

    const payload = {
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: profileRow.id,
        fullName: profileRow.full_name,
        role: profileRow.role,
        eventRole: viewerRole ?? null
      },
      event: eventRow,
      data: {
        profiles: relatedProfiles ?? [],
        memberships,
        batches,
        sales,
        saleAttendees,
        manualGuestEntries,
        expenses,
        additionalRevenues,
        tasks,
        announcements,
        activityLogs
      }
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="backup-${safeFileName(eventRow.slug || eventRow.name)}.json"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel gerar o backup completo." },
      { status: 500 }
    );
  }
}
