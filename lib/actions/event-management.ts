"use server";

import { revalidatePath } from "next/cache";
import {
  AnnouncementActionState,
  EventActionState,
  FinanceActionState,
  SalesActionState,
  TaskActionState,
  TeamActionState
} from "@/lib/actions/action-state";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseActionClient } from "@/lib/supabase/server";
import { DEFAULT_EVENT_BATCH_NAMES, DEFAULT_EVENT_BATCH_PRESETS } from "@/lib/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventMembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type EventBatchRow = Database["public"]["Tables"]["event_batches"]["Row"];
type TicketType = Database["public"]["Tables"]["sales"]["Row"]["ticket_type"];
type SaleType = Database["public"]["Tables"]["sales"]["Row"]["sale_type"];

function slugifyEventName(value: string) {
  const baseSlug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return baseSlug || "festa";
}

async function generateUniqueEventSlug(supabase: any, name: string, currentEventId?: string) {
  const baseSlug = slugifyEventName(name);
  const { data, error } = await supabase
    .from("events")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as Array<{ id: string; slug: string }>).filter((row) => row.id !== currentEventId);
  const existingSlugs = new Set(rows.map((row) => row.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = rows.length + 1;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

function validateEventFields(input: {
  name: string;
  venue: string;
  eventDate: string;
  goalValue: number;
}) {
  if (!input.name || input.name.length < 3) {
    return "Informe um nome de festa com pelo menos 3 caracteres.";
  }

  if (!input.venue || input.venue.length < 2) {
    return "Informe um local valido para a festa.";
  }

  if (!input.eventDate || Number.isNaN(new Date(input.eventDate).getTime())) {
    return "Informe uma data valida para a festa.";
  }

  if (!Number.isFinite(input.goalValue) || input.goalValue < 0) {
    return "Informe uma meta valida maior ou igual a zero.";
  }

  return null;
}

async function getActionProfile() {
  const supabase = createSupabaseActionClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error || !profile) {
    throw new Error("Perfil nao encontrado.");
  }

  return { supabase, profile: profile as ProfileRow };
}

async function getEventRowBySlug(slug: string) {
  const supabase = createSupabaseActionClient() as any;
  const { data: event, error } = await supabase.from("events").select("*").eq("slug", slug).single();

  if (error || !event) {
    throw new Error("Evento nao encontrado.");
  }

  return event;
}

async function getMembership(supabase: any, eventId: string, userId: string) {
  const { data } = await supabase
    .from("event_memberships")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data ?? null) as EventMembershipRow | null;
}

async function getSellerMembershipOrThrow(supabase: any, eventId: string, sellerUserId: string) {
  const { data: sellerMembership, error } = await supabase
    .from("event_memberships")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", sellerUserId)
    .single();

  if (error || !sellerMembership || sellerMembership.role !== "seller") {
    throw new Error("O vendedor selecionado precisa estar vinculado como seller nesta festa.");
  }

  return sellerMembership as EventMembershipRow;
}

function assertHost(profile: ProfileRow) {
  if (profile.role !== "host") {
    throw new Error("Apenas o host global pode executar esta acao.");
  }
}

function canManageEvent(profile: ProfileRow, membership: EventMembershipRow | null) {
  return profile.role === "host" || membership?.role === "host" || membership?.role === "organizer";
}

function ensureCanManageEvent(profile: ProfileRow, membership: EventMembershipRow | null) {
  if (!canManageEvent(profile, membership)) {
    throw new Error("Voce nao tem permissao para gerenciar a equipe desta festa.");
  }
}

function canManageFinance(profile: ProfileRow, membership: EventMembershipRow | null) {
  return canManageEvent(profile, membership);
}

function canManageManualGuests(profile: ProfileRow, membership: EventMembershipRow | null) {
  return profile.role === "host" || membership?.role === "host";
}

function canAssignHostRole(profile: ProfileRow, membership: EventMembershipRow | null) {
  return profile.role === "host" || membership?.role === "host";
}

function ensureRoleTransitionAllowed({
  actorProfile,
  actorMembership,
  targetMembership,
  nextRole
}: {
  actorProfile: ProfileRow;
  actorMembership: EventMembershipRow | null;
  targetMembership?: EventMembershipRow | null;
  nextRole: EventMembershipRow["role"];
}) {
  if (nextRole === "host" && !canAssignHostRole(actorProfile, actorMembership)) {
    throw new Error("Somente host pode definir outro membro como host.");
  }

  if (targetMembership?.role === "host" && !canAssignHostRole(actorProfile, actorMembership)) {
    throw new Error("Somente host pode alterar ou remover um host desta festa.");
  }
}

async function countEventHosts(supabase: any, eventId: string) {
  const { count, error } = await supabase
    .from("event_memberships")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("role", "host");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getExpenseRowById(supabase: any, expenseId: string) {
  const { data: expense, error } = await supabase.from("expenses").select("*").eq("id", expenseId).single();

  if (error || !expense) {
    throw new Error("Despesa nao encontrada.");
  }

  return expense;
}

async function getAdditionalRevenueRowById(supabase: any, revenueId: string) {
  const { data: revenue, error } = await supabase
    .from("additional_revenues")
    .select("*")
    .eq("id", revenueId)
    .single();

  if (error || !revenue) {
    throw new Error("Arrecadacao adicional nao encontrada.");
  }

  return revenue;
}

async function getTaskRowById(supabase: any, taskId: string) {
  const { data: task, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();

  if (error || !task) {
    throw new Error("Tarefa nao encontrada.");
  }

  return task;
}

async function getAnnouncementRowById(supabase: any, announcementId: string) {
  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", announcementId)
    .single();

  if (error || !announcement) {
    throw new Error("Comunicado nao encontrado.");
  }

  return announcement;
}

async function getSaleAttendeeRowById(supabase: any, attendeeId: string) {
  const { data: attendee, error } = await supabase
    .from("sale_attendees")
    .select("*")
    .eq("id", attendeeId)
    .single();

  if (error || !attendee) {
    throw new Error("Nome da lista nao encontrado.");
  }

  return attendee;
}

async function getManualGuestEntryRowById(supabase: any, entryId: string) {
  const { data: entry, error } = await supabase
    .from("manual_guest_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (error || !entry) {
    throw new Error("Nome manual nao encontrado.");
  }

  return entry;
}

function parseGuestNames(formData: FormData) {
  return formData
    .getAll("guestNames")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function parseTicketType(value: FormDataEntryValue | null | undefined): TicketType | null {
  const normalizedValue = String(value ?? "pista").trim().toLowerCase();
  return normalizedValue === "vip" || normalizedValue === "pista" ? normalizedValue : null;
}

interface SubmittedBatchConfig {
  id?: string;
  name: string;
  pistaPrice: number | null;
  vipPrice: number | null;
  isActive: boolean;
  sortOrder: number;
}

function parseBooleanField(value: FormDataEntryValue | null | undefined, fallback = false) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue === "true" || normalizedValue === "1" || normalizedValue === "on" || normalizedValue === "yes";
}

function parseNumberOrNull(value: FormDataEntryValue | null | undefined) {
  const normalizedValue = String(value ?? "").trim().replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function buildDefaultBatchConfigs(hasVip: boolean): SubmittedBatchConfig[] {
  return DEFAULT_EVENT_BATCH_PRESETS.map((preset, index) => ({
    name: preset.name,
    pistaPrice: preset.pistaPrice,
    vipPrice: hasVip ? preset.vipPrice ?? null : null,
    isActive: preset.isActiveByDefault,
    sortOrder: index
  }));
}

function parseBatchConfigs(formData: FormData, hasVip: boolean) {
  const batchIds = formData.getAll("batchIds").map((value) => String(value ?? "").trim());
  const batchNames = formData.getAll("batchNames").map((value) => String(value ?? "").trim());
  const batchPistaPrices = formData.getAll("batchPistaPrices");
  const batchVipPrices = formData.getAll("batchVipPrices");
  const batchActiveStates = formData.getAll("batchActiveStates");
  const batchSortOrders = formData.getAll("batchSortOrders");

  if (batchNames.length === 0) {
    return buildDefaultBatchConfigs(hasVip);
  }

  return batchNames.map((name, index) => ({
    id: batchIds[index] || undefined,
    name,
    pistaPrice: parseNumberOrNull(batchPistaPrices[index]),
    vipPrice: hasVip ? parseNumberOrNull(batchVipPrices[index]) : null,
    isActive: parseBooleanField(batchActiveStates[index], false),
    sortOrder: Number(batchSortOrders[index] ?? index)
  }));
}

function validateCommercialConfig({
  hasVip,
  batches
}: {
  hasVip: boolean;
  batches: SubmittedBatchConfig[];
}) {
  const activeBatches = batches.filter((batch) => batch.isActive);

  if (activeBatches.length === 0) {
    return "Ative pelo menos um lote para a festa.";
  }

  for (const batch of activeBatches) {
    if (!batch.name.trim()) {
      return "Os lotes ativos precisam ter nome.";
    }

    if (!Number.isFinite(batch.pistaPrice) || (batch.pistaPrice ?? 0) <= 0) {
      return `Defina um preco PISTA valido para o lote "${batch.name}".`;
    }

    if (hasVip && (!Number.isFinite(batch.vipPrice) || (batch.vipPrice ?? 0) <= 0)) {
      return `Defina um preco VIP valido para o lote "${batch.name}".`;
    }
  }

  const uniqueNames = new Set(activeBatches.map((batch) => batch.name.trim().toLowerCase()));

  if (uniqueNames.size !== activeBatches.length) {
    return "Os lotes ativos precisam ter nomes unicos.";
  }

  return null;
}

function parseSaleBatchLabel(value: FormDataEntryValue | null | undefined): string | null {
  const normalizedValue = String(value ?? "").trim();
  return [
    "Lote promocional",
    "1º lote",
    "2º lote",
    "3º lote",
    "4º lote"
  ].includes(normalizedValue)
    ? normalizedValue
    : null;
}

function parseSaleType(value: FormDataEntryValue | null | undefined): SaleType | null {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return normalizedValue === "grupo" || normalizedValue === "normal" ? normalizedValue : null;
}

async function getEventBatches(supabase: any, eventId: string) {
  const { data, error } = await supabase
    .from("event_batches")
    .select("id, event_id, name, pista_price, vip_price, is_active, sort_order, created_at, updated_at")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EventBatchRow[];
}

async function ensureEventBatchBelongsToEvent(supabase: any, eventId: string, batchId: string) {
  const { data, error } = await supabase
    .from("event_batches")
    .select("id, event_id, name, is_active, pista_price, vip_price")
    .eq("id", batchId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selecione um lote valido para esta festa.");
  }

  return data as Pick<EventBatchRow, "id" | "event_id" | "name" | "is_active" | "pista_price" | "vip_price">;
}

async function syncEventBatches({
  supabase,
  eventId,
  submittedRows
}: {
  supabase: any;
  eventId: string;
  submittedRows: SubmittedBatchConfig[];
}) {
  const existingBatches = await getEventBatches(supabase, eventId);
  const existingById = new Map(existingBatches.map((batch) => [batch.id, batch]));
  const seenIds = new Set<string>();
  const rowsToUpdate: SubmittedBatchConfig[] = [];
  const rowsToInsert: SubmittedBatchConfig[] = [];

  submittedRows.forEach((row, index) => {
    const normalizedRow = {
      ...row,
      id: row.id?.trim() ?? "",
      name: row.name.trim(),
      sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : index
    };

    if (normalizedRow.id && existingById.has(normalizedRow.id)) {
      seenIds.add(normalizedRow.id);
      rowsToUpdate.push(normalizedRow);
      return;
    }

    rowsToInsert.push(normalizedRow);
  });

  for (const row of rowsToUpdate) {
    if (!row.id) {
      continue;
    }

    const current = existingById.get(row.id);

    if (
      current &&
      (current.name !== row.name ||
        current.pista_price !== row.pistaPrice ||
        current.vip_price !== row.vipPrice ||
        current.is_active !== row.isActive ||
        current.sort_order !== row.sortOrder)
    ) {
      const { error } = await supabase
        .from("event_batches")
        .update({
          name: row.name,
          pista_price: row.pistaPrice,
          vip_price: row.vipPrice,
          is_active: row.isActive,
          sort_order: row.sortOrder
        })
        .eq("id", row.id);

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("event_batches").insert(
      rowsToInsert.map((row) => ({
        event_id: eventId,
        name: row.name,
        pista_price: row.pistaPrice,
        vip_price: row.vipPrice,
        is_active: row.isActive,
        sort_order: row.sortOrder
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const removedIds = existingBatches.filter((batch) => !seenIds.has(batch.id)).map((batch) => batch.id);

  if (removedIds.length > 0) {
    const { count, error: salesCountError } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .in("batch_id", removedIds);

    if (salesCountError) {
      throw new Error(salesCountError.message);
    }

    if ((count ?? 0) > 0) {
      const { error: deactivateError } = await supabase
        .from("event_batches")
        .update({ is_active: false })
        .in("id", removedIds);

      if (deactivateError) {
        throw new Error(deactivateError.message);
      }

      return;
    }

    const { error: deleteError } = await supabase.from("event_batches").delete().in("id", removedIds);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }
}

function validateExpenseFields({
  title,
  category,
  amount,
  incurredAt
}: {
  title: string;
  category: string;
  amount: number;
  incurredAt: string;
}) {
  if (!title) {
    return "Informe o titulo da despesa.";
  }

  if (!category) {
    return "Informe a categoria da despesa.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Informe um valor valido maior que zero.";
  }

  if (Number.isNaN(new Date(incurredAt).getTime())) {
    return "Informe uma data valida para a despesa.";
  }

  return null;
}

async function replaceSaleAttendees({
  supabase,
  eventId,
  saleId,
  sellerUserId,
  guestNames,
  expectedQuantity
}: {
  supabase: any;
  eventId: string;
  saleId: string;
  sellerUserId: string;
  guestNames: string[];
  expectedQuantity: number;
}) {
  const { error: deleteError } = await supabase.from("sale_attendees").delete().eq("sale_id", saleId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (guestNames.length !== expectedQuantity) {
    throw new Error("Quantidade e nomes precisam bater antes de salvar a venda.");
  }

  if (guestNames.length === 0) {
    return [];
  }

  const { data: insertedAttendees, error: insertError } = await supabase
    .from("sale_attendees")
    .insert(
      guestNames.map((guestName) => ({
        event_id: eventId,
        sale_id: saleId,
        seller_user_id: sellerUserId,
        guest_name: guestName
      }))
    )
    .select("id");

  if (insertError) {
    throw new Error(insertError.message);
  }

  if ((insertedAttendees?.length ?? 0) !== expectedQuantity) {
    throw new Error("A venda foi recusada porque nem todos os nomes foram vinculados a lista.");
  }

  return insertedAttendees ?? [];
}

async function restoreSaleAttendees({
  supabase,
  eventId,
  saleId,
  attendees
}: {
  supabase: any;
  eventId: string;
  saleId: string;
  attendees: Array<{
    seller_user_id: string;
    guest_name: string;
    checked_in_at?: string | null;
  }>;
}) {
  await supabase.from("sale_attendees").delete().eq("sale_id", saleId);

  if (attendees.length === 0) {
    return;
  }

  const { error } = await supabase.from("sale_attendees").insert(
    attendees.map((attendee) => ({
      event_id: eventId,
      sale_id: saleId,
      seller_user_id: attendee.seller_user_id,
      guest_name: attendee.guest_name,
      checked_in_at: attendee.checked_in_at ?? null
    }))
  );

  if (error) {
    console.error("[sales] Falha ao restaurar nomes da venda apos erro de edicao", {
      saleId,
      error: error.message
    });
  }
}

async function logActivity(
  supabase: any,
  {
    actorUserId,
    eventId,
    action,
    entityType,
    entityId,
    message,
    metadata
  }: {
    actorUserId: string;
    eventId?: string | null;
    action: string;
    entityType: string;
      entityId?: string | null;
      message: string;
      metadata?: Record<string, string | number | boolean | null>;
  }
) {
  const { error } = await supabase.from("activity_logs").insert({
    event_id: eventId ?? null,
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    message,
    metadata: metadata ?? null
  });

  if (error) {
    console.error("[activity-log] Falha ao registrar atividade", {
      actorUserId,
      eventId,
      action,
      entityType,
      entityId,
      error: error.message
    });
  }
}

export async function createEventAction(
  _prevState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    assertHost(profile);

    const name = String(formData.get("name") ?? "").trim();
    const venue = String(formData.get("venue") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const goalValue = Number(formData.get("goalValue") ?? 0);
    const description = String(formData.get("description") ?? "").trim();
    const status = String(formData.get("status") ?? "upcoming") as Database["public"]["Tables"]["events"]["Row"]["status"];
    const hasVip = parseBooleanField(formData.get("hasVip"), true);
    const hasGroupSales = parseBooleanField(formData.get("hasGroupSales"), true);
    const batchConfigs = parseBatchConfigs(formData, hasVip);

    const validationError = validateEventFields({ name, venue, eventDate, goalValue });
    if (validationError) {
      return {
        status: "error",
        message: validationError
      };
    }

    const commercialValidationError = validateCommercialConfig({ hasVip, batches: batchConfigs });

    if (commercialValidationError) {
      return {
        status: "error",
        message: commercialValidationError
      };
    }

    const slug = await generateUniqueEventSlug(supabase, name);

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        name,
        slug,
        venue,
        description: description || null,
        event_date: eventDate,
        goal_value: goalValue,
        has_vip: hasVip,
        has_group_sales: hasGroupSales,
        status,
        created_by: profile.id
      })
      .select("id, slug")
      .single();

    if (error || !event) {
      throw new Error(error?.message ?? "Nao foi possivel criar a festa.");
    }

    const { error: membershipError } = await supabase.from("event_memberships").insert({
      event_id: event.id,
      user_id: profile.id,
      role: "host"
    });

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const { error: batchInsertError } = await supabase.from("event_batches").insert(
      batchConfigs.map((batch, index) => ({
        event_id: event.id,
        name: batch.name,
        pista_price: batch.pistaPrice,
        vip_price: batch.vipPrice,
        is_active: batch.isActive,
        sort_order: Number.isFinite(batch.sortOrder) ? batch.sortOrder : index
      }))
    );

    if (batchInsertError) {
      throw new Error(batchInsertError.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "event.created",
      entityType: "event",
      entityId: event.id,
      message: `${profile.full_name} criou a festa "${name}".`,
      metadata: {
        eventName: name,
        eventSlug: event.slug,
        status,
        batchCount: batchConfigs.filter((batch) => batch.isActive).length,
        hasVip,
        hasGroupSales
      }
    });

    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Festa criada com sucesso.",
      redirectTo: `/festas/${event.slug}`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel criar a festa."
    };
  }
}

export async function createSaleAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    let sellerUserId = String(formData.get("sellerId") ?? "");

    if (profile.role === "host" || canManageEvent(profile, membership)) {
      if (!sellerUserId) {
        return {
          status: "error",
          message: "Selecione um vendedor para registrar a venda."
        };
      }
    } else if (membership?.role === "seller") {
      sellerUserId = profile.id;
    } else {
      return {
        status: "error",
        message: "Voce nao tem permissao para registrar vendas nesta festa."
      };
    }

    const quantity = Number(formData.get("quantity") ?? 0);
    const unitPrice = Number(formData.get("unitPrice") ?? 0);
    const batchId = String(formData.get("batchId") ?? "").trim();
    const selectedSaleType = parseSaleType(formData.get("saleType"));
    const selectedTicketType = parseTicketType(formData.get("ticketType"));
    const soldAt = String(formData.get("soldAt") ?? new Date().toISOString().slice(0, 10));
    const notes = String(formData.get("notes") ?? "").trim();
    const guestNames = parseGuestNames(formData);
    const saleType = event.has_group_sales ? selectedSaleType : "normal";
    const ticketType = event.has_vip ? selectedTicketType : "pista";

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        status: "error",
        message: "Informe uma quantidade valida maior que zero."
      };
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return {
        status: "error",
        message: "Informe um valor unitario valido maior que zero."
      };
    }

    if (!batchId) {
      return {
        status: "error",
        message: "Selecione um lote valido para a venda."
      };
    }

    if (!saleType) {
      return {
        status: "error",
        message: "Selecione um tipo de venda valido."
      };
    }

    if (!ticketType) {
      return {
        status: "error",
        message: "Selecione um tipo de ingresso valido para a venda."
      };
    }

    if (guestNames.length !== quantity) {
      return {
        status: "error",
        message: "Preencha exatamente um nome por ingresso vendido."
      };
    }

    await getSellerMembershipOrThrow(supabase, event.id, sellerUserId);
    const eventBatch = await ensureEventBatchBelongsToEvent(supabase, event.id, batchId);

    if (!eventBatch.is_active) {
      return {
        status: "error",
        message: "Selecione um lote ativo para registrar a venda."
      };
    }

    const { data: createdSale, error } = await supabase
      .from("sales")
      .insert({
        event_id: event.id,
        seller_user_id: sellerUserId,
        batch_id: eventBatch.id,
        sale_type: saleType,
        ticket_type: ticketType,
        quantity,
        unit_price: unitPrice,
        payment_status: "paid",
        sold_at: soldAt,
        notes: notes || null,
        created_by: profile.id
      })
      .select("id")
      .single();

    if (error || !createdSale) {
      throw new Error(error?.message ?? "Nao foi possivel registrar a venda.");
    }

    try {
      const insertedAttendees = await replaceSaleAttendees({
        supabase,
        eventId: event.id,
        saleId: createdSale.id,
        sellerUserId,
        guestNames,
        expectedQuantity: quantity
      });

      console.info("[sales] Venda criada com nomes vinculados", {
        eventId: event.id,
        saleId: createdSale.id,
        quantity,
        attendeeCount: insertedAttendees.length
      });
    } catch (attendeeError) {
      console.error("[sales] Falha ao vincular nomes; revertendo venda criada", {
        eventId: event.id,
        saleId: createdSale.id,
        quantity,
        attendeeCount: guestNames.length,
        error: attendeeError instanceof Error ? attendeeError.message : String(attendeeError)
      });

      await supabase.from("sales").delete().eq("id", createdSale.id);
      throw attendeeError;
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "sale.created",
      entityType: "sale",
      entityId: createdSale.id,
      message: `${profile.full_name} registrou uma venda de ${quantity} ingresso(s).`,
      metadata: {
        sellerUserId,
        batchId: eventBatch.id,
        batchLabel: eventBatch.name,
        saleType,
        ticketType,
        quantity,
        unitPrice,
        attendeeCount: guestNames.length
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Venda registrada com sucesso. Ranking e lista ja foram atualizados."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel registrar a venda."
    };
  }
}

export async function updateSaleAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const saleId = String(formData.get("saleId") ?? "");

    const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", saleId).single();

    if (saleError || !sale) {
      return {
        status: "error",
        message: "Venda nao encontrada."
      };
    }

    const membership = await getMembership(supabase, sale.event_id, profile.id);
    const canManageThisSale =
      profile.role === "host" ||
      canManageEvent(profile, membership) ||
      (membership?.role === "seller" && sale.seller_user_id === profile.id);

    if (!canManageThisSale) {
      return {
        status: "error",
        message: "Voce nao pode editar esta venda."
      };
    }

    const quantity = Number(formData.get("quantity") ?? sale.quantity);
    const unitPrice = Number(formData.get("unitPrice") ?? sale.unit_price);
    const batchId = String(formData.get("batchId") ?? sale.batch_id ?? "").trim();
    const selectedSaleType = parseSaleType(formData.get("saleType") ?? sale.sale_type);
    const selectedTicketType = parseTicketType(formData.get("ticketType") ?? sale.ticket_type);
    const soldAt = String(formData.get("soldAt") ?? sale.sold_at);
    const notes = String(formData.get("notes") ?? sale.notes ?? "").trim();
    const requestedSellerUserId = String(formData.get("sellerId") ?? sale.seller_user_id).trim();
    const guestNames = parseGuestNames(formData);

    let sellerUserId = sale.seller_user_id;

    if (profile.role === "host" || canManageEvent(profile, membership)) {
      sellerUserId = requestedSellerUserId || sale.seller_user_id;
    } else if (membership?.role === "seller") {
      sellerUserId = profile.id;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        status: "error",
        message: "Informe uma quantidade valida maior que zero."
      };
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return {
        status: "error",
        message: "Informe um valor unitario valido maior que zero."
      };
    }

    if (!batchId) {
      return {
        status: "error",
        message: "Selecione um lote valido para a venda."
      };
    }

    if (!selectedSaleType && (sale.sale_type ?? "normal")) {
      return {
        status: "error",
        message: "Selecione um tipo de venda valido."
      };
    }

    if (!selectedTicketType && (sale.ticket_type ?? "pista")) {
      return {
        status: "error",
        message: "Selecione um tipo de ingresso valido para a venda."
      };
    }

    const eventRow = await getEventRowBySlug(eventSlug || "");
    const saleType = eventRow.has_group_sales ? selectedSaleType : "normal";
    const ticketType = eventRow.has_vip ? selectedTicketType : "pista";

    if (!saleType) {
      return {
        status: "error",
        message: "Selecione um tipo de venda valido."
      };
    }

    if (guestNames.length !== quantity) {
      return {
        status: "error",
        message: "Preencha exatamente um nome por ingresso vendido."
      };
    }

    await getSellerMembershipOrThrow(supabase, sale.event_id, sellerUserId);
    const eventBatch = await ensureEventBatchBelongsToEvent(supabase, sale.event_id, batchId);

    if (!eventBatch.is_active && eventBatch.id !== sale.batch_id) {
      return {
        status: "error",
        message: "Selecione um lote ativo para a venda."
      };
    }

    const { data: previousAttendees, error: previousAttendeesError } = await supabase
      .from("sale_attendees")
      .select("seller_user_id, guest_name, checked_in_at")
      .eq("sale_id", saleId);

    if (previousAttendeesError) {
      throw new Error(previousAttendeesError.message);
    }

    const { error } = await supabase
      .from("sales")
      .update({
        seller_user_id: sellerUserId,
        batch_id: eventBatch.id,
        sale_type: saleType,
        ticket_type: ticketType,
        quantity,
        unit_price: unitPrice,
        payment_status: "paid",
        sold_at: soldAt,
        notes: notes || null
      })
      .eq("id", saleId);

    if (error) {
      throw new Error(error.message);
    }

    try {
      const insertedAttendees = await replaceSaleAttendees({
        supabase,
        eventId: sale.event_id,
        saleId,
        sellerUserId,
        guestNames,
        expectedQuantity: quantity
      });

      console.info("[sales] Venda atualizada com nomes consistentes", {
        eventId: sale.event_id,
        saleId,
        quantity,
        attendeeCount: insertedAttendees.length
      });
    } catch (attendeeError) {
      console.error("[sales] Falha ao recriar nomes; restaurando nomes anteriores", {
        eventId: sale.event_id,
        saleId,
        quantity,
        attendeeCount: guestNames.length,
        error: attendeeError instanceof Error ? attendeeError.message : String(attendeeError)
      });

      await supabase
        .from("sales")
        .update({
          seller_user_id: sale.seller_user_id,
          batch_id: sale.batch_id,
          sale_type: sale.sale_type,
          ticket_type: sale.ticket_type,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          payment_status: sale.payment_status,
          sold_at: sale.sold_at,
          notes: sale.notes
        })
        .eq("id", saleId);
      await restoreSaleAttendees({
        supabase,
        eventId: sale.event_id,
        saleId,
        attendees: previousAttendees ?? []
      });
      throw attendeeError;
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: sale.event_id,
      action: "sale.updated",
      entityType: "sale",
      entityId: saleId,
      message: `${profile.full_name} atualizou uma venda de ${quantity} ingresso(s).`,
      metadata: {
        sellerUserId,
        batchId: eventBatch.id,
        batchLabel: eventBatch.name,
        saleType,
        ticketType,
        quantity,
        unitPrice,
        attendeeCount: guestNames.length
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Venda atualizada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar a venda."
    };
  }
}

export async function deleteSaleAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const saleId = String(formData.get("saleId") ?? "");

    const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", saleId).single();

    if (saleError || !sale) {
      return {
        status: "error",
        message: "Venda nao encontrada."
      };
    }

    const membership = await getMembership(supabase, sale.event_id, profile.id);
    const canDeleteThisSale =
      profile.role === "host" ||
      canManageEvent(profile, membership) ||
      (membership?.role === "seller" && sale.seller_user_id === profile.id);

    if (!canDeleteThisSale) {
      return {
        status: "error",
        message: "Voce nao pode excluir esta venda."
      };
    }

    const { error } = await supabase.from("sales").delete().eq("id", saleId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: sale.event_id,
      action: "sale.deleted",
      entityType: "sale",
      entityId: saleId,
      message: `${profile.full_name} excluiu uma venda de ${sale.quantity} ingresso(s).`,
      metadata: {
        sellerUserId: sale.seller_user_id,
        quantity: sale.quantity,
        unitPrice: sale.unit_price
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Venda excluida com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel excluir a venda."
    };
  }
}

export async function updateSaleAttendeeNameAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const attendeeId = String(formData.get("attendeeId") ?? "").trim();
    const guestName = String(formData.get("guestName") ?? "").trim();

    if (!guestName) {
      return {
        status: "error",
        message: "Informe o nome da pessoa para salvar a alteracao."
      };
    }

    const attendee = await getSaleAttendeeRowById(supabase, attendeeId);
    const membership = await getMembership(supabase, attendee.event_id, profile.id);
    const canEditAttendeeName =
      profile.role === "host" ||
      canManageEvent(profile, membership) ||
      (membership?.role === "seller" && attendee.seller_user_id === profile.id);

    if (!canEditAttendeeName) {
      return {
        status: "error",
        message: "Voce nao pode editar este nome na lista."
      };
    }

    const { error } = await supabase.from("sale_attendees").update({ guest_name: guestName }).eq("id", attendeeId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: attendee.event_id,
      action: "sale_attendee.updated",
      entityType: "sale_attendee",
      entityId: attendeeId,
      message: `${profile.full_name} atualizou um nome da lista de entrada.`,
      metadata: {
        saleId: attendee.sale_id,
        previousGuestName: attendee.guest_name,
        nextGuestName: guestName
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Nome atualizado com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar o nome."
    };
  }
}

export async function createManualGuestEntryAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "").trim();
    const guestName = String(formData.get("guestName") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!canManageManualGuests(profile, membership)) {
      return {
        status: "error",
        message: "Apenas host pode adicionar nomes manuais nesta festa."
      };
    }

    if (!guestName) {
      return {
        status: "error",
        message: "Informe o nome que deve entrar na lista."
      };
    }

    const { data: entry, error } = await supabase
      .from("manual_guest_entries")
      .insert({
        event_id: event.id,
        guest_name: guestName,
        notes: notes || null,
        created_by: profile.id
      })
      .select("id")
      .single();

    if (error || !entry) {
      throw new Error(error?.message ?? "Nao foi possivel adicionar o nome manual.");
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "manual_guest_entry.created",
      entityType: "manual_guest_entry",
      entityId: entry.id,
      message: `${profile.full_name} adicionou um nome manual a lista de entrada.`,
      metadata: {
        guestName
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Nome manual adicionado com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel adicionar o nome manual."
    };
  }
}

export async function updateManualGuestEntryAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "").trim();
    const entryId = String(formData.get("entryId") ?? "").trim();
    const guestName = String(formData.get("guestName") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const entry = await getManualGuestEntryRowById(supabase, entryId);
    const membership = await getMembership(supabase, entry.event_id, profile.id);

    if (!canManageManualGuests(profile, membership)) {
      return {
        status: "error",
        message: "Apenas host pode editar nomes manuais nesta festa."
      };
    }

    if (!guestName) {
      return {
        status: "error",
        message: "Informe o nome que deve permanecer na lista."
      };
    }

    const { error } = await supabase
      .from("manual_guest_entries")
      .update({
        guest_name: guestName,
        notes: notes || null
      })
      .eq("id", entryId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: entry.event_id,
      action: "manual_guest_entry.updated",
      entityType: "manual_guest_entry",
      entityId: entryId,
      message: `${profile.full_name} atualizou um nome manual da lista de entrada.`,
      metadata: {
        previousGuestName: entry.guest_name,
        nextGuestName: guestName
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Nome manual atualizado com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar o nome manual."
    };
  }
}

export async function deleteManualGuestEntryAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "").trim();
    const entryId = String(formData.get("entryId") ?? "").trim();
    const entry = await getManualGuestEntryRowById(supabase, entryId);
    const membership = await getMembership(supabase, entry.event_id, profile.id);

    if (!canManageManualGuests(profile, membership)) {
      return {
        status: "error",
        message: "Apenas host pode remover nomes manuais nesta festa."
      };
    }

    const { error } = await supabase.from("manual_guest_entries").delete().eq("id", entryId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: entry.event_id,
      action: "manual_guest_entry.deleted",
      entityType: "manual_guest_entry",
      entityId: entryId,
      message: `${profile.full_name} removeu um nome manual da lista de entrada.`,
      metadata: {
        guestName: entry.guest_name
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Nome manual removido com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel remover o nome manual."
    };
  }
}

export async function createExpenseAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!canManageFinance(profile, membership)) {
      return {
        status: "error",
        message: "Voce nao tem permissao para cadastrar despesas nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const incurredAt = String(formData.get("incurredAt") ?? new Date().toISOString().slice(0, 10));
    const notes = String(formData.get("notes") ?? "").trim();

    const validationError = validateExpenseFields({
      title,
      category,
      amount,
      incurredAt
    });

    if (validationError) {
      return {
        status: "error",
        message: validationError
      };
    }

    const { error } = await supabase.from("expenses").insert({
      event_id: event.id,
      title,
      category,
      amount,
      incurred_at: incurredAt,
      notes: notes || null,
      created_by: profile.id
    });

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "expense.created",
      entityType: "expense",
      message: `${profile.full_name} cadastrou a despesa "${title}".`,
      metadata: {
        title,
        amount,
        category
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Despesa cadastrada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel cadastrar a despesa."
    };
  }
}

export async function updateExpenseAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const expenseId = String(formData.get("expenseId") ?? "");
    const expense = await getExpenseRowById(supabase, expenseId);
    const membership = await getMembership(supabase, expense.event_id, profile.id);

    if (!canManageFinance(profile, membership)) {
      return {
        status: "error",
        message: "Voce nao tem permissao para editar despesas nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const incurredAt = String(formData.get("incurredAt") ?? expense.incurred_at);
    const notes = String(formData.get("notes") ?? "").trim();
    const validationError = validateExpenseFields({
      title,
      category,
      amount,
      incurredAt
    });

    if (validationError) {
      return {
        status: "error",
        message: validationError
      };
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        title,
        category,
        amount,
        incurred_at: incurredAt,
        notes: notes || null
      })
      .eq("id", expenseId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: expense.event_id,
      action: "expense.updated",
      entityType: "expense",
      entityId: expenseId,
      message: `${profile.full_name} atualizou a despesa "${title}".`,
      metadata: {
        title,
        category,
        amount,
        incurredAt,
        notes: notes || null
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Despesa atualizada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar a despesa."
    };
  }
}

export async function createAdditionalRevenueAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!canManageFinance(profile, membership)) {
      return {
        status: "error",
        message: "Voce nao tem permissao para registrar arrecadacoes nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));

    if (!title) {
      return {
        status: "error",
        message: "Informe o titulo da arrecadacao."
      };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        status: "error",
        message: "Informe um valor valido maior que zero."
      };
    }

    if (Number.isNaN(new Date(date).getTime())) {
      return {
        status: "error",
        message: "Informe uma data valida."
      };
    }

    const { data: revenue, error } = await supabase
      .from("additional_revenues")
      .insert({
        event_id: event.id,
        title,
        amount,
        category: category || null,
        date,
        created_by: profile.id
      })
      .select("id")
      .single();

    if (error || !revenue) {
      throw new Error(error?.message ?? "Nao foi possivel registrar a arrecadacao.");
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "additional_revenue.created",
      entityType: "additional_revenue",
      entityId: revenue.id,
      message: `${profile.full_name} registrou arrecadacao adicional "${title}".`,
      metadata: {
        title,
        amount,
        category: category || null,
        date
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Arrecadacao registrada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel registrar a arrecadacao."
    };
  }
}

export async function updateAdditionalRevenueAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const revenueId = String(formData.get("revenueId") ?? "");
    const revenue = await getAdditionalRevenueRowById(supabase, revenueId);
    const membership = await getMembership(supabase, revenue.event_id, profile.id);

    if (!canManageFinance(profile, membership)) {
      return {
        status: "error",
        message: "Voce nao tem permissao para editar arrecadacoes nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const date = String(formData.get("date") ?? revenue.date);

    if (!title) {
      return {
        status: "error",
        message: "Informe o titulo da arrecadacao."
      };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        status: "error",
        message: "Informe um valor valido maior que zero."
      };
    }

    if (Number.isNaN(new Date(date).getTime())) {
      return {
        status: "error",
        message: "Informe uma data valida."
      };
    }

    const { error } = await supabase
      .from("additional_revenues")
      .update({
        title,
        amount,
        category: category || null,
        date
      })
      .eq("id", revenueId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: revenue.event_id,
      action: "additional_revenue.updated",
      entityType: "additional_revenue",
      entityId: revenueId,
      message: `${profile.full_name} atualizou arrecadacao adicional "${title}".`,
      metadata: {
        title,
        amount,
        category: category || null,
        date
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Arrecadacao atualizada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar a arrecadacao."
    };
  }
}

export async function deleteAdditionalRevenueAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const revenueId = String(formData.get("revenueId") ?? "");
    const revenue = await getAdditionalRevenueRowById(supabase, revenueId);
    const membership = await getMembership(supabase, revenue.event_id, profile.id);

    if (!canManageFinance(profile, membership)) {
      return {
        status: "error",
        message: "Voce nao tem permissao para excluir arrecadacoes nesta festa."
      };
    }

    const { error } = await supabase.from("additional_revenues").delete().eq("id", revenueId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: revenue.event_id,
      action: "additional_revenue.deleted",
      entityType: "additional_revenue",
      entityId: revenueId,
      message: `${profile.full_name} excluiu arrecadacao adicional "${revenue.title}".`,
      metadata: {
        title: revenue.title,
        amount: revenue.amount,
        category: revenue.category ?? null,
        date: revenue.date
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Arrecadacao removida com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel excluir a arrecadacao."
    };
  }
}

export async function deleteExpenseAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const expenseId = String(formData.get("expenseId") ?? "");
    const expense = await getExpenseRowById(supabase, expenseId);
    const membership = await getMembership(supabase, expense.event_id, profile.id);

    if (!canManageFinance(profile, membership)) {
      return {
        status: "error",
        message: "Voce nao tem permissao para excluir esta despesa."
      };
    }

    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: expense.event_id,
      action: "expense.deleted",
      entityType: "expense",
      entityId: expenseId,
      message: `${profile.full_name} excluiu a despesa "${expense.title}".`,
      metadata: {
        title: expense.title,
        amount: expense.amount,
        category: expense.category
      }
    });

    revalidatePath(`/festas/${eventSlug}`);
    revalidatePath("/");
    revalidatePath("/festas");

    return {
      status: "success",
      message: "Despesa excluida com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel excluir a despesa."
    };
  }
}

export async function updateEventAction(
  _prevState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const currentSlug = String(formData.get("eventId") ?? "").trim();
    const event = await getEventRowBySlug(currentSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!(profile.role === "host" || membership?.role === "host")) {
      return {
        status: "error",
        message: "Somente host pode editar os dados desta festa."
      };
    }

    const name = String(formData.get("name") ?? "").trim();
    const venue = String(formData.get("venue") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const goalValue = Number(formData.get("goalValue") ?? 0);
    const description = String(formData.get("description") ?? "").trim();
    const hasVip = parseBooleanField(formData.get("hasVip"), event.has_vip ?? true);
    const hasGroupSales = parseBooleanField(formData.get("hasGroupSales"), event.has_group_sales ?? true);
    const submittedBatchRows = parseBatchConfigs(formData, hasVip);
    const validationError = validateEventFields({ name, venue, eventDate, goalValue });

    if (validationError) {
      return {
        status: "error",
        message: validationError
      };
    }

    const commercialValidationError = validateCommercialConfig({ hasVip, batches: submittedBatchRows });

    if (commercialValidationError) {
      return {
        status: "error",
        message: commercialValidationError
      };
    }

    const nextSlug = await generateUniqueEventSlug(supabase, name, event.id);

    const { error } = await supabase
      .from("events")
      .update({
        name,
        venue,
        description: description || null,
        event_date: eventDate,
        goal_value: goalValue,
        has_vip: hasVip,
        has_group_sales: hasGroupSales,
        slug: nextSlug
      })
      .eq("id", event.id);

    if (error) {
      throw new Error(error.message);
    }

    await syncEventBatches({
      supabase,
      eventId: event.id,
      submittedRows: submittedBatchRows
    });

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "event.updated",
      entityType: "event",
      entityId: event.id,
      message: `${profile.full_name} atualizou os dados da festa "${name}".`,
      metadata: {
        previousSlug: currentSlug,
        nextSlug,
        goalValue,
        batchCount: submittedBatchRows.filter((batch) => batch.isActive).length,
        hasVip,
        hasGroupSales
      }
    });

    revalidatePath("/");
    revalidatePath("/festas");
    revalidatePath(`/festas/${currentSlug}`);
    revalidatePath(`/festas/${nextSlug}`);

    return {
      status: "success",
      message: "Evento atualizado com sucesso.",
      redirectTo: `/festas/${nextSlug}`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar o evento."
    };
  }
}

export async function deleteEventAction(
  _prevState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "").trim();
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!(profile.role === "host" || membership?.role === "host")) {
      return {
        status: "error",
        message: "Somente host pode excluir esta festa."
      };
    }

    const confirmation = String(formData.get("confirmation") ?? "").trim();

    if (confirmation !== event.name) {
      return {
        status: "error",
        message: "Digite o nome exato da festa para confirmar a exclusao."
      };
    }

    const { error } = await supabase.from("events").delete().eq("id", event.id);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "event.deleted",
      entityType: "event",
      entityId: event.id,
      message: `${profile.full_name} excluiu a festa "${event.name}".`,
      metadata: {
        eventName: event.name,
        eventSlug: event.slug
      }
    });

    revalidatePath("/");
    revalidatePath("/festas");
    revalidatePath("/historico");

    return {
      status: "success",
      message: "Evento excluido com sucesso.",
      redirectTo: "/festas"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel excluir o evento."
    };
  }
}

export async function createTaskAction(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode criar tarefas nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const ownerProfileId = String(formData.get("ownerProfileId") ?? "").trim();
    const dueAt = String(formData.get("dueAt") ?? "").trim();
    const status = String(formData.get("status") ?? "pending") as Database["public"]["Tables"]["tasks"]["Row"]["status"];

    if (!title) {
      return {
        status: "error",
        message: "Informe o titulo da tarefa."
      };
    }

    const { error } = await supabase.from("tasks").insert({
      event_id: event.id,
      title,
      owner_profile_id: ownerProfileId || null,
      due_at: dueAt || null,
      status,
      created_by: profile.id
    });

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "task.created",
      entityType: "task",
      message: `${profile.full_name} criou a tarefa "${title}".`,
      metadata: {
        title,
        status
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Tarefa criada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel criar a tarefa."
    };
  }
}

export async function updateTaskAction(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const taskId = String(formData.get("taskId") ?? "");
    const task = await getTaskRowById(supabase, taskId);
    const membership = await getMembership(supabase, task.event_id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode editar tarefas nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const ownerProfileId = String(formData.get("ownerProfileId") ?? "").trim();
    const dueAt = String(formData.get("dueAt") ?? "").trim();
    const status = String(formData.get("status") ?? task.status) as Database["public"]["Tables"]["tasks"]["Row"]["status"];

    if (!title) {
      return {
        status: "error",
        message: "Informe o titulo da tarefa."
      };
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        title,
        owner_profile_id: ownerProfileId || null,
        due_at: dueAt || null,
        status
      })
      .eq("id", taskId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: task.event_id,
      action: "task.updated",
      entityType: "task",
      entityId: taskId,
      message: `${profile.full_name} atualizou a tarefa "${title}".`,
      metadata: {
        title,
        status
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Tarefa atualizada com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar a tarefa."
    };
  }
}

export async function updateTaskStatusAction(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const taskId = String(formData.get("taskId") ?? "");
    const task = await getTaskRowById(supabase, taskId);
    const membership = await getMembership(supabase, task.event_id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode atualizar tarefas nesta festa."
      };
    }

    const status = String(formData.get("status") ?? "pending") as Database["public"]["Tables"]["tasks"]["Row"]["status"];
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: task.event_id,
      action: "task.status_updated",
      entityType: "task",
      entityId: taskId,
      message: `${profile.full_name} atualizou o status da tarefa "${task.title}".`,
      metadata: {
        previousStatus: task.status,
        nextStatus: status
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Status da tarefa atualizado."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar a tarefa."
    };
  }
}

export async function deleteTaskAction(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const taskId = String(formData.get("taskId") ?? "");
    const task = await getTaskRowById(supabase, taskId);
    const membership = await getMembership(supabase, task.event_id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode excluir tarefas nesta festa."
      };
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: task.event_id,
      action: "task.deleted",
      entityType: "task",
      entityId: taskId,
      message: `${profile.full_name} excluiu a tarefa "${task.title}".`,
      metadata: {
        title: task.title
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Tarefa excluida com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel excluir a tarefa."
    };
  }
}

export async function createAnnouncementAction(
  _prevState: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode publicar comunicados nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const pinned = String(formData.get("pinned") ?? "") === "on";

    if (!title || !body) {
      return {
        status: "error",
        message: "Preencha titulo e mensagem."
      };
    }

    const { error } = await supabase.from("announcements").insert({
      event_id: event.id,
      title,
      body,
      pinned,
      created_by: profile.id
    });

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "announcement.created",
      entityType: "announcement",
      message: `${profile.full_name} publicou o comunicado "${title}".`,
      metadata: {
        title,
        pinned
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Comunicado publicado com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel publicar o comunicado."
    };
  }
}

export async function updateAnnouncementAction(
  _prevState: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const announcementId = String(formData.get("announcementId") ?? "");
    const announcement = await getAnnouncementRowById(supabase, announcementId);
    const membership = await getMembership(supabase, announcement.event_id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode editar comunicados nesta festa."
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const pinned = String(formData.get("pinned") ?? "") === "on";

    if (!title || !body) {
      return {
        status: "error",
        message: "Preencha titulo e mensagem."
      };
    }

    const { error } = await supabase
      .from("announcements")
      .update({
        title,
        body,
        pinned
      })
      .eq("id", announcementId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: announcement.event_id,
      action: "announcement.updated",
      entityType: "announcement",
      entityId: announcementId,
      message: `${profile.full_name} atualizou o comunicado "${title}".`,
      metadata: {
        title,
        pinned
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Comunicado atualizado com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar o comunicado."
    };
  }
}

export async function deleteAnnouncementAction(
  _prevState: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const announcementId = String(formData.get("announcementId") ?? "");
    const announcement = await getAnnouncementRowById(supabase, announcementId);
    const membership = await getMembership(supabase, announcement.event_id, profile.id);

    if (!(profile.role === "host" || canManageEvent(profile, membership))) {
      return {
        status: "error",
        message: "Voce nao pode excluir comunicados nesta festa."
      };
    }

    const { error } = await supabase.from("announcements").delete().eq("id", announcementId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: announcement.event_id,
      action: "announcement.deleted",
      entityType: "announcement",
      entityId: announcementId,
      message: `${profile.full_name} excluiu o comunicado "${announcement.title}".`,
      metadata: {
        title: announcement.title
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Comunicado excluido com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel excluir o comunicado."
    };
  }
}

export async function addEventMemberAction(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    ensureCanManageEvent(profile, membership);

    const userId = String(formData.get("userId") ?? "").trim();
    const role = String(formData.get("role") ?? "seller") as EventMembershipRow["role"];
    if (!userId) {
      return {
        status: "error",
        message: "Selecione um usuario para adicionar."
      };
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError) {
      throw new Error(targetProfileError.message);
    }

    if (!targetProfile) {
      return {
        status: "error",
        message: "Usuario nao encontrado na base."
      };
    }

    ensureRoleTransitionAllowed({
      actorProfile: profile,
      actorMembership: membership,
      nextRole: role
    });

    const { error } = await supabase.from("event_memberships").insert({
      event_id: event.id,
      user_id: userId,
      role
    });

    if (error) {
      if (error.code === "23505") {
        return {
          status: "error",
          message: "Esse usuario ja faz parte desta festa."
        };
      }

      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "membership.created",
      entityType: "event_membership",
      entityId: userId,
      message: `${profile.full_name} adicionou um membro a esta festa.`,
      metadata: {
        userId,
        role
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Membro adicionado a equipe com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel adicionar o membro."
    };
  }
}

export async function updateEventMemberRoleAction(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    ensureCanManageEvent(profile, membership);

    const membershipId = String(formData.get("membershipId") ?? "").trim();
    const nextRole = String(formData.get("role") ?? "seller") as EventMembershipRow["role"];
    const { data: targetMembership, error: targetError } = await supabase
      .from("event_memberships")
      .select("*")
      .eq("id", membershipId)
      .eq("event_id", event.id)
      .single();

    if (targetError || !targetMembership) {
      return {
        status: "error",
        message: "Membro da equipe nao encontrado."
      };
    }

    ensureRoleTransitionAllowed({
      actorProfile: profile,
      actorMembership: membership,
      targetMembership,
      nextRole
    });

    if (targetMembership.role === "host" && nextRole !== "host") {
      const totalHosts = await countEventHosts(supabase, event.id);

      if (totalHosts <= 1) {
        return {
          status: "error",
          message: "Essa festa precisa manter pelo menos um host."
        };
      }
    }

    const { error } = await supabase
      .from("event_memberships")
      .update({
        role: nextRole
      })
      .eq("id", membershipId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "membership.role_updated",
      entityType: "event_membership",
      entityId: membershipId,
      message: `${profile.full_name} alterou o cargo de um membro da equipe.`,
      metadata: {
        userId: targetMembership.user_id,
        previousRole: targetMembership.role,
        nextRole
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Cargo atualizado com sucesso."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel atualizar o cargo."
    };
  }
}

export async function removeEventMemberAction(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    ensureCanManageEvent(profile, membership);

    const membershipId = String(formData.get("membershipId") ?? "").trim();

    const { data: targetMembership, error: targetError } = await supabase
      .from("event_memberships")
      .select("*")
      .eq("id", membershipId)
      .eq("event_id", event.id)
      .single();

    if (targetError || !targetMembership) {
      return {
        status: "error",
        message: "Membro da equipe nao encontrado."
      };
    }

    ensureRoleTransitionAllowed({
      actorProfile: profile,
      actorMembership: membership,
      targetMembership,
      nextRole: targetMembership.role
    });

    if (targetMembership.role === "host") {
      const totalHosts = await countEventHosts(supabase, event.id);

      if (totalHosts <= 1) {
        return {
          status: "error",
          message: "Essa festa precisa manter pelo menos um host."
        };
      }
    }

    const { error } = await supabase.from("event_memberships").delete().eq("id", membershipId);

    if (error) {
      throw new Error(error.message);
    }

    await logActivity(supabase, {
      actorUserId: profile.id,
      eventId: event.id,
      action: "membership.deleted",
      entityType: "event_membership",
      entityId: membershipId,
      message: `${profile.full_name} removeu um membro da festa.`,
      metadata: {
        userId: targetMembership.user_id,
        role: targetMembership.role
      }
    });

    revalidatePath(`/festas/${eventSlug}`);

    return {
      status: "success",
      message: "Membro removido da equipe."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Nao foi possivel remover o membro."
    };
  }
}
