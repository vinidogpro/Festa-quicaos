"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function ensureCanManageEvent(profile: ProfileRow, membership: EventMembershipRow | null) {
  if (!canManageEvent(profile, membership)) {
    throw new Error("Voce nao tem permissao para gerenciar a equipe desta festa.");
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
    const paymentStatus = String(formData.get("paymentStatus") ?? "pending") as Database["public"]["Tables"]["sales"]["Row"]["payment_status"];
    const soldAt = String(formData.get("soldAt") ?? new Date().toISOString().slice(0, 10));
    const notes = String(formData.get("notes") ?? "").trim();

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

    const { data: sellerMembership } = await supabase
      .from("event_memberships")
      .select("role")
      .eq("event_id", event.id)
      .eq("user_id", sellerUserId)
      .single();

    if (!sellerMembership || sellerMembership.role !== "seller") {
      return {
        status: "error",
        message: "O usuario selecionado precisa estar vinculado como vendedor nesta festa."
      };
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
    const paymentStatus = String(formData.get("paymentStatus") ?? sale.payment_status) as Database["public"]["Tables"]["sales"]["Row"]["payment_status"];
    const soldAt = String(formData.get("soldAt") ?? sale.sold_at);
    const notes = String(formData.get("notes") ?? sale.notes ?? "").trim();

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

export async function createExpenseAction(
  _prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  try {
    const { supabase, profile } = await getActionProfile();
    const eventSlug = String(formData.get("eventId") ?? "");
    const event = await getEventRowBySlug(eventSlug);
    const membership = await getMembership(supabase, event.id, profile.id);

    if (!(profile.role === "host" || membership?.role === "host" || membership?.role === "organizer")) {
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

    if (!title || !category || !Number.isFinite(amount) || amount <= 0) {
      return {
        status: "error",
        message: "Preencha titulo, categoria e valor valido para a despesa."
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

    revalidatePath(`/festas/${eventSlug}`);

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

    if (!(profile.role === "host" || membership?.role === "host" || membership?.role === "organizer")) {
      return {
        status: "error",
        message: "Voce nao tem permissao para excluir esta despesa."
      };
    }

    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/festas/${eventSlug}`);

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

    if (!name || !venue || !eventDate || !Number.isFinite(goalValue) || goalValue < 0) {
      return {
        status: "error",
        message: "Preencha nome, local, data e meta corretamente."
      };
    }

    const nextSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error } = await supabase
      .from("events")
      .update({
        name,
        venue,
        event_date: eventDate,
        goal_value: goalValue,
        slug: nextSlug
      })
      .eq("id", event.id);

    if (error) {
      throw new Error(error.message);
    }

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
    const ticketQuota = Number(formData.get("ticketQuota") ?? 0);

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

    const { error } = await supabase.from("event_memberships").insert({
      event_id: event.id,
      user_id: userId,
      role,
      ticket_quota: Math.max(ticketQuota, 0)
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
    const ticketQuota = Number(formData.get("ticketQuota") ?? 0);

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
        role: nextRole,
        ticket_quota: Math.max(ticketQuota, 0)
      })
      .eq("id", membershipId);

    if (error) {
      throw new Error(error.message);
    }

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
