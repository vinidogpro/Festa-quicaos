import { isSupabaseConfigured } from "@/lib/env";
import {
  calculateFinanceTotals,
  calculateGoalProgress,
  calculateGuestListStats,
  calculateSellerMetrics
} from "@/lib/event-metrics";
import { buildPermissions } from "@/lib/permissions";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  ActivityLogItem,
  AdditionalRevenue,
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
type AdditionalRevenueRow = Database["public"]["Tables"]["additional_revenues"]["Row"];
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
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Nao foi possivel validar a sessao atual: ${userError.message}`);
  }

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_label, role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel carregar o perfil do usuario: ${error.message}`);
  }

  if (!profile) {
    throw new Error("Perfil do usuario nao encontrado.");
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
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_label, role")
    .in("id", profileIds);

  if (error) {
    throw error;
  }

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
}

function buildSummaryFromRows({
  event,
  sales,
  expenses,
  additionalRevenues,
  memberships,
  profilesMap
}: {
  event: EventRow;
  sales: SaleRow[];
  expenses: ExpenseRow[];
  additionalRevenues: AdditionalRevenueRow[];
  memberships: EventMembershipRow[];
  profilesMap: Map<string, ProfileRow>;
}): EventSummary {
  const financeTotals = calculateFinanceTotals({
    sales: sales.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      paymentStatus: sale.payment_status
    })),
    expenses: expenses.map((expense) => ({ amount: expense.amount })),
    additionalRevenues: additionalRevenues.map((revenue) => ({ amount: revenue.amount }))
  });
  const { totalRevenue, totalExpenses, totalTicketsSold } = financeTotals;
  const progress = calculateGoalProgress(totalRevenue, event.goal_value);

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

  const [{ data: sales }, { data: expenses }, { data: additionalRevenues }, { data: memberships }] = await Promise.all([
    supabase.from("sales").select("*").in("event_id", eventIds),
    supabase.from("expenses").select("*").in("event_id", eventIds),
    supabase.from("additional_revenues").select("*").in("event_id", eventIds),
    supabase.from("event_memberships").select("*").in("event_id", eventIds)
  ]);

  const salesRows = (sales ?? []) as SaleRow[];
  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const additionalRevenueRows = (additionalRevenues ?? []) as AdditionalRevenueRow[];
  const membershipRows = (memberships ?? []) as EventMembershipRow[];
  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const profilesMap = await getProfilesMap(profileIds);

  return events.map((event) =>
    buildSummaryFromRows({
      event,
      sales: salesRows.filter((sale) => sale.event_id === event.id),
      expenses: expenseRows.filter((expense) => expense.event_id === event.id),
      additionalRevenues: additionalRevenueRows.filter((revenue) => revenue.event_id === event.id),
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

  const [
    { data: memberships },
    { data: sales },
    { data: saleAttendees },
    { data: expenses },
    { data: additionalRevenues },
    { data: tasks },
    { data: announcements }
  ] = await Promise.all([
    supabase.from("event_memberships").select("*").eq("event_id", event.id).order("created_at", { ascending: true }),
    supabase.from("sales").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
    supabase.from("sale_attendees").select("*").eq("event_id", event.id).order("guest_name", { ascending: true }),
    supabase.from("expenses").select("*").eq("event_id", event.id).order("incurred_at", { ascending: false }),
    supabase.from("additional_revenues").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
    supabase.from("announcements").select("*").eq("event_id", event.id).order("created_at", { ascending: false })
  ]);

  const membershipRows = (memberships ?? []) as EventMembershipRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const saleAttendeeRows = (saleAttendees ?? []) as SaleAttendeeRow[];
  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const additionalRevenueRows = (additionalRevenues ?? []) as AdditionalRevenueRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const announcementRows = (announcements ?? []) as AnnouncementRow[];
  const profileIds = [
    ...new Set([
      ...membershipRows.map((membership) => membership.user_id),
      ...taskRows.flatMap((task) => (task.owner_profile_id ? [task.owner_profile_id] : []))
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
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (profilesError) {
      throw profilesError;
    }

    const memberIds = new Set(membershipRows.map((membership) => membership.user_id));
    availableUsers = ((allProfiles ?? []) as Array<Pick<ProfileRow, "id" | "full_name">>)
      .filter((profile) => !memberIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name
      }));
  }

  let activityLogRows: ActivityLogRow[] = [];
  let activityLogProfilesMap = profilesMap;

  if (permissions.canViewActivityLog) {
    const { data: activityLogs, error: activityLogsError } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(120);

    if (activityLogsError) {
      throw activityLogsError;
    }

    activityLogRows = (activityLogs ?? []) as ActivityLogRow[];

    const actorProfileIds = [
      ...new Set(activityLogRows.map((log) => log.actor_user_id).filter((actorId) => !profilesMap.has(actorId)))
    ];

    if (actorProfileIds.length > 0) {
      activityLogProfilesMap = new Map([
        ...profilesMap,
        ...Array.from((await getProfilesMap(actorProfileIds)).entries())
      ]);
    }
  }

  const summary = buildSummaryFromRows({
    event,
    sales: salesRows,
    expenses: expenseRows,
    additionalRevenues: additionalRevenueRows,
    memberships: membershipRows,
    profilesMap
  });

  const sellerMemberships = membershipRows.filter((membership) => membership.role === "seller");
  const sellerMetrics = calculateSellerMetrics(
    salesRows.map((sale) => ({
      sellerUserId: sale.seller_user_id,
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      paymentStatus: sale.payment_status
    }))
  );
  const ranking: SellerRanking[] = sellerMemberships
    .map((membership) => {
      const sellerStat = sellerMetrics.get(membership.user_id);
      const ticketsSold = sellerStat?.ticketsSold ?? 0;
      const revenue = sellerStat?.revenue ?? 0;
      const pendingTransferAmount = sellerStat?.pendingTransferAmount ?? 0;
      const profile = profilesMap.get(membership.user_id);

      return {
        id: membership.id,
        sellerUserId: membership.user_id,
        name: profile?.full_name ?? "Vendedor",
        ticketsSold,
        revenue,
        pendingTransferAmount
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

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

  const salesControl: SalesRecord[] = salesRows.map((sale) => {
    const profile = profilesMap.get(sale.seller_user_id);

    const attendeeNames = saleAttendeeRows
      .filter((entry) => entry.sale_id === sale.id)
      .map((entry) => entry.guest_name);

    return {
      id: sale.id,
      saleNumber: saleSequenceMap.get(sale.id) ?? 0,
      sellerUserId: sale.seller_user_id,
      seller: profile?.full_name ?? "Vendedor",
      sold: sale.quantity,
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

  const salesById = new Map(salesRows.map((sale) => [sale.id, sale]));

  const guestListEntries: GuestListEntry[] = saleAttendeeRows
    .filter((entry) => !permissions.canManageOwnSalesOnly || entry.seller_user_id === context.viewer.id)
    .map((entry) => {
      const sale = salesById.get(entry.sale_id);

      return {
        id: entry.id,
        saleId: entry.sale_id,
        saleNumber: saleSequenceMap.get(entry.sale_id) ?? 0,
        sellerUserId: entry.seller_user_id,
        sellerName: profilesMap.get(entry.seller_user_id)?.full_name ?? "Vendedor",
        guestName: entry.guest_name,
        paymentStatus: sale?.payment_status ?? "pending",
        unitPrice: sale?.unit_price ?? 0,
        checkedInAt: entry.checked_in_at ?? undefined,
        createdAt: entry.created_at,
        isOwnedByViewer: entry.seller_user_id === context.viewer.id
      };
    })
    .sort((left, right) => left.guestName.localeCompare(right.guestName));

  const transfersPending: TransferPending[] = sellerMemberships
    .map((membership) => {
      const sellerStat = sellerMetrics.get(membership.user_id);

      return {
        id: membership.user_id,
        name: profilesMap.get(membership.user_id)?.full_name ?? "Vendedor",
        amount: sellerStat?.pendingTransferAmount ?? 0
      };
    })
    .filter((item) => item.amount > 0);

  const financeTotals = calculateFinanceTotals({
    sales: salesRows.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      paymentStatus: sale.payment_status
    })),
    expenses: expenseRows.map((expense) => ({ amount: expense.amount })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({ amount: revenue.amount }))
  });
  const {
    ticketRevenue,
    additionalRevenue,
    paidValue,
    pendingValue,
    totalExpenses,
    pendingPaymentsCount,
    confirmedPaymentsCount
  } = financeTotals;

  const expenseItems: Expense[] = expenseRows.map((expense) => ({
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    incurredAt: expense.incurred_at,
    notes: expense.notes ?? undefined
  }));

  const additionalRevenueItems: AdditionalRevenue[] = additionalRevenueRows.map((revenue) => ({
    id: revenue.id,
    title: revenue.title,
    amount: revenue.amount,
    category: revenue.category ?? undefined,
    date: revenue.date,
    createdAt: revenue.created_at
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
    const key = sale.sold_at;
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + sale.quantity * sale.unit_price);
  }

  const salesSeries = Array.from(salesByDay.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, amount]) => ({ day, amount }));
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
    ticketsSold: salesRows
      .filter((sale) => sale.seller_user_id === membership.user_id)
      .reduce((sum, sale) => sum + sale.quantity, 0),
    revenue: salesRows
      .filter((sale) => sale.seller_user_id === membership.user_id)
      .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0),
    pendingTransferAmount: salesRows
      .filter((sale) => sale.seller_user_id === membership.user_id && sale.payment_status === "pending")
      .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0),
    isCurrentUser: membership.user_id === context.viewer.id
  }));

  const activityItems: ActivityLogItem[] = permissions.canViewActivityLog
    ? activityLogRows.map((log) => ({
        id: log.id,
        actorUserId: log.actor_user_id,
        actorName: activityLogProfilesMap.get(log.actor_user_id)?.full_name ?? "Equipe",
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
  const guestListStats = calculateGuestListStats(
    salesControl.map((sale) => ({
      quantity: sale.sold,
      attendeeCount: sale.attendeeCount
    }))
  );

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

  if (guestListStats.missingNames > 0) {
    attentionItems.push({
      id: "guest-list-missing",
      title: "Nomes ainda faltando na lista",
      description: `${guestListStats.missingNames} nome(s) ainda nao foram vinculados as vendas desta festa.`,
      tone: guestListStats.missingNames > Math.max(5, Math.round(guestListStats.totalExpectedNames * 0.15)) ? "critical" : "warning"
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
    ticketRevenue,
    additionalRevenue,
    confirmedRevenue: paidValue,
    pendingRevenue: pendingValue,
    totalExpenses,
    pendingPaymentsCount,
    confirmedPaymentsCount,
    summary: [
      {
        label: "Total geral",
        value: summary.totalRevenue,
        helper:
          `${formatCurrency(ticketRevenue)} em ingressos | ${formatCurrency(paidValue)} confirmado | ${formatCurrency(pendingValue)} pendente`,
        isCurrency: true
      },
      {
        label: "Meta de vendas",
        value: summary.goalValue,
        helper: `${summary.progress}% da meta`,
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
    additionalRevenues: additionalRevenueItems,
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

export async function getAdditionalRevenuesByEvent(eventId: string): Promise<AdditionalRevenue[]> {
  const context = await getViewerContext();

  if (!context) {
    return [];
  }

  const supabase = createSupabaseServerClient() as any;
  const { data, error } = await supabase
    .from("additional_revenues")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as AdditionalRevenueRow[];

  return rows.map((revenue) => ({
    id: revenue.id,
    title: revenue.title,
    amount: revenue.amount,
    category: revenue.category ?? undefined,
    date: revenue.date,
    createdAt: revenue.created_at
  }));
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
