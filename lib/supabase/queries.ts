import { isSupabaseConfigured } from "@/lib/env";
import { buildPermissions } from "@/lib/permissions";
import { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Announcement,
  EventComparisonSnapshot,
  EventSummary,
  Expense,
  PartyEventDetail,
  SalesRecord,
  SellerContribution,
  SellerOption,
  SellerRanking,
  TaskItem,
  TransferPending,
  ViewerProfile
} from "@/lib/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type SellerRow = Database["public"]["Tables"]["sellers"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

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

  if (viewer.role === "admin" || viewer.role === "organizer") {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as EventRow[];
  }

  const { data: sellerRows, error: sellersError } = await supabase
    .from("sellers")
    .select("event_id")
    .eq("profile_id", viewer.id);

  if (sellersError) {
    throw sellersError;
  }

  const sellerEventRows = (sellerRows ?? []) as Array<Pick<SellerRow, "event_id">>;
  const eventIds = [...new Set(sellerEventRows.map((row) => row.event_id))];

  if (eventIds.length === 0) {
    return [] as EventRow[];
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .order("event_date", { ascending: true });

  if (error) {
    throw error;
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
  sellers,
  profilesMap
}: {
  event: EventRow;
  sales: SaleRow[];
  expenses: ExpenseRow[];
  sellers: SellerRow[];
  profilesMap: Map<string, ProfileRow>;
}): EventSummary {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const progress = event.goal_value > 0 ? Math.round((totalRevenue / event.goal_value) * 100) : 0;

  const revenueBySeller = sellers.map((seller) => {
    const revenue = sales
      .filter((sale) => sale.seller_id === seller.id)
      .reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);

    return {
      seller,
      revenue
    };
  });

  const best = revenueBySeller.sort((left, right) => right.revenue - left.revenue)[0];
  const bestProfile = best ? profilesMap.get(best.seller.profile_id) : undefined;

  return {
    id: event.slug,
    name: event.name,
    eventDate: event.event_date,
    status: event.status,
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

  const [{ data: sales }, { data: expenses }, { data: sellers }] = await Promise.all([
    supabase.from("sales").select("*").in("event_id", eventIds),
    supabase.from("expenses").select("*").in("event_id", eventIds),
    supabase.from("sellers").select("*").in("event_id", eventIds)
  ]);

  const salesRows = (sales ?? []) as SaleRow[];
  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const sellerRows = (sellers ?? []) as SellerRow[];

  const profileIds = [...new Set(sellerRows.map((seller) => seller.profile_id))];
  const profilesMap = await getProfilesMap(profileIds);

  return events.map((event) =>
    buildSummaryFromRows({
      event,
      sales: salesRows.filter((sale) => sale.event_id === event.id),
      expenses: expenseRows.filter((expense) => expense.event_id === event.id),
      sellers: sellerRows.filter((seller) => seller.event_id === event.id),
      profilesMap
    })
  );
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

  const [{ data: sellers }, { data: sales }, { data: expenses }, { data: tasks }, { data: announcements }] =
    await Promise.all([
      supabase.from("sellers").select("*").eq("event_id", event.id).order("created_at", { ascending: true }),
      supabase.from("sales").select("*").eq("event_id", event.id).order("sold_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("event_id", event.id).order("incurred_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").eq("event_id", event.id).order("created_at", { ascending: false })
    ]);

  const sellerRows = (sellers ?? []) as SellerRow[];
  const salesRows = (sales ?? []) as SaleRow[];
  const expenseRows = (expenses ?? []) as ExpenseRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const announcementRows = (announcements ?? []) as AnnouncementRow[];

  const profileIds = [
    ...new Set([
      ...sellerRows.map((seller) => seller.profile_id),
      ...taskRows.flatMap((task) => (task.owner_profile_id ? [task.owner_profile_id] : []))
    ])
  ];
  const profilesMap = await getProfilesMap(profileIds);

  const viewerSeller = sellerRows.find((seller) => seller.profile_id === context.viewer.id);
  const permissions = buildPermissions(context.viewer.role, viewerSeller?.id);

  const summary = buildSummaryFromRows({
    event,
    sales: salesRows,
    expenses: expenseRows,
    sellers: sellerRows,
    profilesMap
  });

  const ranking: SellerRanking[] = sellerRows
    .map((seller) => {
      const sellerSales = salesRows.filter((sale) => sale.seller_id === seller.id);
      const ticketsSold = sellerSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const revenue = sellerSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0);
      const profile = profilesMap.get(seller.profile_id);

      return {
        id: seller.id,
        sellerId: seller.id,
        name: profile?.full_name ?? "Vendedor",
        ticketsSold,
        revenue,
        delta: sellerSales.length > 0 ? `+${Math.max(1, Math.round((ticketsSold / Math.max(1, seller.ticket_quota)) * 10))}%` : "+0%"
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

  const salesControl: SalesRecord[] = salesRows.map((sale) => {
    const seller = sellerRows.find((item) => item.id === sale.seller_id);
    const profile = seller ? profilesMap.get(seller.profile_id) : undefined;
    const sellerSales = salesRows.filter((item) => item.seller_id === sale.seller_id);
    const soldBySeller = sellerSales.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: sale.id,
      sellerId: sale.seller_id,
      seller: profile?.full_name ?? "Vendedor",
      received: seller?.ticket_quota ?? soldBySeller,
      sold: sale.quantity,
      remaining: Math.max((seller?.ticket_quota ?? soldBySeller) - soldBySeller, 0),
      paymentStatus: sale.payment_status,
      unitPrice: sale.unit_price,
      soldAt: sale.sold_at,
      notes: sale.notes ?? undefined,
      amount: sale.quantity * sale.unit_price,
      isOwnedByViewer: seller?.profile_id === context.viewer.id
    };
  });

  const transfersPending: TransferPending[] = sellerRows
    .map((seller) => {
      const sellerSales = salesRows.filter(
        (sale) => sale.seller_id === seller.id && sale.payment_status === "pending"
      );

      return {
        id: seller.id,
        name: profilesMap.get(seller.profile_id)?.full_name ?? "Vendedor",
        amount: sellerSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_price, 0)
      };
    })
    .filter((item) => item.amount > 0);

  const expenseItems: Expense[] = expenseRows.map((expense) => ({
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    incurredAt: expense.incurred_at
  }));

  const taskItems: TaskItem[] = taskRows.map((task) => ({
    id: task.id,
    title: task.title,
    owner: task.owner_profile_id ? profilesMap.get(task.owner_profile_id)?.full_name ?? "Sem responsavel" : "Sem responsavel",
    ownerProfileId: task.owner_profile_id ?? undefined,
    status: task.status,
    dueLabel: task.due_at ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_at)) : "Sem prazo"
  }));

  const announcementItems: Announcement[] = announcementRows.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    pinned: announcement.pinned
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

  const sellerOptions: SellerOption[] = sellerRows.map((seller) => ({
    id: seller.id,
    name: profilesMap.get(seller.profile_id)?.full_name ?? "Vendedor"
  }));

  const participantOptions: SellerOption[] = Array.from(
    new Map(
      [
        context.viewer,
        ...(Array.from(profilesMap.values()).map((profile) => ({
          id: profile.id,
          name: profile.full_name
        })) as SellerOption[])
      ].map((item) => [item.id, item])
    ).values()
  ).map((item) => ({ id: item.id, name: item.name }));

  return {
    ...summary,
    viewer: context.viewer,
    permissions,
    activeSellers: sellerRows.filter((seller) => seller.is_active).length,
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
        helper: `${summary.progress}% da meta`,
        progress: summary.progress,
        isCurrency: true
      },
      {
        label: "Vendedores ativos",
        value: sellerRows.filter((seller) => seller.is_active).length,
        helper: "Equipe comercial habilitada",
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
    salesSeries,
    sellerContribution,
    sellerOptions,
    participantOptions
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
