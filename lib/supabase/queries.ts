import { isSupabaseConfigured } from "@/lib/env";
import { buildPermissions } from "@/lib/permissions";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  ActivityLogItem,
  Announcement,
  EventAttentionItem,
  EventComparisonSnapshot,
  EventHealthSnapshot,
  EventSummary,
  Expense,
  GuestListEntry,
  PartyEventDetail,
  SalesRecord,
  SellerContribution,
  SellerOption,
  SellerRanking,
  TaskItem,
  TeamMember,
  TransferPending,
  UserDirectoryOption,
  ViewerProfile
} from "@/lib/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventMembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface ViewerContext {
  viewer: ViewerProfile;
}

function toAvatarLabel(name: string, avatarLabel?: string | null) {
  if (avatarLabel) {
    return avatarLabel;
  }

  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function getViewerContext(): Promise<ViewerContext | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseServerClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error || !profile) {
    return null;
  }

  return {
    viewer: {
      id: profile.id,
      email: user.email ?? "",
      name: profile.full_name,
      avatar: toAvatarLabel(profile.full_name, profile.avatar_label),
      role: profile.role
    }
  };
}

async function getAccessibleEvents(viewer: ViewerProfile): Promise<EventRow[]> {
  const supabase = createSupabaseServerClient() as any;

  if (viewer.role === "host") {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as EventRow[];
  }

  const { data: memberships, error } = await supabase
    .from("event_memberships")
    .select("event_id")
    .eq("user_id", viewer.id);

  if (error) {
    throw error;
  }

  const eventIds = [...new Set(((memberships ?? []) as Array<Pick<EventMembershipRow, "event_id">>).map((row) => row.event_id))];

  if (eventIds.length === 0) {
    return [];
  }

  const { data, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .order("event_date", { ascending: true });

  if (eventsError) {
    throw eventsError;
  }

  return (data ?? []) as EventRow[];
}

async function getProfilesMap(profileIds: string[]) {
  if (profileIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const supabase = createSupabaseServerClient() as any;
  const { data, error } = await supabase.from("profiles").select("*").in("id", profileIds);

  if (error) {
    throw error;
  }

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
}

function buildSummaryFromRows({
  event,
  sales,
  expenses,
  memberships,
  profilesMap
}: {
  event: EventRow;
  sales: SaleRow[];
  expenses: ExpenseRow[];
  memberships: EventMembershipRow[];
  profilesMap: Map<string, ProfileRow>;
}): EventSummary {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const progress = event.goal_value > 0 ? Math.round((totalRevenue / event.goal_value) * 100) : 0;

  const sellerMemberships = memberships.filter((membership) => membership.role === "seller");
  const revenueBySeller = sellerMemberships.map((membership) => {
    const revenue = sales
      .filter((sale) => sale.seller_user_id === membership.user_id)
      .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);

    return {
      membership,
      revenue
    };
  });

  const best = revenueBySeller.sort((left, right) => right.revenue - left.revenue)[0];
  const bestProfile = best ? profilesMap.get(best.membership.user_id) : undefined;

  return {
    id: event.slug,
    name: event.name,
    eventDate: event.event_date,
    status: event.status,
    description: event.description ?? undefined,
    totalRevenue,
    goalValue: event.goal_value,
    progress,
    estimatedProfit: totalRevenue - totalExpenses,
    totalTicketsSold,
    bestSeller: bestProfile?.full_name ?? "Sem vendas",
    venue: event.venue
  };
}

export async function getCurrentViewer() {
  const context = await getViewerContext();
  return context?.viewer ?? null;
}

export async function getEvents(): Promise<EventSummary[]> {
  const context = await getViewerContext();

  if (!context) {
    return [];
  }

  const supabase = createSupabaseServerClient() as any;
  const events = await getAccessibleEvents(context.viewer);

  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((event) => event.id);

  const [{ data: sales }, { data: expenses }, { data: memberships }] = await Promise.all([
    supabase.from("sales").select("*").in("event_id", eventIds),
    supabase.from("expenses").select("*").in("event_id", eventIds),
    supabase.from("event_memberships").select("*").in("event_id", eventIds)
  ]);

  const salesRows = (sales ?? []) as SaleRow[];
  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const membershipRows = (memberships ?? []) as EventMembershipRow[];
  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const profilesMap = await getProfilesMap(profileIds);

  return events.map((event) =>
    buildSummaryFromRows({
      event,
      sales: salesRows.filter((sale) => sale.event_id === event.id),
      expenses: expenseRows.filter((expense) => expense.event_id === event.id),
      memberships: membershipRows.filter((membership) => membership.event_id === event.id),
      profilesMap
    })
  );
}

function buildHealthSnapshot({
  progress,
  pendingPaymentsCount,
  pendingTransfersCount
}: {
  progress: number;
  pendingPaymentsCount: number;
  pendingTransfersCount: number;
}): EventHealthSnapshot {
  if (progress >= 80 && pendingPaymentsCount <= 2 && pendingTransfersCount <= 1) {
    return {
      label: "Bem encaminhada",
      tone: "positive",
      summary: "A festa esta avancando bem e as pendencias atuais estao sob controle."
    };
  }

  if (progress >= 45 && pendingPaymentsCount <= 5) {
    return {
      label: "Atencao",
      tone: "warning",
      summary: "A meta segue viva, mas o time precisa acelerar vendas e reduzir pendencias."
    };
  }

  return {
    label: "Critica",
    tone: "critical",
    summary: "O evento corre risco de nao bater a meta se o time nao agir agora."
  };
}

export async function getEventById(id: string): Promise<PartyEventDetail | undefined> {
  const context = await getViewerContext();

  if (!context) {
    return undefined;
  }

  const supabase = createSupabaseServerClient() as any;
  const { data: event, error } = await supabase.from("events").select("*").eq("slug", id).single();

  if (error || !event) {
    return undefined;
  }

  const [{ data: memberships }, { data: sales }, { data: saleAttendees }, { data: expenses }, { data: tasks }, { data: announcements }, { data: activityLogs }] =
    await Promise.all([
      supabase.from("event_memberships").select("*").eq("event_id", event.id).order("created_at", { ascending: true }),
      supabase.from("sales").select("*").eq("event_id", event.id).order("sold_at", { ascending: false }),
      supabase.from("sale_attendees").select("*").eq("event_id", event.id).order("guest_name", { ascending: true }),
      supabase.from("expenses").select("*").eq("event_id", event.id).order("incurred_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").eq("event_id", event.id).order("created_at", { ascending: false })
    ]);

  const membershipRows = (memberships ?? []) as EventMembershipRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const saleAttendeeRows = (saleAttendees ?? []) as SaleAttendeeRow[];
  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const announcementRows = (announcements ?? []) as AnnouncementRow[];
  const activityLogRows = (activityLogs ?? []) as ActivityLogRow[];

  const profileIds = [
    ...new Set([
      ...membershipRows.map((membership) => membership.user_id),
      ...taskRows.flatMap((task) => (task.owner_profile_id ? [task.owner_profile_id] : [])),
      ...activityLogRows.map((log) => log.actor_user_id)
    ])
  ];
  const profilesMap = await getProfilesMap(profileIds);

  const viewerMembership = membershipRows.find((membership) => membership.user_id === context.viewer.id);
  const eventRole = viewerMembership?.role;
  const permissions = buildPermissions(context.viewer.role, eventRole, context.viewer.id);

  let availableUsers: UserDirectoryOption[] = [];

  if (permissions.canManageTeam) {
    const { data: allProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (profilesError) {
      throw profilesError;
    }

    const memberIds = new Set(membershipRows.map((membership) => membership.user_id));
    availableUsers = ((allProfiles ?? []) as ProfileRow[])
      .filter((profile) => !memberIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name
      }));
  }

  const summary = buildSummaryFromRows({
    event,
    sales: salesRows,
    expenses: expenseRows,
    memberships: membershipRows,
    profilesMap
  });

  const sellerMemberships = membershipRows.filter((membership) => membership.role === "seller");
  const totalQuota = sellerMemberships.reduce((sum, membership) => sum + membership.ticket_quota, 0);

  const ranking: SellerRanking[] = sellerMemberships
    .map((membership) => {
      const sellerSales = salesRows.filter((sale) => sale.seller_user_id === membership.user_id);
      const ticketsSold = sellerSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const revenue = sellerSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
      const pendingTransferAmount = sellerSales
        .filter((sale) => sale.payment_status === "pending")
        .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
      const profile = profilesMap.get(membership.user_id);
      const goalTickets = membership.ticket_quota;
      const goalProgress = goalTickets > 0 ? Math.round((ticketsSold / goalTickets) * 100) : 0;

      return {
        id: membership.id,
        sellerUserId: membership.user_id,
        name: profile?.full_name ?? "Vendedor",
        ticketsSold,
        revenue,
        goalTickets,
        goalProgress,
        pendingTransferAmount,
        delta: sellerSales.length > 0 ? `+${Math.max(1, Math.round((ticketsSold / Math.max(1, membership.ticket_quota || 1)) * 10))}%` : "+0%"
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

  const salesControl: SalesRecord[] = salesRows.map((sale) => {
    const membership = sellerMemberships.find((item) => item.user_id === sale.seller_user_id);
    const profile = profilesMap.get(sale.seller_user_id);
    const sellerSales = salesRows.filter((item) => item.seller_user_id === sale.seller_user_id);
    const soldBySeller = sellerSales.reduce((sum, item) => sum + item.quantity, 0);

    const attendeeNames = saleAttendeeRows
      .filter((entry) => entry.sale_id === sale.id)
      .map((entry) => entry.guest_name);

    return {
      id: sale.id,
      sellerUserId: sale.seller_user_id,
      seller: profile?.full_name ?? "Vendedor",
      received: membership?.ticket_quota ?? soldBySeller,
      sold: sale.quantity,
      remaining: Math.max((membership?.ticket_quota ?? soldBySeller) - soldBySeller, 0),
      paymentStatus: sale.payment_status,
      unitPrice: sale.unit_price,
      soldAt: sale.sold_at,
      notes: sale.notes ?? undefined,
      amount: sale.quantity * sale.unit_price,
      attendeeNames,
      attendeeCount: attendeeNames.length,
      missingAttendeeCount: Math.max(sale.quantity - attendeeNames.length, 0),
      isOwnedByViewer: sale.seller_user_id === context.viewer.id
    };
  });

  const guestListEntries: GuestListEntry[] = saleAttendeeRows
    .filter((entry) => !permissions.canManageOwnSalesOnly || entry.seller_user_id === context.viewer.id)
    .map((entry) => ({
      id: entry.id,
      saleId: entry.sale_id,
      sellerUserId: entry.seller_user_id,
      sellerName: profilesMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
      guestName: entry.guest_name,
      checkedInAt: entry.checked_in_at ?? undefined,
      createdAt: entry.created_at
    }))
    .sort((left, right) => left.guestName.localeCompare(right.guestName));

  const transfersPending: TransferPending[] = sellerMemberships
    .map((membership) => {
      const sellerSales = salesRows.filter(
        (sale) => sale.seller_user_id === membership.user_id && sale.payment_status === "pending"
      );

      return {
        id: membership.user_id,
        name: profilesMap.get(membership.user_id)?.full_name ?? "Vendedor",
        amount: sellerSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0)
      };
    })
    .filter((item) => item.amount > 0);

  const totalExpenses = expenseRows.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingPaymentsCount = salesRows.filter((sale) => sale.payment_status === "pending").length;
  const confirmedPaymentsCount = salesRows.filter((sale) => sale.payment_status === "paid").length;

  const expenseItems: Expense[] = expenseRows.map((expense) => ({
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    incurredAt: expense.incurred_at,
    notes: expense.notes ?? undefined
  }));

  const taskItems: TaskItem[] = taskRows.map((task) => ({
    id: task.id,
    title: task.title,
    owner: task.owner_profile_id ? profilesMap.get(task.owner_profile_id)?.full_name ?? "Sem responsavel" : "Sem responsavel",
    ownerProfileId: task.owner_profile_id ?? undefined,
    status: task.status,
    dueLabel: task.due_at ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_at)) : "Sem prazo",
    dueAt: task.due_at ?? undefined,
    createdAt: task.created_at
  }));

  const createdByProfileIds = [
    ...new Set(announcementRows.flatMap((announcement) => (announcement.created_by ? [announcement.created_by] : [])))
  ];
  const createdByProfilesMap = await getProfilesMap(createdByProfileIds);

  announcementRows.sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  const announcementItems: Announcement[] = announcementRows.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    pinned: announcement.pinned,
    createdAt: announcement.created_at,
    author: createdByProfilesMap.get(announcement.created_by)?.full_name ?? "Equipe"
  }));

  const salesByDay = new Map<string, number>();
  for (const sale of salesRows) {
    const key = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(sale.sold_at));
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + sale.quantity * sale.unit_price);
  }

  const salesSeries = Array.from(salesByDay.entries()).map(([day, amount]) => ({ day, amount }));
  const sellerContribution: SellerContribution[] = ranking.map((item) => ({
    seller: item.name.split(" ")[0] ?? item.name,
    amount: item.revenue
  }));

  const sellerOptions: SellerOption[] = sellerMemberships.map((membership) => ({
    id: membership.user_id,
    name: profilesMap.get(membership.user_id)?.full_name ?? "Vendedor"
  }));

  const participantOptions: SellerOption[] = Array.from(
    new Map(
      membershipRows
        .map((membership) => ({
          id: membership.user_id,
          name: profilesMap.get(membership.user_id)?.full_name ?? "Membro"
        }))
        .map((item) => [item.id, item])
    ).values()
  );

  const teamMembers: TeamMember[] = membershipRows.map((membership) => ({
    id: membership.id,
    userId: membership.user_id,
    name: profilesMap.get(membership.user_id)?.full_name ?? "Membro",
    role: membership.role,
    isActive: membership.is_active,
    ticketQuota: membership.ticket_quota,
    ticketsSold: salesRows
      .filter((sale) => sale.seller_user_id === membership.user_id)
      .reduce((sum, sale) => sum + sale.quantity, 0),
    revenue: salesRows
      .filter((sale) => sale.seller_user_id === membership.user_id)
      .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0),
    goalProgress:
      membership.role === "seller" && membership.ticket_quota > 0
        ? Math.round(
            (salesRows
              .filter((sale) => sale.seller_user_id === membership.user_id)
              .reduce((sum, sale) => sum + sale.quantity, 0) /
              membership.ticket_quota) *
              100
          )
        : 0,
    pendingTransferAmount: salesRows
      .filter((sale) => sale.seller_user_id === membership.user_id && sale.payment_status === "pending")
      .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0),
    isCurrentUser: membership.user_id === context.viewer.id
  }));

  const activityItems: ActivityLogItem[] = permissions.canViewActivityLog
    ? activityLogRows.map((log) => ({
        id: log.id,
        actorUserId: log.actor_user_id,
        actorName: profilesMap.get(log.actor_user_id)?.full_name ?? "Equipe",
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id ?? undefined,
        message: log.message,
        metadata: (log.metadata as Record<string, string | number | boolean | null> | null) ?? undefined,
        createdAt: log.created_at
      }))
    : [];

  const attentionItems: EventAttentionItem[] = [];
  const topPerformer = ranking[0];
  const lowestPerformer = ranking.filter((seller) => seller.goalTickets > 0).sort((a, b) => a.goalProgress - b.goalProgress)[0];

  if (summary.progress < 60) {
    attentionItems.push({
      id: "goal-risk",
      title: "Risco de nao bater a meta",
      description: `${summary.progress}% da meta foi atingida ate agora. A equipe precisa gerar mais ${formatCurrency(Math.max(summary.goalValue - summary.totalRevenue, 0))}.`,
      tone: summary.progress < 35 ? "critical" : "warning"
    });
  }

  if (transfersPending.length > 0) {
    const biggestPending = [...transfersPending].sort((a, b) => b.amount - a.amount)[0];
    attentionItems.push({
      id: "pending-transfers",
      title: "Repasses ainda em aberto",
      description: `${transfersPending.length} vendedor(es) ainda nao repassaram. Maior pendencia atual: ${biggestPending.name} com ${formatCurrency(biggestPending.amount)}.`,
      tone: biggestPending.amount > Math.max(summary.goalValue * 0.1, 500) ? "critical" : "warning"
    });
  }

  if (lowestPerformer && lowestPerformer.goalProgress < 50) {
    attentionItems.push({
      id: "low-performer",
      title: "Vendedor abaixo da meta individual",
      description: `${lowestPerformer.name} entregou ${lowestPerformer.ticketsSold}/${lowestPerformer.goalTickets} ingressos da propria meta.`,
      tone: lowestPerformer.goalProgress < 30 ? "critical" : "warning"
    });
  }

  const health = buildHealthSnapshot({
    progress: summary.progress,
    pendingPaymentsCount,
    pendingTransfersCount: transfersPending.length
  });

  return {
    ...summary,
    viewer: context.viewer,
    viewerEventRole: eventRole,
    permissions,
    health,
    attentionItems,
    activeSellers: sellerMemberships.filter((membership) => membership.is_active).length,
    totalExpenses,
    pendingPaymentsCount,
    confirmedPaymentsCount,
    summary: [
      {
        label: "Total arrecadado",
        value: summary.totalRevenue,
        helper: `${summary.totalTicketsSold} ingressos vendidos`,
        isCurrency: true
      },
      {
        label: "Meta de vendas",
        value: summary.goalValue,
        helper: totalQuota > 0 ? `${summary.progress}% da meta | ${totalQuota} metas individuais somadas` : `${summary.progress}% da meta`,
        progress: summary.progress,
        isCurrency: true
      },
      {
        label: "Vendedores ativos",
        value: sellerMemberships.filter((membership) => membership.is_active).length,
        helper: "Equipe comercial vinculada",
        isCurrency: false
      },
      {
        label: "Lucro estimado",
        value: summary.estimatedProfit,
        helper: "Receita menos despesas",
        isCurrency: true
      }
    ],
    ranking,
    salesControl,
    expenses: expenseItems,
    transfersPending,
    tasks: taskItems,
    announcements: announcementItems,
    activityLogs: activityItems,
    guestListEntries,
    salesSeries,
    sellerContribution,
    sellerOptions,
    participantOptions,
    teamMembers,
    availableUsers
  };
}

export async function getEventComparison(): Promise<EventComparisonSnapshot> {
  const events = await getEvents();
  const eventDetails = await Promise.all(events.map((event) => getEventById(event.id)));
  const validDetails = eventDetails.filter(Boolean) as PartyEventDetail[];

  if (events.length === 0 || validDetails.length === 0) {
    return {
      bestRevenueEvent: { eventName: "Sem dados", value: 0 },
      bestProfitEvent: { eventName: "Sem dados", value: 0 },
      topSellerOverall: { sellerName: "Sem dados", value: 0 },
      averageSalesPerEvent: 0
    };
  }

  const bestRevenueEvent = [...events].sort((left, right) => right.totalRevenue - left.totalRevenue)[0];
  const bestProfitEvent = [...events].sort((left, right) => right.estimatedProfit - left.estimatedProfit)[0];

  const sellerTotals = new Map<string, number>();
  for (const detail of validDetails) {
    for (const item of detail.ranking) {
      sellerTotals.set(item.name, (sellerTotals.get(item.name) ?? 0) + item.revenue);
    }
  }

  const topSellerEntry = Array.from(sellerTotals.entries()).sort((left, right) => right[1] - left[1])[0];

  return {
    bestRevenueEvent: {
      eventName: bestRevenueEvent.name,
      value: bestRevenueEvent.totalRevenue
    },
    bestProfitEvent: {
      eventName: bestProfitEvent.name,
      value: bestProfitEvent.estimatedProfit
    },
    topSellerOverall: {
      sellerName: topSellerEntry?.[0] ?? "Sem dados",
      value: topSellerEntry?.[1] ?? 0
    },
    averageSalesPerEvent: Math.round(
      events.reduce((sum, event) => sum + event.totalRevenue, 0) / Math.max(events.length, 1)
    )
  };
}
