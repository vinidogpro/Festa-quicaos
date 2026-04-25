import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { buildPortariaExportRows } from "@/lib/guest-list-utils";
import { Database } from "@/lib/supabase/database.types";
import { formatTicketTypeLabel } from "@/lib/utils";

type MembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type ManualGuestEntryRow = Database["public"]["Tables"]["manual_guest_entries"]["Row"];

export const runtime = "nodejs";

const HEADER_FILL = "1E293B";
const HEADER_FONT = "FFFFFF";
const BORDER_COLOR = "CBD5E1";
const ZEBRA_FILL = "F8FAFC";
const VIP_FILL = "F6E7B8";
const VIP_FONT = "8A5A12";
const PISTA_FILL = "E9EEF7";
const PISTA_FONT = "334155";

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
    cell.alignment = {
      vertical: "middle",
      horizontal: "left"
    };
    cell.font = {
      ...(cell.font ?? {}),
      color: { argb: "0F172A" }
    };
  });

  applyBorders(row);
}

function styleTicketTypeCell(cell: ExcelJS.Cell) {
  const value = String(cell.value ?? "").toUpperCase();

  if (value === formatTicketTypeLabel("vip")) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VIP_FILL } };
    cell.font = { ...(cell.font ?? {}), color: { argb: VIP_FONT }, bold: true };
  } else {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PISTA_FILL } };
    cell.font = { ...(cell.font ?? {}), color: { argb: PISTA_FONT }, bold: true };
  }

  cell.alignment = {
    vertical: "middle",
    horizontal: "center"
  };
}

function autoFitColumns(worksheet: ExcelJS.Worksheet, minimumWidth = 18, maximumWidth = 42) {
  worksheet.columns = worksheet.columns.map((column) => {
    let maxLength = minimumWidth;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const text = cell.value == null ? "" : String(cell.value);
      maxLength = Math.max(maxLength, text.length + 2);
    });

    column.width = Math.min(Math.max(maxLength, minimumWidth), maximumWidth);
    return column;
  });
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
    { data: sales, error: salesError }
  ] = await Promise.all([
    supabase.from("event_memberships").select("user_id, role").eq("event_id", event.id),
    supabase
      .from("sales")
      .select("id, ticket_type")
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

  if (!canViewFullList) {
    return NextResponse.json({ error: "A lista da portaria e exclusiva para host e organizer." }, { status: 403 });
  }

  const attendeesQuery = supabase
    .from("sale_attendees")
    .select("id, event_id, sale_id, seller_user_id, guest_name, checked_in_at, created_at")
    .eq("event_id", event.id)
    .order("guest_name", { ascending: true });

  const [{ data: attendees, error: attendeesError }, manualEntriesResult] = await Promise.all([
    attendeesQuery,
    supabase
      .from("manual_guest_entries")
      .select("id, guest_name, notes, created_at")
      .eq("event_id", event.id)
      .order("guest_name", { ascending: true })
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

  const portariaRows = buildPortariaExportRows({
    attendees: attendeeRows,
    manualEntries: manualGuestRows,
    salesRows
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Lista da portaria", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  worksheet.addRow(["Nome", "Tipo de ingresso"]);
  styleHeaderRow(worksheet.getRow(1));

  portariaRows.forEach((row, index) => {
    const excelRow = worksheet.addRow([row.guestName, row.ticketType]);
    styleBodyRow(excelRow, index + 2);
    styleTicketTypeCell(excelRow.getCell(2));
  });

  autoFitColumns(worksheet, 18, 44);
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lista-portaria-${event.slug}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
