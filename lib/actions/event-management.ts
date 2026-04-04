"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseActionClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventMembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];

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

function assertHost(profile: ProfileRow) {
  if (profile.role !== "host") {
    throw new Error("Apenas o host global pode executar esta acao.");
  }
}

function canManageEvent(profile: ProfileRow, membership: EventMembershipRow | null) {
  return profile.role === "host" || membership?.role === "host" || membership?.role === "organizer";
}

export async function createEventAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  assertHost(profile);

  const name = String(formData.get("name") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const goalValue = Number(formData.get("goalValue") ?? 0);
  const status = String(formData.get("status") ?? "upcoming") as Database["public"]["Tables"]["events"]["Row"]["status"];

  if (!name || !venue || !eventDate) {
    throw new Error("Preencha nome, local e data da festa.");
  }

  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name,
      slug,
      venue,
      event_date: eventDate,
      goal_value: goalValue,
      status,
      created_by: profile.id
    })
    .select("id, slug")
    .single();

  if (error || !event) {
    throw new Error(error?.message ?? "Nao foi possivel criar a festa.");
  }

  await supabase.from("event_memberships").insert({
    event_id: event.id,
    user_id: profile.id,
    role: "host"
  });

  revalidatePath("/");
  revalidatePath("/festas");
  redirect(`/festas/${event.slug}`);
}

export async function createSaleAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
  const membership = await getMembership(supabase, event.id, profile.id);

  let sellerUserId = String(formData.get("sellerId") ?? "");

  if (profile.role === "host" || canManageEvent(profile, membership)) {
    if (!sellerUserId) {
      throw new Error("Selecione um vendedor.");
    }
  } else if (membership?.role === "seller") {
    sellerUserId = profile.id;
  } else {
    throw new Error("Voce nao tem permissao para registrar vendas nesta festa.");
  }

  const quantity = Number(formData.get("quantity") ?? 0);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  const paymentStatus = String(formData.get("paymentStatus") ?? "pending") as Database["public"]["Tables"]["sales"]["Row"]["payment_status"];
  const soldAt = String(formData.get("soldAt") ?? new Date().toISOString().slice(0, 10));
  const notes = String(formData.get("notes") ?? "").trim();

  if (quantity <= 0 || unitPrice <= 0) {
    throw new Error("Informe quantidade e valor unitario validos.");
  }

  const { data: sellerMembership } = await supabase
    .from("event_memberships")
    .select("role")
    .eq("event_id", event.id)
    .eq("user_id", sellerUserId)
    .single();

  if (!sellerMembership || sellerMembership.role !== "seller") {
    throw new Error("O usuario selecionado nao esta vinculado como vendedor desta festa.");
  }

  const { error } = await supabase.from("sales").insert({
    event_id: event.id,
    seller_user_id: sellerUserId,
    quantity,
    unit_price: unitPrice,
    payment_status: paymentStatus,
    sold_at: soldAt,
    notes: notes || null,
    created_by: profile.id
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/festas/${eventSlug}`);
  revalidatePath("/");
  revalidatePath("/festas");
}

export async function updateSaleAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const saleId = String(formData.get("saleId") ?? "");

  const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", saleId).single();

  if (saleError || !sale) {
    throw new Error("Venda nao encontrada.");
  }

  const membership = await getMembership(supabase, sale.event_id, profile.id);
  const canManageThisSale =
    profile.role === "host" ||
    canManageEvent(profile, membership) ||
    (membership?.role === "seller" && sale.seller_user_id === profile.id);

  if (!canManageThisSale) {
    throw new Error("Voce nao pode editar esta venda.");
  }

  const quantity = Number(formData.get("quantity") ?? sale.quantity);
  const unitPrice = Number(formData.get("unitPrice") ?? sale.unit_price);
  const paymentStatus = String(formData.get("paymentStatus") ?? sale.payment_status) as Database["public"]["Tables"]["sales"]["Row"]["payment_status"];
  const soldAt = String(formData.get("soldAt") ?? sale.sold_at);
  const notes = String(formData.get("notes") ?? sale.notes ?? "").trim();

  const { error } = await supabase
    .from("sales")
    .update({
      quantity,
      unit_price: unitPrice,
      payment_status: paymentStatus,
      sold_at: soldAt,
      notes: notes || null
    })
    .eq("id", saleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/festas/${eventSlug}`);
}

export async function createExpenseAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
  const membership = await getMembership(supabase, event.id, profile.id);

  if (!(profile.role === "host" || membership?.role === "host")) {
    throw new Error("Apenas host pode criar despesas.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const incurredAt = String(formData.get("incurredAt") ?? new Date().toISOString().slice(0, 10));

  if (!title || !category || amount <= 0) {
    throw new Error("Preencha os dados da despesa corretamente.");
  }

  const { error } = await supabase.from("expenses").insert({
    event_id: event.id,
    title,
    category,
    amount,
    incurred_at: incurredAt,
    created_by: profile.id
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/festas/${eventSlug}`);
}

export async function createTaskAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
  const membership = await getMembership(supabase, event.id, profile.id);

  if (!(profile.role === "host" || canManageEvent(profile, membership))) {
    throw new Error("Voce nao pode criar tarefas nesta festa.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const ownerProfileId = String(formData.get("ownerProfileId") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();

  if (!title) {
    throw new Error("Informe o titulo da tarefa.");
  }

  const { error } = await supabase.from("tasks").insert({
    event_id: event.id,
    title,
    owner_profile_id: ownerProfileId || null,
    due_at: dueAt || null,
    created_by: profile.id
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/festas/${eventSlug}`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
  const membership = await getMembership(supabase, event.id, profile.id);

  if (!(profile.role === "host" || canManageEvent(profile, membership))) {
    throw new Error("Voce nao pode atualizar tarefas nesta festa.");
  }

  const status = String(formData.get("status") ?? "pending") as Database["public"]["Tables"]["tasks"]["Row"]["status"];
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/festas/${eventSlug}`);
}

export async function createAnnouncementAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
  const membership = await getMembership(supabase, event.id, profile.id);

  if (!(profile.role === "host" || canManageEvent(profile, membership))) {
    throw new Error("Voce nao pode publicar comunicados nesta festa.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = String(formData.get("pinned") ?? "") === "on";

  if (!title || !body) {
    throw new Error("Preencha titulo e mensagem.");
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

  revalidatePath(`/festas/${eventSlug}`);
}
