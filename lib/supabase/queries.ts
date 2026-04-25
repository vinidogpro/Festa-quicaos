import { isSupabaseConfigured } from "@/lib/env";
import {
  calculateBatchMetrics,
  calculateExpenseCategoryInsights,
  calculateFinanceTotals,
  calculateGoalProgress,
  calculateGuestListStats,
  calculatePostEventReport,
  calculatePeriodComparison,
  calculateSaleTypeMetrics,
  calculateSellerMetrics,
  calculateTicketTypeMetrics
} from "@/lib/event-metrics";
import { buildPermissions } from "@/lib/permissions";
import { buildGuestListEntries, buildSaleSequenceMap } from "@/lib/guest-list-utils";
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
  PostEventReportSnapshot,
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
  UserDirectoryOption,
  ViewerPermissions,
  ViewerProfile,
  StrategicEventSnapshot,
  StrategicOverviewSnapshot
} from "@/lib/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventMembershipRow = Database["public"]["Tables"]["event_memberships"]["Row"];
type EventBatchRow = Database["public"]["Tables"]["event_batches"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type AdditionalRevenueRow = Database["public"]["Tables"]["additional_revenues"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type SaleAttendeeRow = Database["public"]["Tables"]["sale_attendees"]["Row"];
type ManualGuestEntryRow = Database["public"]["Tables"]["manual_guest_entries"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface ViewerContext {
  viewer: ViewerProfile;
}

function logServerIssue(scope: string, error: unknown, metadata?: Record<string, unknown>) {
  console.error(`[queries][${scope}]`, {
    message: error instanceof Error ? error.message : String(error),
    metadata
  });
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
      unitPrice: sale.unit_price
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
    hasVip: event.has_vip ?? true,
    hasGroupSales: event.has_group_sales ?? true,
    totalRevenue,
    ticketRevenue: financeTotals.ticketRevenue,
    additionalRevenue: financeTotals.additionalRevenue,
    totalExpenses,
    goalValue: event.goal_value,
    progress,
    estimatedProfit: totalRevenue - totalExpenses,
    totalTicketsSold,
    averageTicket: financeTotals.averageTicket,
    bestSeller: bestProfile?.full_name ?? "Sem vendas",
    venue: event.venue
  };
}

export async function getCurrentViewer() {
  const context = await getViewerContext();
  return context?.viewer ?? null;
}

export async function getEvents(): Promise<EventSummary[]> {
  try {
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

    const [
      { data: sales, error: salesError },
      { data: expenses, error: expensesError },
      { data: additionalRevenues, error: additionalRevenuesError },
      { data: memberships, error: membershipsError }
    ] = await Promise.all([
      supabase.from("sales").select("*").in("event_id", eventIds),
      supabase.from("expenses").select("*").in("event_id", eventIds),
      supabase.from("additional_revenues").select("*").in("event_id", eventIds),
      supabase.from("event_memberships").select("*").in("event_id", eventIds)
    ]);

    if (salesError || expensesError || additionalRevenuesError || membershipsError) {
      throw new Error(
        [
          salesError?.message,
          expensesError?.message,
          additionalRevenuesError?.message,
          membershipsError?.message
        ]
          .filter(Boolean)
          .join(" | ") || "Nao foi possivel carregar os dados das festas."
      );
    }

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
  } catch (error) {
    logServerIssue("getEvents", error);
    throw error;
  }
}

function toStrategicEventSnapshot(event: EventSummary): StrategicEventSnapshot {
  return {
    ...event,
    profitMargin: event.totalRevenue > 0 ? Math.round((event.estimatedProfit / event.totalRevenue) * 100) : 0,
    expenseRatio: event.totalRevenue > 0 ? Math.round((event.totalExpenses / event.totalRevenue) * 100) : 0,
    isLoss: event.estimatedProfit < 0,
    isBelowGoal: event.progress < 100
  };
}

export async function getStrategicOverview(preloadedEvents?: EventSummary[]): Promise<StrategicOverviewSnapshot> {
  try {
    const events = preloadedEvents ?? (await getEvents());

    if (events.length === 0) {
      return {
        eventSnapshots: [],
        batchLearning: [],
        ticketTypeLearning: calculateTicketTypeMetrics([]),
        saleTypeLearning: calculateSaleTypeMetrics([]),
        expenseCategoryLearning: [],
        postEventReports: []
      };
    }

    const context = await getViewerContext();

    if (!context) {
      return {
        eventSnapshots: [],
        batchLearning: [],
        ticketTypeLearning: calculateTicketTypeMetrics([]),
        saleTypeLearning: calculateSaleTypeMetrics([]),
        expenseCategoryLearning: [],
        postEventReports: []
      };
    }

    const supabase = createSupabaseServerClient() as any;
    const accessibleEvents = await getAccessibleEvents(context.viewer);
    const eventIds = accessibleEvents.map((event) => event.id);

    if (eventIds.length === 0) {
      return {
        eventSnapshots: [],
        batchLearning: [],
        ticketTypeLearning: calculateTicketTypeMetrics([]),
        saleTypeLearning: calculateSaleTypeMetrics([]),
        expenseCategoryLearning: [],
        postEventReports: []
      };
    }

    const [
      { data: eventBatches, error: eventBatchesError },
      { data: sales, error: salesError },
      { data: expenses, error: expensesError },
      { data: additionalRevenues, error: additionalRevenuesError }
    ] = await Promise.all([
      supabase.from("event_batches").select("id, event_id, name").in("event_id", eventIds),
      supabase
        .from("sales")
        .select("id, event_id, seller_user_id, batch_id, sale_type, ticket_type, quantity, unit_price, sold_at, created_at")
        .in("event_id", eventIds),
      supabase.from("expenses").select("event_id, amount, category").in("event_id", eventIds),
      supabase.from("additional_revenues").select("event_id, amount, category").in("event_id", eventIds)
    ]);

    if (eventBatchesError || salesError || expensesError || additionalRevenuesError) {
      throw new Error(
        [
          eventBatchesError?.message,
          salesError?.message,
          expensesError?.message,
          additionalRevenuesError?.message
        ]
          .filter(Boolean)
          .join(" | ") || "Nao foi possivel carregar o comparativo entre eventos."
      );
    }

    const batchRows = (eventBatches ?? []) as Array<Pick<EventBatchRow, "id" | "event_id" | "name">>;
    const salesRows = (sales ?? []) as Array<
      Pick<SaleRow, "id" | "event_id" | "seller_user_id" | "batch_id" | "sale_type" | "ticket_type" | "quantity" | "unit_price" | "sold_at" | "created_at">
    >;
    const expenseRows = (expenses ?? []) as Array<Pick<ExpenseRow, "event_id" | "amount" | "category">>;
    const additionalRevenueRows = (additionalRevenues ?? []) as Array<Pick<AdditionalRevenueRow, "event_id" | "amount" | "category">>;
    const batchNameMap = new Map(batchRows.map((batch) => [batch.id, batch.name]));
    const internalEventIdBySlug = new Map(accessibleEvents.map((event) => [event.slug, event.id]));
    const eventSnapshots = events.map(toStrategicEventSnapshot);

    const batchLearning = calculateBatchMetrics(
      salesRows.map((sale) => ({
        quantity: sale.quantity,
        unitPrice: sale.unit_price,
        batchLabel: batchNameMap.get(sale.batch_id) ?? "Sem lote"
      }))
    );
    const ticketTypeLearning = calculateTicketTypeMetrics(
      salesRows.map((sale) => ({
        quantity: sale.quantity,
        unitPrice: sale.unit_price,
        ticketType: sale.ticket_type
      }))
    );
    const saleTypeLearning = calculateSaleTypeMetrics(
      salesRows.map((sale) => ({
        quantity: sale.quantity,
        unitPrice: sale.unit_price,
        saleType: sale.sale_type
      }))
    );
    const totalPortfolioRevenue = eventSnapshots.reduce((sum, event) => sum + event.totalRevenue, 0);
    const expenseCategoryLearning = calculateExpenseCategoryInsights(
      expenseRows.map((expense) => ({
        category: expense.category,
        amount: expense.amount
      })),
      totalPortfolioRevenue,
      events.length
    );

    const postEventReports: PostEventReportSnapshot[] = eventSnapshots.map((event) => {
      const sourceEventId = internalEventIdBySlug.get(event.id) ?? event.id;
      const peerEvents = eventSnapshots.filter((item) => item.id !== event.id);
      const peerAverageTicket =
        peerEvents.length > 0
          ? peerEvents.reduce((sum, item) => sum + item.averageTicket, 0) / peerEvents.length
          : undefined;
      const report = calculatePostEventReport({
        eventId: event.id,
        eventName: event.name,
        eventDate: event.eventDate,
        status: event.status,
        goalValue: event.goalValue,
        sales: salesRows
          .filter((sale) => sale.event_id === sourceEventId)
          .map((sale) => ({
            quantity: sale.quantity,
            unitPrice: sale.unit_price,
            batchLabel: batchNameMap.get(sale.batch_id) ?? "Sem lote",
            saleType: sale.sale_type,
            ticketType: sale.ticket_type
          })),
        expenses: expenseRows
          .filter((expense) => expense.event_id === sourceEventId)
          .map((expense) => ({
            amount: expense.amount,
            category: expense.category
          })),
        additionalRevenues: additionalRevenueRows
          .filter((revenue) => revenue.event_id === sourceEventId)
          .map((revenue) => ({
            amount: revenue.amount,
            category: revenue.category
          })),
        peerAverageTicket
      });

      return {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.eventDate,
        status: event.status,
        ...report
      };
    });

    return {
      eventSnapshots,
      batchLearning,
      ticketTypeLearning,
      saleTypeLearning,
      expenseCategoryLearning,
      postEventReports
    };
  } catch (error) {
    logServerIssue("getStrategicOverview", error, { preloadedCount: preloadedEvents?.length ?? 0 });
    throw error;
  }
}

function buildHealthSnapshot({
  progress
}: {
  progress: number;
}): EventHealthSnapshot {
  if (progress >= 80) {
    return {
      label: "Bem encaminhada",
      tone: "positive",
      summary: "A festa esta avancando bem e os principais indicadores estao sob controle."
    };
  }

  if (progress >= 45) {
    return {
      label: "Atencao",
      tone: "warning",
      summary: "A meta segue viva, mas o time precisa acelerar as vendas para ganhar margem."
    };
  }

  return {
    label: "Critica",
    tone: "critical",
    summary: "O evento corre risco de nao bater a meta se o time nao agir agora."
  };
}

export async function getEventById(id: string): Promise<PartyEventDetail | undefined> {
  try {
    const context = await getViewerContext();

    if (!context) {
      return undefined;
    }

    const supabase = createSupabaseServerClient() as any;
    const { data: event, error } = await supabase.from("events").select("*").eq("slug", id).single();

    if (error || !event) {
      if (error) {
        logServerIssue("getEventById.event", error, { slug: id });
      }
      return undefined;
    }

    const [
      { data: memberships, error: membershipsError },
      { data: eventBatches, error: eventBatchesError },
      { data: sales, error: salesError },
      { data: saleAttendees, error: saleAttendeesError },
      { data: expenses, error: expensesError },
      { data: additionalRevenues, error: additionalRevenuesError },
      { data: tasks, error: tasksError },
      { data: announcements, error: announcementsError }
    ] = await Promise.all([
      supabase
        .from("event_memberships")
        .select("id, event_id, user_id, role, is_active, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("event_batches")
        .select("id, event_id, name, pista_price, vip_price, is_active, sort_order, created_at")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("sales")
        .select("id, event_id, seller_user_id, batch_id, sale_type, ticket_type, quantity, unit_price, sold_at, notes, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("sale_attendees")
        .select("id, event_id, sale_id, seller_user_id, guest_name, checked_in_at, created_at")
        .eq("event_id", event.id)
        .order("guest_name", { ascending: true }),
      supabase
        .from("expenses")
        .select("id, event_id, title, category, amount, incurred_at, notes")
        .eq("event_id", event.id)
        .order("incurred_at", { ascending: false }),
      supabase
        .from("additional_revenues")
        .select("id, event_id, title, amount, category, date, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, event_id, title, owner_profile_id, status, due_at, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("announcements")
        .select("id, event_id, title, body, pinned, created_by, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
    ]);

    const sectionErrors = [
      membershipsError,
      eventBatchesError,
      salesError,
      saleAttendeesError,
      expensesError,
      additionalRevenuesError,
      tasksError,
      announcementsError
    ].filter(Boolean);

    if (sectionErrors.length > 0) {
      const message = sectionErrors.map((item) => item?.message).filter(Boolean).join(" | ");
      throw new Error(message || "Nao foi possivel carregar todos os dados da festa.");
    }

    const membershipRows = (memberships ?? []) as EventMembershipRow[];
    const eventBatchRows = (eventBatches ?? []) as EventBatchRow[];
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
    const batchNameMap = new Map(eventBatchRows.map((batch) => [batch.id, batch.name]));
    const eventBatchItems = eventBatchRows.map((batch) => ({
      id: batch.id,
      name: batch.name,
      pistaPrice: batch.pista_price,
      vipPrice: batch.vip_price,
      isActive: batch.is_active ?? true,
      sortOrder: batch.sort_order ?? 0,
      createdAt: batch.created_at
    }));

    const viewerMembership = membershipRows.find((membership) => membership.user_id === context.viewer.id);
    const eventRole = viewerMembership?.role;
    const permissions = buildPermissions(context.viewer.role, eventRole, context.viewer.id);

    const availableUsers: UserDirectoryOption[] = [];
    const activityItems: ActivityLogItem[] = [];

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
      unitPrice: sale.unit_price
    }))
  );
  const ranking: SellerRanking[] = sellerMemberships
    .map((membership) => {
      const sellerStat = sellerMetrics.get(membership.user_id);
      const ticketsSold = sellerStat?.ticketsSold ?? 0;
      const revenue = sellerStat?.revenue ?? 0;
      const profile = profilesMap.get(membership.user_id);

      return {
        id: membership.id,
        sellerUserId: membership.user_id,
        name: profile?.full_name ?? "Vendedor",
        ticketsSold,
        revenue
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

  const saleSequenceMap = buildSaleSequenceMap(salesRows);

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
      batchId: sale.batch_id,
      batchLabel: batchNameMap.get(sale.batch_id) ?? "Sem lote",
      saleType: sale.sale_type,
      ticketType: sale.ticket_type,
      sold: sale.quantity,
      unitPrice: sale.unit_price,
      soldAt: sale.sold_at,
      createdAt: sale.created_at,
      notes: sale.notes ?? undefined,
      amount: sale.quantity * sale.unit_price,
      attendeeNames,
      attendeeCount: attendeeNames.length,
      missingAttendeeCount: Math.max(sale.quantity - attendeeNames.length, 0),
      isOwnedByViewer: sale.seller_user_id === context.viewer.id
    };
  });

  const financeTotals = calculateFinanceTotals({
    sales: salesRows.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price
    })),
    expenses: expenseRows.map((expense) => ({ amount: expense.amount })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({ amount: revenue.amount }))
  });
  const {
    grossSoldRevenue,
    ticketRevenue,
    additionalRevenue,
    totalExpenses
  } = financeTotals;
  const postEventReportBase = calculatePostEventReport({
    eventId: event.slug,
    eventName: event.name,
    eventDate: event.event_date,
    status: event.status,
    goalValue: event.goal_value,
    sales: salesRows.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      batchLabel: batchNameMap.get(sale.batch_id) ?? "Sem lote",
      saleType: sale.sale_type,
      ticketType: sale.ticket_type
    })),
    expenses: expenseRows.map((expense) => ({
      amount: expense.amount,
      category: expense.category
    })),
    additionalRevenues: additionalRevenueRows.map((revenue) => ({
      amount: revenue.amount,
      category: revenue.category
    }))
  });

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
    isCurrentUser: membership.user_id === context.viewer.id
  }));

  const attentionItems: EventAttentionItem[] = [];
  const topPerformer = ranking[0];
  const guestListStats = calculateGuestListStats(
    salesControl.map((sale) => ({
      quantity: sale.sold,
      attendeeCount: sale.attendeeCount
    }))
  );
  const periodComparison = calculatePeriodComparison(
    salesRows.map((sale) => ({
      quantity: sale.quantity,
      unitPrice: sale.unit_price,
      createdAt: sale.sold_at
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

  if (guestListStats.missingNames > 0) {
    attentionItems.push({
      id: "guest-list-missing",
      title: "Nomes ainda faltando na lista",
      description: `${guestListStats.missingNames} nome(s) ainda nao foram vinculados as vendas desta festa.`,
      tone: guestListStats.missingNames > Math.max(5, Math.round(guestListStats.totalExpectedNames * 0.15)) ? "critical" : "warning"
    });
  }

  if (
    (periodComparison.previous3Days.ticketsSold >= 6 &&
      periodComparison.last3Days.ticketsSold <= Math.round(periodComparison.previous3Days.ticketsSold * 0.5)) ||
    (summary.totalTicketsSold > 0 && periodComparison.last3Days.ticketsSold === 0)
  ) {
    attentionItems.push({
      id: "low-sales-pace",
      title: "Pouca venda nos ultimos dias",
      description:
        periodComparison.last3Days.ticketsSold === 0
          ? "Nenhum ingresso foi registrado nos ultimos 3 dias. Vale reativar a operacao comercial."
          : `Os ultimos 3 dias somaram ${periodComparison.last3Days.ticketsSold} ingresso(s), abaixo do ritmo anterior de ${periodComparison.previous3Days.ticketsSold}.`,
      tone:
        periodComparison.last3Days.ticketsSold === 0 ||
        periodComparison.last3Days.ticketsSold <= Math.round(periodComparison.previous3Days.ticketsSold * 0.3)
          ? "critical"
          : "warning"
    });
  }

  const expenseRatio = summary.totalRevenue > 0 ? totalExpenses / summary.totalRevenue : totalExpenses > 0 ? 1 : 0;
  if (expenseRatio >= 0.7) {
    attentionItems.push({
      id: "expenses-high",
      title: "Despesas altas para o momento",
      description:
        summary.totalRevenue > 0
          ? `As despesas ja representam ${Math.round(expenseRatio * 100)}% do total arrecadado da festa.`
          : "Ja existem despesas registradas, mas a festa ainda nao gerou receita suficiente para equilibrar o caixa.",
      tone: expenseRatio >= 0.9 ? "critical" : "warning"
    });
  }

  const eventStart = new Date(event.created_at);
  const eventEnd = new Date(event.event_date);
  const now = new Date();
  if (
    !Number.isNaN(eventStart.getTime()) &&
    !Number.isNaN(eventEnd.getTime()) &&
    eventEnd.getTime() > eventStart.getTime() &&
    now.getTime() > eventStart.getTime()
  ) {
    const elapsedRatio = Math.min(
      Math.max((now.getTime() - eventStart.getTime()) / (eventEnd.getTime() - eventStart.getTime()), 0),
      1
    );
    const expectedProgress = Math.round(elapsedRatio * 100);
    const lag = expectedProgress - summary.progress;

    if (expectedProgress >= 25 && lag >= 15) {
      attentionItems.push({
        id: "goal-pacing",
        title: "Festa abaixo do ritmo esperado",
        description: `Pelo tempo decorrido, a meta deveria estar perto de ${expectedProgress}%, mas a festa esta em ${summary.progress}%.`,
        tone: lag >= 30 ? "critical" : "warning"
      });
    }
  }

  const health = buildHealthSnapshot({
    progress: summary.progress
  });

  return {
    ...summary,
    viewer: context.viewer,
    viewerEventRole: eventRole,
    hasVip: event.has_vip ?? true,
    hasGroupSales: event.has_group_sales ?? true,
    permissions,
    health,
    attentionItems,
    activeSellers: sellerMemberships.filter((membership) => membership.is_active).length,
    ticketRevenue,
    additionalRevenue,
    totalExpenses,
    summary: [
      {
        label: "Total arrecadado",
        value: summary.totalRevenue,
        helper: `${formatCurrency(grossSoldRevenue)} em total vendido | ${formatCurrency(additionalRevenue)} em vendas extras`,
        isCurrency: true
      },
      {
        label: "Meta da festa",
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
    tasks: taskItems,
    announcements: announcementItems,
    activityLogs: activityItems,
    guestListEntries: [],
    salesSeries,
    sellerContribution,
    sellerOptions,
    participantOptions,
    eventBatches: eventBatchItems,
    teamMembers,
    availableUsers,
    postEventReport: {
      eventId: event.slug,
      eventName: event.name,
      eventDate: event.event_date,
      status: event.status,
      ...postEventReportBase
    }
  };
  } catch (error) {
    logServerIssue("getEventById", error, { slug: id });
    throw error;
  }
}

export async function getEventGuestListSectionById(id: string): Promise<
  | {
      permissions: ViewerPermissions;
      guestListEntries: GuestListEntry[];
    }
  | undefined
> {
  try {
    const context = await getViewerContext();

    if (!context) {
      return undefined;
    }

    const supabase = createSupabaseServerClient() as any;
    const { data: event, error } = await supabase.from("events").select("id").eq("slug", id).single();

    if (error || !event) {
      if (error) {
        logServerIssue("getEventGuestListSectionById.event", error, { slug: id });
      }
      return undefined;
    }

    const [
      { data: memberships, error: membershipsError },
      { data: eventBatches, error: eventBatchesError },
      { data: sales, error: salesError }
    ] = await Promise.all([
      supabase
        .from("event_memberships")
        .select("user_id, role")
        .eq("event_id", event.id),
      supabase
        .from("event_batches")
        .select("id, name")
        .eq("event_id", event.id),
      supabase
        .from("sales")
        .select("id, seller_user_id, batch_id, sale_type, quantity, unit_price, ticket_type, sold_at, notes, created_at")
        .eq("event_id", event.id)
    ]);

    if (membershipsError || eventBatchesError || salesError) {
      throw membershipsError ?? eventBatchesError ?? salesError;
    }

    const membershipRows = (memberships ?? []) as Array<Pick<EventMembershipRow, "user_id" | "role">>;
    const eventBatchRows = (eventBatches ?? []) as Array<Pick<EventBatchRow, "id" | "name">>;
    const salesRows = (sales ?? []) as Array<
      Pick<
        SaleRow,
        "id" | "seller_user_id" | "batch_id" | "sale_type" | "quantity" | "unit_price" | "ticket_type" | "sold_at" | "notes" | "created_at"
      >
    >;
    const batchNameMap = new Map(eventBatchRows.map((batch) => [batch.id, batch.name]));
    const viewerMembership = membershipRows.find((membership) => membership.user_id === context.viewer.id);
    const permissions = buildPermissions(context.viewer.role, viewerMembership?.role, context.viewer.id);
    const canViewManualGuests = permissions.canManageManualGuests;

    const saleAttendeesQuery = supabase
      .from("sale_attendees")
      .select("id, sale_id, seller_user_id, guest_name, checked_in_at, created_at")
      .eq("event_id", event.id)
      .order("guest_name", { ascending: true });

    if (permissions.canManageOwnSalesOnly) {
      saleAttendeesQuery.eq("seller_user_id", context.viewer.id);
    }

    const { data: saleAttendees, error: saleAttendeesError } = await saleAttendeesQuery;

    if (saleAttendeesError) {
      throw saleAttendeesError;
    }

    const saleAttendeeRows = (saleAttendees ?? []) as SaleAttendeeRow[];

    const manualGuestEntryRows = canViewManualGuests
      ? await (async () => {
          const { data, error } = await supabase
            .from("manual_guest_entries")
            .select("id, guest_name, notes, created_at")
            .eq("event_id", event.id)
            .order("guest_name", { ascending: true });

          if (error) {
            throw error;
          }

          return (data ?? []) as ManualGuestEntryRow[];
        })()
      : [];

    const profileIds = [...new Set([...membershipRows.map((membership) => membership.user_id), ...saleAttendeeRows.map((entry) => entry.seller_user_id)])];
    const profilesMap = await getProfilesMap(profileIds);
    const guestListEntries = buildGuestListEntries({
      saleAttendeeRows,
      salesRows,
      manualGuestEntryRows,
      batchNameMap,
      profilesMap,
      viewerId: context.viewer.id,
      canManageOwnSalesOnly: permissions.canManageOwnSalesOnly,
      canViewManualGuests
    });

    return {
      permissions,
      guestListEntries
    };
  } catch (error) {
    logServerIssue("getEventGuestListSectionById", error, { slug: id });
    throw error;
  }
}

export async function getEventTeamSectionById(id: string): Promise<
  | {
      permissions: ViewerPermissions;
      teamMembers: TeamMember[];
      availableUsers: UserDirectoryOption[];
    }
  | undefined
> {
  try {
    const context = await getViewerContext();

    if (!context) {
      return undefined;
    }

    const supabase = createSupabaseServerClient() as any;
    const { data: event, error } = await supabase.from("events").select("id").eq("slug", id).single();

    if (error || !event) {
      if (error) {
        logServerIssue("getEventTeamSectionById.event", error, { slug: id });
      }
      return undefined;
    }

  const [{ data: memberships }, { data: sales }] = await Promise.all([
    supabase.from("event_memberships").select("*").eq("event_id", event.id).order("created_at", { ascending: true }),
    supabase.from("sales").select("*").eq("event_id", event.id)
  ]);

  const membershipRows = (memberships ?? []) as EventMembershipRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
  const profilesMap = await getProfilesMap(profileIds);
  const viewerMembership = membershipRows.find((membership) => membership.user_id === context.viewer.id);
  const permissions = buildPermissions(context.viewer.role, viewerMembership?.role, context.viewer.id);

  if (!permissions.canManageTeam) {
    return {
      permissions,
      teamMembers: [],
      availableUsers: []
    };
  }

  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  const memberIds = new Set(membershipRows.map((membership) => membership.user_id));
  const availableUsers = ((allProfiles ?? []) as Array<Pick<ProfileRow, "id" | "full_name">>)
    .filter((profile) => !memberIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name
    }));

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
    isCurrentUser: membership.user_id === context.viewer.id
  }));

  return {
    permissions,
    teamMembers,
    availableUsers
  };
  } catch (error) {
    logServerIssue("getEventTeamSectionById", error, { slug: id });
    throw error;
  }
}

export async function getEventActivitySectionById(id: string): Promise<
  | {
      permissions: ViewerPermissions;
      activityLogs: ActivityLogItem[];
    }
  | undefined
> {
  try {
    const context = await getViewerContext();

    if (!context) {
      return undefined;
    }

    const supabase = createSupabaseServerClient() as any;
    const { data: event, error } = await supabase.from("events").select("id").eq("slug", id).single();

    if (error || !event) {
      if (error) {
        logServerIssue("getEventActivitySectionById.event", error, { slug: id });
      }
      return undefined;
    }

  const { data: viewerMembership } = await supabase
    .from("event_memberships")
    .select("role")
    .eq("event_id", event.id)
    .eq("user_id", context.viewer.id)
    .maybeSingle();

  const permissions = buildPermissions(context.viewer.role, viewerMembership?.role, context.viewer.id);

  if (!permissions.canViewActivityLog) {
    return {
      permissions,
      activityLogs: []
    };
  }

  const { data: activityLogs, error: activityLogsError } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(120);

  if (activityLogsError) {
    throw activityLogsError;
  }

  const activityLogRows = (activityLogs ?? []) as ActivityLogRow[];
  const actorIds = [...new Set(activityLogRows.map((log) => log.actor_user_id))];
  const profilesMap = await getProfilesMap(actorIds);

  return {
    permissions,
    activityLogs: activityLogRows.map((log) => ({
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
  };
  } catch (error) {
    logServerIssue("getEventActivitySectionById", error, { slug: id });
    throw error;
  }
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

function emptyEventComparison(): EventComparisonSnapshot {
  return {
    bestRevenueEvent: { eventName: "Sem dados", value: 0 },
    bestProfitEvent: { eventName: "Sem dados", value: 0 },
    topSellerOverall: { sellerName: "Sem dados", value: 0 },
    averageSalesPerEvent: 0
  };
}

export async function getEventComparison(preloadedEvents?: EventSummary[]): Promise<EventComparisonSnapshot> {
  try {
    const events = preloadedEvents ?? (await getEvents());

    if (events.length === 0) {
      return emptyEventComparison();
    }

    const context = await getViewerContext();

    if (!context) {
      return emptyEventComparison();
    }

    const supabase = createSupabaseServerClient() as any;
    const accessibleEvents = await getAccessibleEvents(context.viewer);
    const eventIds = accessibleEvents.map((event) => event.id);

    if (eventIds.length === 0) {
      return emptyEventComparison();
    }

    const [{ data: memberships }, { data: sales }] = await Promise.all([
      supabase.from("event_memberships").select("event_id, user_id, role").in("event_id", eventIds).eq("role", "seller"),
      supabase.from("sales").select("event_id, seller_user_id, quantity, unit_price").in("event_id", eventIds)
    ]);

    const membershipRows = (memberships ?? []) as Array<Pick<EventMembershipRow, "event_id" | "user_id" | "role">>;
    const salesRows = (sales ?? []) as Array<Pick<SaleRow, "event_id" | "seller_user_id" | "quantity" | "unit_price">>;
    const profileIds = [...new Set(membershipRows.map((membership) => membership.user_id))];
    const profilesMap = await getProfilesMap(profileIds);

    const sellerTotals = new Map<string, { sellerName: string; value: number }>();
    for (const membership of membershipRows) {
      const sellerName = profilesMap.get(membership.user_id)?.full_name ?? "Sem dados";
      const sellerRevenue = salesRows
        .filter((sale) => sale.seller_user_id === membership.user_id && sale.event_id === membership.event_id)
        .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);

      const current = sellerTotals.get(membership.user_id);
      sellerTotals.set(membership.user_id, {
        sellerName,
        value: (current?.value ?? 0) + sellerRevenue
      });
    }

    const bestRevenueEvent = [...events].sort((left, right) => right.totalRevenue - left.totalRevenue)[0];
    const bestProfitEvent = [...events].sort((left, right) => right.estimatedProfit - left.estimatedProfit)[0];
    const topSellerEntry = Array.from(sellerTotals.values()).sort((left, right) => right.value - left.value)[0];

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
        sellerName: topSellerEntry?.sellerName ?? "Sem dados",
        value: topSellerEntry?.value ?? 0
      },
      averageSalesPerEvent: Math.round(
        events.reduce((sum, event) => sum + event.totalRevenue, 0) / Math.max(events.length, 1)
      )
    };
  } catch (error) {
    logServerIssue("getEventComparison", error, { preloadedCount: preloadedEvents?.length ?? 0 });
    throw error;
  }
}
