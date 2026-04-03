"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseActionClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

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

  return { supabase, user, profile };
}

async function getEventRowBySlug(slug: string) {
  const supabase = createSupabaseActionClient() as any;
  const { data: event, error } = await supabase.from("events").select("*").eq("slug", slug).single();

  if (error || !event) {
    throw new Error("Evento nao encontrado.");
  }

  return event;
}

function assertRole(profile: ProfileRow, allowedRoles: ProfileRow["role"][]) {
  if (!allowedRoles.includes(profile.role)) {
    throw new Error("Voce nao tem permissao para esta acao.");
  }
}

export async function createEventAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  assertRole(profile, ["admin"]);

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
    .select("slug")
    .single();

  if (error || !event) {
    throw new Error(error?.message ?? "Nao foi possivel criar a festa.");
  }

  revalidatePath("/");
  revalidatePath("/festas");
  redirect(`/festas/${event.slug}`);
}

export async function createSaleAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);

  let sellerId = String(formData.get("sellerId") ?? "");

  if (profile.role === "seller") {
    const { data: sellerRow } = await supabase
      .from("sellers")
      .select("id")
      .eq("event_id", event.id)
      .eq("profile_id", profile.id)
      .single();

    if (!sellerRow) {
      throw new Error("Seu perfil nao esta vinculado como vendedor deste evento.");
    }

    sellerId = sellerRow.id;
  } else {
    assertRole(profile, ["admin", "organizer"]);
  }

  const quantity = Number(formData.get("quantity") ?? 0);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  const paymentStatus = String(formData.get("paymentStatus") ?? "pending") as Database["public"]["Tables"]["sales"]["Row"]["payment_status"];
  const soldAt = String(formData.get("soldAt") ?? new Date().toISOString().slice(0, 10));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sellerId || quantity <= 0 || unitPrice <= 0) {
    throw new Error("Informe vendedor, quantidade e valor unitario validos.");
  }

  const { error } = await supabase.from("sales").insert({
    event_id: event.id,
    seller_id: sellerId,
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

  if (profile.role === "seller") {
    const { data: sellerRow } = await supabase
      .from("sellers")
      .select("profile_id")
      .eq("id", sale.seller_id)
      .single();

    if (!sellerRow || sellerRow.profile_id !== profile.id) {
      throw new Error("Voce so pode editar suas proprias vendas.");
    }
  } else {
    assertRole(profile, ["admin", "organizer"]);
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
  assertRole(profile, ["admin"]);

  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
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
  assertRole(profile, ["admin", "organizer"]);

  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
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
  assertRole(profile, ["admin", "organizer"]);

  const eventSlug = String(formData.get("eventId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "pending") as Database["public"]["Tables"]["tasks"]["Row"]["status"];

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/festas/${eventSlug}`);
}

export async function createAnnouncementAction(formData: FormData) {
  const { supabase, profile } = await getActionProfile();
  assertRole(profile, ["admin", "organizer"]);

  const eventSlug = String(formData.get("eventId") ?? "");
  const event = await getEventRowBySlug(eventSlug);
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
