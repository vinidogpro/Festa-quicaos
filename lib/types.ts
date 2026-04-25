export type UserRole = "host" | "organizer" | "seller";
export type EventRole = "host" | "organizer" | "seller";
export type EventStatus = "current" | "upcoming" | "past";
export type TaskStatus = "pending" | "in-progress" | "done";
export type TicketType = "vip" | "pista";
export interface EventBatchPreset {
  name: string;
  pistaPrice: number;
  vipPrice?: number;
  isActiveByDefault: boolean;
}

export const DEFAULT_EVENT_BATCH_PRESETS: readonly EventBatchPreset[] = [
  { name: "Lote comissao", pistaPrice: 35, vipPrice: 65, isActiveByDefault: false },
  { name: "Lote promocional", pistaPrice: 35, isActiveByDefault: false },
  { name: "Lote 1", pistaPrice: 45, vipPrice: 65, isActiveByDefault: true },
  { name: "Lote 2", pistaPrice: 50, vipPrice: 70, isActiveByDefault: true },
  { name: "Lote 3", pistaPrice: 55, vipPrice: 75, isActiveByDefault: false },
  { name: "Lote 4", pistaPrice: 60, vipPrice: 80, isActiveByDefault: false },
  { name: "Lote 5", pistaPrice: 65, vipPrice: 85, isActiveByDefault: false },
  { name: "Lote 6", pistaPrice: 70, vipPrice: 90, isActiveByDefault: false }
] as const;

export const DEFAULT_EVENT_BATCH_NAMES = DEFAULT_EVENT_BATCH_PRESETS.filter((batch) => batch.isActiveByDefault).map(
  (batch) => batch.name
) as string[];
export type SaleBatchLabel = string;
export const SALE_TYPE_OPTIONS = ["normal", "grupo"] as const;
export type SaleType = (typeof SALE_TYPE_OPTIONS)[number];

export interface EventBatch {
  id: string;
  name: string;
  pistaPrice?: number | null;
  vipPrice?: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ViewerProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface ViewerPermissions {
  eventRole?: EventRole;
  canCreateEvents: boolean;
  canManageEvent: boolean;
  canViewActivityLog: boolean;
  canManageTeam: boolean;
  canManageManualGuests: boolean;
  canManageSales: boolean;
  canManageFinance: boolean;
  canManageTasks: boolean;
  canManageAnnouncements: boolean;
  canManageOwnSalesOnly: boolean;
  sellerUserId?: string;
}

export interface SummaryMetric {
  label: string;
  value: number;
  helper: string;
  progress?: number;
  isCurrency?: boolean;
}

export interface SellerOption {
  id: string;
  name: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: EventRole;
  isActive: boolean;
  ticketsSold: number;
  revenue: number;
  isCurrentUser: boolean;
}

export interface UserDirectoryOption {
  id: string;
  name: string;
}

export interface SellerRanking {
  id: string;
  sellerUserId?: string;
  name: string;
  ticketsSold: number;
  revenue: number;
}

export interface EventHealthSnapshot {
  label: string;
  tone: "positive" | "warning" | "critical";
  summary: string;
}

export interface EventAttentionItem {
  id: string;
  title: string;
  description: string;
  tone: "warning" | "critical";
}

export interface ActivityLogItem {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface SalesRecord {
  id: string;
  saleNumber: number;
  sellerUserId: string;
  seller: string;
  batchId: string;
  batchLabel: SaleBatchLabel;
  saleType: SaleType;
  ticketType: TicketType;
  sold: number;
  unitPrice: number;
  soldAt: string;
  createdAt: string;
  notes?: string;
  amount: number;
  attendeeNames: string[];
  attendeeCount: number;
  missingAttendeeCount: number;
  isOwnedByViewer: boolean;
}

export interface GuestListEntry {
  id: string;
  saleId?: string;
  saleNumber?: number;
  sellerUserId?: string;
  sellerName: string;
  guestName: string;
  batchId?: string;
  batchLabel?: SaleBatchLabel;
  saleType?: SaleType;
  ticketType?: TicketType;
  sold?: number;
  unitPrice?: number;
  soldAt?: string;
  amount?: number;
  attendeeNames?: string[];
  attendeeCount?: number;
  missingAttendeeCount?: number;
  checkedInAt?: string;
  createdAt: string;
  isOwnedByViewer: boolean;
  notes?: string;
  sourceType: "sale" | "manual";
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  incurredAt: string;
  notes?: string;
}

export interface AdditionalRevenue {
  id: string;
  title: string;
  amount: number;
  category?: string;
  date: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  owner: string;
  ownerProfileId?: string;
  status: TaskStatus;
  dueLabel: string;
  dueAt?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  createdAt: string;
  author?: string;
}

export interface SalesSeries {
  day: string;
  amount: number;
}

export interface SellerContribution {
  seller: string;
  amount: number;
}

export interface EventSummary {
  id: string;
  name: string;
  eventDate: string;
  status: EventStatus;
  description?: string;
  hasVip: boolean;
  hasGroupSales: boolean;
  totalRevenue: number;
  ticketRevenue: number;
  additionalRevenue: number;
  totalExpenses: number;
  goalValue: number;
  progress: number;
  estimatedProfit: number;
  totalTicketsSold: number;
  averageTicket: number;
  bestSeller: string;
  venue: string;
}

export interface PartyEventDetail extends EventSummary {
  viewer: ViewerProfile;
  viewerEventRole?: EventRole;
  permissions: ViewerPermissions;
  health: EventHealthSnapshot;
  attentionItems: EventAttentionItem[];
  activeSellers: number;
  ticketRevenue: number;
  additionalRevenue: number;
  totalExpenses: number;
  summary: SummaryMetric[];
  ranking: SellerRanking[];
  salesControl: SalesRecord[];
  expenses: Expense[];
  additionalRevenues: AdditionalRevenue[];
  tasks: TaskItem[];
  announcements: Announcement[];
  activityLogs: ActivityLogItem[];
  guestListEntries: GuestListEntry[];
  salesSeries: SalesSeries[];
  sellerContribution: SellerContribution[];
  sellerOptions: SellerOption[];
  participantOptions: SellerOption[];
  eventBatches: EventBatch[];
  teamMembers: TeamMember[];
  availableUsers: UserDirectoryOption[];
  postEventReport: PostEventReportSnapshot;
}

export interface EventComparisonSnapshot {
  bestRevenueEvent: {
    eventName: string;
    value: number;
  };
  bestProfitEvent: {
    eventName: string;
    value: number;
  };
  topSellerOverall: {
    sellerName: string;
    value: number;
  };
  averageSalesPerEvent: number;
}

export interface StrategicEventSnapshot extends EventSummary {
  profitMargin: number;
  expenseRatio: number;
  isLoss: boolean;
  isBelowGoal: boolean;
}

export interface StrategicBatchLearning {
  batchLabel: string;
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
  percentage: number;
}

export interface StrategicTicketTypeMetric {
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
  percentage: number;
}

export interface StrategicSaleTypeMetric {
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
  percentage: number;
}

export interface StrategicExpenseCategoryLearning {
  category: string;
  total: number;
  count: number;
  averagePerEvent: number;
  revenueShare: number;
}

export interface PostEventReportSnapshot {
  eventId: string;
  eventName: string;
  eventDate: string;
  status: EventStatus;
  overview: {
    totalRevenue: number;
    ticketRevenue: number;
    additionalRevenue: number;
    totalExpenses: number;
    estimatedProfit: number;
    averageTicket: number;
    totalTicketsSold: number;
  };
  commercial: {
    bestBatchLabel: string;
    bestBatchRevenue: number;
    bestBatchShare: number;
    dominantTicketType: TicketType;
    dominantTicketRevenue: number;
    dominantTicketRevenueShare: number;
    dominantSaleType: SaleType;
    dominantSaleTypeShare: number;
    mostEfficientPrice: number;
    mostEfficientPriceRevenue: number;
  };
  financial: {
    topExpenseCategories: Array<{ category: string; total: number }>;
    heaviestExpenseCategory?: { category: string; total: number };
    marginPercentage: number;
    expenseRatio: number;
  };
  insights: string[];
}

export interface StrategicOverviewSnapshot {
  eventSnapshots: StrategicEventSnapshot[];
  batchLearning: StrategicBatchLearning[];
  ticketTypeLearning: {
    vip: StrategicTicketTypeMetric;
    pista: StrategicTicketTypeMetric;
  };
  saleTypeLearning: {
    normal: StrategicSaleTypeMetric;
    grupo: StrategicSaleTypeMetric;
  };
  expenseCategoryLearning: StrategicExpenseCategoryLearning[];
  postEventReports: PostEventReportSnapshot[];
}
